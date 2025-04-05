import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { InventoryCategory, InventoryStatus, Unit } from "@prisma/client";

// Tüm envanter öğelerini getir
export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const showAll = searchParams.get("showAll") === "true"; // Tüm envanterleri gösterme parametresi

    // Filtre oluştur
    const filter: any = {};
    if (category) {
      filter.category = category;
    }
    if (status) {
      filter.status = status;
    }

    // Eğer showAll parametresi yoksa veya false ise, sadece kullanıcının sahip olduğu envanterleri getir
    if (!showAll && userRole !== "ADMIN") {
      filter.ownerships = {
        some: {
          userId: userId,
        },
      };
    }

    // Envanter öğelerini getir
    const inventory = await prisma.inventory.findMany({
      where: filter,
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
          take: 5,
          orderBy: {
            date: "desc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
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

// Diğer metodlar aynı kalabilir...

// Yeni envanter öğesi oluştur
export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // Sadece admin ve sahip kullanıcılar envanter oluşturabilir
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

    // Envanter öğesi oluştur
    const inventory = await prisma.inventory.create({
      data: {
        name,
        category: category as InventoryCategory,
        totalQuantity: Number(totalQuantity),
        unit: unit as Unit,
        status: status as InventoryStatus,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes,
        ownerships: {
          create: {
            userId,
            shareQuantity: Number(totalQuantity),
          },
        },
        inventoryTransactions: {
          create: {
            type: "PURCHASE",
            quantity: Number(totalQuantity),
            date: new Date(),
            notes: `${name} envanteri oluşturuldu`,
            userId,
          },
        },
      },
    });

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Error creating inventory:", error);
    return NextResponse.json(
      { error: "Envanter oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
