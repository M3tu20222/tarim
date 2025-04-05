import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Tüm ekipmanları getir
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
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    // Filtre oluştur
    const filter: any = {};
    if (status) {
      filter.status = status;
    }
    if (type) {
      filter.type = type;
    }

    // Ekipmanları getir
    const equipment = await prisma.equipment.findMany({
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
        capabilities: true,
        usages: {
          take: 5,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return NextResponse.json(
      { error: "Ekipmanlar getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Yeni ekipman oluştur
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

    // Sadece admin ve sahip kullanıcılar ekipman oluşturabilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const {
      name,
      type,
      fuelConsumptionPerDecare,
      status,
      description,
      capabilities,
      ownerships,
    } = await request.json();

    // Veri doğrulama
    if (
      !name ||
      !type ||
      fuelConsumptionPerDecare === undefined ||
      !status ||
      !capabilities ||
      !ownerships
    ) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik" },
        { status: 400 }
      );
    }

    // Sahiplik yüzdelerinin toplamı 100 olmalı
    const totalPercentage = ownerships.reduce(
      (sum: number, o: any) => sum + o.ownershipPercentage,
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return NextResponse.json(
        { error: "Sahiplik yüzdelerinin toplamı %100 olmalıdır" },
        { status: 400 }
      );
    }

    // Ekipman oluştur
    const equipment = await prisma.equipment.create({
      data: {
        name,
        type,
        fuelConsumptionPerDecare,
        status,
        description,
        capabilities: {
          create: capabilities.map((category: string) => ({
            inventoryCategory: category,
          })),
        },
        ownerships: {
          create: ownerships.map((o: any) => ({
            userId: o.userId,
            ownershipPercentage: o.ownershipPercentage,
          })),
        },
      },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Error creating equipment:", error);
    return NextResponse.json(
      { error: "Ekipman oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
