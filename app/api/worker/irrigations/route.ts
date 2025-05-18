import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }

    if (session.role !== "WORKER") {
      return NextResponse.json(
        { success: false, error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    // URL parametrelerini al
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10");
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Kullanıcı ID'si gerekli" },
        { status: 400 }
      );
    }

    // Kullanıcının kendi ID'si ile eşleşiyor mu kontrol et
    if (userId !== session.id) {
      return NextResponse.json(
        { success: false, error: "Sadece kendi kayıtlarınızı görüntüleyebilirsiniz" },
        { status: 403 }
      );
    }

    // Toplam kayıt sayısını al
    const totalRecords = await prisma.irrigationLog.count({
      where: {
        createdBy: userId,
      },
    });

    // Sayfalama hesapla
    const totalPages = Math.ceil(totalRecords / pageSize);
    const skip = (page - 1) * pageSize;

    // Sulama kayıtlarını getir
    const irrigations = await prisma.irrigationLog.findMany({
      where: {
        createdBy: userId,
      },
      include: {
        well: {
          select: {
            id: true,
            name: true,
          },
        },
        fieldUsages: {
          include: {
            field: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        startDateTime: "desc",
      },
      skip,
      take: pageSize,
    });

    return NextResponse.json({
      success: true,
      irrigations,
      totalRecords,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Sulama kayıtları alınırken hata oluştu:", error);
    return NextResponse.json(
      { success: false, error: "Sulama kayıtları alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
