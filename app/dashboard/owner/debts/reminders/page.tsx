import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DebtReminder } from "@/components/debts/debt-reminder";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Borç Hatırlatmaları | Tarım Yönetim Sistemi",
  description: "Borç hatırlatma sayfası",
};

export default async function DebtRemindersPage() {
  // Ödenmemiş borçları getir
  const debts = await prisma.debt.findMany({
    where: {
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
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  // Borçları DebtReminder bileşeninin beklediği formata dönüştür
  const formattedDebts = debts.map((debt) => ({
    id: debt.id,
    amount: debt.amount,
    dueDate: debt.dueDate.toISOString(),
    status: debt.status,
    reminderSent: debt.reminderSent,
    lastReminderDate: debt.lastReminderDate
      ? debt.lastReminderDate.toISOString()
      : null,
    debtor: {
      id: debt.debtor.id,
      name: debt.debtor.name,
    },
  }));

  // Vadesi geçmiş borçları güncelle
  const now = new Date();
  for (const debt of debts) {
    if (new Date(debt.dueDate) < now && debt.status === "PENDING") {
      await prisma.debt.update({
        where: { id: debt.id },
        data: { status: "OVERDUE" },
      });
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/owner/debts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Borç Hatırlatmaları
        </h1>
      </div>

      <DebtReminder debts={formattedDebts} />
    </div>
  );
}
