import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Aktif sezonu bul
async function getActiveSeasonId(fieldId: string): Promise<string | null> {
  try {
    // Önce tarlanın bağlı olduğu sezonu kontrol et
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      select: { seasonId: true },
    });

    if (field?.seasonId) {
      return field.seasonId;
    }

    // Tarlanın sezonu yoksa, aktif sezonu bul
    const activeSeason = await prisma.season.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    return activeSeason?.id || null;
  } catch (error) {
    console.error("Error getting active season:", error);
    return null;
  }
}

// Tüm sulama kayıtlarını getir
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
    const fieldId = searchParams.get("fieldId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const method = searchParams.get("method");

    // Filtre oluştur
    const filter: any = {};
    if (fieldId) {
      filter.fieldId = fieldId;
    }
    if (startDate && endDate) {
      filter.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      filter.date = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      filter.date = {
        lte: new Date(endDate),
      };
    }
    if (method) {
      filter.method = method;
    }

    // Kullanıcı rolüne göre filtreleme
    if (userRole === "WORKER") {
      filter.workerId = userId;
    }

    // Sulama kayıtlarını getir
    const irrigationLogs = await prisma.irrigationLog.findMany({
      where: filter,
      include: {
        field: true,
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(irrigationLogs);
  } catch (error) {
    console.error("Error fetching irrigation logs:", error);
    return NextResponse.json(
      { error: "Sulama kayıtları getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Yeni sulama kaydı oluştur
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

    const { date, amount, duration, method, notes, fieldId } =
      await request.json();

    // Veri doğrulama
    if (!date || !amount || !duration || !method || !fieldId) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik" },
        { status: 400 }
      );
    }

    // Aktif sezonu bul
    const seasonId = await getActiveSeasonId(fieldId);

    // Sulama kaydı oluştur
    const irrigationLog = await prisma.irrigationLog.create({
      data: {
        date: new Date(date),
        amount,
        duration,
        method,
        notes,
        fieldId,
        workerId: userId,
        seasonId,
      },
    });

    return NextResponse.json(irrigationLog);
  } catch (error) {
    console.error("Error creating irrigation log:", error);
    return NextResponse.json(
      { error: "Sulama kaydı oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
