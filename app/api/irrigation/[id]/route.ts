import { type NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSideSession } from "@/lib/session"; // Updated import

const prisma = new PrismaClient();

// Belirli bir sulama kaydını getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSideSession(); // Use custom session function
    if (!session || !session.id) { // Check for session.id instead of session.user
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;

    const irrigationLog = await prisma.irrigationLog.findUnique({
      where: { id },
      include: {
        well: true,
        season: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        fieldUsages: {
          include: {
            field: true,
            ownerUsages: {
              include: {
                owner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        inventoryUsages: {
          include: {
            inventory: true,
            ownerUsages: {
              include: {
                owner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!irrigationLog) {
      return NextResponse.json(
        { error: "Irrigation log not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: irrigationLog });
  } catch (error) {
    console.error("Error fetching irrigation log:", error);
    return NextResponse.json(
      { error: "Failed to fetch irrigation log" },
      { status: 500 }
    );
  }
}

// Sulama kaydını güncelle (İlişkili kayıtları silip yeniden oluşturarak)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSideSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id; // IrrigationLog ID
    const data = await request.json();
    const {
      startDateTime,
      duration,
      notes,
      fieldIrrigations, // Array of { fieldId, percentage, irrigatedArea, wellId, seasonId }
      ownerDurations,   // Array of { userId, duration, irrigatedArea }
      inventoryUsages,  // Array of { inventoryId, quantity, unitPrice, ownerUsages: [{ userId, quantity, cost }] }
      status,           // Optional status
    } = data;

    // Veri doğrulama (Temel alanlar)
    if (!startDateTime || !duration || !fieldIrrigations || fieldIrrigations.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields (startDateTime, duration, fieldIrrigations)" },
        { status: 400 }
      );
    }

    // İlk tarla kullanımından wellId ve seasonId'yi al (varsayım: tüm tarlalar aynı kuyu ve sezonda)
    // Daha karmaşık senaryolar için bu mantık değişebilir.
    const primaryFieldUsage = fieldIrrigations[0];
    const wellId = primaryFieldUsage?.wellId;
    const seasonId = primaryFieldUsage?.seasonId;

    if (!wellId || !seasonId) {
        return NextResponse.json(
            { error: "Could not determine wellId or seasonId from fieldIrrigations" },
            { status: 400 }
        );
    }

    const updatedIrrigationLog = await prisma.$transaction(async (tx) => {
      // 1. Mevcut ilişkili kayıtları sil ve stokları geri yükle
      //    (DELETE fonksiyonundan alınan mantık + Stok Geri Yükleme)

      // 1a. Mevcut envanter kullanımlarını ve miktarlarını al
      const existingInventoryUsages = await tx.irrigationInventoryUsage.findMany({
        where: { irrigationLogId: id },
        select: { id: true, inventoryId: true, quantity: true } // Miktarları ve ID'leri al
      });

      // 1b. Eski kullanımlara ait stokları geri yükle
      if (existingInventoryUsages.length > 0) {
        for (const usage of existingInventoryUsages) {
          await tx.inventory.update({
            where: { id: usage.inventoryId },
            data: {
              totalQuantity: {
                increment: usage.quantity, // Stoğu geri artır
              },
            },
          });
        }

        // 1c. Envanter sahip kullanımlarını sil
        const existingInventoryUsageIds = existingInventoryUsages.map(usage => usage.id);
        await tx.irrigationInventoryOwnerUsage.deleteMany({
          where: { irrigationInventoryUsageId: { in: existingInventoryUsageIds } },
        });

        // 1d. Envanter kullanımlarını sil (stoklar geri yüklendikten sonra)
        await tx.irrigationInventoryUsage.deleteMany({
          where: { irrigationLogId: id },
        });
      }

      // 1e. Tarla sahip kullanımlarını sil
      const existingFieldUsages = await tx.irrigationFieldUsage.findMany({
        where: { irrigationLogId: id },
        select: { id: true } // Sadece id'leri al
      });
      const existingFieldUsageIds = existingFieldUsages.map(usage => usage.id);
      if (existingFieldUsageIds.length > 0) {
        await tx.irrigationOwnerUsage.deleteMany({
          where: { irrigationFieldUsageId: { in: existingFieldUsageIds } },
        });
      }

      // 1f. Tarla kullanımlarını sil
      await tx.irrigationFieldUsage.deleteMany({
        where: { irrigationLogId: id },
      });

      // 1g. Kuyu fatura kullanımlarını sil (Eğer varsa ve güncellenmesi gerekiyorsa)
      //    Bu örnekte kuyu faturalandırmasıyla ilgili bir güncelleme yapmıyoruz,
      //    ancak silinmesi gerekebilir. İhtiyaç halinde ekleyin.
      // await tx.wellBillingIrrigationUsage.deleteMany({
      //   where: { irrigationLogId: id },
      // });

      // 2. Ana sulama kaydını güncelle
      const updatedLog = await tx.irrigationLog.update({
        where: { id },
        data: {
          startDateTime: new Date(startDateTime),
          duration,
          wellId,
          notes,
          status, // Gelen status değerini kullan
          seasonId,
          updatedAt: new Date(),
          // userId güncellenmez, oluşturan kullanıcı aynı kalır
        },
      });

      // 3. Yeni ilişkili kayıtları oluştur (POST /api/irrigation mantığına benzer)

      // 3a. Tarla kullanımlarını ve sahip sürelerini oluştur
      for (const fieldUsageData of fieldIrrigations) {
        const createdFieldUsage = await tx.irrigationFieldUsage.create({
          data: {
            irrigationLogId: updatedLog.id,
            fieldId: fieldUsageData.fieldId,
            percentage: fieldUsageData.percentage,
            // irrigatedArea alanı doğrudan bu modelde yok, ownerUsages içinde tutuluyor.
            // ownerDurations'dan ilgili sahip sürelerini bul ve ekle
            ownerUsages: {
              create: ownerDurations
                .filter((od: any) => fieldUsageData.owners?.some((owner: any) => owner.userId === od.userId)) // Sadece bu tarlanın sahipleri için
                .map((od: any) => ({
                  ownerId: od.userId,
                  duration: od.duration,
                  irrigatedArea: od.irrigatedArea,
                })),
            },
          },
        });
      }

      // 3b. Envanter kullanımlarını ve sahip maliyetlerini oluştur
      if (inventoryUsages && inventoryUsages.length > 0) {
        for (const invUsageData of inventoryUsages) {
          // Toplam maliyeti hesapla
          const totalCost = invUsageData.ownerUsages.reduce((sum: number, usage: any) => sum + (usage.cost || 0), 0);

          const createdInvUsage = await tx.irrigationInventoryUsage.create({
            data: {
              irrigationLogId: updatedLog.id,
              inventoryId: invUsageData.inventoryId,
              quantity: invUsageData.quantity,
              unitPrice: invUsageData.unitPrice, // Formdan gelen birim fiyatı kullan
              totalCost: totalCost, // Hesaplanan toplam maliyeti ekle
              // invUsageData.ownerUsages'dan ilgili sahip maliyetlerini ekle
              ownerUsages: {
                create: invUsageData.ownerUsages.map((ou: any) => ({
                  ownerId: ou.userId,
                  quantity: ou.quantity,
                  cost: ou.cost,
                })),
              },
            },
          });

          // Envanter stoğunu güncelle (POST'taki gibi)
          await tx.inventory.update({
            where: { id: invUsageData.inventoryId },
            data: {
              totalQuantity: {
                decrement: invUsageData.quantity,
              },
            },
          });
        }
      }

      return updatedLog; // Transaction sonucunu döndür
    });

    // Güncellenmiş kaydı (veya en azından ID'sini) döndür
    return NextResponse.json({ data: { id: updatedIrrigationLog.id } }); // Sadece ID döndürmek yeterli olabilir

  } catch (error) {
    console.error("Error updating irrigation log:", error);
    // Prisma transaction hatalarını daha detaylı loglama
    if (error instanceof Error && 'code' in error) { // Prisma hata kontrolü
        console.error("Prisma Error Code:", (error as any).code);
        console.error("Prisma Error Meta:", (error as any).meta);
    }
    return NextResponse.json(
      { error: "Failed to update irrigation log" },
      { status: 500 }
    );
  }
}

// Sulama kaydını sil
export async function DELETE(
  request: NextRequest, // request parametresi genellikle DELETE için kullanılmaz ama burada kalabilir.
  { params }: { params: { id: string } } // params'ı doğrudan destruct ediyoruz.
) {
  const id = await params.id; // id'yi buradan alıyoruz.

  try {
    const session = await getServerSideSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // const id = params.id; // id yukarıda tanımlandı.

    // 1. Silinecek ilişkili kayıtların ID'lerini ve stok bilgilerini transaction öncesinde topla
    const inventoryUsagesToDelete = await prisma.irrigationInventoryUsage.findMany({
        where: { irrigationLogId: id },
        select: { id: true, inventoryId: true, quantity: true }
    });
    const inventoryUsageIdsToDelete = inventoryUsagesToDelete.map(usage => usage.id);

    const fieldUsagesToDelete = await prisma.irrigationFieldUsage.findMany({
        where: { irrigationLogId: id },
        select: { id: true }
    });
    const fieldUsageIdsToDelete = fieldUsagesToDelete.map(usage => usage.id);

    // Açık transaction OLMADAN ilişkili kayıtları sırayla sil
    // (Hata ayıklama adımı - P2028'in kaynağını bulmak için)

    // Adım 1: Envanter sahip kullanımlarını sil
    if (inventoryUsageIdsToDelete.length > 0) {
        await prisma.irrigationInventoryOwnerUsage.deleteMany({ // tx yerine prisma
            where: { irrigationInventoryUsageId: { in: inventoryUsageIdsToDelete } },
        });
    }

    // Adım 2: Envanter kullanımlarını sil
    await prisma.irrigationInventoryUsage.deleteMany({ // tx yerine prisma
        where: { irrigationLogId: id },
    });

    // Adım 3: Tarla sahip kullanımlarını sil
    if (fieldUsageIdsToDelete.length > 0) {
        await prisma.irrigationOwnerUsage.deleteMany({ // tx yerine prisma
            where: { irrigationFieldUsageId: { in: fieldUsageIdsToDelete } },
        });
    }

    // Adım 4: Tarla kullanımlarını sil
    await prisma.irrigationFieldUsage.deleteMany({ // tx yerine prisma
      where: { irrigationLogId: id },
    });

    // Adım 5: Kuyu fatura kullanımlarını sil (varsa)
    await prisma.wellBillingIrrigationUsage.deleteMany({ // tx yerine prisma
      where: { irrigationLogId: id },
    });

    // Adım 6: İlişkili Sulama Sahip Özetlerini (IrrigationOwnerSummary) sil
    await prisma.irrigationOwnerSummary.deleteMany({ // tx yerine prisma
        where: { irrigationLogId: id },
    });

    // Adım 7: Ana sulama kaydını sil
    // ÖNEMLİ: Bu adım başarısız olursa, yukarıdaki adımlar geri alınmaz!
    await prisma.irrigationLog.delete({ // tx yerine prisma
      where: { id },
    });

    // Tüm silme işlemleri başarılı olduktan sonra stokları geri yükle
    if (inventoryUsagesToDelete.length > 0) {
        for (const usage of inventoryUsagesToDelete) {
            await prisma.inventory.update({ // tx yerine prisma kullanıyoruz
                where: { id: usage.inventoryId },
                data: {
                    totalQuantity: {
                        increment: usage.quantity, // Stoğu geri artır
                    },
                },
            });
        }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting irrigation log:", error);
    return NextResponse.json(
      { error: "Failed to delete irrigation log" },
      { status: 500 }
    );
  }
}
