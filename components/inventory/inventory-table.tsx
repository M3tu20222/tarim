"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import type { InventoryCategory, InventoryStatus } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Edit, Eye, Filter, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";

// Kategori enum değerlerini Türkçe etiketlere dönüştür
function getCategoryLabel(category: InventoryCategory): string {
  const labels: Record<InventoryCategory, string> = {
    SEED: "Tohum",
    FERTILIZER: "Gübre",
    PESTICIDE: "İlaç",
    EQUIPMENT: "Ekipman",
    FUEL: "Yakıt",
    OTHER: "Diğer",
  };
  return labels[category] || category;
}

// Durum enum değerlerini Türkçe etiketlere dönüştür
function getStatusLabel(status: InventoryStatus): string {
  const labels: Record<InventoryStatus, string> = {
    AVAILABLE: "Mevcut",
    LOW_STOCK: "Az Stok",
    OUT_OF_STOCK: "Stokta Yok",
    EXPIRED: "Süresi Dolmuş",
  };
  return labels[status] || status;
}

export function InventoryTable() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchInventory();
  }, [showAll]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inventory?showAll=${showAll}`);
      if (!response.ok) {
        throw new Error("Envanter verileri alınamadı");
      }
      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast({
        title: "Hata",
        description: "Envanter verileri yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Kullanıcının sahiplik yüzdesini hesapla
  const calculateOwnershipPercentage = (item: any) => {
    if (!user || !item.ownerships || item.ownerships.length === 0) return "0%";

    const userOwnership = item.ownerships.find(
      (o: any) => o.user.id === user.id
    );
    if (!userOwnership) return "0%";

    const totalQuantity = item.totalQuantity || 1;
    const percentage = (userOwnership.shareQuantity / totalQuantity) * 100;

    return `${percentage.toFixed(2)}%`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-all"
                checked={showAll}
                onCheckedChange={setShowAll}
              />
              <Label htmlFor="show-all">
                {showAll
                  ? "Tüm Envanterleri Göster"
                  : "Sadece Kendi Envanterlerimi Göster"}
              </Label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtrele
              </Button>
              <Button variant="outline" size="sm">
                <Search className="h-4 w-4 mr-2" />
                Ara
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ürün Adı</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Miktar</TableHead>
              <TableHead>Sahiplik Yüzdesi</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Son Güncelleme</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Envanter yükleniyor...
                </TableCell>
              </TableRow>
            ) : inventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Henüz envanter kaydı bulunmuyor.
                </TableCell>
              </TableRow>
            ) : (
              inventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{getCategoryLabel(item.category)}</TableCell>
                  <TableCell>
                    {item.totalQuantity} {item.unit}
                  </TableCell>
                  <TableCell>{calculateOwnershipPercentage(item)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        item.status === "AVAILABLE"
                          ? "bg-green-500/10 text-green-500 border-green-500"
                          : item.status === "LOW_STOCK"
                            ? "bg-yellow-500/10 text-yellow-500 border-yellow-500"
                            : item.status === "OUT_OF_STOCK"
                              ? "bg-red-500/10 text-red-500 border-red-500"
                              : "bg-gray-500/10 text-gray-500 border-gray-500"
                      }
                    >
                      {getStatusLabel(item.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(item.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" asChild>
                        <Link href={`/dashboard/owner/inventory/${item.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="outline" size="icon" asChild>
                        <Link
                          href={`/dashboard/owner/inventory/${item.id}/edit`}
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
