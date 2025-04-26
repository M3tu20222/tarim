import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InventoryCategory, InventoryStatus, Unit } from "@prisma/client"; // Import the actual enum

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
    const fetchAll = searchParams.get("fetchAll") === "true"; // fetchAll parametresini ekle
    const userIdsParam = searchParams.get("userIds"); // userIds parametresini al

    // Filtre oluştur
    const filter: any = {};

    // Kategori filtresi
    if (category) {
      const categories = category
        .split(',')
        .map(cat => cat.trim().toUpperCase()) // Trim whitespace and convert to uppercase for case-insensitivity
        .filter(cat => cat in InventoryCategory); // Filter only valid enum keys

      if (categories.length > 0) {
        filter.category = {
          in: categories as InventoryCategory[], // Cast to InventoryCategory array
        };
      } else {
        // Geçersiz kategori(ler) varsa veya hiç geçerli kategori yoksa, boş sonuç döndür
        // veya isteğe bağlı olarak hatayı yoksayabilirsiniz. Şimdilik boş döndürelim.
        return NextResponse.json([]);
      }
    }

    // Durum filtresi (status için de benzer bir enum kontrolü gerekebilir)
    if (status) {
      // TODO: status için de enum kontrolü ekle (InventoryStatus enum'u varsa)
      filter.status = status; // Şimdilik olduğu gibi bırakıldı
    }

    // Filtreleme Mantığı Düzeltmesi:
    // 1. userIds parametresi varsa öncelikli olarak ona göre filtrele
    if (userIdsParam) {
      const userIdsArray = userIdsParam.split(',').filter(id => id.trim() !== '');
      if (userIdsArray.length > 0) {
        filter.ownerships = {
          some: {
            userId: {
              in: userIdsArray,
            },
          },
        };
      } else {
        // userIds parametresi var ama geçerli ID içermiyorsa boş liste döndür
        return NextResponse.json([]);
      }
    }
    // 2. userIds yoksa, (showAll=true VEYA fetchAll=true) veya rol ADMIN ise filtre uygulama
    else if (showAll || fetchAll || userRole === "ADMIN") { // fetchAll kontrolü eklendi
      // Sahiplik filtresi uygulanmaz, tüm envanter (kategori/status varsa onlara göre filtrelenmiş) gelir.
    }
    // 3. userIds yoksa, showAll/fetchAll=false ve rol ADMIN değilse, isteği yapan kullanıcıya göre filtrele
    else {
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

    // Map costPrice to unitPrice for frontend compatibility
    const formattedInventory = inventory.map(item => ({
      ...item,
      unitPrice: item.costPrice ?? 0, // Map costPrice to unitPrice, default to 0 if null/undefined
    }));


    return NextResponse.json(formattedInventory); // Return formatted data
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
    const inventory = await prisma.inventory.create({
      data: {
        name,
        category: category as InventoryCategory,
        totalQuantity: Number(totalQuantity),
        unit: unit as Unit,
        status: status as InventoryStatus,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        costPrice: Number(costPrice), // costPrice eklendi
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
