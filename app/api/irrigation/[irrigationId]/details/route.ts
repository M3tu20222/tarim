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

    const irrigationId = params.irrigationId;
    if (!irrigationId) {
      return NextResponse.json({ error: "Sulama ID'si eksik." }, { status: 400 });
    }

    const requestData = await request.json();
    const {
      fieldIrrigations,
      ownerDurations,
      inventoryDeductions,
      costAllocations,
    }: {
      fieldIrrigations?: FieldIrrigationInput[];
      ownerDurations?: OwnerDurationInput[];
      inventoryDeductions?: InventoryDeductionInput[];
      costAllocations?: any[];
    } = requestData;

    const result = await prisma.$transaction(async (tx) => {
      // Sulama kaydının varlığını ve taslak durumunu kontrol et
      const irrigationLog = await tx.irrigationLog.findUnique({
        where: { id: irrigationId },
        select: { id: true, status: true, wellId: true, seasonId: true, createdBy: true },
      });

      if (!irrigationLog) {
        throw new Error("Sulama kaydı bulunamadı.");
      }
      if (irrigationLog.status !== "DRAFT") {
        throw new Error("Sadece taslak durumundaki sulama kayıtları güncellenebilir.");
      }

      // Field Usages işlemleri
      if (fieldIrrigations && fieldIrrigations.length > 0) {
        // Mevcut field usages'ları sil
        await tx.irrigationFieldUsage.deleteMany({
          where: { irrigationLogId: irrigationId },
        });
        // Yeni field usages'ları oluştur
        const fieldUsageRecords: IrrigationFieldUsageWithFieldAndOwners[] = await Promise.all(fieldIrrigations.map(async (fieldUsage: FieldIrrigationInput) => {
          const usage = await tx.irrigationFieldUsage.create({
            data: {
              irrigationLogId: irrigationId,
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
          return usage;
        }));

        // Owner Summaries'i güncelle (fieldIrrigations'a göre)
        if (ownerDurations && ownerDurations.length > 0) {
          await tx.irrigationOwnerSummary.deleteMany({
            where: { irrigationLogId: irrigationId },
          });
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
      }

      // Envanter kullanımlarını işle (inventoryDeductions üzerinden)
      if (inventoryDeductions && inventoryDeductions.length > 0) {
        // Mevcut envanter kullanımlarını sil (ve stokları geri al)
        const existingInventoryUsages = await tx.irrigationInventoryUsage.findMany({
          where: { irrigationLogId: irrigationId },
          include: {
            ownerUsages: true,
            inventory: { select: { id: true, totalQuantity: true } }
          }
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
          // İşlem kaydını sil
          await tx.inventoryTransaction.deleteMany({
            where: {
              inventoryId: existingUsage.inventoryId,
              notes: { contains: `Sulama kaydı #${irrigationId}` } // Belirli bir not ile eşleşenleri sil
            }
          });
        }
        await tx.irrigationInventoryUsage.deleteMany({
          where: { irrigationLogId: irrigationId },
        });
        await tx.irrigationInventoryOwnerUsage.deleteMany({
          where: { irrigationInventoryUsage: { irrigationLogId: irrigationId } },
        });


        for (const deduction of inventoryDeductions) {
          const { inventoryId, quantityUsed, unitPrice, ownerId: deductionOwnerId } = deduction;

          // Stok kontrolleri (tekrar)
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
          const ownerNameForError = ownerInventory?.user?.name || `Sahip ID: ${deductionOwnerId}`;

          if (!ownerInventory || ownerInventory.shareQuantity < quantityUsed) {
            throw new Error(
              `${ownerNameForError} adlı sahip için ${inventoryItem.name} stoğu yetersiz. İhtiyaç: ${round(quantityUsed)} ${inventoryItem.unit}, Mevcut: ${round(ownerInventory?.shareQuantity ?? 0)} ${inventoryItem.unit}`
            );
          }

          // 1. IrrigationInventoryUsage
          const createdIrrigationInventoryUsage = await tx.irrigationInventoryUsage.create({
            data: {
              irrigationLogId: irrigationId,
              inventoryId: inventoryId,
              quantity: round(quantityUsed),
              unitPrice: round(unitPrice),
              totalCost: round(quantityUsed * unitPrice),
            },
          });

          // 2. IrrigationInventoryOwnerUsage
          await tx.irrigationInventoryOwnerUsage.create({
            data: {
              irrigationInventoryUsageId: createdIrrigationInventoryUsage.id,
              ownerId: deductionOwnerId,
              percentage: 100,
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
              date: new Date(), // Güncel tarih
              notes: `Sulama kaydı #${irrigationId} için ${ownerNameForError} stoğundan kullanıldı.`,
              userId: session.id,
            },
          });
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
