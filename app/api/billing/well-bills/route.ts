import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Kuyu faturalarını getir
    const wellBills = await prisma.wellBill.findMany({
      where,
      include: {
        well: {
          select: {
            id: true,
            name: true,
          },
        },
        billingPeriod: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(wellBills);
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

    const billingPeriod = await prisma.billingPeriod.findUnique({
      where: { id: billingPeriodId },
    });
    if (!billingPeriod) {
      return NextResponse.json(
        { error: "Fatura dönemi bulunamadı" },
        { status: 404 }
      );
    }

    // Aynı kuyu ve dönem için fatura kontrolü
    const existingBill = await prisma.wellBill.findFirst({
      where: {
        wellId,
        billingPeriodId,
      },
    });

    if (existingBill) {
      return NextResponse.json(
        {
          error: "Bu kuyu ve fatura dönemi için zaten bir fatura bulunmaktadır",
        },
        { status: 400 }
      );
    }

    // Yeni kuyu faturası oluştur
    const wellBill = await prisma.wellBill.create({
      data: {
        wellId,
        billingPeriodId,
        totalAmount,
        invoiceNumber,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
        status: "PENDING",
        totalHours: 0, // Başlangıçta 0, hesaplama sonrası güncellenecek
      },
    });

    return NextResponse.json(wellBill);
  } catch (error) {
    console.error("Error creating well bill:", error);
    return NextResponse.json(
      { error: "Kuyu faturası oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
