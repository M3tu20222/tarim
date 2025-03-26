import Link from "next/link";
import { CardFooter } from "@/components/ui/card";
import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Overview } from "@/components/dashboard/overview";
import { RecentSales } from "@/components/dashboard/recent-sales";
import { Button } from "@/components/ui/button";
import { CalendarDateRangePicker } from "@/components/date-range-picker";
import { prisma } from "@/lib/prisma";
import type { DebtStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "Genel Bakış | Tarım Yönetim Sistemi",
  description: "Tarım yönetim sistemi genel bakış sayfası",
};

export default async function DashboardPage() {
  // Özet istatistikleri getir
  const totalFields = await prisma.field.count();
  const totalCrops = await prisma.crop.count();
  const totalUsers = await prisma.user.count();

  // Aktif sezonu getir
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
  });

  // Vadesi yaklaşan borçları getir (7 gün içinde)
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  const upcomingDebts = await prisma.debt.findMany({
    where: {
      dueDate: {
        gte: new Date(),
        lte: sevenDaysLater,
      },
      status: { in: ["PENDING", "PARTIALLY_PAID"] },
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
      paymentHistory: true,
    },
    orderBy: { dueDate: "asc" },
    take: 5,
  });

  // Borçları DebtList bileşeninin beklediği formata dönüştür
  const formattedDebts = upcomingDebts.map((debt) => ({
    id: debt.id,
    amount: debt.amount,
    dueDate: debt.dueDate.toISOString(),
    status: debt.status as DebtStatus,
    description: debt.description || undefined, // null değerleri undefined'a dönüştür
    reason: debt.reason || undefined, // null değerleri undefined'a dönüştür
    paymentDate: debt.paymentDate?.toISOString() || undefined, // null değerleri undefined'a dönüştür
    reminderSent: debt.reminderSent,
    lastReminderDate: debt.lastReminderDate?.toISOString() || undefined, // null değerleri undefined'a dönüştür
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
      notes: payment.notes || undefined, // null değerleri undefined'a dönüştür
    })),
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Genel Bakış</h2>
        <div className="flex items-center space-x-2">
          <CalendarDateRangePicker />
          <Button>İndir</Button>
        </div>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="analytics">Analitik</TabsTrigger>
          <TabsTrigger value="reports">Raporlar</TabsTrigger>
          <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Toplam Tarla
                </CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalFields}</div>
                <p className="text-xs text-muted-foreground">
                  {activeSeason
                    ? `${activeSeason.name} sezonu`
                    : "Aktif sezon yok"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Toplam Ekin
                </CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCrops}</div>
                <p className="text-xs text-muted-foreground">
                  {activeSeason
                    ? `${activeSeason.name} sezonu`
                    : "Aktif sezon yok"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Toplam Kullanıcı
                </CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Aktif kullanıcılar
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Aktif Abonelikler
                </CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+1</div>
                <p className="text-xs text-muted-foreground">Temel Plan</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Genel Bakış</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Son Satışlar</CardTitle>
                <CardDescription>Bu ay 16 satış yaptınız.</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentSales />
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>Yaklaşan Borç Ödemeleri</CardTitle>
                <CardDescription>
                  Önümüzdeki 7 gün içinde vadesi dolacak borçlar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* DebtList bileşenini import etmek yerine doğrudan kullanıyoruz */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {formattedDebts.length > 0 ? (
                    formattedDebts.map((debt) => (
                      <Card
                        key={debt.id}
                        className={
                          debt.status === "OVERDUE" ? "border-red-500" : ""
                        }
                      >
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">
                              {new Intl.NumberFormat("tr-TR", {
                                style: "currency",
                                currency: "TRY",
                              }).format(debt.amount)}
                            </CardTitle>
                          </div>
                          <CardDescription>
                            <div className="flex flex-col gap-1 mt-1">
                              <div className="flex justify-between">
                                <span>Alacaklı:</span>
                                <span className="font-medium">
                                  {debt.creditor.name}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Borçlu:</span>
                                <span className="font-medium">
                                  {debt.debtor.name}
                                </span>
                              </div>
                            </div>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Vade Tarihi:
                              </span>
                              <span>
                                {new Date(debt.dueDate).toLocaleDateString(
                                  "tr-TR"
                                )}
                              </span>
                            </div>
                            {debt.description && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">
                                  Açıklama:
                                </span>
                                <p className="line-clamp-1">
                                  {debt.description}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="w-full"
                          >
                            <Link href={`/dashboard/owner/debts/${debt.id}`}>
                              Detaylar
                            </Link>
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-3 flex flex-col items-center justify-center p-8 border rounded-lg">
                      <h3 className="text-xl font-semibold mb-2">
                        Yaklaşan borç bulunmuyor
                      </h3>
                      <p className="text-muted-foreground mb-4 text-center">
                        Önümüzdeki 7 gün içinde vadesi dolacak borç bulunmuyor.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
