import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    const purchaseId = params.id;

    if (!purchaseId) {
      return NextResponse.json(
        { error: "Alış ID'si gerekli" },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: "Alış kaydı bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json(purchase);
  } catch (error) {
    console.error("Alış detayları alınırken hata:", error);
    return NextResponse.json(
      { error: "Alış detayları alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
