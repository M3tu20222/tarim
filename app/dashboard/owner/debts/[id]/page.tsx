import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  ArrowLeft,
  CreditCard,
  Edit,
  Bell,
  Trash,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Borç Detayları | Tarım Yönetim Sistemi",
  description: "Borç detayları sayfası",
};

interface DebtDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function DebtDetailsPage({ params }: DebtDetailsPageProps) {
  // Borç detaylarını getir
  const debt = await prisma.debt.findUnique({
    where: {
      id: params.id,
    },
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
      purchase: {
        include: {
          contributors: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
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

  // Toplam ödenen tutarı hesapla
  const totalPaid = debt.paymentHistory.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  const remainingAmount = debt.amount - totalPaid;

  // Durum metni
  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Bekliyor";
      case "PARTIALLY_PAID":
        return "Kısmen Ödendi";
      case "PAID":
        return "Ödendi";
      case "OVERDUE":
        return "Gecikmiş";
      case "CANCELLED":
        return "İptal Edildi";
      default:
        return status;
    }
  };

  // Durum rengi
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500";
      case "PARTIALLY_PAID":
        return "bg-blue-500/10 text-blue-500 border-blue-500";
      case "PAID":
        return "bg-green-500/10 text-green-500 border-green-500";
      case "OVERDUE":
        return "bg-red-500/10 text-red-500 border-red-500";
      case "CANCELLED":
        return "bg-gray-500/10 text-gray-500 border-gray-500";
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard/owner">Ana Sayfa</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard/owner/debts">
                Borçlar
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Borç Detayları</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/owner/debts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Geri Dön
            </Link>
          </Button>
          {debt.status !== "PAID" && debt.status !== "CANCELLED" && (
            <Button asChild>
              <Link href={`/dashboard/owner/debts/pay/${params.id}`}>
                <CreditCard className="mr-2 h-4 w-4" />
                Ödeme Yap
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Borç Detayları
              </CardTitle>
              <Badge
                variant="outline"
                className={getStatusColor(debt.status)}
              >
                {getStatusText(debt.status)}
              </Badge>
            </div>
            <CardDescription>
              Borç bilgileri ve ödeme durumu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm font-medium">Alacaklı:</div>
              <div>{debt.creditor.name}</div>

              <div className="text-sm font-medium">Borçlu:</div>
              <div>{debt.debtor.name}</div>

              <div className="text-sm font-medium">Borç Tutarı:</div>
              <div className="font-semibold">{formatCurrency(debt.amount)}</div>

              <div className="text-sm font-medium">Ödenen Tutar:</div>
              <div>{formatCurrency(totalPaid)}</div>

              <div className="text-sm font-medium">Kalan Tutar:</div>
              <div className="font-semibold">{formatCurrency(remainingAmount)}</div>

              <div className="text-sm font-medium">Vade Tarihi:</div>
              <div>{formatDate(debt.dueDate)}</div>

              {debt.purchase && (
                <>
                  <div className="text-sm font-medium">İlgili Alış:</div>
                  <div>{debt.purchase.product}</div>
                </>
              )}

              {debt.description && (
                <>
                  <div className="text-sm font-medium">Açıklama:</div>
                  <div>{debt.description}</div>
                </>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              {debt.status !== "PAID" && debt.status !== "CANCELLED" && (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/owner/debts/${params.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Düzenle
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm">
                    <Bell className="mr-2 h-4 w-4" />
                    Hatırlatma Gönder
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ödeme Geçmişi</CardTitle>
            <CardDescription>
              Bu borç için yapılan ödemeler
            </CardDescription>
          </CardHeader>
          <CardContent>
            {debt.paymentHistory.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Henüz ödeme yapılmamış.
              </div>
            ) : (
              <div className="space-y-3">
                {debt.paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-md border p-3 text-sm"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">
                        {formatCurrency(payment.amount)}
                      </div>
                      <Badge variant="outline">
                        {payment.paymentMethod}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <div>
                        <span>Ödeyen: </span>
                        <span>{payment.payer.name}</span>
                      </div>
                      <div>
                        {format(new Date(payment.paymentDate), "dd MMMM yyyy", {
                          locale: tr,
                        })}
                      </div>
                    </div>
                    {payment.notes && (
                      <div className="mt-2 text-muted-foreground">
                        <span>Not: </span>
                        <span>{payment.notes}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
