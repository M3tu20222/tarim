import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentForm } from "@/components/payments/payment-form";
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
import { ArrowLeft, CreditCard } from "lucide-react";

interface PayDebtPageProps {
  params: {
    id: string;
  };
}

export const metadata: Metadata = {
  title: "Borç Ödemesi | Tarım Yönetim Sistemi",
  description: "Borç ödeme sayfası",
};

export default async function PayDebtPage({ params }: PayDebtPageProps) {
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
      paymentHistory: true,
    },
  });

  if (!debt) {
    notFound();
  }

  // Borç ödenmiş mi kontrol et
  if (debt.status === "PAID") {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard/owner">
                  Ana Sayfa
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard/owner/debts">
                  Borçlar
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Borç Ödemesi</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button variant="outline" asChild>
            <Link href="/dashboard/owner/debts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Geri Dön
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-green-500">
              Bu borç zaten ödenmiş
            </CardTitle>
            <CardDescription>
              Bu borç {formatDate(debt.paymentDate!)} tarihinde ödenmiştir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/owner/debts">Borçlara Dön</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <BreadcrumbPage>Borç Ödemesi</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button variant="outline" asChild>
          <Link href="/dashboard/owner/debts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri Dön
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Borç Detayları
            </CardTitle>
            <CardDescription>
              Ödeme yapmak üzere olduğunuz borcun detayları
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

              <div className="text-sm font-medium">Vade Tarihi:</div>
              <div>{formatDate(debt.dueDate)}</div>

              <div className="text-sm font-medium">Durum:</div>
              <div>
                {debt.status === "PENDING"
                  ? "Bekliyor"
                  : debt.status === "PARTIALLY_PAID"
                    ? "Kısmen Ödendi"
                    : debt.status === "OVERDUE"
                      ? "Gecikmiş"
                      : "İptal Edildi"}
              </div>

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

            {debt.paymentHistory.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-medium">Ödeme Geçmişi</h3>
                <div className="space-y-2">
                  {debt.paymentHistory.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-md border p-2 text-sm"
                    >
                      <div className="flex justify-between">
                        <span>{formatDate(payment.paymentDate)}</span>
                        <span className="font-medium">
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ödeme Yap</CardTitle>
            <CardDescription>
              Borç ödemesi için aşağıdaki formu doldurun
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentForm
              debtId={debt.id}
              maxAmount={debt.amount}
              receiverId={debt.creditorId}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
