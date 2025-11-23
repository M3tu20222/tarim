
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ArrowLeft, Calendar, Tractor, User } from "lucide-react";

import { getServerSideSession } from "@/lib/session";
import { cookies } from "next/headers";
import { getApiUrl } from "@/lib/api-url";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ProcessDetails } from "@/components/processes/process-details";
import { ProcessActions } from "@/components/processes/process-actions";

export const metadata: Metadata = {
  title: "İşlem Detayları",
  description: "Tarla işlem detaylarını görüntüleyin",
};

async function getProcess(id: string, userId: string, userRole: string) {
  try {
    // Cookie'leri al
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    // API isteği için header'ları hazırla
    const headers: HeadersInit = {};

    // Cookie başlığını ekle (eğer token varsa)
    if (token) {
      headers["Cookie"] = `token=${token}`;
    }

    // Server-side API çağrısı: Vercel'de çalışan tam URL kullan
    const url = getApiUrl(`/api/processes/${id}`);
    const response = await fetch(url, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error("Failed to fetch process");
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching process:", error);
    throw new Error("Failed to fetch process");
  }
}

function ProcessDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      <Separator />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function ProcessDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Next.js 13'te params.id async olarak await edilmeli
  const { id } = await params;

  const user = await getServerSideSession();

  if (!user) {
    notFound();
  }

  const process = await getProcess(id, user.id, user.role);

  if (!process) {
    notFound();
  }

  // İşlem tiplerini Türkçe'ye çevir
  const processTypeMap: Record<string, string> = {
    PLOWING: "Sürme",
    SEEDING: "Ekim",
    FERTILIZING: "Gübreleme",
    PESTICIDE: "İlaçlama",
    HARVESTING: "Hasat",
    OTHER: "Diğer",
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Button variant="outline" size="sm" className="mb-2" asChild>
            <a href="/dashboard/owner/processes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              İşlemler Listesine Dön
            </a>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {processTypeMap[process.type] || process.type} İşlemi
          </h1>
          <p className="text-muted-foreground">
            {process.field?.name} tarlasında yapılan işlem detayları
          </p>
        </div>
        <ProcessActions process={process} />
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>İşlem Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-2 py-1">
                {processTypeMap[process.type] || process.type}
              </Badge>
              {process.status && (
                <Badge
                  className={
                    process.status === "COMPLETED" || process.status === "FINALIZED"
                      ? "bg-green-500"
                      : process.status === "IN_PROGRESS"
                        ? "bg-blue-500"
                        : process.status === "DRAFT"
                          ? "bg-gray-500"
                          : process.status === "PENDING_INVENTORY_EQUIPMENT"
                            ? "bg-orange-500"
                            : "bg-yellow-500"
                  }
                >
                  {process.status === "COMPLETED" || process.status === "FINALIZED"
                    ? "Tamamlandı"
                    : process.status === "IN_PROGRESS"
                      ? "Devam Ediyor"
                      : process.status === "DRAFT"
                        ? "Taslak"
                        : process.status === "PENDING_INVENTORY_EQUIPMENT"
                          ? "Envanter Bekleniyor"
                          : "Planlandı"}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Tarla
                </p>
                <p>{process.field?.name || "Belirtilmemiş"}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  İşlenen Alan
                </p>
                <p>
                  {process.processedPercentage
                    ? `${process.processedPercentage}% (${(((process.field?.size || 0) * process.processedPercentage) / 100).toFixed(2)} dekar)`
                    : "Belirtilmemiş"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    İşlem Tarihi
                  </p>
                  <p>{format(new Date(process.date), "PPP", { locale: tr })}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    İşlemi Yapan
                  </p>
                  <p>{process.worker?.name || "Belirtilmemiş"}</p>
                </div>
              </div>

              {process.equipment && (
                <div className="col-span-2 flex items-center gap-2">
                  <Tractor className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Kullanılan Ekipman
                    </p>
                    <p>{process.equipment.name}</p>
                  </div>
                </div>
              )}
            </div>

            {process.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Açıklama
                </p>
                <p className="whitespace-pre-wrap">{process.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
          <ProcessDetails process={process} />
        </Suspense>
      </div>
    </div>
  );
}
