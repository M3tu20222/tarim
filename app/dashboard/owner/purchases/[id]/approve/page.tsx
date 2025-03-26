import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PurchaseApproval } from "@/components/purchases/purchase-approval";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Alış Onayı | Tarım Yönetim Sistemi",
  description: "Alış onay sayfası",
};

interface ApprovePageProps {
  params: {
    id: string;
  };
}

export default async function ApprovePage({ params }: ApprovePageProps) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: params.id },
    include: {
      approvals: {
        include: {
          approver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!purchase) {
    notFound();
  }

  // Satın alma bilgilerini PurchaseApproval bileşeninin beklediği formata dönüştür
  const formattedPurchase = {
    id: purchase.id,
    product: purchase.product,
    totalCost: purchase.totalCost,
    approvalStatus: purchase.approvalStatus,
    approvals: purchase.approvals.map((approval) => ({
      id: approval.id,
      status: approval.status,
      comment: approval.comment,
      approvedAt: approval.approvedAt
        ? approval.approvedAt.toISOString()
        : null, // Date | null -> string | null
      approver: {
        id: approval.approver.id,
        name: approval.approver.name,
      },
    })),
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/owner/purchases">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Alış Onayı</h1>
      </div>

      <PurchaseApproval purchase={formattedPurchase} />
    </div>
  );
}
