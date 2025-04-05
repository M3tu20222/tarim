import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { InventoryForm } from "@/components/inventory/inventory-form";

export default async function EditInventoryPage({
  params,
}: {
  params: { id: string };
}) {
  try {
    // params'ı await ile bekletelim
    const awaitedParams = await params;
    const inventoryId = awaitedParams.id;

    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!inventory) {
      notFound();
    }

    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/owner/inventory/${inventoryId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            Envanter Düzenle
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Envanter Bilgileri</CardTitle>
            <CardDescription>
              Envanter bilgilerini güncellemek için aşağıdaki formu doldurun.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InventoryForm initialData={inventory} />
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Hata</h1>
        <p className="text-red-500">
          Envanter bilgileri yüklenirken bir hata oluştu.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/owner/inventory">Geri Dön</Link>
        </Button>
      </div>
    );
  }
}
