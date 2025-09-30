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
import WeatherRiskDashboard from "@/components/weather/weather-risk-dashboard";
import { IrrigationAIDashboard } from "@/components/irrigation/irrigation-ai-dashboard";
import { prisma } from "@/lib/prisma";
import type { DebtStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "Genel Bakis | Tarim Yonetim Sistemi",
  description: "Tarim yonetim sistemi genel bakis sayfasi",
};

export default async function DashboardPage() {
  // Ozet istatistikleri getir
  const totalFields = await prisma.field.count();
  const totalCrops = await prisma.crop.count();
  const totalUsers = await prisma.user.count();

  // Aktif sezonu getir
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
  });

  const weatherFieldWithRecentData = await prisma.field.findFirst({
    where: {
      weatherDailySummaries: {
        some: {},
      },
      crops: {
        some: {
          status: { notIn: ["HARVESTED"] },
        },
      },
    },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  let weatherField = weatherFieldWithRecentData;

  if (!weatherField) {
    weatherField = await prisma.field.findFirst({
      where: {
        OR: [
          { coordinates: { not: null } },
          {
            fieldWells: {
              some: {
                well: {
                  latitude: { not: null },
                  longitude: { not: null },
                },
              },
            },
          },
        ],
      },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!weatherField) {
    weatherField = await prisma.field.findFirst({
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });
  }

  // Vadesi yaklasan borclari getir (7 gun icinde)
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

  // Borclari DebtList bileseninin bekledigi formata donustur
  const formattedDebts = upcomingDebts.map((debt) => ({
    id: debt.id,
    amount: debt.amount,
    dueDate: debt.dueDate.toISOString(),
    status: debt.status as DebtStatus,
    description: debt.description || undefined, // null degerleri undefined'a donustur
    reason: debt.reason || undefined, // null degerleri undefined'a donustur
    paymentDate: debt.paymentDate?.toISOString() || undefined, // null degerleri undefined'a donustur
    reminderSent: debt.reminderSent,
    lastReminderDate: debt.lastReminderDate?.toISOString() || undefined, // null degerleri undefined'a donustur
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
      notes: payment.notes || undefined, // null degerleri undefined'a donustur
    })),
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Genel Bakis</h2>
        <div className="flex items-center space-x-2">
          <Button>Indir</Button>
        </div>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Genel Bakis</TabsTrigger>
          <TabsTrigger value="risk">⚠️ Risk Analizi</TabsTrigger>
          <TabsTrigger value="analytics">Analitik</TabsTrigger>
          <TabsTrigger value="reports">Raporlar</TabsTrigger>
          <TabsTrigger value="ai-irrigation">🤖 AI Sulama</TabsTrigger>
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
                  Toplam Kullanici
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
                  Aktif kullanicilar
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
                <CardTitle>Genel Bakis</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Son Satislar</CardTitle>
                <CardDescription>Bu ay 16 satis yaptiniz.</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentSales />
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>Yaklasan Borc Odemeleri</CardTitle>
                <CardDescription>
                  Onumuzdeki 7 gun icinde vadesi dolacak borclar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* DebtList bilesenini import etmek yerine dogrudan kullaniyoruz */}
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
                                <span>Alacakli:</span>
                                <span className="font-medium">
                                  {debt.creditor.name}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Borclu:</span>
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
                                  Aciklama:
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
                        Yaklasan borc bulunmuyor
                      </h3>
                      <p className="text-muted-foreground mb-4 text-center">
                        Onumuzdeki 7 gun icinde vadesi dolacak borc bulunmuyor.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          {weatherField ? (
            <WeatherRiskDashboard fieldId={weatherField.id} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Risk Analizi</CardTitle>
                <CardDescription>
                  Risk analizi yapmak için koordinat bilgisi girilmis bir tarla ekleyin.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai-irrigation" className="space-y-4">
          <IrrigationAIDashboard
            totalFields={totalFields}
            totalCrops={totalCrops}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}



