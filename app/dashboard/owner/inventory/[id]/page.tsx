import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const inventory = await prisma.inventory.findUnique({
      where: { id },
      include: {
        ownerships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        inventoryTransactions: {
          orderBy: {
            date: "desc",
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!inventory) {
      notFound();
    }

    // Kategori enum değerlerini Türkçe etiketlere dönüştür
    const getCategoryLabel = (category: string): string => {
      const labels: Record<string, string> = {
        SEED: "Tohum",
        FERTILIZER: "Gübre",
        PESTICIDE: "İlaç",
        EQUIPMENT: "Ekipman",
        FUEL: "Yakıt",
        OTHER: "Diğer",
      };
      return labels[category] || category;
    };

    // Durum enum değerlerini Türkçe etiketlere dönüştür
    const getStatusLabel = (status: string): string => {
      const labels: Record<string, string> = {
        AVAILABLE: "Mevcut",
        LOW_STOCK: "Az Stok",
        OUT_OF_STOCK: "Stokta Yok",
        EXPIRED: "Süresi Dolmuş",
      };
      return labels[status] || status;
    };

    // İşlem tiplerini Türkçe etiketlere dönüştür
    const getTransactionTypeLabel = (type: string): string => {
      const labels: Record<string, string> = {
        PURCHASE: "Alış",
        USAGE: "Kullanım",
        TRANSFER: "Transfer",
        ADJUSTMENT: "Düzeltme",
      };
      return labels[type] || type;
    };

    // Sahiplik yüzdelerini hesapla
    const calculateOwnershipPercentages = () => {
      if (!inventory.ownerships || inventory.ownerships.length === 0) return [];

      const totalQuantity = inventory.totalQuantity || 1;
      return inventory.ownerships.map((ownership) => ({
        ...ownership,
        percentage: (ownership.shareQuantity / totalQuantity) * 100,
      }));
    };

    const ownershipPercentages = calculateOwnershipPercentages();

    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/owner/inventory">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">
              {inventory.name}
            </h1>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/owner/inventory/${inventory.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Düzenle
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Envanter Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Kategori
                    </p>
                    <p>{getCategoryLabel(inventory.category)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Miktar
                    </p>
                    <p>
                      {inventory.totalQuantity} {inventory.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Durum
                    </p>
                    <Badge
                      variant="outline"
                      className={
                        inventory.status === "AVAILABLE"
                          ? "bg-green-500/10 text-green-500 border-green-500"
                          : inventory.status === "LOW_STOCK"
                            ? "bg-yellow-500/10 text-yellow-500 border-yellow-500"
                            : inventory.status === "OUT_OF_STOCK"
                              ? "bg-red-500/10 text-red-500 border-red-500"
                              : "bg-gray-500/10 text-gray-500 border-gray-500"
                      }
                    >
                      {getStatusLabel(inventory.status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Alış Tarihi
                    </p>
                    <p>
                      {inventory.purchaseDate
                        ? formatDate(inventory.purchaseDate)
                        : "Belirtilmemiş"}
                    </p>
                  </div>
                  {inventory.expiryDate && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Son Kullanma Tarihi
                      </p>
                      <p>{formatDate(inventory.expiryDate)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Oluşturulma Tarihi
                    </p>
                    <p>{formatDate(inventory.createdAt)}</p>
                  </div>
                </div>

                {inventory.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Notlar
                    </p>
                    <p>{inventory.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sahiplik Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              {ownershipPercentages.length === 0 ? (
                <p className="text-muted-foreground">
                  Sahiplik bilgisi bulunamadı.
                </p>
              ) : (
                <div className="space-y-6">
                  {ownershipPercentages.map((ownership) => (
                    <div key={ownership.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{ownership.user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {ownership.shareQuantity} {inventory.unit} (
                            {ownership.percentage.toFixed(2)}%)
                          </p>
                        </div>
                      </div>
                      <Progress value={ownership.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>İşlem Geçmişi</CardTitle>
          </CardHeader>
          <CardContent>
            {inventory.inventoryTransactions.length === 0 ? (
              <p className="text-muted-foreground">İşlem geçmişi bulunamadı.</p>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const irrigationLogCache = new Map();

                  return inventory.inventoryTransactions.map(async (transaction) => {
                    let transactionNote = transaction.notes;
                    let transactionLink: string | null = null;
                    let responsibleUser: string | null = transaction.user?.name || "Bilinmeyen Kullanıcı";

                    if (transaction.type === 'USAGE' && transactionNote?.startsWith("Sulama kaydı #")) {
                      const match = transactionNote.match(/([a-f0-9]{24})/);
                      const irrigationLogId = match ? match[0] : null;
                      if (irrigationLogId) {
                        let irrigationLog;
                        if (irrigationLogCache.has(irrigationLogId)) {
                          irrigationLog = irrigationLogCache.get(irrigationLogId);
                        } else {
                          try {
                            irrigationLog = await prisma.irrigationLog.findUnique({
                              where: { id: irrigationLogId },
                              include: {
                                fieldUsages: {
                                  include: {
                                    field: { select: { id: true, name: true } },
                                  },
                                },
                                inventoryUsages: {
                                  where: { inventoryId: inventory.id },
                                  include: {
                                    ownerUsages: {
                                      include: {
                                        owner: { select: { id: true, name: true } },
                                      },
                                    },
                                  },
                                },
                              },
                            });
                            irrigationLogCache.set(irrigationLogId, irrigationLog);
                          } catch (e) {
                            console.error("Error fetching irrigation log for note:", e);
                            irrigationLog = null;
                          }
                        }

                        if (irrigationLog) {
                          const fieldNames = irrigationLog.fieldUsages
                            .map((fu: any) => fu.field.name)
                            .join(", ");

                          const ownerNames = irrigationLog.inventoryUsages
                            .flatMap((invUsage: any) =>
                              invUsage.ownerUsages.map((ownerUsage: any) => ownerUsage.owner.name)
                            )
                            .filter((name: string, index: number, self: string[]) => self.indexOf(name) === index)
                            .join(", ");
                          
                          responsibleUser = ownerNames || "Belirtilmemiş";
                          transactionNote = `${fieldNames} - ${formatDate(irrigationLog.date)} sulama işlemi`;
                          transactionLink = `/dashboard/owner/irrigation/${irrigationLogId}`;
                        }
                      }
                    }

                    return (
                      <div
                        key={transaction.id}
                        className="flex justify-between items-center border-b pb-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {getTransactionTypeLabel(transaction.type)}
                            </Badge>
                            <p className="font-medium">
                              {transaction.quantity} {inventory.unit}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(transaction.date)}
                          </p>
                          {transactionNote && (
                            <p className="text-sm">
                              {transactionLink ? (
                                <Link href={transactionLink} className="text-blue-500 hover:underline">
                                  {transactionNote}
                                </Link>
                              ) : (
                                transactionNote
                              )}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {responsibleUser}
                          </p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error("Error fetching inventory details:", error);
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Hata</h1>
        <p className="text-red-500">
          Envanter detayları yüklenirken bir hata oluştu.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/owner/inventory">Geri Dön</Link>
        </Button>
      </div>
    );
  }
}
