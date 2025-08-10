import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSideSession } from "@/lib/session";
import { addMinutes, max as dateMax, min as dateMin } from "date-fns";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSideSession();
    if (!session?.id || !session.role) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    if (session.role !== "ADMIN" && session.role !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const periodId = params.id;
    const body = await request.json();
    const { totalAmount } = body;

    if (!totalAmount || typeof totalAmount !== "number" || totalAmount <= 0) {
      return NextResponse.json(
        { error: "Geçerli bir toplam tutar girilmelidir" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Ön Kontroller
        const period = await tx.wellBillingPeriod.findUnique({
          where: { id: periodId },
        });

        if (!period) {
          throw new Error("Fatura dönemi bulunamadı");
        }
        if (period.status === "DISTRIBUTED" || period.status === "PAID") {
          throw new Error("Bu fatura dönemi için dağıtım zaten yapılmış");
        }

        const season = await tx.season.findFirst({
          where: {
            startDate: { lte: period.startDate },
            endDate: { gte: period.endDate },
          },
        });
        if (!season) {
          throw new Error("Fatura dönemi için uygun bir sezon bulunamadı.");
        }

        // 2. Veri Toplama ve Ağırlık Hesaplama
        const fieldDetails = new Map<string, { weight: number; duration: number }>();
        const irrigationLogs = await tx.irrigationLog.findMany({
          where: {
            wellId: period.wellId,
            // Kaba filtreleme: Bitiş tarihinden önce başlayanları ve
            // başlangıç tarihinden sonra bitenleri (yaklaşık olarak) al.
            // Kesin hesaplama döngü içinde yapılacak.
            startDateTime: { lte: period.endDate },
          },
          include: { fieldUsages: true },
        });

        for (const log of irrigationLogs) {
          const logEnd = addMinutes(log.startDateTime, log.duration);
          const overlapStart = dateMax([log.startDateTime, period.startDate]);
          const overlapEnd = dateMin([logEnd, period.endDate]);
          const overlapMinutes =
            (overlapEnd.getTime() - overlapStart.getTime()) / 60000;

          if (overlapMinutes <= 0) continue;

          const totalPercentage = log.fieldUsages.reduce(
            (sum, u) => sum + u.percentage,
            0
          );

          if (totalPercentage <= 0) continue;

          for (const usage of log.fieldUsages) {
            const normalizedPercentage = usage.percentage / totalPercentage;
            const fieldWeight = overlapMinutes * normalizedPercentage;
            
            const current = fieldDetails.get(usage.fieldId) || {
              weight: 0,
              duration: 0,
            };
            fieldDetails.set(usage.fieldId, {
              weight: current.weight + fieldWeight,
              duration: current.duration + fieldWeight,
            });
          }
        }

        const totalWeight = Array.from(fieldDetails.values()).reduce(
          (s, v) => s + v.weight,
          0
        );

        if (totalWeight === 0) {
          throw new Error(
            "Belirtilen dönemde faturalandırılacak sulama kaydı bulunamadı."
          );
        }

        // 3. Tarla ve Sahip Bazında Dağıtım ve Kayıt Hazırlığı
        const fieldExpenseCreates: any[] = [];
        const ownerDebts = new Map<string, number>();
        const ownerDistributionDetails = new Map<string, any[]>();

        for (const [fieldId, details] of fieldDetails.entries()) {
          const fieldAmount = (totalAmount * details.weight) / totalWeight;

          fieldExpenseCreates.push({
            fieldId,
            seasonId: season.id,
            totalCost: parseFloat(fieldAmount.toFixed(2)),
            description: `Kuyu Faturası - ${period.startDate.toLocaleDateString()}`,
            expenseDate: period.endDate,
            sourceType: "WELL_BILL",
            sourceId: period.id,
          });

          const ownerships = await tx.fieldOwnership.findMany({
            where: { fieldId },
          });
          if (ownerships.length === 0) continue;

          for (const ownership of ownerships) {
            const ownerAmount = fieldAmount * (ownership.percentage / 100);
            ownerDebts.set(
              ownership.userId,
              (ownerDebts.get(ownership.userId) || 0) + ownerAmount
            );

            const distributionDetail = {
              wellBillingPeriodId: period.id,
              fieldId: fieldId,
              ownerId: ownership.userId,
              amount: parseFloat(ownerAmount.toFixed(2)),
              basisDuration:
                details.duration * (ownership.percentage / 100),
              basisWeight: details.weight * (ownership.percentage / 100),
              sharePercentage: (ownerAmount / totalAmount) * 100,
            };

            if (!ownerDistributionDetails.has(ownership.userId)) {
              ownerDistributionDetails.set(ownership.userId, []);
            }
            ownerDistributionDetails
              .get(ownership.userId)!
              .push(distributionDetail);
          }
        }

        // 4. Veritabanı İşlemleri
        await tx.fieldExpense.createMany({ data: fieldExpenseCreates });

        const finalDistributionCreates: any[] = [];
        for (const [ownerId, totalDebtAmount] of ownerDebts.entries()) {
          const finalAmount = parseFloat(totalDebtAmount.toFixed(2));
          if (finalAmount <= 0) continue;

          const debt = await tx.debt.create({
            data: {
              debtorId: ownerId,
              creditorId: session.id,
              amount: finalAmount,
              dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
              status: "PENDING",
              reason: "WELL_BILLING",
              description: `Kuyu Faturası Borcu: ${period.startDate.toLocaleDateString()} - ${period.endDate.toLocaleDateString()}`,
            },
          });

          const distributionsForOwner =
            ownerDistributionDetails.get(ownerId) || [];
          const updatedDistributions = distributionsForOwner.map((d) => ({
            ...d,
            debtId: debt.id,
          }));
          finalDistributionCreates.push(...updatedDistributions);
        }

        if (finalDistributionCreates.length > 0) {
          await tx.wellBillDistribution.createMany({
            data: finalDistributionCreates,
          });
        }

        // 5. Ana Kaydı Güncelle
        const updatedPeriod = await tx.wellBillingPeriod.update({
          where: { id: periodId },
          data: {
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            status: "DISTRIBUTED",
          },
        });

        return { updatedPeriod, count: finalDistributionCreates.length };
      },
      {
        timeout: 20000, // Zaman aşımını 20 saniyeye çıkar
      }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error distributing well bill:", error);
    return NextResponse.json(
      { error: error.message || "Fatura dağıtılırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
