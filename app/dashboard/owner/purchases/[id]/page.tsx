import { PurchaseDetails } from "@/components/purchases/purchase-details";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function PurchaseDetailsPage(props: {
  params: { id: string };
}) {
  const { id } = await props.params; // Destructure params inside the function body
  // Destructured 'id' directly from params

  if (!id) {
    // Use 'id' directly
    notFound();
  }

  try {
    // Alış kaydını tüm ilişkili verilerle birlikte al
    const purchase = await prisma.purchase.findUnique({
      where: { id: id }, // Use 'id' directly
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
