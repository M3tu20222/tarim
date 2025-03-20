import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PurchaseActions } from "./purchase-actions";
import type { Purchase, Prisma, PurchaseContributor } from "@prisma/client";

interface PurchasesTableProps {
  filter?: string;
}

type PurchaseWithRelations = Purchase & {
  contributors: (PurchaseContributor & {
    user: {
      id: string;
      name: string;
    };
  })[];
  debts: {
    id: string;
    creditor: {
      id: string;
      name: string;
    };
    debtor: {
      id: string;
      name: string;
    };
  }[];
};

export async function PurchasesTable({ filter = "all" }: PurchasesTableProps) {
  // Filtreleme koşullarını oluştur
  const whereCondition: Prisma.PurchaseWhereInput = {};

  // Prisma şemasında doğru alan adını kullanıyoruz
  // Eğer paymentMethod alanı varsa, ona göre filtreleme yapıyoruz
  if (filter === "paid") {
    whereCondition.paymentMethod = "CASH"; // veya "CREDIT_CARD"
  } else if (filter === "pending") {
    whereCondition.paymentMethod = "CREDIT"; // Kredi olarak alınanlar bekleyen olarak kabul edilebilir
  }

  const purchases = await prisma.purchase.findMany({
    where: whereCondition,
    include: {
      contributors: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      debts: {
        include: {
          creditor: {
            select: {
              id: true,
              name: true,
            },
          },
          debtor: {
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
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ürün</TableHead>
            <TableHead>Miktar</TableHead>
            <TableHead>Birim</TableHead>
            <TableHead>Toplam Maliyet</TableHead>
            <TableHead>Ödeme Yöntemi</TableHead>
            <TableHead>Katkıda Bulunanlar</TableHead>
            <TableHead>Tarih</TableHead>
            <TableHead className="text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                Alış bulunamadı.
              </TableCell>
            </TableRow>
          ) : (
            purchases.map((purchase: PurchaseWithRelations) => (
              <TableRow key={purchase.id}>
                <TableCell className="font-medium">
                  {purchase.product}
                </TableCell>
                <TableCell>
                  {purchase.quantity} @ {formatCurrency(purchase.unitPrice)}
                </TableCell>
                <TableCell>
                  {purchase.unit ? formatUnit(purchase.unit) : "Belirtilmemiş"}
                </TableCell>
                <TableCell>{formatCurrency(purchase.totalCost)}</TableCell>
                <TableCell>
                  <PaymentMethodBadge method={purchase.paymentMethod} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {purchase.contributors.map((contributor) => (
                      <div
                        key={contributor.id}
                        className="text-xs flex items-center gap-1"
                      >
                        <span>{contributor.user.name}</span>
                        {contributor.isCreditor && (
                          <Badge variant="outline" className="text-xs py-0 h-4">
                            Alacaklı
                          </Badge>
                        )}
                        {contributor.contribution > 0 && (
                          <span className="text-muted-foreground">
                            ({formatCurrency(contributor.contribution)})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{formatDate(purchase.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <PurchaseActions purchase={purchase} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function PaymentMethodBadge({ method }: { method: string }) {
  const methodMap: Record<
    string,
    { label: string; variant: "default" | "outline" | "secondary" }
  > = {
    CASH: { label: "Nakit", variant: "default" },
    CREDIT_CARD: { label: "Kredi Kartı", variant: "secondary" },
    CREDIT: { label: "Kredi", variant: "outline" },
  };

  const { label, variant } = methodMap[method] || {
    label: method,
    variant: "outline",
  };

  return <Badge variant={variant}>{label}</Badge>;
}

// Birim formatlamak için yardımcı fonksiyon
function formatUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    KG: "Kilogram",
    TON: "Ton",
    LITRE: "Litre",
    ADET: "Adet",
    CUVAL: "Çuval",
    BIDON: "Bidon",
    PAKET: "Paket",
    METRE: "Metre",
    METREKARE: "Metrekare",
    DIGER: "Diğer",
  };

  return unitMap[unit] || unit;
}
