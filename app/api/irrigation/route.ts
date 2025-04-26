import { type NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { getServerSideSession } from "@/lib/session";

const prisma = new PrismaClient();

// Helper function to round to 2 decimal places
const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

// Tüm sulama kayıtlarını getir (ownerSummaries eklendi)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSideSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? Number.parseInt(searchParams.get("limit")!)
      : 50;
    const page = searchParams.get("page")
      ? Number.parseInt(searchParams.get("page")!)
      : 1;
    const skip = (page - 1) * limit;
    const seasonId = searchParams.get("seasonId");
    const status = searchParams.get("status");
    const wellId = searchParams.get("wellId");
    const fieldId = searchParams.get("fieldId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const ownerId = searchParams.get("ownerId"); // Yeni filtre: Sahip ID'si

    const where: Prisma.IrrigationLogWhereInput = {};

    if (seasonId) where.seasonId = seasonId;
    if (status) where.status = status;
    if (wellId) where.wellId = wellId;
    if (fieldId) {
      where.fieldUsages = { some: { fieldId: fieldId } };
    }
    if (startDate && endDate) {
      where.startDateTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    // Sahibe göre filtreleme (ownerSummaries üzerinden)
    if (ownerId) {
      where.ownerSummaries = { some: { ownerId: ownerId } };
    }

    const totalCount = await prisma.irrigationLog.count({ where });

    const irrigationLogs = await prisma.irrigationLog.findMany({
      where,
      include: {
        well: true,
        season: true,
        user: { select: { id: true, name: true, email: true } },
        fieldUsages: {
          include: {
            field: { select: { id: true, name: true, size: true } }, // Sadece gerekli alanları seç
            ownerUsages: {
              // Bu hala tarla bazlı detayı gösterir
              include: {
                owner: { select: { id: true, name: true } },
              },
            },
          },
        },
        inventoryUsages: {
          include: {
            inventory: { select: { id: true, name: true, unit: true } }, // Sadece gerekli alanları seç
            ownerUsages: {
              // Bu hala envanter bazlı detayı gösterir
              include: {
                owner: { select: { id: true, name: true } },
              },
            },
          },
        },
        ownerSummaries: {
          // Yeni eklenen özet bilgisi
          include: {
            owner: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { startDateTime: "desc" },
      skip,
      take: limit,
    });

    return NextResponse.json({
      data: irrigationLogs,
      meta: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching irrigation logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch irrigation logs" },
      { status: 500 }
    );
  }
}

// Yeni sulama kaydı oluştur (Yeni hesaplama mantığı ile)



export async function POST(request: NextRequest) {
  try {
    const session = await getServerSideSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Formdan gelen verileri al (doğru isimlerle)
    const {
      startDateTime,
      duration,
      notes,
      fieldIrrigations, // 'fieldUsages' yerine 'fieldIrrigations'
      ownerDurations,   // Eklendi
      inventoryUsages,  // Yapısı formdan geldiği gibi
    } = await request.json();

    // Gerekli doğrulamalar
    if (
      !startDateTime ||
      !duration ||
      !fieldIrrigations ||
      fieldIrrigations.length === 0 ||
      !ownerDurations || ownerDurations.length === 0 // ownerDurations kontrolü eklendi ve boş olmaması sağlandı
    ) {
      return NextResponse.json({ error: "Eksik alanlar" }, { status: 400 });
    }

    // Toplam sulanan alanı hesapla (Envanter yüzdesi için gerekli)
    const totalIrrigatedAreaForLog = ownerDurations.reduce(
      (sum: number, owner: any) => sum + owner.irrigatedArea,
      0
    );
    if (totalIrrigatedAreaForLog <= 0) {
       return NextResponse.json({ error: "Toplam sulanan alan sıfır veya negatif olamaz." }, { status: 400 });
    }


    // wellId ve seasonId'yi ilk tarla kullanımından al (varsayım: hepsi aynı)
    // Daha sağlam bir çözüm için tüm fieldIrrigations kontrol edilebilir.
    const primaryFieldUsage = fieldIrrigations[0];
    const wellId = primaryFieldUsage.wellId;
    const seasonId = primaryFieldUsage.seasonId;

    // API içindeki karmaşık hesaplamalar kaldırıldı, formdan gelen veriler kullanılacak.

    // Veritabanı işlemlerini transaction içinde yap
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ana sulama kaydını oluştur
      const irrigationLog = await tx.irrigationLog.create({
        data: {
          startDateTime: new Date(startDateTime),
          duration,
          notes,
          status: "COMPLETED", // Varsayılan status eklendi
          wellId: wellId || null, // wellId varsa ekle, yoksa null
          seasonId: seasonId || null, // seasonId varsa ekle, yoksa null
          createdBy: session.id, // 'createdById' yerine 'createdBy' kullanıldı
        },
      });

      // 2. Tarla kullanımlarını kaydet (formdan gelen fieldIrrigations ile)
      for (const fieldUsage of fieldIrrigations) {
        // IrrigationFieldUsage'da irrigatedArea alanı yok, kaldırıldı.
        await tx.irrigationFieldUsage.create({
          data: {
            irrigationLogId: irrigationLog.id,
            fieldId: fieldUsage.fieldId,
            percentage: fieldUsage.percentage,
            // irrigatedArea alanı kaldırıldı
          },
        });
      }

      // 3. Sahip özetlerini kaydet (formdan gelen ownerDurations ile)
      for (const ownerSummary of ownerDurations) {
        await tx.irrigationOwnerSummary.create({
          data: {
            irrigationLogId: irrigationLog.id,
            ownerId: ownerSummary.userId,
            totalAllocatedDuration: round(ownerSummary.duration), // 'duration' yerine 'totalAllocatedDuration'
            totalIrrigatedArea: round(ownerSummary.irrigatedArea), // Alan adı düzeltildi (schema'da totalIrrigatedArea)
          },
        });
      }

      // 4. Envanter kullanımlarını ve stok güncellemelerini işle
      if (inventoryUsages && inventoryUsages.length > 0) {
        for (const usage of inventoryUsages) {
          // 4a. Ana envanter kullanım kaydını oluştur
          const irrigationInventoryUsage = await tx.irrigationInventoryUsage.create({
            data: {
              irrigationLogId: irrigationLog.id,
              inventoryId: usage.inventoryId,
              quantity: round(usage.quantity),
              unitPrice: round(usage.unitPrice), // Formdan gelen birim fiyat
              totalCost: round(usage.quantity * usage.unitPrice), // Toplam maliyet
            },
          });

          // 4b. Sahip bazında envanter kullanımını kaydet (formdan gelen ownerUsages ile)
          if (usage.ownerUsages && usage.ownerUsages.length > 0) {
            for (const ownerUsage of usage.ownerUsages) {
              // Sahip pay yüzdesini hesapla
              const ownerSummaryData = ownerDurations.find((o: any) => o.userId === ownerUsage.userId);
              const ownerPercentage = ownerSummaryData
                ? round((ownerSummaryData.irrigatedArea / totalIrrigatedAreaForLog) * 100)
                : 0; // Eğer sahip bulunamazsa 0 ata (hata durumu)

               if (!ownerSummaryData) {
                 console.warn(`Owner summary not found for userId: ${ownerUsage.userId} in inventory usage calculation.`);
                 // İsteğe bağlı: Hata fırlatılabilir veya işleme devam edilebilir.
               }


              await tx.irrigationInventoryOwnerUsage.create({
                data: {
                  irrigationInventoryUsageId: irrigationInventoryUsage.id,
                  ownerId: ownerUsage.userId,
                  percentage: ownerPercentage, // Hesaplanan yüzde eklendi
                  quantity: round(ownerUsage.quantity),
                  cost: round(ownerUsage.cost),
                },
              });

              // 4c. Sahip envanter stoğunu güncelle
              const ownerInventory = await tx.inventoryOwnership.findFirst({
                where: {
                  inventoryId: usage.inventoryId,
                  userId: ownerUsage.userId,
                },
              });

              if (!ownerInventory || ownerInventory.shareQuantity < ownerUsage.quantity) {
                throw new Error(
                  `Sahip ${ownerUsage.userId} için envanter ${usage.inventoryId} stok yetersiz (${ownerInventory?.shareQuantity} < ${ownerUsage.quantity})`
                );
              }

              await tx.inventoryOwnership.update({
                where: { id: ownerInventory.id },
                data: { shareQuantity: { decrement: round(ownerUsage.quantity) } },
              });
            }
          }

          // 4d. Toplam envanter stoğunu güncelle
          await tx.inventory.update({
            where: { id: usage.inventoryId },
            data: { totalQuantity: { decrement: round(usage.quantity) } },
          });

          // 4e. Envanter işlemi (transaction) kaydı oluştur
          await tx.inventoryTransaction.create({
            data: {
              inventoryId: usage.inventoryId,
              type: "USAGE",
              quantity: -round(usage.quantity), // Kullanım olduğu için negatif
              date: new Date(startDateTime),
              notes: `Sulama kaydı #${irrigationLog.id} için kullanıldı.`,
              userId: session.id, // İşlemi yapan kullanıcı
              // relatedIrrigationLogId alanı kaldırıldı
            },
          });
        }
      }

      return irrigationLog; // Transaction'dan sonucu döndür
    }); // Transaction sonu

    return NextResponse.json({ data: result }); // Başarılı yanıt
  } catch (error: any) {
    console.error("Sulama kaydı oluşturma hatası:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  } finally {
    await prisma.$disconnect();
  }
}
