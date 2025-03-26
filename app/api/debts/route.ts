import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Borçları getir
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
    const status = searchParams.get("status");
    const creditorId = searchParams.get("creditorId");
    const debtorId = searchParams.get("debtorId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Filtre oluştur
    const filter: any = {};
    if (status) {
      filter.status = status;
    }
    if (creditorId) {
      filter.creditorId = creditorId;
    }
    if (debtorId) {
      filter.debtorId = debtorId;
    }
    if (startDate && endDate) {
      filter.dueDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Sadece admin ve sahip kullanıcılar tüm borçları görebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      filter.OR = [{ creditorId: userId }, { debtorId: userId }];
    }

    // Borçları getir
    const debts = await prisma.debt.findMany({
      where: filter,
      include: {
        creditor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        debtor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        paymentHistory: true,
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    });

    return NextResponse.json(debts);
  } catch (error) {
    console.error("Error fetching debts:", error);
    return NextResponse.json(
      { error: "Borçlar getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Yeni borç oluştur
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

    // Sadece admin ve sahip kullanıcılar borç oluşturabilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const { amount, dueDate, description, creditorId, debtorId, reason } =
      await request.json();

    // Veri doğrulama
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Borç tutarı pozitif bir sayı olmalıdır" },
        { status: 400 }
      );
    }

    if (!dueDate) {
      return NextResponse.json(
        { error: "Vade tarihi zorunludur" },
        { status: 400 }
      );
    }

    if (!creditorId) {
      return NextResponse.json(
        { error: "Alacaklı seçilmelidir" },
        { status: 400 }
      );
    }

    if (!debtorId) {
      return NextResponse.json(
        { error: "Borçlu seçilmelidir" },
        { status: 400 }
      );
    }

    // Borç oluştur
    const debt = await prisma.debt.create({
      data: {
        amount,
        dueDate: new Date(dueDate),
        description,
        reason,
        creditor: {
          connect: { id: creditorId },
        },
        debtor: {
          connect: { id: debtorId },
        },
      },
    });

    // Bildirim oluştur
    await prisma.notification.create({
      data: {
        title: "Yeni Borç",
        message: `${amount.toFixed(2)} ₺ tutarında yeni bir borç kaydı oluşturuldu. Vade tarihi: ${new Date(dueDate).toLocaleDateString("tr-TR")}`,
        type: "DEBT",
        receiver: {
          connect: { id: debtorId },
        },
        sender: {
          connect: { id: userId },
        },
      },
    });

    return NextResponse.json(debt);
  } catch (error) {
    console.error("Error creating debt:", error);
    return NextResponse.json(
      { error: "Borç oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
