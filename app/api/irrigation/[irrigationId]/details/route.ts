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
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === 'string') {
      return msg;
    }
  }
  return "Sulama kaydı güncellenirken bilinmeyen bir hata oluştu.";
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { irrigationId: string } }
) {
  try {
    const session = await getServerSideSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { irrigationId } = await params;
    if (!irrigationId) {
      return NextResponse.json({ error: "Sulama ID'si eksik." }, { status: 400 });
    }

    const requestData = await request.json();
    const {
      fieldIrrigations,
      ownerDurations,
      inventoryDeductions,
    }: {
      fieldIrrigations?: FieldIrrigationInput[];
      ownerDurations?: OwnerDurationInput[];
      inventoryDeductions?: InventoryDeductionInput[];
    } = requestData;

    const result = await prisma.$transaction(async (tx) => {
      // Sulama kaydının varlığını ve taslak durumunu kontrol et
      const irrigationLog = await tx.irrigationLog.findUnique({
        where: { id: irrigationId },
        select: { id: true, status: true },
      });

      if (!irrigationLog) {
        throw new Error("Sulama kaydı bulunamadı.");
      }
      if (irrigationLog.status !== "DRAFT") {
        throw new Error("Sadece taslak durumundaki sulama kayıtları güncellenebilir.");
      }

      // 1. Tarla bilgileri geldiyse, SADECE tarla bilgilerini güncelle
      if (fieldIrrigations && ownerDurations) {
        // Mevcut tarla ve sahip özetlerini sil
        await tx.irrigationOwnerSummary.deleteMany({ where: { irrigationLogId: irrigationId } });
        const existingFieldUsages = await tx.irrigationFieldUsage.findMany({ where: { irrigationLogId: irrigationId }, select: { id: true } });
        if (existingFieldUsages.length > 0) {
          await tx.irrigationOwnerUsage.deleteMany({ where: { irrigationFieldUsageId: { in: existingFieldUsages.map(fu => fu.id) } } });
        }
        await tx.irrigationFieldUsage.deleteMany({ where: { irrigationLogId: irrigationId } });

        // Yeni tarla bilgilerini ekle
        for (const fieldUsage of fieldIrrigations) {
          await tx.irrigationFieldUsage.create({
            data: {
              irrigationLogId: irrigationId,
              fieldId: fieldUsage.fieldId,
              percentage: fieldUsage.percentage,
            },
          });
        }
        for (const ownerSummary of ownerDurations) {
          await tx.irrigationOwnerSummary.create({
            data: {
              irrigationLogId: irrigationId,
              ownerId: ownerSummary.userId,
              totalAllocatedDuration: round(ownerSummary.duration),
              totalIrrigatedArea: round(ownerSummary.irrigatedArea ?? 0),
            },
          });
        }
      }

      // 2. Envanter bilgileri geldiyse, SADECE envanter bilgilerini güncelle
      if (inventoryDeductions) { // Boş dizi gelirse silme işlemi yapması için .length kontrolü kaldırıldı
        // Mevcut envanter kullanımlarını sil ve stokları geri al
        const existingInventoryUsages = await tx.irrigationInventoryUsage.findMany({
          where: { irrigationLogId: irrigationId },
          include: { ownerUsages: true }
        });

        for (const existingUsage of existingInventoryUsages) {
          // Genel stoğu geri al
          await tx.inventory.update({
            where: { id: existingUsage.inventoryId },
            data: { totalQuantity: { increment: round(existingUsage.quantity) } },
          });
          // Sahip stoğunu geri al
          for (const ownerUsage of existingUsage.ownerUsages) {
            const inventoryOwnership = await tx.inventoryOwnership.findFirst({
              where: { inventoryId: existingUsage.inventoryId, userId: ownerUsage.ownerId },
            });
            if (inventoryOwnership) {
              await tx.inventoryOwnership.update({
                where: { id: inventoryOwnership.id },
                data: { shareQuantity: { increment: round(ownerUsage.quantity) } },
              });
            }
          }
        }
        // İlişkili kayıtları ve ana kaydı sil
        const existingUsageIds = existingInventoryUsages.map(u => u.id);
        if (existingUsageIds.length > 0) {
            await tx.irrigationInventoryOwnerUsage.deleteMany({
                where: { irrigationInventoryUsageId: { in: existingUsageIds } },
            });
        }
        await tx.irrigationInventoryUsage.deleteMany({
          where: { irrigationLogId: irrigationId },
        });

        // Yeni envanterleri işlemeden önce birleştir
        const aggregatedDeductions: Record<string, { totalQuantity: number; unitPrice: number; owners: Record<string, number> }> = {};

        for (const deduction of inventoryDeductions) {
          const { inventoryId, quantityUsed, unitPrice, ownerId } = deduction;
          if (!aggregatedDeductions[inventoryId]) {
            aggregatedDeductions[inventoryId] = {
              totalQuantity: 0,
              unitPrice: unitPrice, // Fiyatın aynı olduğu varsayılır
              owners: {},
            };
          }
          aggregatedDeductions[inventoryId].totalQuantity += quantityUsed;
          if (!aggregatedDeductions[inventoryId].owners[ownerId]) {
            aggregatedDeductions[inventoryId].owners[ownerId] = 0;
          }
          aggregatedDeductions[inventoryId].owners[ownerId] += quantityUsed;
        }

        // Birleştirilmiş envanterleri ekle
        for (const inventoryId in aggregatedDeductions) {
          const { totalQuantity, unitPrice, owners } = aggregatedDeductions[inventoryId];

          if (isNaN(totalQuantity) || totalQuantity <= 0 || isNaN(unitPrice) || unitPrice < 0) {
            throw new Error(`Geçersiz miktar veya birim fiyat. Miktar: ${totalQuantity}, Fiyat: ${unitPrice}`);
          }

          const inventoryItem = await tx.inventory.findUnique({
            where: { id: inventoryId },
            select: { name: true, unit: true, totalQuantity: true },
          });
          if (!inventoryItem || inventoryItem.totalQuantity < totalQuantity) {
            throw new Error(`Genel ${inventoryItem?.name || inventoryId} stoğu yetersiz.`);
          }

          // Ana envanter kullanım kaydını oluştur
          const createdUsage = await tx.irrigationInventoryUsage.create({
            data: {
              irrigationLog: { connect: { id: irrigationId } },
              inventory: { connect: { id: inventoryId } },
              quantity: round(totalQuantity),
              unitPrice: round(unitPrice),
              totalCost: round(totalQuantity * unitPrice),
            },
          });

          // Genel stoktan düş
          await tx.inventory.update({
            where: { id: inventoryId },
            data: { totalQuantity: { decrement: round(totalQuantity) } },
          });

          // Sahip bazında kullanımları ve stokları işle
          for (const ownerId in owners) {
            const quantityUsedByOwner = owners[ownerId];
            const ownerInventory = await tx.inventoryOwnership.findFirst({
              where: { inventoryId: inventoryId, userId: ownerId },
              select: { id: true, shareQuantity: true, user: { select: { name: true } } },
            });

            if (!ownerInventory || ownerInventory.shareQuantity < quantityUsedByOwner) {
              throw new Error(`${ownerInventory?.user?.name || 'Bilinmeyen sahip'} için ${inventoryItem.name} stoğu yetersiz.`);
            }

            await tx.irrigationInventoryOwnerUsage.create({
              data: {
                irrigationInventoryUsageId: createdUsage.id,
                ownerId: ownerId,
                percentage: round((quantityUsedByOwner / totalQuantity) * 100),
                quantity: round(quantityUsedByOwner),
                cost: round(quantityUsedByOwner * unitPrice),
              },
            });

            await tx.inventoryOwnership.update({
              where: { id: ownerInventory.id },
              data: { shareQuantity: { decrement: round(quantityUsedByOwner) } },
            });
          }
        }
      }

      return { id: irrigationId }; // Başarılı yanıt
    },
    {
      timeout: 20000, // İşlem zaman aşımı 20 saniyeye çıkarıldı
    });

    return NextResponse.json({ data: result });
  } catch (caughtError: unknown) {
    console.error("Sulama detayları güncelleme hatası:", caughtError);
    const finalErrorMessage: string = getErrorMessage(caughtError);
    return NextResponse.json({ error: finalErrorMessage }, { status: 400 });
  } finally {
    await prisma.$disconnect();
  }
}
