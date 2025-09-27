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
import { WellForm } from "@/components/wells/well-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Kuyu Düzenle | Tarım Yönetim Sistemi",
  description: "Kuyu düzenleme sayfası",
};

interface EditWellPageProps {
  params: {
    id: string;
  };
}

export default async function EditWellPage({ params }: EditWellPageProps) {
  const awaitedParams = await params;
  const well = await prisma.well.findUnique({
    where: { id: awaitedParams.id },
    include: {
      fieldWells: {
        select: {
          field: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!well) {
    notFound();
  }

  // Prisma'dan gelen null değerini undefined'a dönüştürüyoruz
  const formattedWell = {
    id: well.id,
    name: well.name,
    depth: well.depth,
    capacity: well.capacity,
    latitude: well.latitude ?? null,
    longitude: well.longitude ?? null,
    status: well.status,
    fieldIds: well.fieldWells.map((fw) => fw.field.id),
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/owner/wells">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Kuyu Düzenle</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kuyu Bilgileri</CardTitle>
          <CardDescription>
            Kuyu bilgilerini güncellemek için aşağıdaki formu doldurun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Düzeltildi: initialData -> defaultValues */}
          <WellForm wellId={well.id} defaultValues={formattedWell} />
        </CardContent>
      </Card>
    </div>
  );
}

