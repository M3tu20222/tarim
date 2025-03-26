import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DebtForm } from "@/components/debts/debt-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Borç Düzenle | Tarım Yönetim Sistemi",
  description: "Borç düzenleme sayfası",
};

interface EditDebtPageProps {
  params: {
    id: string;
  };
}

export default async function EditDebtPage({ params }: EditDebtPageProps) {
  const debt = await prisma.debt.findUnique({
    where: { id: params.id },
  });

  if (!debt) {
    notFound();
  }

  // Ödenmiş veya iptal edilmiş borçlar düzenlenemez
  if (debt.status === "PAID" || debt.status === "CANCELLED") {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/owner/debts/${params.id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Borç Düzenle</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Borç Düzenlenemez</CardTitle>
            <CardDescription>
              Ödenmiş veya iptal edilmiş borçlar düzenlenemez.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Button asChild>
                <Link href={`/dashboard/owner/debts/${params.id}`}>
                  Borç Detaylarına Dön
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Borç verilerini form için hazırla
  const formattedDebt = {
    id: debt.id,
    amount: debt.amount,
    dueDate: debt.dueDate,
    description: debt.description || undefined,
    creditorId: debt.creditorId,
    debtorId: debt.debtorId,
    reason: debt.reason || undefined,
    status: debt.status,
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/owner/debts/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Borç Düzenle</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Borç Bilgileri</CardTitle>
          <CardDescription>
            Borç bilgilerini güncellemek için aşağıdaki formu doldurun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DebtForm initialData={formattedDebt} />
        </CardContent>
      </Card>
    </div>
  );
}
