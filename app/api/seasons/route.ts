import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Route-level ISR (300 sn): Sezonlar nadiren değişir
export const revalidate = 300;

// Tüm sezonları getir
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
    const fetchAll = searchParams.get("fetchAll") === "true";

    // Filtre oluştur
    const filter: any = {};
    if (activeOnly && !fetchAll) {
      filter.isActive = true;
    }

    // Sezonları getir (projection: yanıtı küçült)
    const seasons = await prisma.season.findMany({
      where: filter,
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
        // creator minimal
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({ data: seasons });
  } catch (error) {
    console.error("Error fetching seasons:", error);
    return NextResponse.json(
      { error: "Sezonlar getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Yeni sezon oluştur
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

    // Sadece admin ve sahip kullanıcılar sezon oluşturabilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const { name, startDate, endDate, description, isActive } =
      await request.json();

    // Veri doğrulama
    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Sezon adı, başlangıç ve bitiş tarihi zorunludur" },
        { status: 400 }
      );
    }

    // Tarih kontrolü
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return NextResponse.json(
        { error: "Bitiş tarihi başlangıç tarihinden sonra olmalıdır" },
        { status: 400 }
      );
    }

    // Aktif sezon kontrolü
    if (isActive) {
      // Diğer aktif sezonları pasif yap
      await prisma.season.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    // Sezon oluştur
    const season = await prisma.season.create({
      data: {
        name,
        startDate: start,
        endDate: end,
        description,
        isActive: isActive !== undefined ? isActive : true,
        creator: {
          connect: { id: userId },
        },
      },
    });

    return NextResponse.json(season);
  } catch (error) {
    console.error("Error creating season:", error);
    return NextResponse.json(
      { error: "Sezon oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
