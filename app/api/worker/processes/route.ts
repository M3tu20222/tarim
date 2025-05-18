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
    const status = url.searchParams.get("status") || "pending"; // pending, completed, upcoming

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

    // Bugünün tarihini al
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Durum filtresine göre where koşulunu oluştur
    let whereCondition: any = {
      workerId: userId,
    };

    if (status === "completed") {
      whereCondition.processedPercentage = 100;
    } else if (status === "upcoming") {
      whereCondition.date = {
        gt: today,
      };
      whereCondition.processedPercentage = {
        lt: 100,
      };
    } else if (status === "pending") {
      whereCondition.date = {
        lte: today,
      };
      whereCondition.processedPercentage = {
        lt: 100,
      };
    }

    // Toplam kayıt sayısını al
    const totalRecords = await prisma.process.count({
      where: whereCondition,
    });

    // Sayfalama hesapla
    const totalPages = Math.ceil(totalRecords / pageSize);
    const skip = (page - 1) * pageSize;

    // İşlem kayıtlarını getir
    const processes = await prisma.process.findMany({
      where: whereCondition,
      include: {
        field: {
          select: {
            id: true,
            name: true,
            location: true,
            size: true,
          },
        },
        inventoryUsages: {
          include: {
            inventory: {
              select: {
                id: true,
                name: true,
                category: true,
                unit: true,
              },
            },
          },
        },
        equipmentUsages: {
          include: {
            equipment: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          date: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      skip,
      take: pageSize,
    });

    return NextResponse.json({
      success: true,
      processes,
      totalRecords,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("İşlem kayıtları alınırken hata oluştu:", error);
    return NextResponse.json(
      { success: false, error: "İşlem kayıtları alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
