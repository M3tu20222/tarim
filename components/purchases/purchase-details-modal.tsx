"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatCurrency } from "@/lib/utils";
import { Loader2, Pencil } from "lucide-react";
import Link from "next/link";

// Enum değerlerini Türkçe'ye çeviren yardımcı fonksiyonlar
const translatePaymentMethod = (method: string) => {
  const methods: Record<string, string> = {
    CASH: "Nakit",
    CREDIT_CARD: "Kredi Kartı",
    BANK_TRANSFER: "Banka Transferi",
    CHECK: "Çek",
    DEFERRED: "Vadeli",
    CREDIT: "Kredi",
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
    LITRE: "Litre",
    ADET: "Adet",
    CUVAL: "Çuval",
    BIDON: "Bidon",
    PAKET: "Paket",
    METRE: "Metre",
    METREKARE: "Metrekare",
    DIGER: "Diğer",
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

interface PurchaseDetailsModalProps {
  purchaseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseDetailsModal({
  purchaseId,
  open,
  onOpenChange,
}: PurchaseDetailsModalProps) {
  const [purchase, setPurchase] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    if (open && purchaseId) {
      setLoading(true);
      setError(null);
      fetch(`/api/purchases/${purchaseId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Alış kaydı bulunamadı");
          return res.json();
        })
        .then((data) => {
          setPurchase(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [open, purchaseId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="!flex !flex-col fixed left-0 top-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] translate-x-0 translate-y-0 w-full h-full sm:w-[95vw] sm:max-w-4xl sm:h-auto sm:max-h-[85vh] overflow-y-auto border-0 sm:border shadow-xl rounded-none sm:rounded-lg pt-12 sm:pt-6 px-4 pb-4 sm:p-6 !bg-[hsl(222,84%,5%)] z-[100]"
      >
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-lg sm:text-xl">Alış Detayları</span>
            {purchase && (
              <Badge
                className={`${getStatusColor(purchase.approvalStatus)} text-white w-fit`}
              >
                {translateApprovalStatus(purchase.approvalStatus)}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {purchase ? purchase.product : "Yükleniyor..."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">{error}</div>
        ) : purchase ? (
          <div className="space-y-4 mt-4">
            <Tabs
              defaultValue="details"
              value={activeTab}
              onValueChange={setActiveTab}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details" className="text-xs sm:text-sm">Detaylar</TabsTrigger>
                <TabsTrigger value="contributors" className="text-xs sm:text-sm">Ortaklar</TabsTrigger>
                <TabsTrigger value="debts" className="text-xs sm:text-sm">Borçlar</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">
                      Ürün
                    </h3>
                    <p>{purchase.product}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">
                      Kategori
                    </h3>
                    <p>{translateCategory(purchase.category)}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">
                      Miktar
                    </h3>
                    <p>
                      {purchase.quantity} {translateUnit(purchase.unit)}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">
                      Birim Fiyat
                    </h3>
                    <p>{formatCurrency(purchase.unitPrice)}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">
                      Toplam Tutar
                    </h3>
                    <p className="text-lg font-semibold">
                      {formatCurrency(purchase.totalCost)}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">
                      Ödeme Yöntemi
                    </h3>
                    <p>{translatePaymentMethod(purchase.paymentMethod)}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">
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
                      <h3 className="font-medium text-sm text-muted-foreground">
                        Vade Tarihi
                      </h3>
                      <p>
                        {format(new Date(purchase.dueDate), "dd MMMM yyyy", {
                          locale: tr,
                        })}
                      </p>
                    </div>
                  )}
                  {purchase.description && (
                    <div className="col-span-2">
                      <h3 className="font-medium text-sm text-muted-foreground">
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
                      <TableHead>Alacaklı</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchase.contributors && purchase.contributors.length > 0 ? (
                      purchase.contributors.map((contributor: any) => (
                        <TableRow key={contributor.id}>
                          <TableCell>
                            {contributor.user?.name || "Bilinmeyen Kullanıcı"}
                          </TableCell>
                          <TableCell>{contributor.sharePercentage}%</TableCell>
                          <TableCell>
                            {formatCurrency(contributor.contribution)}
                          </TableCell>
                          <TableCell>
                            {contributor.isCreditor ? (
                              <Badge variant="outline">Alacaklı</Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
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
                        <TableHead>Alacaklı</TableHead>
                        <TableHead>Borçlu</TableHead>
                        <TableHead>Tutar</TableHead>
                        <TableHead>Durum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchase.debts.map((debt: any) => (
                        <TableRow key={debt.id}>
                          <TableCell>{debt.creditor?.name || "-"}</TableCell>
                          <TableCell>{debt.debtor?.name || "-"}</TableCell>
                          <TableCell>{formatCurrency(debt.amount)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                debt.status === "PAID" ? "default" : "outline"
                              }
                            >
                              {debt.status === "PAID" ? "Ödendi" : "Bekliyor"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">
                    Borç kaydı bulunamadı
                  </p>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Kapat
              </Button>
              <Button asChild>
                <Link href={`/dashboard/owner/purchases/${purchase.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Düzenle
                </Link>
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
