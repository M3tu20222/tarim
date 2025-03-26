import { prisma } from "@/lib/prisma";
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
import { Edit, Eye } from "lucide-react";

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

export async function InventoryTable() {
  try {
    // Null totalQuantity değerlerini filtrelemek için farklı bir yaklaşım kullanalım
    const inventory = await prisma.inventory.findMany({
      where: {
        // Burada null değerleri filtrelemek için gte kullanıyoruz
        // Bu, totalQuantity'nin en az 0 olduğu kayıtları getirir
        totalQuantity: {
          gte: 0,
        },
      },
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
          take: 1,
          orderBy: {
            date: "desc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ürün Adı</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Miktar</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Son Güncelleme</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
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
    );
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-red-500 mb-2">
          Envanter verileri yüklenirken bir hata oluştu.
        </p>
        <p className="text-sm text-muted-foreground">
          Lütfen daha sonra tekrar deneyin veya yöneticinize başvurun.
        </p>
      </div>
    );
  }
}
