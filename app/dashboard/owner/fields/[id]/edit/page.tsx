import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import { NewFieldForm } from "@/components/fields/new-field-form";

export const metadata: Metadata = {
  title: "Tarla Düzenle | Tarım Yönetim Sistemi",
  description: "Tarla düzenleme sayfası",
};

interface EditFieldPageProps {
  params: {
    id: string;
  };
}

export default async function EditFieldPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const field = await prisma.field.findUnique({
      where: { id },
      include: {
        owners: true,
        season: true,
        crops: true,
        wells: true,
      },
    });

    if (!field) {
      notFound();
    }

    const formattedField = {
      ...field,
      ownerships: field.owners.map((owner) => ({
        userId: owner.userId,
        percentage: owner.percentage,
      })),
      wellId: field.wells && field.wells.length > 0 ? field.wells[0].id : "",
    };

    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/owner/fields/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Tarla Düzenle</h1>
        </div>
        {/* ... devam ... */}

        <Card>
          <CardHeader>
            <CardTitle>Tarla Bilgileri</CardTitle>
            <CardDescription>
              Tarla bilgilerini güncellemek için aşağıdaki formu doldurun.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NewFieldForm initialData={formattedField} />
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error("Error fetching field:", error);
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Hata</h1>
        <p className="text-red-500">
          Tarla bilgileri yüklenirken bir hata oluştu.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/owner/fields">Geri Dön</Link>
        </Button>
      </div>
    );
  }
}
