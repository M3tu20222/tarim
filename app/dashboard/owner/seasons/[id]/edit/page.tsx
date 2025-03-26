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
import { SeasonForm } from "@/components/seasons/season-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Sezon Düzenle | Tarım Yönetim Sistemi",
  description: "Sezon düzenleme sayfası",
};

interface EditSeasonPageProps {
  params: {
    id: string;
  };
}

export default async function EditSeasonPage({ params }: EditSeasonPageProps) {
  const awaitedParams = await params;
  const season = await prisma.season.findUnique({
    where: { id: awaitedParams.id },
  });

  if (!season) {
    notFound();
  }

  // Prisma'dan gelen null değerini undefined'a dönüştürüyoruz
  const formattedSeason = {
    id: season.id,
    name: season.name,
    startDate: season.startDate,
    endDate: season.endDate,
    description: season.description || undefined, // null ise undefined'a dönüştür
    isActive: season.isActive,
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/owner/seasons">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Sezon Düzenle</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sezon Bilgileri</CardTitle>
          <CardDescription>
            Sezon bilgilerini güncellemek için aşağıdaki formu doldurun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SeasonForm initialData={formattedSeason} />
        </CardContent>
      </Card>
    </div>
  );
}
