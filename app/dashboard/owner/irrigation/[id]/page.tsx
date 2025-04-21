import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export const metadata: Metadata = {
  title: "Sulama Kaydı Detayları | Tarım Yönetim Sistemi",
  description: "Sulama kaydı detayları sayfası",
};

interface IrrigationPageProps {
  params: {
    id: string;
  };
}

export default async function IrrigationPage({ params }: IrrigationPageProps) {
  const awaitedParams = await params;
  const { id } = awaitedParams;

  const irrigationLog = await prisma.irrigationLog.findUnique({
    where: { id: awaitedParams.id },
    include: {
      field: {
        select: {
          id: true,
          name: true,
          location: true,
          size: true,
        },
      },
      worker: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      // wellUsages ilişkisi IrrigationLog modelinde yok, kaldırıldı.
      // Kuyu bilgisi gerekiyorsa field ilişkisi üzerinden alınmalı.
      season: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!irrigationLog) {
    notFound();
  }

  // Sulama metodunu formatla
  const formatMethod = (method: string) => {
    switch (method) {
      case "DRIP":
        return "Damla Sulama";
      case "SPRINKLER":
        return "Yağmurlama";
      case "FLOOD":
        return "Salma Sulama";
      case "CENTER_PIVOT":
        return "Merkezi Pivot";
      case "OTHER":
        return "Diğer";
      default:
        return method;
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/owner/irrigation">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            Sulama Kaydı Detayları
          </h1>
        </div>
        <Button asChild>
          <Link href={`/dashboard/owner/irrigation/${irrigationLog.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Düzenle
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sulama Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Tarla</dt>
                <dd className="mt-1">{irrigationLog.field.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Konum</dt>
                <dd className="mt-1">{irrigationLog.field.location}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Tarih</dt>
                <dd className="mt-1">
                  {format(new Date(irrigationLog.date), "PPP", { locale: tr })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Miktar</dt>
                <dd className="mt-1">{irrigationLog.amount} litre</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Süre</dt>
                <dd className="mt-1">{irrigationLog.duration} dakika</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Metod</dt>
                <dd className="mt-1">
                  <Badge variant="outline">
                    {formatMethod(irrigationLog.method)}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">İşçi</dt>
                <dd className="mt-1">{irrigationLog.worker.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Sezon</dt>
                <dd className="mt-1">
                  {irrigationLog.season?.name || "Belirtilmemiş"}
                </dd>
              </div>
              {irrigationLog.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Notlar</dt>
                  <dd className="mt-1">{irrigationLog.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Kullanılan Kuyular kartı kaldırıldı çünkü wellUsages verisi yok */}
        {/* Gerekirse, kuyu bilgisi Field ilişkisi üzerinden gösterilebilir */}
      </div>
    </div>
  );
}
