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

// Belirli bir sulama kaydını getir
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

    const irrigation = await prisma.irrigationLog.findUnique({
      where: { id: params.id },
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
    });

    if (!irrigation) {
      return NextResponse.json(
        { error: "Sulama kaydı bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json(irrigation);
  } catch (error) {
    console.error("Error fetching irrigation log:", error);
    return NextResponse.json(
      { error: "Sulama kaydı getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Sulama kaydını güncelle
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

    // Sadece admin ve sahip kullanıcılar sulama kaydı güncelleyebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
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

    // Sulama kaydını güncelle
    const updatedIrrigation = await prisma.irrigationLog.update({
      where: { id: params.id },
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

    return NextResponse.json(updatedIrrigation);
  } catch (error) {
    console.error("Error updating irrigation log:", error);
    return NextResponse.json(
      { error: "Sulama kaydı güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Sulama kaydını sil
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

    // Sadece admin ve sahip kullanıcılar sulama kaydı silebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    // Sulama kaydını sil
    await prisma.irrigationLog.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting irrigation log:", error);
    return NextResponse.json(
      { error: "Sulama kaydı silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
