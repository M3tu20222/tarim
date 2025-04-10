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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tarla Detayları | Tarım Yönetim Sistemi",
  description: "Tarla detayları sayfası",
};

interface FieldPageProps {
  params: {
    id: string;
  };
}

export default async function FieldPage({ params }: FieldPageProps) {
  const awaitedParams = await params;
  const { id } = awaitedParams;
  const field = await prisma.field.findUnique({
    where: { id: awaitedParams.id },
    include: {
      owners: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      season: true,
      crops: true,
      wells: true,
      irrigationLogs: {
        take: 5,
        orderBy: {
          date: "desc",
        },
      },
      processingLogs: {
        take: 5,
        orderBy: {
          date: "desc",
        },
      },
    },
  });

  if (!field) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/owner/fields">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{field.name}</h1>
          <Badge variant="outline" className="ml-2">
            {field.status}
          </Badge>
        </div>
        <Button asChild>
          <Link href={`/dashboard/owner/fields/${field.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Düzenle
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tarla Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Konum</dt>
                <dd className="mt-1">{field.location}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Alan</dt>
                <dd className="mt-1">{field.size} dekar</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Sezon</dt>
                <dd className="mt-1">
                  {field.season?.name || "Belirtilmemiş"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Oluşturulma Tarihi
                </dt>
                <dd className="mt-1">{formatDate(field.createdAt)}</dd>
              </div>
              {field.coordinates && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">
                    Koordinatlar
                  </dt>
                  <dd className="mt-1">{field.coordinates}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sahiplik Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            {field.owners.length === 0 ? (
              <p className="text-sm text-gray-500">
                Sahiplik bilgisi bulunamadı.
              </p>
            ) : (
              <ul className="space-y-4">
                {field.owners.map((ownership) => (
                  <li
                    key={ownership.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{ownership.user.name}</p>
                      <p className="text-sm text-gray-500">
                        {ownership.user.email}
                      </p>
                    </div>
                    <Badge>%{ownership.percentage}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Ekinler</CardTitle>
            <CardDescription>Bu tarlada yetiştirilen ekinler</CardDescription>
          </CardHeader>
          <CardContent>
            {field.crops.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Bu tarlada henüz ekin bulunmuyor.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {field.crops.map((crop) => (
                  <div
                    key={crop.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{crop.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Ekim: {formatDate(crop.plantedDate)} | Hasat:{" "}
                        {crop.harvestDate
                          ? formatDate(crop.harvestDate)
                          : "Belirtilmemiş"}
                      </p>
                    </div>
                    <Badge variant="outline">{crop.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kuyular</CardTitle>
            <CardDescription>Bu tarlada bulunan kuyular</CardDescription>
          </CardHeader>
          <CardContent>
            {field.wells.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Bu tarlada henüz kuyu bulunmuyor.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {field.wells.map((well) => (
                  <div
                    key={well.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{well.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Derinlik: {well.depth}m | Kapasite: {well.capacity}{" "}
                        lt/sa
                      </p>
                    </div>
                    <Badge variant="outline">{well.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Son Sulama İşlemleri</CardTitle>
          </CardHeader>
          <CardContent>
            {field.irrigationLogs.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Bu tarlada henüz sulama işlemi yapılmamış.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {field.irrigationLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{formatDate(log.date)}</p>
                      <p className="text-sm text-muted-foreground">
                        Miktar: {log.amount} {log.method} | Süre: {log.duration}{" "}
                        dakika
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Son İşlemler</CardTitle>
          </CardHeader>
          <CardContent>
            {field.processingLogs.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Bu tarlada henüz işlem yapılmamış.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {field.processingLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{formatDate(log.date)}</p>
                      <p className="text-sm text-muted-foreground">
                        Tür: {log.processType} | Süre: {log.duration} dakika
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
