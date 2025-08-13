import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Tüm kuyu fatura dönemlerini getir
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

    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const wellId = searchParams.get("wellId");
    const status = searchParams.get("status"); // PENDING, DISTRIBUTED, PAID

    const where: Prisma.WellBillingPeriodWhereInput = {};
    if (wellId) {
      where.wellId = wellId;
    }
    if (status) {
      where.status = status;
    }

    const periods = await prisma.wellBillingPeriod.findMany({
      where,
      include: {
        well: true,
        distributions: {
          include: {
            owner: true,
            debt: true,
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
    });

    return NextResponse.json(periods);
  } catch (error) {
    console.error("Error fetching billing periods:", error);
    return NextResponse.json(
      { error: "Fatura dönemleri getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Yeni kuyu fatura dönemi oluştur
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

    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const { wellId, startDate, endDate, totalAmount, paymentDueDate } = await request.json();

    if (!wellId || !startDate || !endDate || !totalAmount || !paymentDueDate) {
      return NextResponse.json(
        { error: "Kuyu ID'si, başlangıç tarihi, bitiş tarihi, fatura tutarı ve ödeme tarihi zorunludur." },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const dueDate = new Date(paymentDueDate);

    if (start >= end) {
      return NextResponse.json(
        { error: "Başlangıç tarihi bitiş tarihinden önce olmalıdır." },
        { status: 400 }
      );
    }
    if (dueDate < end) { // Ödeme tarihi bitiş tarihinden önce olmamalı
        return NextResponse.json(
        { error: "Fatura ödeme tarihi, bitiş tarihinden sonra veya aynı gün olmalıdır." },
        { status: 400 }
      );
    }

    // Aynı kuyu için çakışan bir fatura dönemi olup olmadığını kontrol et
    const overlappingPeriod = await prisma.wellBillingPeriod.findFirst({
      where: {
        wellId,
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
    });

    if (overlappingPeriod) {
      return NextResponse.json(
        { error: "Bu kuyu için seçilen tarih aralığında başka bir fatura dönemi mevcut." },
        { status: 400 }
      );
    }

    const newPeriod = await prisma.wellBillingPeriod.create({
      data: {
        wellId,
        startDate: start,
        endDate: end,
        paymentDueDate: dueDate,
        totalAmount,
        status: "PENDING", // Varsayılan durum
      },
      include: {
        well: true,
      },
    });

    return NextResponse.json(newPeriod);
  } catch (error) {
    console.error("Error creating billing period:", error);
    return NextResponse.json(
      { error: "Fatura dönemi oluşturulurken bir hata oluştu." },
      { status: 500 }
    );
  }
}
