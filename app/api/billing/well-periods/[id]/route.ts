import { type NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSideSession } from "@/lib/session"; // Updated import

const prisma = new PrismaClient();

// Belirli bir kuyu fatura dönemini getir
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

    const wellBillingPeriod = await prisma.wellBillingPeriod.findUnique({
      where: { id },
      include: {
        well: true,
        irrigationUsages: {
          include: {
            irrigationLog: {
              include: {
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
              },
            },
          },
        },
      },
    });

    if (!wellBillingPeriod) {
      return NextResponse.json(
        { error: "Well billing period not found" },
        { status: 404 }
      );
    }

    // Sahip bazlı maliyet dağılımını hesapla
    const ownerCosts: Record<
      string,
      { ownerId: string; name: string; email: string; amount: number }
    > = {};

    for (const usage of wellBillingPeriod.irrigationUsages) {
      for (const fieldUsage of usage.irrigationLog.fieldUsages) {
        for (const ownerUsage of fieldUsage.ownerUsages) {
          const ownerPercentage =
            (ownerUsage.usagePercentage * usage.percentage) / 100;
          const ownerAmount = (usage.amount * ownerPercentage) / 100;

          if (ownerCosts[ownerUsage.ownerId]) {
            ownerCosts[ownerUsage.ownerId].amount += ownerAmount;
          } else {
            ownerCosts[ownerUsage.ownerId] = {
              ownerId: ownerUsage.ownerId,
              name: ownerUsage.owner.name,
              email: ownerUsage.owner.email,
              amount: ownerAmount,
            };
          }
        }
      }
    }

    // İki ondalık basamağa yuvarla
    for (const key in ownerCosts) {
      ownerCosts[key].amount = Math.round(ownerCosts[key].amount * 100) / 100;
    }

    return NextResponse.json({
      data: wellBillingPeriod,
      ownerCosts: Object.values(ownerCosts),
    });
  } catch (error) {
    console.error("Error fetching well billing period:", error);
    return NextResponse.json(
      { error: "Failed to fetch well billing period" },
      { status: 500 }
    );
  }
}

// Kuyu fatura dönemini güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSideSession(); // Use custom session function
    if (!session || !session.id) { // Check for session.id instead of session.user
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;
    const data = await request.json();
    const { wellId, startDate, endDate, totalAmount, totalUsage, status } =
      data;

    // Veri doğrulama
    if (!wellId || !startDate || !endDate || !totalAmount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Transaction ile tüm işlemleri gerçekleştir
    const result = await prisma.$transaction(async (tx) => {
      // 1. Kuyu fatura dönemini güncelle
      const wellBillingPeriod = await tx.wellBillingPeriod.update({
        where: { id },
        data: {
          wellId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          totalAmount,
          totalUsage,
          status,
        },
      });

      // 2. Mevcut fatura kullanımlarını sil
      await tx.wellBillingIrrigationUsage.deleteMany({
        where: { wellBillingPeriodId: id },
      });

      // 3. Dönem içindeki sulama kayıtlarını bul
      const irrigationLogs = await tx.irrigationLog.findMany({
        where: {
          wellId,
          startDateTime: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      });

      // 4. Toplam süreyi hesapla
      const totalDuration = irrigationLogs.reduce(
        (sum, log) => sum + log.duration,
        0
      );

      // 5. Her sulama kaydı için fatura kullanımı oluştur
      for (const log of irrigationLogs) {
        const percentage =
          totalDuration > 0 ? (log.duration / totalDuration) * 100 : 0;
        const amount = (totalAmount * percentage) / 100;

        await tx.wellBillingIrrigationUsage.create({
          data: {
            wellBillingPeriodId: wellBillingPeriod.id,
            irrigationLogId: log.id,
            duration: log.duration,
            percentage,
            amount,
          },
        });
      }

      return wellBillingPeriod;
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Error updating well billing period:", error);
    return NextResponse.json(
      { error: "Failed to update well billing period" },
      { status: 500 }
    );
  }
}

// Kuyu fatura dönemini sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSideSession(); // Use custom session function
    if (!session || !session.id) { // Check for session.id instead of session.user
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;

    // Transaction ile tüm ilişkili kayıtları sil
    await prisma.$transaction(async (tx) => {
      // 1. Fatura kullanımlarını sil
      await tx.wellBillingIrrigationUsage.deleteMany({
        where: { wellBillingPeriodId: id },
      });

      // 2. Kuyu fatura dönemini sil
      await tx.wellBillingPeriod.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting well billing period:", error);
    return NextResponse.json(
      { error: "Failed to delete well billing period" },
      { status: 500 }
    );
  }
}
