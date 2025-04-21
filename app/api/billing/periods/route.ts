import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client"; // Prisma türlerini içe aktaralım

// Tüm sezonları getir (Fatura dönemi yerine)
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

    // Sadece admin ve sahip kullanıcılar sezonları görebilir (Yetkilendirme projeye göre ayarlanabilir)
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");

    // Filtreleme koşullarını oluştur
    const where: Prisma.SeasonWhereInput = {};
     if (isActive === "true") {
        where.isActive = true;
     } else if (isActive === "false") {
        where.isActive = false;
     }
    // where = isActive === "true" ? { isActive: true } : {}; // isActive false durumu için de filtreleme eklendi

    // Sezonları getir
    const seasons = await prisma.season.findMany({
      where,
      orderBy: {
        startDate: "desc",
      },
    });

    return NextResponse.json(seasons);
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

    // Sadece admin ve sahip kullanıcılar sezon oluşturabilir (Yetkilendirme projeye göre ayarlanabilir)
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const { name, startDate, endDate, isActive, description } = await request.json();

    // Veri doğrulama
    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Ad, başlangıç tarihi ve bitiş tarihi zorunludur" },
        { status: 400 }
      );
    }

    // Tarih kontrolü
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return NextResponse.json(
        { error: "Başlangıç tarihi bitiş tarihinden önce olmalıdır" },
        { status: 400 }
      );
    }

    // Çakışan sezon kontrolü
    const overlappingSeason = await prisma.season.findFirst({
      where: {
        // Aktif veya pasif farketmeksizin çakışma kontrolü
        // isActive filtresi kaldırıldı, tüm sezonlarla çakışma kontrolü yapılır.
        // İstenirse sadece aktif sezonlarla çakışma kontrolü için { isActive: true } eklenebilir.
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
    });

    if (overlappingSeason) {
      return NextResponse.json(
        { error: "Bu tarih aralığında başka bir sezon bulunmaktadır" },
        { status: 400 }
      );
    }

    // Yeni sezon oluştur
    const newSeason = await prisma.season.create({
      data: {
        name,
        startDate: start,
        endDate: end,
        isActive: isActive ?? true,
        description: description, // Açıklama eklendi
        creatorId: userId, // Zorunlu creatorId alanı eklendi
      },
    });

    return NextResponse.json(newSeason);
  } catch (error) {
    console.error("Error creating season:", error);
    return NextResponse.json(
      { error: "Sezon oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
