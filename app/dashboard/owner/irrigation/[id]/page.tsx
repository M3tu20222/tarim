import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar, Clock, Droplet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

const prisma = new PrismaClient();

// Helper function to round to 2 decimal places
const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

async function getIrrigationLog(id: string) {
  try {
    const irrigationLog = await prisma.irrigationLog.findUnique({
      where: { id },
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
              select: { // Select only necessary fields
                id: true,
                name: true,
              }
            },
            // ownerUsages are not directly needed here if summarized later
          },
        },
        inventoryUsages: {
          // Use select to explicitly get cost fields
          select: {
            id: true,
            quantity: true,
            unitPrice: true, // Select unitPrice
            totalCost: true, // Select totalCost
            inventory: { // Select necessary inventory details
              select: {
                id: true,
                name: true,
                unit: true,
              }
            },
            ownerUsages: { // Select necessary owner usage details
              select: {
                id: true,
                ownerId: true,
                quantity: true,
                cost: true, // Select cost
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
        // Include ownerSummaries if needed for display (optional here if calculated below)
        // ownerSummaries: {
        //   include: {
        //     owner: { select: { id: true, name: true, email: true } },
        //   },
        // },
      },
    });

    // Type assertion to help TypeScript understand the selected structure
    // This might be necessary depending on strictness settings
    // type IrrigationLogWithDetails = Prisma.PromiseReturnType<typeof getIrrigationLog>;

    return irrigationLog;
  } catch (error) {
    console.error("Error fetching irrigation log:", error);
    return null;
  }
}

export default async function IrrigationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Fix 1: Assign params.id to a variable before using it
 const { id } = await params;
 const irrigationLog = await getIrrigationLog(id);

  if (!irrigationLog) {
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

  // Sahip bazlı envanter kullanımını hesapla (Prisma'dan gelen verilerle)
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

  // Ensure inventoryUsages is not null or undefined before iterating
  if (irrigationLog.inventoryUsages) {
    for (const usage of irrigationLog.inventoryUsages) {
      // Ensure ownerUsages is not null or undefined
      if (usage.ownerUsages) {
        for (const ownerUsage of usage.ownerUsages) {
          if (!ownerInventoryUsage[ownerUsage.ownerId]) {
            ownerInventoryUsage[ownerUsage.ownerId] = {
              ownerId: ownerUsage.ownerId,
              name: ownerUsage.owner.name,
              email: ownerUsage.owner.email,
              items: {},
            };
          }

          const inventoryId = usage.inventory.id; // Get inventory ID from the selected inventory data
          if (!ownerInventoryUsage[ownerUsage.ownerId].items[inventoryId]) {
            ownerInventoryUsage[ownerUsage.ownerId].items[inventoryId] = {
              name: usage.inventory.name,
              quantity: 0,
              unit: usage.inventory.unit,
              cost: 0,
            };
          }

          ownerInventoryUsage[ownerUsage.ownerId].items[inventoryId].quantity +=
            ownerUsage.quantity;
          // Use the cost directly from the selected ownerUsage data
          ownerInventoryUsage[ownerUsage.ownerId].items[inventoryId].cost +=
            ownerUsage.cost;
        }
      }
    }
  }


  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sulama Kaydı Detayı</h1>
        <div className="space-x-2">
          <Button asChild>
            {/* Fix 1: Use the 'id' variable */}
            <Link href={`/dashboard/owner/irrigation/${id}/edit`}>
              Düzenle
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/owner/irrigation">Listeye Dön</Link>
          </Button>
        </div>
      </div>

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
                  {format(
                    new Date(irrigationLog.startDateTime),
                    "dd MMMM yyyy",
                    { locale: tr }
                  )}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Başlangıç Saati
                </h3>
                <p className="flex items-center mt-1">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  {format(new Date(irrigationLog.startDateTime), "HH:mm", {
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
                  {Math.floor(irrigationLog.duration / 60)}s{" "}
                  {irrigationLog.duration % 60}dk
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Durum
                </h3>
                {/* Fix 2: Change <p> to <div> to avoid hydration error */}
                <div className="mt-1">{getStatusBadge(irrigationLog.status)}</div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Kuyu
                </h3>
                <p className="flex items-center mt-1">
                  <Droplet className="mr-2 h-4 w-4 text-muted-foreground" />
                  {irrigationLog.well?.name || "-"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Sezon
                </h3>
                <p className="mt-1">{irrigationLog.season?.name || "-"}</p>
              </div>
              <div className="col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Notlar
                </h3>
                <p className="mt-1">{irrigationLog.notes || "-"}</p>
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
                {irrigationLog.fieldUsages.map((usage) => (
                  <TableRow key={usage.id}>
                    <TableCell>{usage.field.name}</TableCell>
                    <TableCell>%{usage.percentage}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {irrigationLog.inventoryUsages && irrigationLog.inventoryUsages.length > 0 && (
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
                  {irrigationLog.inventoryUsages.map((usage) => (
                    <TableRow key={usage.id}>
                      <TableCell>{usage.inventory.name}</TableCell>
                      <TableCell>
                        {/* Use round for quantity if needed */}
                        {round(usage.quantity)} {usage.inventory.unit}
                      </TableCell>
                      {/* Fix 3: Use the selected unitPrice and totalCost */}
                      <TableCell>{round(usage.unitPrice).toFixed(2)} TL</TableCell>
                      <TableCell>{round(usage.totalCost).toFixed(2)} TL</TableCell>
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
                            {round(item.quantity).toFixed(2)} {item.unit}
                          </TableCell>
                          {/* Fix 3: Use the calculated cost */}
                          <TableCell>{round(item.cost).toFixed(2)} TL</TableCell>
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
