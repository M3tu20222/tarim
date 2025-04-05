import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ProcessType, Unit } from "@prisma/client";

// Tüm işlemleri getir
export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const fieldId = searchParams.get("fieldId");
    const seasonId = searchParams.get("seasonId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Filtre oluştur
    const filter: any = {};
    if (type) {
      filter.type = type;
    }
    if (fieldId) {
      filter.fieldId = fieldId;
    }
    if (seasonId) {
      filter.seasonId = seasonId;
    }
    if (startDate && endDate) {
      filter.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Kullanıcı rolüne göre filtreleme
    if (userRole === "WORKER") {
      // İşçiler sadece kendi yaptıkları işlemleri görebilir
      filter.workerId = userId;
    } else if (userRole === "OWNER") {
      // Sahipler kendi tarlalarındaki işlemleri görebilir
      filter.OR = [
        { workerId: userId }, // Kendi yaptığı işlemler
        {
          field: {
            owners: {
              some: {
                userId: userId,
              },
            },
          },
        }, // Sahip olduğu tarlalardaki işlemler
      ];
    }
    // Admin tüm işlemleri görebilir

    // İşlemleri getir
    const processes = await prisma.process.findMany({
      where: filter,
      include: {
        field: {
          select: {
            id: true,
            name: true,
            location: true,
            size: true,
          },
        },
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        season: {
          select: {
            id: true,
            name: true,
          },
        },
        equipmentUsages: {
          include: {
            equipment: true,
          },
        },
        inventoryUsages: {
          include: {
            inventory: true,
          },
        },
        processCosts: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(processes);
  } catch (error) {
    console.error("Error fetching processes:", error);
    return NextResponse.json(
      { error: "İşlemler getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Yeni işlem oluştur
export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    const {
      fieldId,
      type,
      date,
      description,
      processedPercentage,
      equipmentUsages,
      inventoryUsages,
      seasonId,
    } = await request.json();

    // Veri doğrulama
    if (!fieldId || !type || !date || processedPercentage === undefined) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik" },
        { status: 400 }
      );
    }

    // Tarla bilgilerini al
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
    });

    if (!field) {
      return NextResponse.json({ error: "Tarla bulunamadı" }, { status: 404 });
    }

    // İşlenen alan hesapla
    const totalArea = field.size;
    const processedArea = (totalArea * processedPercentage) / 100;

    // Aktif sezonu bul
    let activeSeason;
    if (!seasonId) {
      activeSeason = await prisma.season.findFirst({
        where: { isActive: true },
      });

      if (!activeSeason) {
        return NextResponse.json(
          { error: "Aktif sezon bulunamadı. Lütfen bir sezon seçin." },
          { status: 400 }
        );
      }
    }

    // Transaction ile işlem oluştur
    const result = await prisma.$transaction(async (tx) => {
      // 1. İşlem kaydı oluştur
      const process = await tx.process.create({
        data: {
          fieldId,
          workerId: userId,
          seasonId: seasonId || activeSeason!.id,
          type: type as ProcessType,
          date: new Date(date),
          description,
          totalArea,
          processedArea,
          processedPercentage,
        },
      });

      // 2. Ekipman kullanımlarını kaydet
      const equipmentUsageRecords = [];
      if (equipmentUsages && equipmentUsages.length > 0) {
        for (const usage of equipmentUsages) {
          // Ekipman bilgilerini al
          const equipment = await tx.equipment.findUnique({
            where: { id: usage.equipmentId },
          });

          if (!equipment) {
            throw new Error(`Ekipman bulunamadı: ${usage.equipmentId}`);
          }

          // Yakıt tüketimini hesapla
          const fuelConsumed =
            processedArea * equipment.fuelConsumptionPerDecare;

          // Ekipman kullanımını kaydet
          const equipmentUsage = await tx.equipmentUsage.create({
            data: {
              processId: process.id,
              equipmentId: usage.equipmentId,
              userId: userId, // Kullanıcı ID'si eklendi
              areaProcessed: processedArea,
              processedPercentage,
              fuelConsumed,
              unit: (usage.unit || "DECARE") as Unit,
            },
          });

          equipmentUsageRecords.push(equipmentUsage);
        }
      }

      // 3. Envanter kullanımlarını kaydet
      const inventoryUsageRecords = [];
      if (inventoryUsages && inventoryUsages.length > 0) {
        for (const usage of inventoryUsages) {
          // Envanter bilgilerini al
          const inventory = await tx.inventory.findUnique({
            where: { id: usage.inventoryId },
          });

          if (!inventory) {
            throw new Error(`Envanter bulunamadı: ${usage.inventoryId}`);
          }

          // Envanter kullanımını kaydet
          const inventoryUsage = await tx.inventoryUsage.create({
            data: {
              processId: process.id,
              inventoryId: usage.inventoryId,
              usedQuantity: usage.quantity,
              usageType: "PROCESSING",
              usedById: userId,
              fieldId,
            },
          });

          // Envanter miktarını güncelle
          await tx.inventory.update({
            where: { id: usage.inventoryId },
            data: {
              totalQuantity: {
                decrement: usage.quantity,
              },
            },
          });

          inventoryUsageRecords.push(inventoryUsage);
        }
      }

      // 4. Maliyet hesapla
      // İşçilik maliyeti (örnek olarak sabit bir değer)
      const laborCost = 100; // TL/saat olarak düşünülebilir

      // Ekipman maliyeti (örnek olarak sabit bir değer)
      const equipmentCost = equipmentUsageRecords.length * 50; // Her ekipman için 50 TL

      // Envanter maliyeti
      let inventoryCost = 0;
      for (const usage of inventoryUsageRecords) {
        const inventory = await tx.inventory.findUnique({
          where: { id: usage.inventoryId },
        });
        if (inventory) {
          // Basit bir hesaplama örneği
          inventoryCost += usage.usedQuantity * 10; // Her birim için 10 TL
        }
      }

      // Yakıt maliyeti
      const fuelCost = equipmentUsageRecords.reduce(
        (sum, usage) => sum + usage.fuelConsumed * 30, // Litre başına 30 TL
        0
      );

      // Toplam maliyet
      const totalCost = laborCost + equipmentCost + inventoryCost + fuelCost;

      // Maliyet kaydı oluştur
      const processCost = await tx.processCost.create({
        data: {
          processId: process.id,
          laborCost,
          equipmentCost,
          inventoryCost,
          fuelCost,
          totalCost,
        },
      });

      // 5. Tarla gideri oluştur
      const fieldExpense = await tx.fieldExpense.create({
        data: {
          fieldId,
          seasonId: seasonId || activeSeason!.id,
          processCostId: processCost.id,
          totalCost,
          periodStart: new Date(date),
          periodEnd: new Date(date),
        },
      });

      // 6. Tarla sahipleri için gider kayıtları oluştur
      const fieldOwnerships = await tx.fieldOwnership.findMany({
        where: { fieldId },
      });

      for (const ownership of fieldOwnerships) {
        await tx.fieldOwnerExpense.create({
          data: {
            fieldOwnershipId: ownership.id,
            processCostId: processCost.id,
            userId: ownership.userId, // Kullanıcı ID'si eklendi
            amount: totalCost * (ownership.percentage / 100),
            percentage: ownership.percentage,
            periodStart: new Date(date),
            periodEnd: new Date(date),
          },
        });
      }

      // 7. Tüm sahiplere ve yöneticilere bildirim gönder
      const owners = await tx.user.findMany({
        where: {
          OR: [{ role: "OWNER" }, { role: "ADMIN" }],
        },
      });

      const worker = await tx.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      const processTypeMap: Record<ProcessType, string> = {
        PLOWING: "Sürme",
        SEEDING: "Ekim",
        FERTILIZING: "Gübreleme",
        PESTICIDE: "İlaçlama",
        HARVESTING: "Hasat",
        OTHER: "Diğer",
      };

      const processTypeName = processTypeMap[type as ProcessType] || type;

      for (const owner of owners) {
        // İşçilere bildirim gönderme
        if (owner.id !== userId) {
          // İşlemi yapan kişiye bildirim gönderme
          await tx.notification.create({
            data: {
              title: "Tarla İşlemi Kaydedildi",
              message: `${field.name} tarlasının %${processedPercentage}'lik kısmında ${processTypeName} işlemi ${worker?.name || "bir çalışan"} tarafından gerçekleştirildi.`,
              type: "FIELD_PROCESSING",
              receiverId: owner.id,
              senderId: userId,
              processId: process.id,
            },
          });
        }
      }

      return {
        process,
        equipmentUsages: equipmentUsageRecords,
        inventoryUsages: inventoryUsageRecords,
        processCost,
        fieldExpense,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating process:", error);
    return NextResponse.json(
      {
        error:
          "İşlem oluşturulurken bir hata oluştu: " + (error as Error).message,
      },
      { status: 500 }
    );
  }
}
