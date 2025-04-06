import { PurchaseDetails } from "@/components/purchases/purchase-details";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function PurchaseDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  // Await the params object
  const awaitedParams = await params;
  const purchaseId = awaitedParams.id;

  if (!purchaseId) {
    notFound();
  }

  try {
    // Alış kaydını tüm ilişkili verilerle birlikte al
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        contributors: {
          include: {
            user: true,
          },
        },
        season: true,
        debts: true,
        inventoryTransactions: true,
        approvals: {
          include: {
            approver: true,
          },
        },
      },
    });

    if (!purchase) {
      notFound();
    }

    return (
      <div className="container mx-auto py-6">
        <PurchaseDetails purchase={purchase} />
      </div>
    );
  } catch (error) {
    console.error("Alış detayları alınırken hata:", error);
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">Hata</h1>
        <p>Alış detayları alınırken bir hata oluştu.</p>
      </div>
    );
  }
}
