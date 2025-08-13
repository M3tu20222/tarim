import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addMinutes, max as dateMax, min as dateMin } from 'date-fns';

// Belirli bir fatura dönemini dağıt
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
      return NextResponse.json(
        { error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

    const { id: billingPeriodId } = await params;
    const { totalAmount, invoiceNumber, invoiceDate } = await request.json();

    if (totalAmount === undefined) {
      return NextResponse.json(
        { error: 'Toplam tutar zorunludur' },
        { status: 400 }
      );
    }

    const period = await prisma.wellBillingPeriod.findUnique({
      where: { id: billingPeriodId },
      include: {
        well: true, // Kuyu bilgisini de getir
      },
    });

    if (!period) {
      return NextResponse.json(
        { error: 'Fatura dönemi bulunamadı' },
        { status: 404 }
      );
    }

    const wellId = period.wellId;

    const existingDistributionsCount = await prisma.wellBillDistribution.count({
      where: { wellBillingPeriodId: period.id },
    });

    if (existingDistributionsCount > 0) {
      return NextResponse.json(
        { error: 'Bu fatura dönemi için dağıtım zaten yapılmış' },
        { status: 400 }
      );
    }

    const updatedPeriod = await prisma.wellBillingPeriod.update({
      where: { id: period.id },
      data: {
        totalAmount,
        status: 'PENDING',
      },
    });

    const logs = await prisma.irrigationLog.findMany({
      where: {
        wellId: wellId,
        startDateTime: { lte: updatedPeriod.endDate },
      },
      include: {
        fieldUsages: {
          include: {
            field: {
              include: {
                owners: true, // Field ownership information
              },
            },
          },
        },
      },
    });

    const periodStart = updatedPeriod.startDate;
    const periodEnd = updatedPeriod.endDate;

    type DistRow = {
      fieldId: string;
      ownerId: string;
      basisDuration: number; // Toplam süre (dakika) - SADECE o tarlaya ait olan
      basisArea: number;     // Toplam alan (dekar) - SADECE o tarlaya ait olan
      shareAmount: number;
    };

    const distributionsMap = new Map<string, DistRow>();

    // Önce her bir tarla-sahip ikilisi için toplam süreyi ve alanı hesapla
    for (const log of logs) {
      const logStart = log.startDateTime;
      const logEnd = addMinutes(log.startDateTime, log.duration);
      const overlapStart = dateMax([logStart, periodStart]);
      const overlapEnd = dateMin([logEnd, periodEnd]);
      const overlapMinutes = Math.max(
        0,
        (overlapEnd.getTime() - overlapStart.getTime()) / 60000
      );

      if (overlapMinutes <= 0) continue;

      // Bu kayıtta sulanan TOPLAM alanı hesapla (tüm tarlaların sulanan alanları toplamı)
      let totalAreaIrrigatedInThisLog = 0;
      const fieldIrrigatedAreas: { [fieldId: string]: number } = {};

      for (const fu of log.fieldUsages) {
        if (!fu.field || fu.percentage === null || fu.percentage <= 0) continue;
        const areaIrrigated = fu.field.size * (fu.percentage / 100);
        totalAreaIrrigatedInThisLog += areaIrrigated;
        fieldIrrigatedAreas[fu.fieldId] = areaIrrigated;
      }

      if (totalAreaIrrigatedInThisLog === 0) continue;

      // Her bir tarla ve sahibi için bu kayıttaki payı hesapla
      for (const fu of log.fieldUsages) {
        if (!fu.field || fu.percentage === null || fu.percentage <= 0) continue;
        
        const areaOfThisFieldInThisLog = fieldIrrigatedAreas[fu.fieldId];

        for (const fieldOwner of fu.field.owners) {
          const ownerSharePercentage = (fieldOwner.percentage ?? 0) / 100;
          if (ownerSharePercentage <= 0) continue;

          const uniqueKey = `${fu.fieldId}-${fieldOwner.userId}`;
          let currentDistribution = distributionsMap.get(uniqueKey);

          if (!currentDistribution) {
            currentDistribution = {
              fieldId: fu.fieldId,
              ownerId: fieldOwner.userId,
              basisDuration: 0,
              basisArea: 0,
              shareAmount: 0,
            };
            distributionsMap.set(uniqueKey, currentDistribution);
          }
          
          // Bu tarla-sahip ikilisi için BU KAYITTAki süreyi hesapla
          // (Bu tarlanın bu kayıttaki sulanan alanı / Bu kayıttaki toplam sulanan alan) * Kayıt süresi * Sahip Yüzdesi
          const durationForThisFieldOwnerInThisLog = (areaOfThisFieldInThisLog / totalAreaIrrigatedInThisLog) * overlapMinutes * (ownerSharePercentage);
          
          currentDistribution.basisDuration += durationForThisFieldOwnerInThisLog;
          currentDistribution.basisArea += areaOfThisFieldInThisLog * ownerSharePercentage; // Sahibin bu kayıttaki alan payı
        }
      }
    }

    // Toplam tutarı, her bir dağıtımın basisDuration (toplam süre) oranına göre paylaştır
    const distributionsArray = Array.from(distributionsMap.values());
    const totalCalculatedDuration = distributionsArray.reduce((sum, d) => sum + d.basisDuration, 0);

    for (const dist of distributionsArray) {
      if (totalCalculatedDuration > 0) {
        dist.shareAmount = (dist.basisDuration / totalCalculatedDuration) * totalAmount;
      } else {
        dist.shareAmount = 0;
      }
    }

    // Yuvarlama farklarını yönet
    const rounded = distributionsArray.map((d: DistRow) => ({
      ...d,
      shareAmount: Math.round(d.shareAmount * 100) / 100,
    }));

    let sumRoundedShares = rounded.reduce((sum: number, d: DistRow) => sum + d.shareAmount, 0);
    let roundingDiff = Math.round((totalAmount - sumRoundedShares) * 100) / 100;

    if (Math.abs(roundingDiff) >= 0.01 && rounded.length > 0) {
      // Yuvarlama farkını genellikle en büyük paya ekle
      rounded.sort((a: DistRow, b: DistRow) => b.shareAmount - a.shareAmount);
      // Farkı sadece bir kere ekle, sonsuz döngüyü önlemek için diff'i güncelle
      if (rounded.length > 0) {
        rounded[0].shareAmount =
          Math.round((rounded[0].shareAmount + roundingDiff) * 100) / 100;
      }
    }

    // 7) Dağıtım, Borç ve Gider Kayıtlarını Tek Bir Transaction İçinde Oluştur
    const createdDists = await prisma.$transaction(async (tx: any) => {
      const results = [];
      for (const r of rounded) {
        if (r.shareAmount <= 0) continue; // Tutarı 0 olanlar için kayıt oluşturma

        // Her bir dağıtım için borç kaydı oluştur
        const newDebt = await tx.debt.create({
          data: {
            amount: r.shareAmount,
            dueDate: updatedPeriod.paymentDueDate,
            description: `Kuyu Faturası: ${period.well.name} - Tarla: ${r.fieldId}`, // period üzerinden well bilgisine eriş
            creditorId: userId, // Faturayı oluşturan kişi alacaklı
            debtorId: r.ownerId,
            status: 'PENDING',
            reason: 'WELL_BILL',
          },
        });

        // WellBillDistribution kaydını oluştur ve borca bağla
        // Unique constraint hatasını önlemek için upsert kullanmayı düşünebiliriz,
        // ancak bu durumda dağıtımın tekrar yapılmaması daha doğru.
        // Mevcut kod, dağıtımın zaten yapıldığı bir dönemde tekrar çalıştırıldığında hata veriyor.
        // Bu, genellikle istenmeyen bir durumdur.
        const newDist = await tx.wellBillDistribution.create({
          data: {
            wellBillingPeriodId: updatedPeriod.id,
            fieldId: r.fieldId,
            ownerId: r.ownerId,
            basisDuration: r.basisDuration,
            basisArea: r.basisArea === 0 ? null : r.basisArea,
            sharePercentage: (r.shareAmount / totalAmount) * 100,
            amount: r.shareAmount,
            debtId: newDebt.id, // Yeni oluşturulan borca bağla
          },
        });
        results.push(newDist);
      }
      return results;
    });

    // Calculate totalMinutes from the created distributions for WellBillingIrrigationUsage
    // This is a bit of a workaround as we don't have the individual log contributions to total duration here anymore
    // A more accurate way would be to sum up all basisDuration from createdDists after they are created.
    // For now, we'll calculate it based on the original logs and the new logic, but this needs refinement.
    let totalMinutesForUsage = 0;
    for (const dist of createdDists) {
        totalMinutesForUsage += dist.basisDuration;
    }


    const usageCreates: any[] = [];
    for (const log of logs) {
      const logStart = log.startDateTime;
      const logEnd = addMinutes(log.startDateTime, log.duration);
      const overlapStart = dateMax([logStart, periodStart]);
      const overlapEnd = dateMin([logEnd, periodEnd]);
      const overlapMinutes = Math.max(
        0,
        (overlapEnd.getTime() - overlapStart.getTime()) / 60000
      );
      if (overlapMinutes <= 0) continue;

      // The percentage for WellBillingIrrigationUsage should be based on its contribution to the total duration
      // This is tricky because the total duration is now the sum of basisDurations.
      // For simplicity, we'll use the original overlapMinutes if totalMinutesForUsage is 0.
      const totalDurationForPercentage = totalMinutesForUsage > 0 ? totalMinutesForUsage : overlapMinutes; // Fallback if no distributions yet

      const percentage =
        totalDurationForPercentage > 0 ? (overlapMinutes / totalDurationForPercentage) * 100 : 0;
      const amount = (totalAmount * percentage) / 100;

      usageCreates.push(
        prisma.wellBillingIrrigationUsage.create({
          data: {
            wellBillingPeriodId: updatedPeriod.id,
            irrigationLogId: log.id,
            duration: overlapMinutes,
            percentage,
            amount: Math.round(amount * 100) / 100,
          },
        })
      );
    }
    await prisma.$transaction(usageCreates);

    const finalPeriod = await prisma.wellBillingPeriod.update({
      where: { id: updatedPeriod.id },
      data: { status: 'DISTRIBUTED' },
      include: {
        irrigationUsages: true,
      },
    });

    return NextResponse.json({
      period: finalPeriod,
      distributionsSummary: createdDists,
      invoiceMeta: {
        invoiceNumber: invoiceNumber ?? null,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
      },
    });
  } catch (error) {
    console.error('Error distributing well bill:', error);
    return NextResponse.json(
      { error: 'Kuyu faturası dağıtılırken bir hata oluştu' },
      { status: 500 }
    );
  }
}
