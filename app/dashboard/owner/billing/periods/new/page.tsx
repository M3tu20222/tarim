import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewPeriodForm } from "@/components/billing/new-period-form";
import { prisma } from "@/lib/prisma";

async function getWells() {
  try {
    const wells = await prisma.well.findMany({
      select: { id: true, name: true },
    });
    return wells;
  } catch (error) {
    console.error("Failed to fetch wells:", error);
    return [];
  }
}

export default async function NewBillingPeriodPage() {
  const wells = await getWells();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Yeni Fatura Dönemi Ekle</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dönem Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <NewPeriodForm wells={wells} />
        </CardContent>
      </Card>
    </div>
  );
}
