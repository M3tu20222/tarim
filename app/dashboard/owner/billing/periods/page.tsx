import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodsTable } from "@/components/billing/periods-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";

async function getPeriods() {
  // Bu kısım, gerçek API çağrısını simüle eder.
  // Gerçek implementasyonda, fetch veya bir API client kütüphanesi kullanılmalıdır.
  // Şimdilik, doğrudan prisma call yapacağız, çünkü bu bir server component.
  const { prisma } = await import("@/lib/prisma");
  try {
    const periods = await prisma.wellBillingPeriod.findMany({
      include: {
        well: {
          select: { name: true },
        },
      },
      orderBy: {
        startDate: "desc",
      },
    });
    return periods;
  } catch (error) {
    console.error("Failed to fetch periods:", error);
    return [];
  }
}

export default async function BillingPeriodsPage() {
  const periods = await getPeriods();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fatura Dönemleri</h1>
        <Button asChild>
          <Link href="/dashboard/owner/billing/periods/new">
            Yeni Dönem Ekle
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Kuyu Faturaları</CardTitle>
        </CardHeader>
        <CardContent>
          <PeriodsTable data={periods} />
        </CardContent>
      </Card>
    </div>
  );
}
