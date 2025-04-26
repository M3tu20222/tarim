import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import type { ProcessType, Role } from "@prisma/client";

// Belirli bir işlemi getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Token kontrolü
    const cookieStore = await cookies(); // Await cookies()
    const token = cookieStore.get("token")?.value;
    // const processIdParam = params.id; // Bu satır kaldırıldı, params.id'ye daha sonra erişilecek

    // params.id erişimini sonraya taşı
    // const processId = params.id; // Buradan kaldırıldı

    // Özel durum: unread-count için farklı endpoint kullanılmalı
    // Doğrudan params.id kullan (ilk await'ten sonra olduğu için sorun olmamalı)
    if (params.id === "unread-count") {
      return NextResponse.json(
        {
          error: "Geçersiz endpoint. /api/notifications/unread-count kullanın",
        },
        { status: 400 }
      );
    }

    // Token kontrolü
    if (!token) {
      console.error("Token bulunamadı:", request.url);
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (error) {
      console.error("Token doğrulama hatası:", error);
      return NextResponse.json(
        { error: "Geçersiz veya süresi dolmuş token" },
        { status: 401 }
      );
    }

    const userId = decoded.id;
    const userRole = decoded.role as Role;

    // processId'yi burada, kullanmadan hemen önce al
    const processId = params.id; // params.id'ye burada erişiliyor (token doğrulamasından sonra)

    console.log(
      `API isteği (/api/processes/${processId}): Kullanıcı ID: ${userId}, Rol: ${userRole}`
    );

    // Rol bazlı erişim kontrolü
    const whereClause: any = { id: processId };

    if (userRole === "WORKER") {
      // İşçi sadece kendisine atanmış işlemleri görebilir
      whereClause.workerId = userId;
    } else if (userRole !== "ADMIN" && userRole !== "OWNER") {
      // Diğer roller yetkisiz
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const process = await prisma.process.findFirst({
      where: whereClause,
      include: {
        field: { select: { id: true, name: true, size: true } },
        worker: { select: { id: true, name: true } },
        season: { select: { id: true, name: true } },
        equipmentUsages: {
          include: {
            equipment: { select: { id: true, name: true } },
          },
        },
        inventoryUsages: {
          include: {
            inventory: { select: { id: true, name: true, unit: true } },
          },
        },
        processCosts: true,
      },
    });

    if (!process) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(process);
  } catch (error) {
    console.error("Error fetching process:", error);
    return NextResponse.json(
      { error: "İşlem getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// İşlemi güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // processId'yi ilk await'ten SONRA al
  // const processId = params.id; // Buradan kaldırıldı

  try {
    // Token kontrolü
    const cookieStore = await cookies(); // Await cookies()
    // processId'yi burada alma, token doğrulamasından sonra al
    const tokenCookie = cookieStore.get("token"); // Get the cookie object
    const token = tokenCookie?.value; // Extract the value

    if (!token) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: "Geçersiz veya süresi dolmuş token" },
        { status: 401 }
      );
    }

    const userId = decoded.id;
    const userRole = decoded.role as Role;
    const processId = params.id; // processId'yi burada al (token doğrulamasından sonra)

    // İşlemi bul
    const existingProcess = await prisma.process.findUnique({
      where: { id: processId }, // Use processId variable
      include: {
        field: { select: { id: true } },
      },
    });

    if (!existingProcess) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    // Yetki kontrolü
    let canUpdate = false;
    if (userRole === "ADMIN") {
      canUpdate = true;
    } else if (userRole === "OWNER" && existingProcess.fieldId) { // Check if fieldId exists
      // Tarla sahibi kontrolü
      const fieldOwnership = await prisma.fieldOwnership.findFirst({
        where: {
          fieldId: existingProcess.fieldId, // Use checked fieldId
          userId: userId,
        },
      });
      if (fieldOwnership) {
        canUpdate = true;
      }
    } else if (userRole === "WORKER" && existingProcess.workerId === userId) {
      // İşçi kendi işlemini güncelleyebilir
      canUpdate = true;
    }

    if (!canUpdate) {
      return NextResponse.json(
        { error: "Bu işlemi güncelleme yetkiniz yok" },
        { status: 403 }
      );
    }

    // İstek gövdesini al
    const body = await request.json();
    const {
      fieldId,
      workerId,
      seasonId,
      type,
      date,
      description,
      processedArea,
      processedPercentage,
      equipmentUsages,
      inventoryUsages,
    } = body;

    // Veri doğrulama
    if (!fieldId || !workerId || !type || !date) {
      return NextResponse.json(
        {
          error:
            "Gerekli alanlar eksik: fieldId, workerId, type, date zorunludur.",
        },
        { status: 400 }
      );
    }

    // Transaction başlat
    const updatedProcess = await prisma.$transaction(async (tx) => {
      // 1. Ana işlem kaydını güncelle
      const updated = await tx.process.update({
        where: { id: processId }, // Use processId variable
        data: {
          fieldId,
          workerId,
          seasonId,
          type: type as ProcessType,
          date: new Date(date),
          description,
          processedArea: processedArea
            ? Number.parseFloat(processedArea)
            : undefined,
          processedPercentage: processedPercentage
            ? Number.parseInt(processedPercentage, 10)
            : undefined,
        },
      });

      // 2. Ekipman kullanımlarını güncelle (varsa)
      if (equipmentUsages && equipmentUsages.length > 0) {
        // Önce mevcut kullanımları sil
        await tx.equipmentUsage.deleteMany({
          where: { processId: processId }, // Use processId variable
        });

        // Sonra yenilerini ekle
        await tx.equipmentUsage.createMany({
          data: equipmentUsages.map((usage: any) => ({
            processId: processId, // Use processId variable
            equipmentId: usage.equipmentId,
            usageDuration: usage.usageDuration
              ? Number.parseFloat(usage.usageDuration)
              : null,
            cost: Number.parseFloat(usage.cost),
          })),
        });
      }

      // 3. Envanter kullanımlarını güncelle (varsa)
      if (inventoryUsages && inventoryUsages.length > 0) {
        // Mevcut kullanımları al
        const existingUsages = await tx.inventoryUsage.findMany({
          where: { processId: processId }, // Use processId variable
        });

        // Mevcut kullanımları sil
        await tx.inventoryUsage.deleteMany({
          where: { processId: processId }, // Use processId variable
        });

        // Silinen kullanımlar için envanter stoklarını geri ekle
        for (const usage of existingUsages) {
          // Use usedQuantity instead of quantityUsed
          const quantityToIncrement = Number(usage.usedQuantity);
          if (!isNaN(quantityToIncrement) && quantityToIncrement > 0) {
            await tx.inventory.update({
              where: { id: usage.inventoryId },
              data: {
                totalQuantity: {
                  increment: quantityToIncrement,
                },
              },
            });
          } else {
             console.warn(`Skipping inventory update for usage ${usage.id} due to invalid quantity: ${usage.usedQuantity}`);
          }
        }

        // Yeni kullanımları ekle
        await tx.inventoryUsage.createMany({
          data: inventoryUsages.map((usage: any) => ({
            processId: processId, // Use processId variable
            inventoryId: usage.inventoryId,
            quantityUsed: Number.parseFloat(usage.quantityUsed),
            cost: Number.parseFloat(usage.cost),
          })),
        });

        // Yeni kullanımlar için envanter stoklarını azalt
        for (const usage of inventoryUsages) {
          await tx.inventory.update({
            where: { id: usage.inventoryId },
            data: {
              totalQuantity: {
                decrement: Number.parseFloat(usage.quantityUsed),
              },
            },
          });
        }
      }

      // 4. İşlem maliyetlerini güncelle
      const totalEquipmentCost =
        equipmentUsages?.reduce(
          (sum: number, usage: any) => sum + Number.parseFloat(usage.cost || 0),
          0
        ) || 0;
      const totalInventoryCost =
        inventoryUsages?.reduce(
          (sum: number, usage: any) => sum + Number.parseFloat(usage.cost || 0),
          0
        ) || 0;
      const totalDirectCost = totalEquipmentCost + totalInventoryCost;

      // Mevcut maliyet kaydını bul
      const existingCost = await tx.processCost.findFirst({
        where: { processId: processId }, // Use processId variable
      });

      if (existingCost) {
        // Mevcut kaydı güncelle
        await tx.processCost.update({
          where: { id: existingCost.id },
          data: {
            totalCost: totalDirectCost,
            equipmentCost: totalEquipmentCost,
            inventoryCost: totalInventoryCost,
          },
        });
      } else if (totalDirectCost > 0) {
        // Yeni kayıt oluştur
        await tx.processCost.create({
          data: {
            processId: processId, // Use processId variable
            totalCost: totalDirectCost,
            equipmentCost: totalEquipmentCost,
            inventoryCost: totalInventoryCost,
            laborCost: 0,
            fuelCost: 0,
            fieldId: fieldId,
          },
        });
      }

      return updated;
    });

    return NextResponse.json(updatedProcess);
  } catch (error) {
    console.error("Error updating process:", error);
    return NextResponse.json(
      { error: "İşlem güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// İşlemi sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } } // Destructure params object
) {
  // processId'yi ilk await'ten SONRA al
  // const processId = params.id; // Buradan kaldırıldı

  try {
    // Token kontrolü
    const cookieStore = await cookies(); // Await cookies()
    const processId = params.id; // processId'yi burada al
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: "Geçersiz veya süresi dolmuş token" },
        { status: 401 }
      );
    }

    const userId = decoded.id;
    const userRole = decoded.role as Role;

    // İşlemi bul
    const existingProcess = await prisma.process.findUnique({
      where: { id: processId }, // Use processId variable
      include: {
        field: { select: { id: true } },
        inventoryUsages: true,
      },
    });

    if (!existingProcess) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    // Yetki kontrolü
    let canDelete = false;
    if (userRole === "ADMIN") {
      canDelete = true;
    } else if (userRole === "OWNER" && existingProcess.fieldId) { // Check if fieldId exists
      // Tarla sahibi kontrolü
      const fieldOwnership = await prisma.fieldOwnership.findFirst({
        where: {
          fieldId: existingProcess.fieldId, // Use checked fieldId
          userId: userId,
        },
      });
      if (fieldOwnership) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return NextResponse.json(
        { error: "Bu işlemi silme yetkiniz yok" },
        { status: 403 }
      );
    }

    // Transaction başlat (zaman aşımı süresini artırarak)
    await prisma.$transaction(async (tx) => {
      // 1. Envanter kullanımlarını sil ve stokları geri ekle
      console.log(`Starting inventory update for process: ${processId}`); // Log başlangıcı
      if (existingProcess.inventoryUsages && Array.isArray(existingProcess.inventoryUsages) && existingProcess.inventoryUsages.length > 0) {
        console.log(`Found ${existingProcess.inventoryUsages.length} inventory usages to process.`); // Log: Kaç kullanım bulundu
        for (const usage of existingProcess.inventoryUsages) {
          console.log(`Processing usage ID: ${usage.id}, Inventory ID: ${usage.inventoryId}, Quantity Used: ${usage.usedQuantity}`); // Log: Mevcut kullanım detayı
          // Ensure usedQuantity is a valid number before incrementing
          // Use usedQuantity instead of quantityUsed
          const quantityToIncrement = Number(usage.usedQuantity);
          if (!isNaN(quantityToIncrement) && quantityToIncrement > 0) {
               console.log(`Attempting to increment inventory ${usage.inventoryId} by ${quantityToIncrement}`); // Log: Güncelleme denemesi
               try {
                 await tx.inventory.update({
                    where: { id: usage.inventoryId },
                    data: {
                        totalQuantity: {
                        increment: quantityToIncrement,
                        },
                    },
                 });
                 console.log(`Successfully incremented inventory ${usage.inventoryId}`); // Log: Başarılı güncelleme
               } catch (updateError) {
                 console.error(`Failed to update inventory ${usage.inventoryId}:`, updateError); // Log: Güncelleme hatası
                 // Transaction'ı geri almak için hatayı tekrar fırlat
                 throw updateError;
               }
          } else {
              // Use usedQuantity in the warning message
              console.warn(`Skipping inventory update for usage ${usage.id} due to invalid or zero quantity: ${usage.usedQuantity}`); // Log: Geçersiz miktar
          }
        }
      } else {
        console.log(`No inventory usages found for process ${processId} to update.`); // Log: Kullanım bulunamadı
      }

      // 2. İlişkili kayıtları sil (Sıralama önemli!)

      // Önce FieldOwnerExpense kayıtlarını sil
      await tx.fieldOwnerExpense.deleteMany({
        where: { processCost: { processId: processId } },
      });

      // Sonra FieldExpense kayıtlarını sil (Yeni Eklendi)
      await tx.fieldExpense.deleteMany({
        where: { processCost: { processId: processId } },
      });

      // Sonra ProcessCost kayıtlarını sil
      await tx.processCost.deleteMany({
        where: { processId: processId },
      });

      // Diğer ilişkili kayıtları sil
      await tx.equipmentUsage.deleteMany({
        where: { processId: processId }, // Use processId variable
      });

      await tx.inventoryUsage.deleteMany({
        where: { processId: processId }, // Use processId variable
      });


      // 3. Ana işlem kaydını sil
      await tx.process.delete({
        where: { id: processId }, // Use processId variable
      });
    }, {
      timeout: 15000 // Zaman aşımını 15 saniyeye çıkar
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting process:", error);
    return NextResponse.json(
      { error: "İşlem silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
