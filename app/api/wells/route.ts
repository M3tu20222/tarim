import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Tüm kuyuları getir
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
    const activeOnly = searchParams.get("active") === "true";
    const fieldId = searchParams.get("fieldId");

    // Filtre oluştur
    const filter: any = {};
    if (activeOnly) {
      filter.status = "ACTIVE";
    }
    // Güncellendi: Filtreleme fieldWells üzerinden yapılıyor
    if (fieldId) {
      filter.fieldWells = {
        some: {
          fieldId: fieldId,
        },
      };
    }

    // Kuyuları getir
    const wells = await prisma.well.findMany({
      where: filter,
      // Güncellendi: fieldWells ve içindeki field dahil ediliyor
      include: {
        fieldWells: {
          include: {
            field: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      }, // Fazladan kapanış parantezi kaldırıldı
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ data: wells });
  } catch (error) {
    console.error("Error fetching wells:", error);
    return NextResponse.json(
      { error: "Kuyular getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Yeni kuyu oluştur
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

    // Sadece admin ve sahip kullanıcılar kuyu oluşturabilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    // Geri Alındı: fieldId -> fieldIds
    const { name, depth, capacity, status, fieldIds } = await request.json();

    // Veri doğrulama
    if (!name || !depth || !capacity) {
      return NextResponse.json(
        { error: "Kuyu adı, derinlik ve kapasite zorunludur" },
        { status: 400 }
      );
    }

    // Kuyu oluştur
    const well = await prisma.well.create({
      data: {
        name,
        depth,
        capacity,
        status: status || "ACTIVE",
        // Güncellendi: Explicit join modeli için fieldWells.create kullanılıyor
        fieldWells: {
          create: fieldIds?.map((id: string) => ({
            field: { connect: { id } },
          })) || [], // fieldIds varsa FieldWell kayıtları oluştur
        },
      },
    });

    return NextResponse.json(well);
  } catch (error) {
    console.error("Error creating well:", error);
    return NextResponse.json(
      { error: "Kuyu oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
