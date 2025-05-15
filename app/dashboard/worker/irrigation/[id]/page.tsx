import type { Metadata } from "next";
import { getServerSideSession } from "@/lib/session"; // Değiştirildi: lib/auth -> lib/session, getUserFromCookie -> getServerSideSession ve tırnaklar düzeltildi
import { prisma } from "@/lib/prisma"; // Tırnaklar düzeltildi ve @/ eklendi
import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button"; // Tırnaklar düzeltildi ve @/ eklendi
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Tırnaklar düzeltildi ve @/ eklendi
import { Badge } from "@/components/ui/badge"; // Tırnaklar düzeltildi ve @/ eklendi
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Tırnaklar düzeltildi ve @/ eklendi
import { Calendar, ChevronLeft, Clock, Droplet } from "lucide-react";
import Link from "next/link";

// Add route segment config to explicitly mark this route as dynamic
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Sulama Detayı | Çiftlik Yönetimi",
  description: "Sulama detayları",
};

async function getIrrigationData(irrigationId: string, userId: string) {
  try {
    // Get worker's assigned well
    const workerWellAssignment = await prisma.workerWellAssignment.findFirst({
      where: { workerId: userId },
    });

    if (!workerWellAssignment) {
      return null;
    }

    // Get irrigation details
    const irrigation = await prisma.irrigationLog.findUnique({
      where: { id: irrigationId },
      include: {
        well: true,
        season: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        fieldUsages: {
          include: {
            field: {
              include: {
                fieldWells: true,
              },
            },
            ownerUsages: {
              include: {
                owner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        inventoryUsages: {
          include: {
            inventory: true,
            ownerUsages: {
              include: {
                owner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!irrigation) {
      return null;
    }

    // Check if the irrigation is related to the worker's well or created by the worker
    if (
      irrigation.wellId !== workerWellAssignment.wellId &&
      irrigation.createdBy !== userId
    ) {
      // Check if any of the fields are connected to the worker's well
      const fieldConnectedToWell = irrigation.fieldUsages.some((fieldUsage) =>
        fieldUsage.field.fieldWells.some(
          (fieldWell) => fieldWell.wellId === workerWellAssignment.wellId
        )
      );

      if (!fieldConnectedToWell) {
        return null;
      }
    }

    return irrigation;
  } catch (error) {
    console.error("Error fetching irrigation data:", error);
    return null;
  }
}

export default async function WorkerIrrigationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Next.js 13+ için params nesnesini await etmemize gerek yok,
  // ancak params.id'yi doğrudan kullanmak yerine bir değişkene atayalım
  const id = params.id;

  // Eğer ID "new" ise, bu sayfa yeni kayıt oluşturmak için değil,
  // var olan bir kaydın detayını göstermek içindir.
  // Bu nedenle notFound() çağırarak 404 sayfasına yönlendiriyoruz.
  // Yeni kayıt oluşturma için ayrı bir sayfa (örn: /dashboard/worker/irrigation/new/page.tsx veya /create)
  // veya bu sayfada bir form gösterimi düşünülebilir. Şimdilik en basit çözüm notFound().
  if (id === "new") {
    notFound();
    return; // notFound() çağrıldıktan sonra fonksiyonun geri kalanının çalışmaması için return ekliyoruz.
  }

  const user = await getServerSideSession(); // Değiştirildi: getUserFromCookie -> getServerSideSession

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "WORKER") {
    redirect("/dashboard");
  }

  const irrigation = await getIrrigationData(id, user.id);

  if (!irrigation) {
    notFound();
  }

  // Durum badge'i
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="success">Tamamlandı</Badge>;
      case "PLANNED":
        return <Badge variant="warning">Planlandı</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">İptal Edildi</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Sahip bazlı envanter kullanımını hesapla
  const ownerInventoryUsage: Record<
    string,
    {
      ownerId: string;
      name: string;
      email: string;
      items: Record<
        string,
        { name: string; quantity: number; unit: string; cost: number }
      >;
    }
  > = {};

  for (const usage of irrigation.inventoryUsages) {
    for (const ownerUsage of usage.ownerUsages) {
      if (!ownerInventoryUsage[ownerUsage.ownerId]) {
        ownerInventoryUsage[ownerUsage.ownerId] = {
          ownerId: ownerUsage.ownerId,
          name: ownerUsage.owner.name,
          email: ownerUsage.owner.email,
          items: {},
        };
      }

      if (!ownerInventoryUsage[ownerUsage.ownerId].items[usage.inventoryId]) {
        ownerInventoryUsage[ownerUsage.ownerId].items[usage.inventoryId] = {
          name: usage.inventory.name,
          quantity: 0,
          unit: usage.inventory.unit,
          cost: 0,
        };
      }

      ownerInventoryUsage[ownerUsage.ownerId].items[
        usage.inventoryId
      ].quantity += ownerUsage.quantity;
      ownerInventoryUsage[ownerUsage.ownerId].items[usage.inventoryId].cost +=
        ownerUsage.cost;
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/worker">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Geri
          </Button>
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Sulama Detayı</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Temel Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Sulama Tarihi
                </h3>
                <p className="flex items-center mt-1">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  {format(new Date(irrigation.startDateTime), "dd MMMM yyyy", {
                    locale: tr,
                  })}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Başlangıç Saati
                </h3>
                <p className="flex items-center mt-1">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  {format(new Date(irrigation.startDateTime), "HH:mm", {
                    locale: tr,
                  })}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Süre
                </h3>
                <p className="flex items-center mt-1">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  {Math.floor(irrigation.duration / 60)}s{" "}
                  {irrigation.duration % 60}dk
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Durum
                </h3>
                <div className="mt-1">{getStatusBadge(irrigation.status)}</div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Kuyu
                </h3>
                <p className="flex items-center mt-1">
                  <Droplet className="mr-2 h-4 w-4 text-muted-foreground" />
                  {irrigation.well?.name || "-"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Sezon
                </h3>
                <p className="mt-1">{irrigation.season?.name || "-"}</p>
              </div>
              <div className="col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Notlar
                </h3>
                <p className="mt-1">{irrigation.notes || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarla Kullanımı</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarla</TableHead>
                  <TableHead>Yüzde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {irrigation.fieldUsages.map((usage) => (
                  <TableRow key={usage.id}>
                    <TableCell>{usage.field.name}</TableCell>
                    <TableCell>%{usage.percentage}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {irrigation.inventoryUsages.length > 0 && (
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Envanter Kullanımı</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Envanter</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead>Birim Fiyat</TableHead>
                    <TableHead>Toplam Maliyet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {irrigation.inventoryUsages.map((usage) => (
                    <TableRow key={usage.id}>
                      <TableCell>{usage.inventory.name}</TableCell>
                      <TableCell>
                        {usage.quantity} {usage.inventory.unit}
                      </TableCell>
                      <TableCell>{usage.unitPrice.toFixed(2)} TL</TableCell>
                      <TableCell>{usage.totalCost.toFixed(2)} TL</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {Object.keys(ownerInventoryUsage).length > 0 && (
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Sahip Bazlı Envanter Kullanımı</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.values(ownerInventoryUsage).map((owner) => (
                <div key={owner.ownerId} className="mb-6">
                  <h3 className="text-lg font-medium mb-2">
                    {owner.name} ({owner.email})
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Envanter</TableHead>
                        <TableHead>Miktar</TableHead>
                        <TableHead>Maliyet</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.values(owner.items).map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>
                            {item.quantity.toFixed(2)} {item.unit}
                          </TableCell>
                          <TableCell>{item.cost.toFixed(2)} TL</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
