"use client";

import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

// Enum değerlerini Türkçe'ye çeviren yardımcı fonksiyonlar
const translatePaymentMethod = (method: string) => {
  const methods: Record<string, string> = {
    CASH: "Nakit",
    CREDIT_CARD: "Kredi Kartı",
    BANK_TRANSFER: "Banka Transferi",
    CHECK: "Çek",
    DEFERRED: "Vadeli",
  };
  return methods[method] || method;
};

const translateCategory = (category: string) => {
  const categories: Record<string, string> = {
    FERTILIZER: "Gübre",
    SEED: "Tohum",
    PESTICIDE: "İlaç",
    FUEL: "Yakıt",
    EQUIPMENT: "Ekipman",
    OTHER: "Diğer",
  };
  return categories[category] || category;
};

const translateUnit = (unit: string) => {
  const units: Record<string, string> = {
    KG: "Kilogram",
    LITER: "Litre",
    PIECE: "Adet",
    TON: "Ton",
    PACKAGE: "Paket",
  };
  return units[unit] || unit;
};

const translateApprovalStatus = (status: string) => {
  const statuses: Record<string, string> = {
    PENDING: "Bekliyor",
    APPROVED: "Onaylandı",
    REJECTED: "Reddedildi",
  };
  return statuses[status] || status;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-500",
    APPROVED: "bg-green-500",
    REJECTED: "bg-red-500",
  };
  return colors[status] || "bg-gray-500";
};

export function PurchaseDetails({ purchase }: { purchase: any }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("details");
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  if (!purchase) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p>Alış kaydı yükleniyor veya bulunamadı...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Alış Detayları</h1>
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/owner/purchases")}
          >
            Geri Dön
          </Button>
          <Button
            onClick={() =>
              router.push(`/dashboard/owner/purchases/${purchase.id}/edit`)
            }
          >
            Düzenle
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{purchase.product}</CardTitle>
              <CardDescription>
                {translateCategory(purchase.category)}
              </CardDescription>
            </div>
            <Badge
              className={`${getStatusColor(purchase.approvalStatus)} text-white`}
            >
              {translateApprovalStatus(purchase.approvalStatus)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="details"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Detaylar</TabsTrigger>
              <TabsTrigger value="contributors">Ortaklar</TabsTrigger>
              <TabsTrigger value="debts">Borçlar</TabsTrigger>
              <TabsTrigger value="inventory">Envanter</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Ürün</h3>
                  <p>{purchase.product}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">
                    Kategori
                  </h3>
                  <p>{translateCategory(purchase.category)}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">Miktar</h3>
                  <p>
                    {purchase.quantity} {translateUnit(purchase.unit)}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">
                    Birim Fiyat
                  </h3>
                  <p>{formatCurrency(purchase.unitPrice)}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">
                    Toplam Tutar
                  </h3>
                  <p>{formatCurrency(purchase.totalCost)}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">
                    Ödeme Yöntemi
                  </h3>
                  <p>{translatePaymentMethod(purchase.paymentMethod)}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500">
                    Oluşturulma Tarihi
                  </h3>
                  <p>
                    {format(new Date(purchase.createdAt), "dd MMMM yyyy", {
                      locale: tr,
                    })}
                  </p>
                </div>
                {purchase.dueDate && (
                  <div>
                    <h3 className="font-medium text-sm text-gray-500">
                      Vade Tarihi
                    </h3>
                    <p>
                      {format(new Date(purchase.dueDate), "dd MMMM yyyy", {
                        locale: tr,
                      })}
                    </p>
                  </div>
                )}
                {purchase.seasonId && (
                  <div>
                    <h3 className="font-medium text-sm text-gray-500">Sezon</h3>
                    <p>{purchase.season?.name || "Belirtilmemiş"}</p>
                  </div>
                )}
                {purchase.description && (
                  <div className="col-span-2">
                    <h3 className="font-medium text-sm text-gray-500">
                      Açıklama
                    </h3>
                    <p>{purchase.description}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="contributors" className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ortak</TableHead>
                    <TableHead>Yüzde</TableHead>
                    <TableHead>Katkı Payı</TableHead>
                    <TableHead>Ödenen</TableHead>
                    <TableHead>Kalan</TableHead>
                    <TableHead>Vade Tarihi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.contributors.length > 0 ? (
                    purchase.contributors.map((contributor: any) => (
                      <TableRow key={contributor.id}>
                        <TableCell>
                          {contributor.user?.name || "Bilinmeyen Kullanıcı"}
                        </TableCell>
                        <TableCell>{contributor.percentage}%</TableCell>
                        <TableCell>
                          {formatCurrency(contributor.expectedContribution)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(contributor.actualContribution)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(contributor.remainingAmount)}
                        </TableCell>
                        <TableCell>
                          {contributor.dueDate
                            ? format(
                                new Date(contributor.dueDate),
                                "dd MMMM yyyy",
                                { locale: tr }
                              )
                            : "Belirtilmemiş"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Ortak bulunamadı
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="debts" className="pt-4">
              {purchase.debts && purchase.debts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Borç ID</TableHead>
                      <TableHead>Tutar</TableHead>
                      <TableHead>Vade Tarihi</TableHead>
                      <TableHead>Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchase.debts.map((debt: any) => (
                      <TableRow key={debt.id}>
                        <TableCell>{debt.id}</TableCell>
                        <TableCell>{formatCurrency(debt.amount)}</TableCell>
                        <TableCell>
                          {debt.dueDate
                            ? format(new Date(debt.dueDate), "dd MMMM yyyy", {
                                locale: tr,
                              })
                            : "Belirtilmemiş"}
                        </TableCell>
                        <TableCell>{debt.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-4">Borç kaydı bulunamadı</p>
              )}
            </TabsContent>

            <TabsContent value="inventory" className="pt-4">
              {purchase.inventoryTransactions &&
              purchase.inventoryTransactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>İşlem ID</TableHead>
                      <TableHead>Ürün</TableHead>
                      <TableHead>Miktar</TableHead>
                      <TableHead>Tarih</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchase.inventoryTransactions.map((transaction: any) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <button
                            onClick={() => {
                              setSelectedTransaction(transaction);
                              setTransactionDialogOpen(true);
                            }}
                            className="text-blue-600 hover:underline font-medium text-sm"
                            title={transaction.id}
                          >
                            #{transaction.id.slice(0, 8)}...
                          </button>
                        </TableCell>
                        <TableCell>{transaction.product}</TableCell>
                        <TableCell>
                          {transaction.quantity} {transaction.unit}
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(transaction.createdAt),
                            "dd MMMM yyyy",
                            { locale: tr }
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-4">Envanter işlemi bulunamadı</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {purchase.approvalStatus === "PENDING" &&
        purchase.approvalRequired &&
        purchase.totalCost >= purchase.approvalThreshold && (
          <Card>
            <CardHeader>
              <CardTitle>Onay Durumu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  Bu alış kaydı onay bekliyor. Toplam tutar (
                  {formatCurrency(purchase.totalCost)}), onay eşiğinden (
                  {formatCurrency(purchase.approvalThreshold)}) yüksek olduğu
                  için onay gerekiyor.
                </p>
                <Button
                  onClick={() =>
                    router.push(
                      `/dashboard/owner/purchases/${purchase.id}/approve`
                    )
                  }
                >
                  Onay Sayfasına Git
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      {/* İşlem Detayları Dialog'u */}
      <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>İşlem Detayları</DialogTitle>
            <DialogDescription>
              Seçili envanter işlemine ait özet bilgiler
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 -mr-2">
            {selectedTransaction ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="font-medium text-sm text-gray-500">İşlem ID</div>
                  <div className="text-sm font-mono">{selectedTransaction.id}</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-sm text-gray-500">İşlem Tipi</div>
                  <div className="text-sm">
                    {selectedTransaction.type || "Belirtilmemiş"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-sm text-gray-500">Ürün</div>
                  <div className="text-sm">{selectedTransaction.product}</div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-sm text-gray-500">Kategori</div>
                  <div className="text-sm">
                    {selectedTransaction.category || "Belirtilmemiş"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-sm text-gray-500">Miktar</div>
                  <div className="text-sm">
                    {selectedTransaction.quantity} {selectedTransaction.unit || ""}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-sm text-gray-500">Tarih</div>
                  <div className="text-sm">
                    {format(
                      new Date(selectedTransaction.createdAt),
                      "dd MMMM yyyy HH:mm",
                      { locale: tr }
                    )}
                  </div>
                </div>
                {selectedTransaction.notes && (
                  <div className="col-span-2 space-y-1">
                    <div className="font-medium text-sm text-gray-500">Açıklama</div>
                    <div className="text-sm">{selectedTransaction.notes}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                İşlem yükleniyor...
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setTransactionDialogOpen(false);
                setSelectedTransaction(null);
              }}
            >
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
