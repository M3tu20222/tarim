import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Alış ve ilişkili tüm kayıtları getir
export async function GET(request: NextRequest) {
  try {
    // /api/purchases/[id]/full-details şeklinde olduğu için id'yi URL'den çek
    const urlParts = request.nextUrl.pathname.split("/");
    // .../purchases/[id]/full-details
    const idIndex = urlParts.findIndex(p => p === "purchases") + 1;
    const id = urlParts[idIndex];
    console.log("[full-details] urlParts:", urlParts, "id:", id);
    if (!id) {
      console.log("[full-details] Eksik alış ID", { urlParts });
      return NextResponse.json({ error: "Eksik alış ID" }, { status: 400 });
    }

    // Tüm ilişkili kayıtlarla birlikte alış kaydını getir
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        contributors: {
          include: { user: { select: { id: true, name: true } } },
        },
        season: {
          include: {
            processes: {
              include: {
                field: { select: { id: true, name: true } },
              },
            },
            irrigationLogs: true,
          },
        },
        debts: true,
        inventoryTransactions: {
          include: {
            inventory: true,
          },
        },
        approvals: {
          include: { approver: { select: { id: true, name: true } } },
        },
      },
    });

    if (!purchase) {
      console.log(`[full-details] Alış kaydı bulunamadı, id: ${id}`);
      return NextResponse.json({ error: "Alış kaydı bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(purchase);
  } catch (error) {
    console.error("/api/purchases/[id]/full-details", { error, id: request.nextUrl.pathname });
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
