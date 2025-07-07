import { type NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSideSession } from "@/lib/session";

const prisma = new PrismaClient();

// Belirli bir sulama kaydını getir
export async function GET(
  request: NextRequest,
  { params }: { params: { irrigationId: string } }
) {
  try {
    const session = await getServerSideSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { irrigationId } = params;

    const irrigationLog = await prisma.irrigationLog.findUnique({
      where: { id: irrigationId },
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

// Sulama kaydını güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: { irrigationId: string } }
) {
  try {
    const session = await getServerSideSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { irrigationId } = params;
    const data = await request.json();
    const {
      startDateTime,
      duration,
      notes,
      fieldIrrigations = [],
      ownerDurations = [],
      inventoryDeductions = [],
      status,
    } = data;

    if (!startDateTime || !duration || !fieldIrrigations || fieldIrrigations.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const primaryFieldUsage = fieldIrrigations[0];
    const wellId = primaryFieldUsage?.wellId;
    const seasonId = primaryFieldUsage?.seasonId;

    if (!wellId || !seasonId) {
      return NextResponse.json(
        { error: "Could not determine wellId or seasonId" },
        { status: 400 }
      );
    }

    const updatedIrrigationLog = await prisma.$transaction(async (tx) => {
      const existingInventoryUsages = await tx.irrigationInventoryUsage.findMany({
        where: { irrigationLogId: irrigationId },
        select: { id: true, inventoryId: true, quantity: true },
      });

      if (existingInventoryUsages.length > 0) {
        for (const usage of existingInventoryUsages) {
          await tx.inventory.update({
            where: { id: usage.inventoryId },
            data: { totalQuantity: { increment: usage.quantity } },
          });
        }

        const existingInventoryUsageIds = existingInventoryUsages.map(
          (usage) => usage.id
        );
        await tx.irrigationInventoryOwnerUsage.deleteMany({
          where: { irrigationInventoryUsageId: { in: existingInventoryUsageIds } },
        });

        await tx.irrigationInventoryUsage.deleteMany({
          where: { irrigationLogId: irrigationId },
        });
      }

      const existingFieldUsages = await tx.irrigationFieldUsage.findMany({
        where: { irrigationLogId: irrigationId },
        select: { id: true },
      });
      const existingFieldUsageIds = existingFieldUsages.map((usage) => usage.id);
      if (existingFieldUsageIds.length > 0) {
        await tx.irrigationOwnerUsage.deleteMany({
          where: { irrigationFieldUsageId: { in: existingFieldUsageIds } },
        });
      }

      await tx.irrigationFieldUsage.deleteMany({
        where: { irrigationLogId: irrigationId },
      });

      const updatedLog = await tx.irrigationLog.update({
        where: { id: irrigationId },
        data: {
          startDateTime: new Date(startDateTime),
          duration,
          wellId,
          notes,
          status,
          seasonId,
          updatedAt: new Date(),
        },
      });

      for (const fieldUsageData of fieldIrrigations) {
        await tx.irrigationFieldUsage.create({
          data: {
            irrigationLogId: updatedLog.id,
            fieldId: fieldUsageData.fieldId,
            percentage: fieldUsageData.percentage,
            ownerUsages: {
              create: ownerDurations
                .filter((od: { userId: string }) =>
                  fieldUsageData.owners?.some((owner: { userId: string }) => owner.userId === od.userId)
                )
                .map((od: { userId: string, duration: number, irrigatedArea: number }) => ({
                  ownerId: od.userId,
                  duration: od.duration,
                  irrigatedArea: od.irrigatedArea,
                })),
            },
          },
        });
      }

      if (inventoryDeductions && inventoryDeductions.length > 0) {
        for (const deduction of inventoryDeductions) {
          const createdInvUsage = await tx.irrigationInventoryUsage.create({
            data: {
              irrigationLog: { connect: { id: updatedLog.id } },
              inventory: { connect: { id: deduction.inventoryId } },
              quantity: Number(deduction.quantityUsed) || 0,
              unitPrice: Number(deduction.unitPrice) || 0,
              totalCost:
                (Number(deduction.quantityUsed) || 0) *
                (Number(deduction.unitPrice) || 0),
            },
          });

          for (const ownerUsage of deduction.ownerUsages) {
            await tx.irrigationInventoryOwnerUsage.create({
              data: {
                irrigationInventoryUsageId: createdInvUsage.id,
                ownerId: ownerUsage.userId,
                percentage: ownerUsage.percentage,
                quantity: ownerUsage.quantity,
                cost: ownerUsage.cost,
              },
            });
          }
        }
      }

      for (const ownerData of ownerDurations) {
        await tx.irrigationOwnerSummary.upsert({
          where: {
            irrigationLogId_ownerId: {
              irrigationLogId: updatedLog.id,
              ownerId: ownerData.userId,
            },
          },
          update: {
            totalIrrigatedArea: ownerData.irrigatedArea,
            totalAllocatedDuration: ownerData.duration,
          },
          create: {
            irrigationLogId: updatedLog.id,
            ownerId: ownerData.userId,
            totalIrrigatedArea: ownerData.irrigatedArea,
            totalAllocatedDuration: ownerData.duration,
          },
        });
      }

      return updatedLog;
    });

    return NextResponse.json({ data: { id: updatedIrrigationLog.id } });
  } catch (error) {
    console.error("Error updating irrigation log:", error);
    return NextResponse.json(
      { error: "Failed to update irrigation log" },
      { status: 500 }
    );
  }
}

// Sulama kaydını sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { irrigationId: string } }
) {
  try {
    const session = await getServerSideSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { irrigationId } = params;
    if (!irrigationId) {
      return NextResponse.json({ error: "Sulama ID'si eksik." }, { status: 400 });
    }

    try {
      await prisma.$transaction(async (tx) => {
        const inventoryUsagesToDelete = await tx.irrigationInventoryUsage.findMany({
          where: { irrigationLogId: irrigationId },
          select: { id: true, inventoryId: true, quantity: true },
        });
        const inventoryUsageIdsToDelete = inventoryUsagesToDelete.map(
          (usage) => usage.id
        );

        const fieldUsagesToDelete = await tx.irrigationFieldUsage.findMany({
          where: { irrigationLogId: irrigationId },
          select: { id: true },
        });
        const fieldUsageIdsToDelete = fieldUsagesToDelete.map((usage) => usage.id);

        for (const usage of inventoryUsagesToDelete) {
          await tx.inventory.update({
            where: { id: usage.inventoryId },
            data: { totalQuantity: { increment: usage.quantity } },
          });

          const ownerUsages = await tx.irrigationInventoryOwnerUsage.findMany({
            where: { irrigationInventoryUsageId: usage.id },
            select: { ownerId: true, quantity: true },
          });

          for (const ownerUsage of ownerUsages) {
            await tx.inventoryOwnership.updateMany({
              where: {
                inventoryId: usage.inventoryId,
                userId: ownerUsage.ownerId,
              },
              data: { shareQuantity: { increment: ownerUsage.quantity } },
            });
          }

          await tx.inventoryTransaction.deleteMany({
            where: {
              inventoryId: usage.inventoryId,
              notes: { contains: `Sulama kaydı #${irrigationId}` },
            },
          });
        }

        if (inventoryUsageIdsToDelete.length > 0) {
          await tx.irrigationInventoryOwnerUsage.deleteMany({
            where: { irrigationInventoryUsageId: { in: inventoryUsageIdsToDelete } },
          });
        }
        await tx.irrigationInventoryUsage.deleteMany({
          where: { irrigationLogId: irrigationId },
        });

        if (fieldUsageIdsToDelete.length > 0) {
          await tx.irrigationOwnerUsage.deleteMany({
            where: { irrigationFieldUsageId: { in: fieldUsageIdsToDelete } },
          });
        }
        await tx.irrigationFieldUsage.deleteMany({
          where: { irrigationLogId: irrigationId },
        });

        await tx.wellBillingIrrigationUsage.deleteMany({
          where: { irrigationLogId: irrigationId },
        });

        await tx.irrigationOwnerSummary.deleteMany({
          where: { irrigationLogId: irrigationId },
        });

        await tx.irrigationLog.delete({
          where: { id: irrigationId },
        });
      }, {
        maxWait: 15000, // 15 seconds
        timeout: 30000, // 30 seconds
      });
    } catch (transactionError) {
      console.error("Transaction failed:", transactionError);
      return NextResponse.json(
        { error: "Transaction failed during deletion." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sulama kaydı silme hatası:", error);
    return NextResponse.json(
      { error: "Sulama kaydı silinirken bir hata oluştu." },
      { status: 500 }
    );
  }
}