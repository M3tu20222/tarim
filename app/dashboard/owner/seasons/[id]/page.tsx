import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  Edit,
  MapPin,
  Tractor,
  DropletIcon,
  ShoppingCart,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sezon Detayları | Tarım Yönetim Sistemi",
  description: "Sezon detayları sayfası",
};

interface SeasonPageProps {
  params: {
    id: string;
  };
}

export default async function SeasonPage({ params }: SeasonPageProps) {
  const awaitedParams = await params;
  const { id } = awaitedParams;
  const season = await prisma.season.findUnique({
    where: { id: awaitedParams.id },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      fields: true,
      crops: true,
      purchases: true,
      processes: true,
      irrigationLogs: true,
    },
  });

  if (!season) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/owner/seasons">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{season.name}</h1>
          {season.isActive && (
            <Badge
              variant="outline"
              className="bg-green-500/10 text-green-500 border-green-500"
            >
              Aktif
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/owner/seasons/${season.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Düzenle
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sezon Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Tarih Aralığı</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(season.startDate)} -{" "}
                    {formatDate(season.endDate)}
                  </p>
                </div>
              </div>
              {season.description && (
                <div>
                  <p className="text-sm font-medium">Açıklama</p>
                  <p className="text-sm text-muted-foreground">
                    {season.description}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium">Oluşturan</p>
                <p className="text-sm text-muted-foreground">
                  {season.creator.name}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Oluşturulma Tarihi</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(season.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sezon İstatistikleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                <MapPin className="h-8 w-8 text-blue-500 mb-2" />
                <p className="text-2xl font-bold">{season.fields.length}</p>
                <p className="text-sm text-muted-foreground">Tarla</p>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                <Tractor className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-2xl font-bold">{season.crops.length}</p>
                <p className="text-sm text-muted-foreground">Ekin</p>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                <DropletIcon className="h-8 w-8 text-cyan-500 mb-2" />
                <p className="text-2xl font-bold">
                  {season.irrigationLogs.length}
                </p>
                <p className="text-sm text-muted-foreground">Sulama</p>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                <ShoppingCart className="h-8 w-8 text-purple-500 mb-2" />
                <p className="text-2xl font-bold">{season.purchases.length}</p>
                <p className="text-sm text-muted-foreground">Alış</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Tarlalar</CardTitle>
            <CardDescription>Bu sezona ait tarlalar</CardDescription>
          </CardHeader>
          <CardContent>
            {season.fields.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Bu sezona ait tarla bulunmuyor.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {season.fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{field.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {field.location}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/owner/fields/${field.id}`}>
                        Detaylar
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ekinler</CardTitle>
            <CardDescription>Bu sezona ait ekinler</CardDescription>
          </CardHeader>
          <CardContent>
            {season.crops.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Bu sezona ait ekin bulunmuyor.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {season.crops.map((crop) => (
                  <div
                    key={crop.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{crop.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Ekim: {formatDate(crop.plantedDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
