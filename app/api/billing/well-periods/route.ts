import { type NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSideSession } from "@/lib/session"; // Updated import

// Add route segment config to explicitly mark this route as dynamic
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// Tüm kuyu fatura dönemlerini getir
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSideSession(); // Use custom session function
    if (!session || !session.id) { // Check for session.id instead of session.user
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
    const wellId = searchParams.get("wellId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Filtreleme koşulları
    const where: any = {};

    if (wellId) where.wellId = wellId;
    if (status) where.status = status;
    if (startDate && endDate) {
      where.startDate = {
        gte: new Date(startDate),
      };
      where.endDate = {
        lte: new Date(endDate),
      };
    }

    // Toplam kayıt sayısını al
    const totalCount = await prisma.wellBillingPeriod.count({ where });

    // Kuyu fatura dönemlerini getir
    const wellBillingPeriods = await prisma.wellBillingPeriod.findMany({
      where,
      include: {
        well: true,
        irrigationUsages: {
          include: {
            irrigationLog: true,
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
      skip,
      take: limit,
    });

    return NextResponse.json({
      data: wellBillingPeriods,
      meta: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching well billing periods:", error);
    return NextResponse.json(
      { error: "Failed to fetch well billing periods" },
      { status: 500 }
    );
  }
}

// Yeni kuyu fatura dönemi oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSideSession(); // Use custom session function
    if (!session || !session.id) { // Check for session.id instead of session.user
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // 2. Dönem içindeki sulama kayıtlarını bul (Transaction DIŞINDA)
    const irrigationLogs = await prisma.irrigationLog.findMany({
      where: {
        wellId,
        startDateTime: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    // Transaction ile tüm işlemleri gerçekleştir
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Kuyu fatura dönemini oluştur
        const wellBillingPeriod = await tx.wellBillingPeriod.create({
          data: {
            wellId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            totalAmount,
            totalUsage: totalUsage || 0, // totalUsage için varsayılan değer
            status: status || "PENDING",
          },
        });

        // 3. Toplam süreyi hesapla
        const totalDuration = irrigationLogs.reduce(
          (sum, log) => sum + log.duration,
          0
        );

        // 4. Her sulama kaydı için fatura kullanımı oluştur (createMany ile)
        if (totalDuration > 0) {
          const usageData = irrigationLogs.map((log) => {
            const percentage = (log.duration / totalDuration) * 100;
            const amount = (totalAmount * percentage) / 100;
            return {
              wellBillingPeriodId: wellBillingPeriod.id,
              irrigationLogId: log.id,
              duration: log.duration,
              percentage,
              amount,
            };
          });

          await tx.wellBillingIrrigationUsage.createMany({
            data: usageData,
          });
        }

        return wellBillingPeriod;
      },
      {
        timeout: 15000, // Zaman aşımını 15 saniyeye çıkar
      }
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Error creating well billing period:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.";
    return NextResponse.json(
      { error: `Failed to create well billing period: ${errorMessage}` },
      { status: 500 }
    );
  }
}
