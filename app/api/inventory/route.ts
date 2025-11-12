import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { getAllInventory, getInventoryWithOwnerships, getActiveInventory } from "@/lib/data/inventory";
import { InventoryCategory, InventoryStatus, Unit } from "@prisma/client"; // Import the actual enum

// Envanter listesi nadiren değişir; DB yükünü azaltmak için ISR
export const revalidate = 900;

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
    const showAll = searchParams.get("showAll") === "true";
    const fetchAll = searchParams.get("fetchAll") === "true";
    const userIdsParam = searchParams.get("userIds");
    const userIdParam = searchParams.get("userId");

    // Cached data getters'dan veri al
    let inventory;

    // Ownership verileri gerekli mi kontrol et
    const needsOwnerships = showAll || fetchAll || userRole === "ADMIN" || userIdsParam || userIdParam;

    if (needsOwnerships) {
      console.log("[Cache] Using getInventoryWithOwnerships");
      inventory = await getInventoryWithOwnerships();
    } else {
      console.log("[Cache] Using getAllInventory");
      inventory = await getAllInventory();
    }

    // Kategori filtresi (bellek içinde)
    if (category) {
      const categories = category
        .split(',')
        .map(cat => cat.trim().toUpperCase())
        .filter(cat => cat in InventoryCategory);

      if (categories.length > 0) {
        inventory = inventory.filter(item => (categories as any[]).includes(item.category));
      } else {
        return NextResponse.json({ data: [] });
      }
    }

    // Status filtresi (bellek içinde)
    if (status) {
      inventory = inventory.filter(item => item.status === status);
    }

    // Ownership filtresi (bellek içinde)
    if (userIdsParam) {
      const userIdsArray = userIdsParam.split(',').filter(id => id.trim() !== '');
      if (userIdsArray.length > 0) {
        inventory = inventory.filter(item =>
          'ownerships' in item && item.ownerships.some((o: any) => userIdsArray.includes(o.userId))
        );
      } else {
        return NextResponse.json({ data: [] });
      }
    } else if (userIdParam) {
      inventory = inventory.filter(item =>
        'ownerships' in item && item.ownerships.some((o: any) => o.userId === userIdParam)
      );
    } else if (!showAll && !fetchAll && userRole !== "ADMIN") {
      // Kullanıcının kendi envanterini filtrele
      inventory = inventory.filter(item =>
        'ownerships' in item && item.ownerships.some((o: any) => o.userId === userId)
      );
    }

    // Ek ilişkili veri getir (inventoryTransactions)
    const inventoryIds = inventory.map(i => i.id);
    let transactionsMap = new Map<string, any[]>();

    if (inventoryIds.length > 0) {
      const transactions = await prisma.inventoryTransaction.findMany({
        where: { inventoryId: { in: inventoryIds } },
        orderBy: { date: "desc" },
        take: 3 * inventoryIds.length, // Max 3 per inventory
      });

      // Son 3 işlemi stokla
      transactions.forEach(tx => {
        if (!transactionsMap.has(tx.inventoryId)) {
          transactionsMap.set(tx.inventoryId, []);
        }
        if ((transactionsMap.get(tx.inventoryId)?.length ?? 0) < 3) {
          transactionsMap.get(tx.inventoryId)!.push({
            id: tx.id,
            type: tx.type,
            quantity: tx.quantity,
            date: tx.date,
            userId: tx.userId,
          });
        }
      });
    }

    // Öğeleri formatla ve işlemleri ekle
    const formattedInventory = inventory.map(item => ({
      ...item,
      unitPrice: (item as any).costPrice ?? 0,
      inventoryTransactions: transactionsMap.get(item.id) || [],
    }));

    return NextResponse.json({ data: formattedInventory });
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
      costPrice, // costPrice eklendi
    } = await request.json();

    // Veri doğrulama
    if (!name || !category || totalQuantity === undefined || !unit || !status || costPrice === undefined) { // costPrice kontrolü eklendi
      return NextResponse.json(
        { error: "Gerekli alanlar eksik" },
        { status: 400 }
      );
    }

    // Envanter öğesi oluştur
    const newInventory = await prisma.inventory.create({
      data: {
        name,
        category: category as InventoryCategory,
        totalQuantity: Number(totalQuantity),
        unit: unit as Unit,
        status: status as InventoryStatus,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        costPrice: Number(costPrice),
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

    // Cache invalidation
    console.log("[Cache] Invalidating inventory tags after inventory creation");
    revalidateTag("inventory");
    revalidateTag("inventory-ownerships");

    return NextResponse.json(newInventory);
  } catch (error) {
    console.error("Error creating inventory:", error);
    return NextResponse.json(
      { error: "Envanter oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
