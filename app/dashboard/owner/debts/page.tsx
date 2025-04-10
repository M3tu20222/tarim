import type { Metadata } from "next";
import { Bell, PlusIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import type { DebtStatus } from "@prisma/client";
import DebtList from "@/components/debts/debt-list";

export const metadata: Metadata = {
  title: "Borç Yönetimi | Tarım Yönetim Sistemi",
  description: "Borç yönetimi sayfası",
};

export default async function DebtsPage() {
  // Tüm borçları getir
  const debts = await prisma.debt.findMany({
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

  // Borçları DebtList bileşeninin beklediği formata dönüştür
  const formattedDebts = debts.map((debt) => ({
    id: debt.id,
    amount: debt.amount,
    dueDate: debt.dueDate.toISOString(),
    status: debt.status as DebtStatus,
    description: debt.description || undefined,
    reason: debt.reason || undefined,
    paymentDate: debt.paymentDate?.toISOString() || undefined,
    reminderSent: debt.reminderSent,
    lastReminderDate: debt.lastReminderDate?.toISOString() || undefined,
    creditor: {
      id: debt.creditor.id,
      name: debt.creditor.name,
    },
    debtor: {
      id: debt.debtor.id,
      name: debt.debtor.name,
    },
    paymentHistory: debt.paymentHistory.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      paymentDate: payment.paymentDate.toISOString(),
      paymentMethod: payment.paymentMethod,
      notes: payment.notes || undefined,
    })),
  }));

  // Özet istatistikler
  const totalPendingDebt = debts
    .filter(
      (debt) =>
        debt.status === "PENDING" ||
        debt.status === "PARTIALLY_PAID" ||
        debt.status === "OVERDUE"
    )
    .reduce((sum, debt) => sum + debt.amount, 0);

  const totalPaidDebt = debts
    .filter((debt) => debt.status === "PAID")
    .reduce((sum, debt) => sum + debt.amount, 0);

  const overdueDebts = debts.filter((debt) => debt.status === "OVERDUE").length;

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Borç Yönetimi</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/owner/debts/reminders">
              <Bell className="mr-2 h-4 w-4" />
              Hatırlatmalar
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/owner/debts/new">
              <PlusIcon className="mr-2 h-4 w-4" />
              Yeni Borç
            </Link>
          </Button>
        </div>
      </div>

      {/* Özet kartları */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-col space-y-1.5">
            <h3 className="text-sm font-medium text-muted-foreground">
              Toplam Bekleyen Borç
            </h3>
            <p className="text-2xl font-bold">
              {totalPendingDebt.toLocaleString("tr-TR")} ₺
            </p>
          </div>
        </div>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-col space-y-1.5">
            <h3 className="text-sm font-medium text-muted-foreground">
              Toplam Ödenen Borç
            </h3>
            <p className="text-2xl font-bold">
              {totalPaidDebt.toLocaleString("tr-TR")} ₺
            </p>
          </div>
        </div>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-col space-y-1.5">
            <h3 className="text-sm font-medium text-muted-foreground">
              Vadesi Geçmiş Borç
            </h3>
            <p className="text-2xl font-bold">{overdueDebts} adet</p>
          </div>
        </div>
      </div>

      {/* Borç listesi */}
      <DebtList debts={formattedDebts} />
    </div>
  );
}
