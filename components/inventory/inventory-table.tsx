import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InventoryActions } from "./inventory-actions";

// Birim formatlamak için bir yardımcı fonksiyon ekleyelim (eğer yoksa)
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

export async function InventoryTable() {
  const inventory = await prisma.inventory.findMany({
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
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Owners</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventory.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No inventory items found.
              </TableCell>
            </TableRow>
          ) : (
            inventory.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>
                  {item.totalQuantity} {formatUnit(item.unit)}
                </TableCell>
                <TableCell>
                  <InventoryStatusBadge status={item.status} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {item.ownerships.map((ownership) => (
                      <div key={ownership.id} className="text-xs">
                        {ownership.user.name}: {ownership.shareQuantity}{" "}
                        {item.unit}
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{formatDate(item.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <InventoryActions item={item} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function InventoryStatusBadge({ status }: { status: string }) {
  const statusMap: Record<
    string,
    {
      label: string;
      variant: "default" | "outline" | "secondary" | "destructive";
    }
  > = {
    AVAILABLE: { label: "Available", variant: "default" },
    LOW_STOCK: { label: "Low Stock", variant: "secondary" },
    OUT_OF_STOCK: { label: "Out of Stock", variant: "destructive" },
    EXPIRED: { label: "Expired", variant: "destructive" },
  };

  const { label, variant } = statusMap[status] || {
    label: status,
    variant: "outline",
  };

  return <Badge variant={variant}>{label}</Badge>;
}
