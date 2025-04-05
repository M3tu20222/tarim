import type { Metadata } from "next";
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
import { EquipmentForm } from "@/components/equipment/equipment-form";

export const metadata: Metadata = {
  title: "Ekipman Düzenle | Tarım Yönetim Sistemi",
  description: "Ekipman bilgilerini düzenleyin",
};

export default async function EditEquipmentPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  try {
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        capabilities: true,
        ownerships: true,
      },
    });

    if (!equipment) {
      notFound();
    }

    const formData = {
      ...equipment,
      capabilities: equipment.capabilities.map((c) => c.inventoryCategory),
      ownerships: equipment.ownerships,
    };

    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        {/* ... mevcut JSX ... */}
        <Card>
          <CardHeader>
            <CardTitle>Ekipman Bilgileri</CardTitle>
            <CardDescription>
              Ekipman bilgilerini güncellemek için aşağıdaki formu doldurun.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EquipmentForm initialData={formData} />
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Hata</h1>
        <p className="text-red-500">
          Ekipman bilgileri yüklenirken bir hata oluştu.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/owner/equipment">Geri Dön</Link>
        </Button>
      </div>
    );
  }
}