import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, ArrowUpRight, ArrowDownRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Borçlar | Tarım Yönetim Sistemi",
  description: "Tarım Yönetim Sistemi borç yönetimi",
};

export default async function DebtsPage() {
  // Kullanıcının borçları
  const myDebts = await prisma.debt.findMany({
    where: {
      debtorId: "user-1", // Gerçek uygulamada oturum açmış kullanıcının ID'si olmalı
      status: "PENDING",
    },
    include: {
      creditor: true,
      purchase: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Kullanıcının alacakları
  const myCredits = await prisma.debt.findMany({
    where: {
      creditorId: "user-1", // Gerçek uygulamada oturum açmış kullanıcının ID'si olmalı
      status: "PENDING",
    },
    include: {
      debtor: true,
      purchase: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Toplam borç
  const totalDebt = myDebts.reduce((sum, debt) => sum + debt.amount, 0);

  // Toplam alacak
  const totalCredit = myCredits.reduce((sum, debt) => sum + debt.amount, 0);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Borç Yönetimi</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Borç</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalDebt)}
            </div>
            <p className="text-xs text-muted-foreground">
              {myDebts.length} borç kaydı
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Alacak</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalCredit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {myCredits.length} alacak kaydı
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Durum</CardTitle>
            {totalCredit > totalDebt ? (
              <ArrowDownRight className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowUpRight className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalCredit - totalDebt)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalCredit > totalDebt ? "Alacak fazlası" : "Borç fazlası"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="debts" className="w-full">
        <TabsList>
          <TabsTrigger value="debts">Borçlarım</TabsTrigger>
          <TabsTrigger value="credits">Alacaklarım</TabsTrigger>
        </TabsList>
        <TabsContent value="debts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Borçlarım</CardTitle>
              <CardDescription>
                Ödemeniz gereken borçların listesi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myDebts.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                  <p className="text-sm text-muted-foreground">
                    Bekleyen borcunuz bulunmamaktadır.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myDebts.map((debt) => (
                    <div
                      key={debt.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {debt.purchase?.product || "Borç"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Alacaklı: {debt.creditor.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Oluşturulma: {formatDate(debt.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-semibold text-red-500"
                        >
                          {formatCurrency(debt.amount)}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <CreditCard className="mr-2 h-4 w-4" />
                          Öde
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="credits" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Alacaklarım</CardTitle>
              <CardDescription>
                Size ödenmesi gereken alacakların listesi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myCredits.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                  <p className="text-sm text-muted-foreground">
                    Bekleyen alacağınız bulunmamaktadır.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myCredits.map((debt) => (
                    <div
                      key={debt.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {debt.purchase?.product || "Alacak"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Borçlu: {debt.debtor.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Oluşturulma: {formatDate(debt.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-semibold text-green-500"
                        >
                          {formatCurrency(debt.amount)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
