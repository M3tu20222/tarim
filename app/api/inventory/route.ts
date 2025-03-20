import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Tüm envanter öğelerini getir
export async function GET(request: Request) {
  try {
    // Yetkilendirme kontrolü
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    let inventory;

    // Admin tüm envanterleri görebilir, diğer kullanıcılar sadece kendi payı olanları
    if (userRole === "ADMIN") {
      inventory = await prisma.inventory.findMany({
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
        },
      });
    } else {
      // Kullanıcının payı olan envanterleri getir
      inventory = await prisma.inventory.findMany({
        where: {
          ownerships: {
            some: {
              userId: userId,
            },
          },
        },
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
        },
      });
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

// Yeni envanter öğesi oluştur
export async function POST(request: Request) {
  try {
    // Yetkilendirme kontrolü
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
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
      purchaseDate,
      expiryDate,
      status,
      notes,
      ownerships,
    } = await request.json();

    // Veri doğrulama
    if (!name || !category || !totalQuantity || !unit) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik" },
        { status: 400 }
      );
    }

    // Envanter öğesi oluştur
    const inventory = await prisma.inventory.create({
      data: {
        name,
        category,
        totalQuantity,
        unit,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        status: status || "AVAILABLE",
        notes,
        ownerships: {
          create: ownerships.map((ownership: any) => ({
            userId: ownership.userId,
            shareQuantity: ownership.shareQuantity,
          })),
        },
      },
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
      },
    });

    return NextResponse.json(inventory, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory:", error);
    return NextResponse.json(
      { error: "Envanter oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
