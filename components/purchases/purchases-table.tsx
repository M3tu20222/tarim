import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { PurchasesTableClient } from "./purchases-table-client";

interface PurchasesTableProps {
  filter?: string;
}

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

  // Serialize dates for client component
  const serializedPurchases = purchases.map((purchase) => ({
    ...purchase,
    createdAt: purchase.createdAt,
  }));

  return <PurchasesTableClient purchases={serializedPurchases} />;
}
