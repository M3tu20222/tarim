import { type NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { getServerSideSession } from "@/lib/session";

const prisma = new PrismaClient();

// Helper function to round to 2 decimal places
const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

// Helper function to extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim() !== '') {
    return error;
  }
  // Check for object with a string message property
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === 'string') {
      return msg;
    }
  }
  return "Sulama kaydı oluşturulurken bilinmeyen bir hata oluştu.";
}

// Define interfaces for request data and nested types
interface FieldIrrigationInput {
  fieldId: string;
  percentage: number;
  wellId?: string;
  seasonId?: string;
}

interface OwnerDurationInput {
  userId: string;
  duration: number;
  irrigatedArea?: number;
  userName?: string;
}

interface InventoryDeductionInput {
  inventoryId: string;
  quantityUsed: number;
  unitPrice: number;
  ownerId: string;
}

// For the fieldUsageRecords map function, reflecting the actual return type from Prisma.create with specific includes
type IrrigationFieldUsageWithFieldAndOwners = Prisma.IrrigationFieldUsageGetPayload<{
  include: {
    field: {
      select: {
        id: true;
        name: true;
        owners: {
          select: {
            userId: true;
          };
        };
      };
    };
  };
}>;

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
    const createdBy = searchParams.get("createdBy"); // Yeni filtre: Oluşturan kullanıcı ID'si

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
    // Oluşturan kullanıcıya göre filtreleme
    if (createdBy) {
      where.createdBy = createdBy;
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
    const requestData = await request.json();

    const {
      startDateTime,
      duration,
      notes,
      wellId: directWellId, // Form'dan doğrudan gelen wellId
      fieldIrrigations,
      ownerDurations,
      inventoryDeductions, // inventoryUsages yerine
      costAllocations,   // Yeni eklendi, şimdilik loglama/raporlama için
    }: {
      startDateTime: string;
      duration: number;
      notes?: string;
      wellId?: string;
      fieldIrrigations: FieldIrrigationInput[];
      ownerDurations: OwnerDurationInput[];
      inventoryDeductions?: InventoryDeductionInput[];
      costAllocations?: any[];
    } = requestData;

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

    // Toplam sulanan alanı hesapla (Raporlama ve bazı dağıtımlar için gerekli olabilir)
    const totalIrrigatedAreaForLog = ownerDurations.reduce(
      (sum: number, owner: OwnerDurationInput) => sum + (owner.irrigatedArea ?? 0), // Use nullish coalescing
      0
    );
    // totalIrrigatedAreaForLog sıfır olabilir, bu bir hata değil, sadece envanter dağıtımı yapılmaz.

    // Kuyu ID'sini belirle - önce doğrudan gelen wellId'yi kontrol et, yoksa fieldIrrigations'dan al
    const primaryFieldUsage = fieldIrrigations[0];
    const fieldWellId = primaryFieldUsage?.wellId; // Tarla üzerinden gelen kuyu ID'si
    const seasonId = primaryFieldUsage?.seasonId; // Sezon ID'si

    // Öncelikle doğrudan gelen wellId'yi kullan, yoksa fieldIrrigations'dan gelen wellId'yi kullan
    const wellId = directWellId || fieldWellId;

    // wellId belirlendi. Schema'da wellId zorunlu olduğu için kontrol ekle
    if (!wellId) {
      return NextResponse.json({ error: "Kuyu bilgisi eksik. Lütfen sulama yapılacak tarlaların en az birinin bir kuyuya bağlı olması gerekir." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const irrigationLog = await tx.irrigationLog.create({
        data: {
          startDateTime: new Date(startDateTime),
          duration,
          notes,
          status: "COMPLETED",
          wellId: wellId, // wellId artık null olamaz
          seasonId: seasonId || null,
          createdBy: session.id,
        },
      });

      // Field usages are now created in the field names collection part below

      for (const ownerSummary of ownerDurations) {
        await tx.irrigationOwnerSummary.create({
          data: {
            irrigationLogId: irrigationLog.id,
            ownerId: ownerSummary.userId,
            totalAllocatedDuration: round(ownerSummary.duration),
            totalIrrigatedArea: round(ownerSummary.irrigatedArea ?? 0), // Use nullish coalescing
          },
        });
      }

      // Envanter kullanımlarını işle (inventoryDeductions üzerinden)
      if (inventoryDeductions && inventoryDeductions.length > 0) {
        for (const deduction of inventoryDeductions) {
          const { inventoryId, quantityUsed, unitPrice, ownerId: deductionOwnerId } = deduction;

          // Stok kontrolleri
          const inventoryItem = await tx.inventory.findUnique({
            where: { id: inventoryId },
            select: { name: true, unit: true, totalQuantity: true },
          });
          if (!inventoryItem || inventoryItem.totalQuantity < quantityUsed) {
            throw new Error(
              `Genel ${inventoryItem?.name || inventoryId} stoğu yetersiz. İhtiyaç: ${round(quantityUsed)} ${inventoryItem?.unit || ''}, Mevcut: ${round(inventoryItem?.totalQuantity ?? 0)} ${inventoryItem?.unit || ''}`
            );
          }

          const ownerInventory = await tx.inventoryOwnership.findFirst({
            where: { inventoryId: inventoryId, userId: deductionOwnerId },
            select: { id: true, shareQuantity: true, user: { select: { name: true } } },
          });
          const ownerNameForError = ownerInventory?.user?.name || ownerDurations.find((o: OwnerDurationInput) => o.userId === deductionOwnerId)?.userName || `Sahip ID: ${deductionOwnerId}`;

          if (!ownerInventory) {
            // Bu sahip bu envantere sahip değil, diğer sahipleri kontrol et
            const allOwnerships = await tx.inventoryOwnership.findMany({
              where: { inventoryId: inventoryId },
              select: {
                id: true,
                shareQuantity: true,
                userId: true,
                user: { select: { name: true } }
              },
            });

            const availableOwners = allOwnerships
              .filter(ownership => ownership.shareQuantity >= quantityUsed)
              .map(ownership => `${ownership.user?.name || ownership.userId} (${round(ownership.shareQuantity)} ${inventoryItem.unit})`)
              .join(', ');

            const totalStock = allOwnerships.reduce((sum, ownership) => sum + ownership.shareQuantity, 0);

            throw new Error(
              `${ownerNameForError} adlı sahip ${inventoryItem.name} envanterine sahip değil. ` +
              `Toplam stok: ${round(totalStock)} ${inventoryItem.unit}. ` +
              `${availableOwners ? `Yeterli stoğa sahip sahipler: ${availableOwners}` : 'Hiçbir sahip yeterli stoğa sahip değil.'}`
            );
          }

          if (ownerInventory.shareQuantity < quantityUsed) {
            throw new Error(
              `${ownerNameForError} adlı sahip için ${inventoryItem.name} stoğu yetersiz. İhtiyaç: ${round(quantityUsed)} ${inventoryItem.unit}, Mevcut: ${round(ownerInventory.shareQuantity)} ${inventoryItem.unit}`
            );
          }

          // 1. IrrigationInventoryUsage (Her bir direkt stok düşümü için)
          const createdIrrigationInventoryUsage = await tx.irrigationInventoryUsage.create({
            data: {
              irrigationLogId: irrigationLog.id,
              inventoryId: inventoryId,
              quantity: round(quantityUsed),
              unitPrice: round(unitPrice),
              totalCost: round(quantityUsed * unitPrice),
            },
          });

          // 2. IrrigationInventoryOwnerUsage (Bu direkt düşümün sahibini belirtir)
          await tx.irrigationInventoryOwnerUsage.create({
            data: {
              irrigationInventoryUsageId: createdIrrigationInventoryUsage.id,
              ownerId: deductionOwnerId,
              percentage: 100, // Bu spesifik kullanımın %100'ü bu sahibe ait
              quantity: round(quantityUsed),
              cost: round(quantityUsed * unitPrice),
            },
          });

          // 3. Inventory (Toplam Stok Güncelleme)
          await tx.inventory.update({
            where: { id: inventoryId },
            data: { totalQuantity: { decrement: round(quantityUsed) } },
          });

          // 4. InventoryOwnership (Sahip Stoğu Güncelleme)
          await tx.inventoryOwnership.update({
            where: { id: ownerInventory.id },
            data: { shareQuantity: { decrement: round(quantityUsed) } },
          });

          // 5. InventoryTransaction
          await tx.inventoryTransaction.create({
            data: {
              inventoryId: inventoryId,
              type: "USAGE",
              quantity: -round(quantityUsed),
              date: new Date(startDateTime),
              notes: `Sulama kaydı #${irrigationLog.id} için ${ownerNameForError} stoğundan kullanıldı.`,
              userId: session.id,
            },
          });
        }
      }
      // costAllocations verisi, eğer saklanması gerekiyorsa, burada ayrı bir mantıkla işlenebilir.
      // Şimdilik sadece stok düşümlerini işliyoruz.

      // Bildirimleri Oluştur
      const createdByUser = await tx.user.findUnique({ where: { id: session.id } });
      const well = irrigationLog.wellId ? await tx.well.findUnique({ where: { id: irrigationLog.wellId } }) : null;

      // Tarla isimlerini topla
      const ownerFieldNames: Record<string, string[]> = {};

      // Önce tüm tarla kullanımlarını oluştur ve kaydet
      const fieldUsageRecords: IrrigationFieldUsageWithFieldAndOwners[] = await Promise.all(fieldIrrigations.map(async (fieldUsage: FieldIrrigationInput) => {
        const usage = await tx.irrigationFieldUsage.create({
          data: {
            irrigationLogId: irrigationLog.id,
            fieldId: fieldUsage.fieldId,
            percentage: fieldUsage.percentage,
          },
          include: {
            field: {
              select: {
                id: true,
                name: true,
                owners: {
                  select: {
                    userId: true
                  }
                }
              }
            }
          }
        });
        return usage; // No need for 'as' cast here, type is inferred correctly
      }));

      // Şimdi tarla kullanımlarından tarla isimlerini topla
      for (const usage of fieldUsageRecords) {
        if (usage.field && usage.field.owners) {
          for (const owner of usage.field.owners) {
            if (!ownerFieldNames[owner.userId]) {
              ownerFieldNames[owner.userId] = [];
            }
            if (!ownerFieldNames[owner.userId].includes(usage.field.name)) {
              ownerFieldNames[owner.userId].push(usage.field.name);
            }
          }
        }
      }

      const uniqueOwnerIds = [...new Set(ownerDurations.map((os: OwnerDurationInput) => os.userId))];
      for (const ownerId of uniqueOwnerIds) {
        if (ownerId !== session.id) {
          // Tarla isimlerini al veya varsayılan mesaj kullan
          const fieldNames = ownerFieldNames[ownerId] || [];
          const fieldNamesText = fieldNames.length > 0
            ? fieldNames.map(name => `<span class="neon-text-green">${name}</span>`).join(', ')
            : "tarlanız/tarlalarınız";

          // Get the field IDs for this owner
          const ownerFieldIds = fieldUsageRecords
            .filter(usage => usage.field?.owners?.some(owner => owner.userId === ownerId))
            .map(usage => usage.field?.id)
            .filter(Boolean);

          // Use the first field ID for the notification (if available)
          const primaryFieldId = ownerFieldIds.length > 0 ? ownerFieldIds[0] : null;

          await tx.notification.create({
            data: {
              title: "Tarlanızda Sulama Yapıldı",
              message: `${well?.name || (wellId ? `Kuyu (ID: ${wellId})` : 'Bilinmeyen Kuyu')}'dan ${fieldNamesText} için ${irrigationLog.duration} dakika sulama yapıldı.`,
              type: "IRRIGATION_COMPLETED",
              receiverId: ownerId as string, // Type assertion eklendi
              senderId: session.id as string, // Type assertion eklendi
              irrigationId: irrigationLog.id,
              fieldId: primaryFieldId, // Add the field ID to the notification
              link: `/dashboard/owner/irrigation/${irrigationLog.id}`, // Veya ilgili tarla/kuyu linki
              priority: "NORMAL",
            },
          });
        }
      }

      // 2. Yöneticilere (ADMIN) Bildirim
      const admins = await tx.user.findMany({ where: { role: "ADMIN" } });

      // Tüm tarla isimlerini topla
      const allFieldNames = fieldUsageRecords
        .map(usage => usage.field?.name)
        .filter(Boolean) as string[];

      // Tarla isimlerini neon yeşil yap
      const allFieldNamesText = allFieldNames.length > 0
        ? allFieldNames.map(name => `<span class="neon-text-green">${name}</span>`).join(', ')
        : "bilinmeyen tarlalar";

      for (const admin of admins) {
        if (admin.id !== session.id) { // Kaydı oluşturan admin ise tekrar bildirim gitmesin
          // Use the first field ID for the admin notification (if available)
          const primaryFieldId = fieldUsageRecords.length > 0 && fieldUsageRecords[0].field ?
            fieldUsageRecords[0].field.id : null;

          await tx.notification.create({
            data: {
              title: "Yeni Sulama Kaydı Oluşturuldu",
              message: `${well?.name || 'Bilinmeyen Kuyu'}'dan ${allFieldNamesText} için ${irrigationLog.duration} dakika süren yeni bir sulama kaydı (${createdByUser?.name || 'bir kullanıcı'} tarafından) oluşturuldu.`,
              type: "IRRIGATION_COMPLETED",
              receiverId: admin.id as string, // Type assertion eklendi
              senderId: session.id as string, // Type assertion eklendi
              irrigationId: irrigationLog.id,
              fieldId: primaryFieldId, // Add the field ID to the notification
              link: `/dashboard/admin/irrigation/${irrigationLog.id}`, // Admin için farklı bir link olabilir
              priority: "NORMAL",
            },
          });
        }
      }

      return irrigationLog; // Transaction'dan sonucu döndür
    },
    {
      timeout: 15000, // İşlem zaman aşımı 15 saniyeye çıkarıldı (varsayılan 5sn)
    }); // Transaction sonu

    return NextResponse.json({ data: result }); // Başarılı yanıt
  } catch (caughtError: unknown) {
    console.error("Sulama kaydı oluşturma hatası:", caughtError);
    const finalErrorMessage: string = getErrorMessage(caughtError);
    // Construct the response object with explicit typing for the object itself
    const errorResponsePayload: { error: string } = { error: finalErrorMessage };
    return NextResponse.json(errorResponsePayload, { status: 400 });
  } finally {
    await prisma.$disconnect();
  }
}
