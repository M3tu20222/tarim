import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addMinutes, max as dateMax, min as dateMin } from "date-fns";

// Tüm kuyu faturalarını getir
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

    // Sadece admin ve sahip kullanıcılar kuyu faturalarını görebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const billingPeriodId = searchParams.get("billingPeriodId");
    const wellId = searchParams.get("wellId");
    const status = searchParams.get("status");

    // Filtreleme koşullarını oluştur
    const where: any = {};
    if (billingPeriodId) where.billingPeriodId = billingPeriodId;
    if (wellId) where.wellId = wellId;
    if (status) where.status = status;

    // Not: Yeni şemada WellBill modelimiz yok; dönemler üzerinden veri sağlanır.
    // İstek parametrelerinden wellId veya billingPeriodId verilmişse buna göre filtreleyelim.
    const periods = await prisma.wellBillingPeriod.findMany({
      where: {
        ...(wellId ? { wellId } : {}),
        ...(billingPeriodId ? { id: billingPeriodId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        well: {
          select: { id: true, name: true },
        },
        irrigationUsages: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(periods);
  } catch (error) {
    console.error("Error fetching well bills:", error);
    return NextResponse.json(
      { error: "Kuyu faturaları getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Yeni kuyu faturası oluştur
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

    // Sadece admin ve sahip kullanıcılar kuyu faturası oluşturabilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const { wellId, billingPeriodId, totalAmount, invoiceNumber, invoiceDate } =
      await request.json();

    // Veri doğrulama
    if (!wellId || !billingPeriodId || totalAmount === undefined) {
      return NextResponse.json(
        { error: "Kuyu, fatura dönemi ve toplam tutar zorunludur" },
        { status: 400 }
      );
    }

    // Kuyu ve fatura dönemi kontrolü
    const well = await prisma.well.findUnique({ where: { id: wellId } });
    if (!well) {
      return NextResponse.json({ error: "Kuyu bulunamadı" }, { status: 404 });
    }

    // Eski kodda "billingPeriod" modeli kullanılıyordu; yeni şemada WellBillingPeriod var.
    const billingPeriod = await prisma.wellBillingPeriod.findUnique({
      where: { id: billingPeriodId },
    });
    if (!billingPeriod) {
      return NextResponse.json(
        { error: "Fatura dönemi bulunamadı" },
        { status: 404 }
      );
    }

    // Aynı kuyu ve dönem için fatura kontrolü
    // Dönem bazlı çalıştığımız için aynı dönem için tekrar dağıtımı engelleyeceğiz.
    // Bu nedenle eski "wellBill" kontrolü kaldırıldı.
    const existingBill = null;

    if (existingBill) {
      return NextResponse.json(
        {
          error: "Bu kuyu ve fatura dönemi için zaten bir fatura bulunmaktadır",
        },
        { status: 400 }
      );
    }

    // Dikkat: Bu kod, Prisma şemasındaki gerçek modelleri baz alır.
    // Mevcut şemaya göre faturanın kaydı WellBillingPeriod üzerinden tutulacak,
    // kişi bazlı dağıtımlar WellBillDistribution tablosuna yazılacaktır.

    // İlgili dönem bilgilerini al
    const period = await prisma.wellBillingPeriod.findUnique({
      where: { id: billingPeriodId },
    });

    if (!period) {
      return NextResponse.json(
        { error: "Fatura dönemi bulunamadı" },
        { status: 404 }
      );
    }
    if (period.wellId !== wellId) {
      return NextResponse.json(
        { error: "Seçilen dönem farklı bir kuyuya ait" },
        { status: 400 }
      );
    }

    // Aynı dönem için daha önce dağıtım yapılmış mı kontrolü
    // Prisma model adı: WellBillDistribution -> client alan adı: wellBillDistributionS? Değil; Prisma'da tekil model adı otomatik olarak çoğul yapılmaz.
    // Doğru kullanım: prisma.wellBillDistribution (tekil model adı camelCase)
    // Prisma Client model adları camelCase olup model adına göre üretilir: WellBillDistribution -> wellBillDistribution
    // Ancak mevcut Prisma client'ta bu model henüz tanımlı olmayabilir (migrate+generate sonrası gelir).
    // Bu nedenle doğrudan distrib varlığını period üzerinden sayarak kontrol edelim.
    // Prisma Client'ta model adları prisma generate sonrası oluşur. WellBillDistribution modeli eklendi.
    // Eğer henüz generate yapılmadıysa build zamanı tip hatası görülebilir; migrate+generate sonrası düzelecektir.
    const existingDistributionsCount = await prisma.wellBillDistribution.count({
      where: { wellBillingPeriodId: period.id },
    });
    if (existingDistributionsCount > 0) {
      return NextResponse.json(
        { error: "Bu fatura dönemi için dağıtım zaten yapılmış" },
        { status: 400 }
      );
    }

    // 1) Fatura dönemi toplam tutarı güncelle ve PENDING olarak bırak
    const updatedPeriod = await prisma.wellBillingPeriod.update({
      where: { id: period.id },
      data: {
        totalAmount,
        status: "PENDING",
      },
    });

    // 2) Dönemle kesişen sulama loglarını çek
    const logs = await prisma.irrigationLog.findMany({
      where: {
        wellId: wellId,
        // kaba filtre: başlangıcı dönemden önce olsa bile sonuçta kesişim hesabı yapılacak
        startDateTime: { lte: updatedPeriod.endDate },
      },
      include: {
        fieldUsages: true,
      },
    });

    const periodStart = updatedPeriod.startDate;
    const periodEnd = updatedPeriod.endDate;

    // 3) Ağırlık hesapları (field bazlı)
    const fieldWeightMap = new Map<string, { weight: number; duration: number; area: number }>();

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

      for (const fu of log.fieldUsages) {
        const fieldId = fu.fieldId;
        const percent = (fu.percentage ?? 0) / 100;
        const fieldWeightForThisLog = overlapMinutes * percent;

        const prev = fieldWeightMap.get(fieldId) ?? {
          weight: 0,
          duration: 0,
          area: 0,
        };
        fieldWeightMap.set(fieldId, {
          weight: prev.weight + fieldWeightForThisLog,
          duration: prev.duration + overlapMinutes * percent,
          area: prev.area + (fu.actualIrrigatedArea ?? 0),
        });
      }
    }

    // 4) Toplam ağırlık
    let totalWeight = 0;
    for (const v of fieldWeightMap.values()) totalWeight += v.weight;

    if (totalWeight === 0) {
      // Kesişim yoksa dağıtım yapma
      await prisma.wellBillingPeriod.update({
        where: { id: updatedPeriod.id },
        data: {
          status: "PENDING",
        },
      });

      return NextResponse.json({
        period: updatedPeriod,
        distributionsSummary: [],
        message:
          "Dönem için kesişen sulama kaydı bulunamadı; dağıtım yapılmadı.",
      });
    }

    // 5) FieldOwnership bazlı sahibi dağıtımları hazırla
    type DistRow = {
      fieldId: string;
      ownerId: string;
      basisDuration: number;
      basisArea: number;
      basisWeight: number;
      shareAmount: number;
    };

    const distributions: DistRow[] = [];

    for (const [fieldId, agg] of fieldWeightMap.entries()) {
      const fieldShareAmount = (totalAmount * agg.weight) / totalWeight;

      const ownerships = await prisma.fieldOwnership.findMany({
        where: { fieldId },
      });

      if (!ownerships || ownerships.length === 0) {
        // Sahiplik yoksa bu tarlayı atla (iş kuralı gereği sahiplik zorunlu varsayıldı)
        continue;
      }

      for (const own of ownerships) {
        const ownerPercentage = (own.percentage ?? 0) / 100;
        const ownerShare = fieldShareAmount * ownerPercentage;

        distributions.push({
          fieldId,
          ownerId: own.userId,
          basisDuration: agg.duration,
          basisArea: agg.area,
          basisWeight: agg.weight * ownerPercentage,
          shareAmount: ownerShare,
        });
      }
    }

    // 6) Yuvarlama ve sapma kapama
    const rounded = distributions.map((d) => ({
      ...d,
      shareAmount: Math.round(d.shareAmount * 100) / 100,
    }));
    const sumRounded = rounded.reduce((s, r) => s + r.shareAmount, 0);
    const diff = Math.round((totalAmount - sumRounded) * 100) / 100;

    if (Math.abs(diff) > 0) {
      // en büyük paylı kaleme farkı ekle
      let maxIdx = 0;
      for (let i = 1; i < rounded.length; i++) {
        if (rounded[i].shareAmount > rounded[maxIdx].shareAmount) {
          maxIdx = i;
        }
      }
      rounded[maxIdx].shareAmount =
        Math.round((rounded[maxIdx].shareAmount + diff) * 100) / 100;
    }

    // 7) WellBillDistribution kayıtlarını oluştur
    // Dağıtım kayıtlarını ekle
    const createdDists = await prisma.$transaction(
      rounded.map((r) =>
        prisma.wellBillDistribution.create({
          data: {
            wellBillingPeriodId: updatedPeriod.id,
            fieldId: r.fieldId,
            ownerId: r.ownerId,
            basisDuration: r.basisDuration,
            basisArea: r.basisArea === 0 ? null : r.basisArea,
            basisWeight: r.basisWeight,
            sharePercentage: (r.shareAmount / totalAmount) * 100,
            amount: r.shareAmount,
          },
        })
      )
    );

    // 8) Opsiyonel: WellBillingIrrigationUsage (özet) hesapla ve kaydet
    const totalMinutes = Array.from(fieldWeightMap.values()).reduce(
      (s, v) => s + v.duration,
      0
    );

    // Basit log bazlı yüzde dağılımı için tekrar logları dolaş
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

      const percentage =
        totalMinutes > 0 ? (overlapMinutes / totalMinutes) * 100 : 0;
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

    // 9) Dönem durumunu DISTRIBUTED yap
    const finalPeriod = await prisma.wellBillingPeriod.update({
      where: { id: updatedPeriod.id },
      data: { status: "DISTRIBUTED" },
      include: {
        irrigationUsages: true,
      },
    });

    // Fatura meta bilgilerini (numara/tarih) döneme not olarak saklamak istenirse,
    // ayrı bir metadata alanına yazılabilir. Şimdilik response'a dahil edelim.
    return NextResponse.json({
      period: finalPeriod,
      distributionsSummary: createdDists,
      invoiceMeta: {
        invoiceNumber: invoiceNumber ?? null,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
      },
    });
  } catch (error) {
    console.error("Error creating well bill:", error);
    return NextResponse.json(
      { error: "Kuyu faturası oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
