import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader2, Calendar, MapPin, Package, TrendingUp, User, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface HarvestDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getHarvest(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const harvest = await prisma.harvest.findUnique({
      where: { id },
      include: {
        field: {
          select: {
            id: true,
            name: true,
            location: true,
            size: true
          }
        },
        crop: {
          select: {
            id: true,
            name: true,
            cropType: true,
            plantedDate: true,
            status: true
          }
        },
        season: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        },
        harvestedBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!harvest) {
      return null;
    }

    // Kullanıcının erişim yetkisini kontrol et
    if (user.role !== 'ADMIN') {
      const ownership = await prisma.fieldOwnership.findFirst({
        where: {
          fieldId: harvest.fieldId,
          userId: user.id
        }
      });

      if (!ownership) {
        throw new Error("Forbidden");
      }
    }

    return harvest;
  } catch (error) {
    console.error("Error fetching harvest:", error);
    return null;
  }
}

function getCropTypeLabel(cropType: string) {
  const types: { [key: string]: string } = {
    CORN: "Mısır",
    WHEAT: "Buğday",
    BEAN: "Fasulye",
    CHICKPEA: "Nohut",
    CUMIN: "Kimyon",
    CANOLA: "Kanola",
    OATS: "Yulaf",
    BARLEY: "Arpa",
    SUNFLOWER: "Ayçiçeği",
    COTTON: "Pamuk",
    SUGAR_BEET: "Şeker Pancarı",
    POTATO: "Patates",
    TOMATO: "Domates",
    ONION: "Soğan",
    OTHER: "Diğer",
  };
  return types[cropType] || cropType;
}

function formatCurrency(amount?: number) {
  if (!amount) return "-";
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
}

function formatNumber(num: number) {
  return new Intl.NumberFormat('tr-TR').format(num);
}

function getQualityBadgeColor(quality?: string) {
  if (!quality) return "bg-gray-100 text-gray-700";
  switch (quality) {
    case "Extra":
      return "bg-green-100 text-green-700 border-green-200";
    case "A":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "B":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "C":
      return "bg-orange-100 text-orange-700 border-orange-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export default async function HarvestDetailPage({ params }: HarvestDetailPageProps) {
  const { id } = await params;
  const harvest = await getHarvest(id);

  if (!harvest) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{harvest.crop.name} Hasadı</h1>
          <p className="text-muted-foreground">
            {harvest.field.name} - {format(new Date(harvest.harvestDate), "PPP", { locale: tr })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/harvests/${harvest.id}/edit`}>
              Düzenle
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/harvests">
              Geri Dön
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ana Bilgiler */}
        <div className="lg:col-span-2 space-y-6">
          {/* Genel Bilgiler */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Hasat Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Hasat Tarihi
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(harvest.harvestDate), "PPP", { locale: tr })}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Hasat Edilen Alan
                  </label>
                  <p className="mt-1 font-medium">{formatNumber(harvest.harvestedArea)} dönüm</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Hasat Miktarı
                  </label>
                  <p className="mt-1 font-medium">
                    {formatNumber(harvest.quantity)} {harvest.unit}
                  </p>
                </div>
                {harvest.pricePerUnit && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Birim Fiyat
                    </label>
                    <p className="mt-1 font-medium">
                      {formatCurrency(harvest.pricePerUnit)}/{harvest.unit}
                    </p>
                  </div>
                )}
              </div>

              {harvest.quality && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Kalite
                  </label>
                  <div className="mt-1">
                    <Badge variant="outline" className={getQualityBadgeColor(harvest.quality)}>
                      {harvest.quality} Kalite
                    </Badge>
                  </div>
                </div>
              )}

              {harvest.moistureContent && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Nem Oranı
                  </label>
                  <p className="mt-1 font-medium">%{harvest.moistureContent}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Finansal Bilgiler */}
          {(harvest.totalRevenue || harvest.transportCost || harvest.laborCost) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Finansal Bilgiler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {harvest.totalRevenue && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Toplam Gelir
                      </label>
                      <p className="mt-1 font-bold text-green-600 text-lg">
                        {formatCurrency(harvest.totalRevenue)}
                      </p>
                    </div>
                  )}
                  {harvest.transportCost && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Nakliye Maliyeti
                      </label>
                      <p className="mt-1 font-medium text-red-600">
                        {formatCurrency(harvest.transportCost)}
                      </p>
                    </div>
                  )}
                  {harvest.laborCost && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        İşçilik Maliyeti
                      </label>
                      <p className="mt-1 font-medium text-red-600">
                        {formatCurrency(harvest.laborCost)}
                      </p>
                    </div>
                  )}
                  {harvest.totalRevenue && (harvest.transportCost || harvest.laborCost) && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Net Gelir
                      </label>
                      <p className="mt-1 font-bold text-green-600 text-lg">
                        {formatCurrency(
                          harvest.totalRevenue -
                          (harvest.transportCost || 0) -
                          (harvest.laborCost || 0)
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ek Bilgiler */}
          {(harvest.storageLocation || harvest.buyerInfo || harvest.weatherConditions || harvest.notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Ek Bilgiler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {harvest.storageLocation && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Depolama Yeri
                    </label>
                    <p className="mt-1">{harvest.storageLocation}</p>
                  </div>
                )}
                {harvest.buyerInfo && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Alıcı Bilgisi
                    </label>
                    <p className="mt-1">{harvest.buyerInfo}</p>
                  </div>
                )}
                {harvest.weatherConditions && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Hava Durumu Koşulları
                    </label>
                    <p className="mt-1">{harvest.weatherConditions}</p>
                  </div>
                )}
                {harvest.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Notlar
                    </label>
                    <p className="mt-1">{harvest.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Yan Panel */}
        <div className="space-y-6">
          {/* Tarla Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Tarla Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Tarla Adı
                </label>
                <p className="mt-1 font-medium">{harvest.field.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Konum
                </label>
                <p className="mt-1">{harvest.field.location}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Toplam Alan
                </label>
                <p className="mt-1">{formatNumber(harvest.field.size)} dönüm</p>
              </div>
            </CardContent>
          </Card>

          {/* Ekin Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Ekin Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Ekin Adı
                </label>
                <p className="mt-1 font-medium">{harvest.crop.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Ekin Türü
                </label>
                <p className="mt-1">{getCropTypeLabel(harvest.crop.cropType)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Ekim Tarihi
                </label>
                <p className="mt-1">
                  {format(new Date(harvest.crop.plantedDate), "PPP", { locale: tr })}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Durum
                </label>
                <div className="mt-1">
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                    Hasat Edildi
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Diğer Bilgiler */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Diğer Bilgiler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Hasat Eden
                </label>
                <p className="mt-1 font-medium">{harvest.harvestedBy.name}</p>
              </div>
              {harvest.season && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Sezon
                  </label>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {harvest.season.name}
                      {harvest.season.isActive && " (Aktif)"}
                    </Badge>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Kayıt Tarihi
                </label>
                <p className="mt-1 text-sm">
                  {format(new Date(harvest.createdAt), "PPP", { locale: tr })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}