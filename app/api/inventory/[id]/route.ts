import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  InventoryCategory,
  InventoryStatus,
  Unit,
  TransactionType,
} from "@prisma/client";
import { getServerSideSession } from "@/lib/session";

// Envanter detayları seyrek değişir; route-level ISR ile cache
export const revalidate = 900;

// Belirli bir envanter öğesini getir
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inventoryId } = await params;
    const session = await getServerSideSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    const userId = session.id;
    const userRole = session.role;

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      select: {
        id: true,
        name: true,
        category: true,
        totalQuantity: true,
        unit: true,
        status: true,
        purchaseDate: true,
        expiryDate: true,
        costPrice: true,
        notes: true,
        updatedAt: true,
        ownerships: {
          select: {
            id: true,
            userId: true,
            shareQuantity: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        inventoryTransactions: {
          orderBy: { date: "desc" },
          select: {
            id: true,
            type: true,
            quantity: true,
            date: true,
            notes: true,
            user: { select: { id: true, name: true } },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inventoryId } = await params;
    const session = await getServerSideSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    const userId = session.id;
    const userRole = session.role;

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
      include: { ownerships: true },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inventoryId } = await params;
    const session = await getServerSideSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    const userId = session.id;
    const userRole = session.role;

    // Sadece admin ve sahip kullanıcılar envanter silebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

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
