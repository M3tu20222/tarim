import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Borç hatırlatmaları gönder
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

    // Sadece admin ve sahip kullanıcılar hatırlatma gönderebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const { debtIds } = await request.json();

    // Veri doğrulama
    if (!debtIds || !Array.isArray(debtIds) || debtIds.length === 0) {
      return NextResponse.json(
        { error: "Geçersiz borç ID'leri" },
        { status: 400 }
      );
    }

    // Borçları getir
    const debts = await prisma.debt.findMany({
      where: {
        id: { in: debtIds },
        status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
      },
      include: {
        debtor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        creditor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (debts.length === 0) {
      return NextResponse.json(
        { error: "Hatırlatma gönderilebilecek borç bulunamadı" },
        { status: 404 }
      );
    }

    // Bildirimler oluştur
    const notifications = [];
    for (const debt of debts) {
      // Borç durumunu güncelle
      await prisma.debt.update({
        where: { id: debt.id },
        data: {
          reminderSent: true,
          lastReminderDate: new Date(),
        },
      });

      // Bildirim oluştur
      const notification = await prisma.notification.create({
        data: {
          title: "Borç Hatırlatması",
          message: `${debt.amount.toFixed(2)} ₺ tutarındaki borcunuz için ödeme hatırlatması. Vade tarihi: ${new Date(debt.dueDate).toLocaleDateString("tr-TR")}`,
          type: "REMINDER",
          receiver: {
            connect: { id: debt.debtorId },
          },
          sender: {
            connect: { id: userId },
          },
        },
      });

      notifications.push(notification);
    }

    return NextResponse.json({
      message: `${notifications.length} borç için hatırlatma gönderildi`,
      notifications,
    });
  } catch (error) {
    console.error("Error sending debt reminders:", error);
    return NextResponse.json(
      { error: "Borç hatırlatmaları gönderilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
