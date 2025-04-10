import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Kuyu Detayları | Tarım Yönetim Sistemi",
  description: "Kuyu detayları sayfası",
};

interface WellPageProps {
  params: {
    id: string;
  };
}

export default async function WellPage({ params }: WellPageProps) {
  const awaitedParams = await params;
  const { id } = awaitedParams;
  const well = await prisma.well.findUnique({
    where: { id: awaitedParams.id },
    // Güncellendi: field -> fieldWells
    include: {
      fieldWells: { 
        include: {
          field: { // fieldWells içindeki field'ı dahil et
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

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/owner/wells">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{well.name}</h1>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/owner/wells/${well.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Düzenle
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kuyu Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Derinlik</p>
                <p className="text-sm text-muted-foreground">
                  {well.depth} metre
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Kapasite</p>
                <p className="text-sm text-muted-foreground">
                  {well.capacity} litre/saat
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Durum</p>
                <p className="text-sm text-muted-foreground">{well.status}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Oluşturulma Tarihi</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(well.createdAt).toLocaleDateString("tr-TR")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            {/* Güncellendi: Bağlı Tarla -> Bağlı Tarlalar */}
            <CardTitle>Bağlı Tarlalar</CardTitle> 
          </CardHeader>
          <CardContent>
            {/* Güncellendi: well.field kontrolü -> well.fieldWells kontrolü ve map */}
            {!well.fieldWells || well.fieldWells.length === 0 ? ( 
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Bu kuyuya henüz tarla bağlanmamış.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* well.fieldWells dizisi üzerinde dön */}
                {well.fieldWells.map((fieldWell) => ( 
                  <div
                    key={fieldWell.field.id} // fieldWell içindeki field'ın id'si
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      {/* fieldWell içindeki field'ın adı */}
                      <p className="font-medium">{fieldWell.field.name}</p> 
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      {/* fieldWell içindeki field'ın id'sine link */}
                      <Link href={`/dashboard/owner/fields/${fieldWell.field.id}`}> 
                        Detaylar
                      </Link>
                    </Button>
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
