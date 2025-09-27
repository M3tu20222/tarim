import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const parseCoordinate = (value: unknown) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const normalized = Number(value.trim());
    return Number.isFinite(normalized) ? normalized : null;
  }
  return null;
};

// Belirli bir kuyuyu getir
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    const { id: wellId } = await params;

    const well = await prisma.well.findUnique({
      where: {
        id: wellId,
      },
      include: {
        fieldWells: { // Düzeltildi: field -> fieldWells
          include: {
            field: { // Field modeline fieldWells üzerinden erişim
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!well) {
      return NextResponse.json({ error: "Kuyu bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(well);
  } catch (error) {
    console.error("Error fetching well:", error);
    return NextResponse.json(
      { error: "Kuyu getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Kuyuyu güncelle
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // Sadece admin ve sahip kullanıcılar kuyu güncelleyebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const { id: wellId } = await params;
    // Düzeltildi: fieldId -> fieldIds (çoğul dizi)
    const { name, depth, capacity, status, fieldIds, latitude, longitude } = await request.json();

    // Veri doğrulama
    if (!name || !depth || !capacity) {
      return NextResponse.json(
        { error: "Kuyu adı, derinlik ve kapasite zorunludur" },
        { status: 400 }
      );
    }

    // Kuyu güncelle
    const latitudeValue = parseCoordinate(latitude);
    const longitudeValue = parseCoordinate(longitude);

    const well = await prisma.well.update({
      where: {
        id: wellId,
      },
      data: {
        name,
        depth,
        capacity,
        status,
        latitude: latitudeValue,
        longitude: longitudeValue,
        // Düzeltildi: fieldWells ilişkisi yönetimi
        fieldWells: {
          deleteMany: {}, // Mevcut tüm fieldWell bağlantılarını sil
          create: Array.isArray(fieldIds) && fieldIds.length > 0
            ? fieldIds.map((id: string) => ({ // Yeni fieldWell bağlantıları oluştur
                field: {
                  connect: { id: id },
                },
              }))
            : [], // fieldIds boş veya dizi değilse yeni bağlantı oluşturma
        },
      },
    });

    return NextResponse.json(well);
  } catch (error) {
    console.error("Error updating well:", error);
    return NextResponse.json(
      { error: "Kuyu güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Kuyuyu sil
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // Sadece admin ve sahip kullanıcılar kuyu silebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const { id: wellId } = await params;

    // Kuyuyu sil
    await prisma.well.delete({
      where: {
        id: wellId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting well:", error);
    return NextResponse.json(
      { error: "Kuyu silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

