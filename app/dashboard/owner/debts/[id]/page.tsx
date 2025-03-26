import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  ArrowLeft,
  Edit,
  CreditCard,
  Calendar,
  User,
  FileText,
  Bell,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { DebtPaymentForm } from "@/components/debts/debt-payment-form";

export const metadata: Metadata = {
  title: "Borç Detayları | Tarım Yönetim Sistemi",
  description: "Borç detayları sayfası",
};

interface DebtPageProps {
  params: {
    id: string;
  };
}

export default async function DebtPage({ params }: DebtPageProps) {
  const debt = await prisma.debt.findUnique({
    where: { id: params.id },
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
      paymentHistory: {
        include: {
          payer: {
            select: {
              id: true,
              name: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          paymentDate: "desc",
        },
      },
    },
  });

  if (!debt) {
    notFound();
  }

  // Durum rengini belirle
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-500/10 text-green-500 border-green-500";
      case "OVERDUE":
        return "bg-red-500/10 text-red-500 border-red-500";
      case "CANCELLED":
        return "bg-gray-500/10 text-gray-500 border-gray-500";
      case "PARTIALLY_PAID":
        return "bg-blue-500/10 text-blue-500 border-blue-500";
      default:
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500";
    }
  };

  // Durum metnini belirle
  const getStatusText = (status: string) => {
    switch (status) {
      case "PAID":
        return "Ödendi";
      case "OVERDUE":
        return "Gecikti";
      case "CANCELLED":
        return "İptal Edildi";
      case "PARTIALLY_PAID":
        return "Kısmen Ödendi";
      default:
        return "Bekliyor";
    }
  };

  // Borç nedenini belirle
  const getReasonText = (reason?: string | null) => {
    if (!reason) return "Belirtilmemiş";

    switch (reason) {
      case "PURCHASE":
        return "Alış";
      case "LOAN":
        return "Kredi";
      case "SERVICE":
        return "Hizmet";
      case "EQUIPMENT":
        return "Ekipman";
      default:
        return "Diğer";
    }
  };

  // Ödeme yöntemini belirle
  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case "CASH":
        return "Nakit";
      case "CREDIT_CARD":
        return "Kredi Kartı";
      case "CREDIT":
        return "Kredi";
      case "BANK_TRANSFER":
        return "Banka Transferi";
      default:
        return method;
    }
  };

  // Toplam ödenen tutarı hesapla
  const totalPaid = debt.paymentHistory.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  const remainingAmount = debt.amount - totalPaid;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/owner/debts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Borç Detayları</h1>
          <Badge variant="outline" className={getStatusColor(debt.status)}>
            {getStatusText(debt.status)}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/owner/debts/${debt.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Düzenle
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Borç Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Borç Tutarı</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(debt.amount)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Vade Tarihi</p>
                  <p className="text-sm text-muted-foreground">
                    {format(debt.dueDate, "PPP", { locale: tr })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Alacaklı</p>
                  <p className="text-sm text-muted-foreground">
                    {debt.creditor.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Borçlu</p>
                  <p className="text-sm text-muted-foreground">
                    {debt.debtor.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Borç Nedeni</p>
                  <p className="text-sm text-muted-foreground">
                    {getReasonText(debt.reason)}
                  </p>
                </div>
              </div>
              {debt.description && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Açıklama</p>
                    <p className="text-sm text-muted-foreground">
                      {debt.description}
                    </p>
                  </div>
                </div>
              )}
              {debt.reminderSent && (
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Son Hatırlatma</p>
                    <p className="text-sm text-muted-foreground">
                      {debt.lastReminderDate
                        ? format(debt.lastReminderDate, "PPP", { locale: tr })
                        : "Belirtilmemiş"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ödeme Durumu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Toplam Borç</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(debt.amount)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Ödenen</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(totalPaid)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Kalan</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(remainingAmount)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Ödeme Sayısı</p>
                  <p className="text-xl font-bold">
                    {debt.paymentHistory.length}
                  </p>
                </div>
              </div>

              {debt.status !== "PAID" && debt.status !== "CANCELLED" && (
                <DebtPaymentForm
                  debtId={debt.id}
                  remainingAmount={remainingAmount}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ödeme Geçmişi</CardTitle>
          <CardDescription>Bu borca yapılan tüm ödemeler</CardDescription>
        </CardHeader>
        <CardContent>
          {debt.paymentHistory.length === 0 ? (
            <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
              <p className="text-sm text-muted-foreground">
                Henüz ödeme yapılmamış.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {debt.paymentHistory.map((payment) => (
                <div key={payment.id} className="rounded-lg border p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <p className="font-medium">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(payment.paymentDate, "PPP", { locale: tr })}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {getPaymentMethodText(payment.paymentMethod)}
                    </Badge>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm">
                    <div>
                      <p className="text-muted-foreground">Ödeyen</p>
                      <p>{payment.payer.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Alan</p>
                      <p>{payment.receiver.name}</p>
                    </div>
                  </div>
                  {payment.notes && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">Not</p>
                      <p className="text-sm">{payment.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
