import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Tüm envanter öğelerini getir
export async function GET() {
  try {
    const inventory = await prisma.inventory.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        usageLogs: true,
      },
    });
    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Envanter getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Yeni envanter öğesi oluştur
export async function POST(request: Request) {
  try {
    const {
      name,
      category,
      quantity,
      unit,
      purchaseDate,
      expiryDate,
      status,
      notes,
      ownerId,
    } = await request.json();

    // Envanter öğesi oluştur
    const inventoryItem = await prisma.inventory.create({
      data: {
        name,
        category,
        quantity,
        unit,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        status,
        notes,
        owner: {
          connect: { id: ownerId },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(inventoryItem);
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json(
      { error: "Envanter öğesi oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
