import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Otomatik borç hatırlatmaları ve gecikme bildirimleri
export async function GET(request: Request) {
  try {
    // API anahtarını kontrol et (gerçek uygulamada daha güvenli bir yöntem kullanılmalı)
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
      return NextResponse.json(
        { error: "Geçersiz API anahtarı" },
        { status: 401 }
      );
    }

    const now = new Date();
    const results = {
      overdueUpdated: 0,
      reminders: {
        upcoming: 0,
        overdue: 0,
      },
    };

    // 1. Vadesi geçmiş borçları güncelle
    const overdueDebts = await prisma.debt.findMany({
      where: {
        dueDate: { lt: now },
        status: "PENDING",
      },
    });

    for (const debt of overdueDebts) {
      await prisma.debt.update({
        where: { id: debt.id },
        data: { status: "OVERDUE" },
      });
      results.overdueUpdated++;
    }

    // 2. Vadesi yaklaşan borçlar için hatırlatma (3 gün kala)
    const threeDaysLater = new Date();
    threeDaysLater.setDate(now.getDate() + 3);

    const upcomingDebts = await prisma.debt.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: threeDaysLater,
        },
        status: { in: ["PENDING", "PARTIALLY_PAID"] },
        reminderSent: false,
      },
      include: {
        debtor: {
          select: {
            id: true,
            name: true,
          },
        },
        creditor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 3. Vadesi geçmiş borçlar için hatırlatma (7 günde bir)
    const overdueReminders = await prisma.debt.findMany({
      where: {
        dueDate: { lt: now },
        status: { in: ["OVERDUE", "PARTIALLY_PAID"] },
        OR: [
          { lastReminderDate: null },
          {
            lastReminderDate: {
              lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 gün önce
            },
          },
        ],
      },
      include: {
        debtor: {
          select: { id: true, name: true },
        },
        creditor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Hatırlatmaları gönder
    for (const debt of [...upcomingDebts, ...overdueReminders]) {
      // Borç durumunu güncelle
      await prisma.debt.update({
        where: { id: debt.id },
        data: {
          reminderSent: true,
          lastReminderDate: now,
        },
      });

      // Bildirim oluştur
      await prisma.notification.create({
        data: {
          title:
            debt.dueDate < now
              ? "Gecikmiş Borç Hatırlatması"
              : "Yaklaşan Borç Hatırlatması",
          message: `${debt.amount.toFixed(2)} ₺ tutarındaki borcunuz için ${
            debt.dueDate < now ? "gecikme" : "yaklaşan vade"
          } hatırlatması. Vade tarihi: ${new Date(debt.dueDate).toLocaleDateString("tr-TR")}`,
          type: "REMINDER",
          receiver: {
            connect: { id: debt.debtorId },
          },
          sender: {
            connect: { id: debt.creditorId },
          },
        },
      });

      if (debt.dueDate < now) {
        results.reminders.overdue++;
      } else {
        results.reminders.upcoming++;
      }
    }

    return NextResponse.json({
      message: "Borç hatırlatmaları ve güncellemeleri tamamlandı",
      results,
    });
  } catch (error) {
    console.error("Error in debt reminders cron:", error);
    return NextResponse.json(
      { error: "Borç hatırlatmaları işlenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
