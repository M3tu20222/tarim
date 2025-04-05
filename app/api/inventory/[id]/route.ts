import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  InventoryCategory,
  InventoryStatus,
  Unit,
  TransactionType,
} from "@prisma/client";

// Belirli bir envanter öğesini getir
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // params nesnesini await ile beklet
    const awaitedParams = await params;
    const inventoryId = awaitedParams.id;

    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: {
        ownerships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        inventoryTransactions: {
          orderBy: {
            date: "desc",
          },
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
    });

    if (!inventory) {
      return NextResponse.json(
        { error: "Envanter bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Envanter getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Envanter öğesini güncelle
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // Sadece admin ve sahip kullanıcılar envanter güncelleyebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    // params nesnesini await ile beklet
    const awaitedParams = await params;
    const inventoryId = awaitedParams.id;

    const {
      name,
      category,
      totalQuantity,
      unit,
      status,
      purchaseDate,
      expiryDate,
      notes,
    } = await request.json();

    // Veri doğrulama
    if (!name || !category || totalQuantity === undefined || !unit || !status) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik" },
        { status: 400 }
      );
    }

    // Mevcut envanteri kontrol et
    const existingInventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: {
        ownerships: true,
      },
    });

    if (!existingInventory) {
      return NextResponse.json(
        { error: "Envanter bulunamadı" },
        { status: 404 }
      );
    }

    // Miktar değişikliği varsa işlem kaydı oluştur
    let transaction = null;
    if (existingInventory.totalQuantity !== Number(totalQuantity)) {
      const difference =
        Number(totalQuantity) - existingInventory.totalQuantity;
      transaction = {
        type: difference > 0 ? "ADJUSTMENT" : ("USAGE" as TransactionType),
        quantity: Math.abs(difference),
        date: new Date(),
        notes: `Miktar ${difference > 0 ? "artırıldı" : "azaltıldı"}: ${Math.abs(difference)} ${unit}`,
        userId,
      };
    }

    // Envanter öğesini güncelle
    const inventory = await prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        name,
        category: category as InventoryCategory,
        totalQuantity: Number(totalQuantity),
        unit: unit as Unit,
        status: status as InventoryStatus,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes,
        ...(transaction && {
          inventoryTransactions: {
            create: transaction,
          },
        }),
      },
    });

    // Sahiplik payını güncelle
    if (
      existingInventory.ownerships.length > 0 &&
      existingInventory.totalQuantity !== Number(totalQuantity)
    ) {
      await prisma.inventoryOwnership.update({
        where: { id: existingInventory.ownerships[0].id },
        data: {
          shareQuantity: Number(totalQuantity),
        },
      });
    }

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Error updating inventory:", error);
    return NextResponse.json(
      { error: "Envanter güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Envanter öğesini sil
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // Sadece admin ve sahip kullanıcılar envanter silebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    // params nesnesini await ile beklet
    const awaitedParams = await params;
    const inventoryId = awaitedParams.id;

    // Mevcut envanteri kontrol et
    const existingInventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!existingInventory) {
      return NextResponse.json(
        { error: "Envanter bulunamadı" },
        { status: 404 }
      );
    }

    // İlişkili kayıtları sil
    await prisma.$transaction([
      prisma.inventoryOwnership.deleteMany({
        where: { inventoryId: inventoryId },
      }),
      prisma.inventoryTransaction.deleteMany({
        where: { inventoryId: inventoryId },
      }),
      prisma.inventory.delete({
        where: { id: inventoryId },
      }),
    ]);

    return NextResponse.json({ message: "Envanter başarıyla silindi" });
  } catch (error) {
    console.error("Error deleting inventory:", error);
    return NextResponse.json(
      { error: "Envanter silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
