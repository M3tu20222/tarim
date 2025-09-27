// app/api/seasons/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// Belirli bir sezonu getir
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    const userRole = headersList.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    const season = await prisma.season.findUnique({
      where: { id: id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!season) {
      return NextResponse.json({ error: "Sezon bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(season);
  } catch (error) {
    console.error("Error fetching season:", error);
    return NextResponse.json(
      { error: "Sezon getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Sezonu güncelle
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    const userRole = headersList.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // Sadece admin ve sahip kullanıcılar sezon güncelleyebilir
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
        where: {
          isActive: true,
          id: { not: id },
        },
        data: { isActive: false },
      });
    }

    // Sezonu güncelle
    const season = await prisma.season.update({
      where: { id: id },
      data: {
        name,
        startDate: start,
        endDate: end,
        description,
        isActive,
      },
    });

    return NextResponse.json(season);
  } catch (error) {
    console.error("Error updating season:", error);
    return NextResponse.json(
      { error: "Sezon güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Sezonu sil
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    const userRole = headersList.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // Sadece admin ve sahip kullanıcılar sezon silebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    // İlişkili kayıtları kontrol et
    const relatedFields = await prisma.field.count({
      where: { seasonId: id },
    });

    const relatedCrops = await prisma.crop.count({
      where: { seasonId: id },
    });

    const relatedPurchases = await prisma.purchase.count({
      where: { seasonId: id },
    });

    // İlişkili kayıtlar varsa silme işlemini engelle
    if (relatedFields > 0 || relatedCrops > 0 || relatedPurchases > 0) {
      return NextResponse.json(
        {
          error: "Bu sezon silinemiyor çünkü ilişkili kayıtlar var",
          details: {
            fields: relatedFields,
            crops: relatedCrops,
            purchases: relatedPurchases,
          },
        },
        { status: 400 }
      );
    }

    // Sezonu sil
    await prisma.season.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Sezon başarıyla silindi" });
  } catch (error) {
    console.error("Error deleting season:", error);
    return NextResponse.json(
      { error: "Sezon silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
