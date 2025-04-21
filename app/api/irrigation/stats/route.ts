import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Sulama istatistiklerini getir
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

    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const fieldId = searchParams.get("fieldId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const seasonId = searchParams.get("seasonId");

    // Filtre oluştur
    const filter: any = {};

    if (fieldId) {
      filter.fieldId = fieldId;
    }

    if (seasonId) {
      filter.seasonId = seasonId;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.gte = new Date(startDate);
      }
      if (endDate) {
        filter.date.lte = new Date(endDate);
      }
    }

    // Toplam sulama miktarı
    const totalAmount = await prisma.irrigationLog.aggregate({
      where: filter,
      _sum: {
        amount: true,
      },
    });

    // Toplam sulama süresi
    const totalDuration = await prisma.irrigationLog.aggregate({
      where: filter,
      _sum: {
        duration: true,
      },
    });

    // Sulama sayısı
    const irrigationCount = await prisma.irrigationLog.count({
      where: filter,
    });

    // Sulama metodlarına göre dağılım
    const methodDistribution = await prisma.irrigationLog.groupBy({
      by: ["method"],
      where: filter,
      _count: {
        method: true,
      },
      _sum: {
        amount: true,
        duration: true,
      },
    });

    // Tarlalara göre dağılım
    const fieldDistribution = await prisma.irrigationLog.groupBy({
      by: ["fieldId"],
      where: filter,
      _count: true,
      _sum: {
        amount: true,
        duration: true,
      },
    });

    // Tarla adlarını al
    const fields = await prisma.field.findMany({
      where: {
        id: {
          in: fieldDistribution.map((item) => item.fieldId),
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Tarla adlarını ekle
    const fieldDistributionWithNames = fieldDistribution.map((item) => ({
      ...item,
      fieldName:
        fields.find((field) => field.id === item.fieldId)?.name ||
        "Bilinmeyen Tarla",
    }));

    // Aylık sulama miktarları
    // DİKKAT: $queryRaw kullanımı ve filtreleme şekli veritabanına (MongoDB) ve Prisma sürümüne göre
    //          güvenlik açığı oluşturabilir veya çalışmayabilir. Güvenli parametre kullanımı için
    //          Prisma.sql`` veya $queryRawUnsafe yerine $queryRaw kullanılması önerilir.
    //          Şimdilik sadece TypeScript hatasını düzeltiyoruz. $queryRaw tanınmadığı için $queryRawUnsafe deniyoruz.
    // Aylık sulama miktarları MongoDB aggregation pipeline ile alınacak
    const monthlyAggregationResult = await prisma.$runCommandRaw({
      aggregate: "IrrigationLog", // Koleksiyon adı
      pipeline: [
        {
          $match: filter, // Prisma'nın oluşturduğu filtreyi kullanmayı deneyelim
                         // Tarih filtrelemesi için filter.date içindeki değerlerin Date objesi olduğundan emin olunmalı
        },
        {
          $group: {
            _id: {
              year: { $year: "$date" },
              month: { $month: "$date" },
            },
            total_amount: { $sum: "$amount" },
            total_duration: { $sum: "$duration" },
            count: { $sum: 1 },
          },
        },
        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
        {
          // Çıktıyı istenen formata dönüştür (isteğe bağlı ama önerilir)
          $project: {
            _id: 0, // _id alanını kaldır
            month: { // YYYY-MM formatında bir string oluştur
              $dateToString: {
                format: "%Y-%m",
                date: {
                  $dateFromParts: {
                    year: "$_id.year",
                    month: "$_id.month",
                    day: 1, // Gün önemli değil
                  },
                },
              },
            },
            total_amount: 1,
            total_duration: 1,
            count: 1,
          },
        },
      ],
      cursor: {}, // Boş cursor objesi genellikle gereklidir
    });

    // Aggregation sonucu genellikle 'cursor.firstBatch' içinde gelir
    // Dönüş tipini 'any' olarak belirterek TypeScript hatasını giderelim
    const resultAsAny = monthlyAggregationResult as any;
    const monthlyData = resultAsAny?.cursor?.firstBatch || [];


    return NextResponse.json({
      totalAmount: totalAmount._sum.amount || 0,
      totalDuration: totalDuration._sum.duration || 0,
      irrigationCount,
      methodDistribution,
      fieldDistribution: fieldDistributionWithNames,
      monthlyData,
    });
  } catch (error) {
    console.error("Error fetching irrigation stats:", error);
    return NextResponse.json(
      { error: "Sulama istatistikleri getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
