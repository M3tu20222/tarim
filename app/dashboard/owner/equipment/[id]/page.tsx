import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export async function generateMetadata(
  _props: { params: { id: string } }
): Promise<Metadata> {
  return {
    title: "Ekipman Detayları | Tarım Yönetim Sistemi",
    description: "Ekipman detaylarını görüntüleyin",
  };
}

// Ekipman tipi enum değerlerini Türkçe etiketlere dönüştür
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    SEEDING: "Ekim",
    TILLAGE: "Toprak İşleme",
    SPRAYING: "İlaçlama",
    FERTILIZING: "Gübreleme",
    HARVESTING: "Hasat",
    OTHER: "Diğer",
  };
  return labels[type] || type;
}

// Durum enum değerlerini Türkçe etiketlere dönüştür
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Aktif",
    MAINTENANCE: "Bakımda",
    INACTIVE: "Pasif",
  };
  return labels[status] || status;
}

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        ownerships: {
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
        capabilities: true,
        usages: {
          include: {
            process: {
              include: {
                field: true,
                worker: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
    });

    if (!equipment) {
      notFound();
    }

    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/owner/equipment">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">
              {equipment.name}
            </h1>
            <Badge
              variant="outline"
              className={
                equipment.status === "ACTIVE"
                  ? "bg-green-500/10 text-green-500 border-green-500"
                  : equipment.status === "MAINTENANCE"
                    ? "bg-yellow-500/10 text-yellow-500 border-yellow-500"
                    : "bg-gray-500/10 text-gray-500 border-gray-500"
              }
            >
              {getStatusLabel(equipment.status)}
            </Badge>
          </div>
          <Button asChild>
            <Link href={`/dashboard/owner/equipment/${equipment.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Düzenle
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ekipman Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Ekipman Tipi
                  </dt>
                  <dd className="mt-1">{getTypeLabel(equipment.type)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Yakıt Tüketimi
                  </dt>
                  <dd className="mt-1">
                    {equipment.fuelConsumptionPerDecare} lt/dekar
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Durum</dt>
                  <dd className="mt-1">{getStatusLabel(equipment.status)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Oluşturulma Tarihi
                  </dt>
                  <dd className="mt-1">{formatDate(equipment.createdAt)}</dd>
                </div>
                {equipment.description && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">
                      Açıklama
                    </dt>
                    <dd className="mt-1">{equipment.description}</dd>
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
              {equipment.ownerships.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Sahiplik bilgisi bulunamadı.
                </p>
              ) : (
                <ul className="space-y-4">
                  {equipment.ownerships.map((ownership) => (
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
                      <Badge>%{ownership.ownershipPercentage}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Yetenekler</CardTitle>
            <CardDescription>
              Bu ekipmanın kullanabileceği envanter kategorileri
            </CardDescription>
          </CardHeader>
          <CardContent>
            {equipment.capabilities.length === 0 ? (
              <p className="text-sm text-gray-500">
                Yetenek bilgisi bulunamadı.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {equipment.capabilities.map((capability) => (
                  <Badge key={capability.id} variant="outline">
                    {capability.inventoryCategory}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kullanım Geçmişi</CardTitle>
            <CardDescription>Bu ekipmanın son kullanımları</CardDescription>
          </CardHeader>
          <CardContent>
            {equipment.usages.length === 0 ? (
              <p className="text-sm text-gray-500">
                Henüz kullanım kaydı bulunmuyor.
              </p>
            ) : (
              <ul className="space-y-4">
                {equipment.usages.map((usage) => (
                  <li key={usage.id} className="border-b pb-4 last:border-0">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">
                          {usage.process.field.name} -{" "}
                          {getTypeLabel(usage.process.type)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(usage.process.date)} -{" "}
                          {usage.process.worker.name} tarafından
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {usage.areaProcessed.toFixed(2)} dekar
                        </p>
                        <p className="text-sm text-gray-500">
                          {usage.fuelConsumed.toFixed(2)} lt yakıt
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Hata</h1>
        <p className="text-red-500">
          Ekipman bilgileri yüklenirken bir hata oluştu.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/owner/equipment">Geri Dön</Link>
        </Button>
      </div>
    );
  }
}
