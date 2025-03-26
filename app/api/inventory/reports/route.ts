import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Envanter raporlarını getir
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
    const category = searchParams.get("category");
    const seasonId = searchParams.get("seasonId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");

    // Filtre oluştur
    const filter: any = {};
    if (category) {
      filter.category = category;
    }
    if (status) {
      filter.status = status;
    }

    // Envanter verilerini getir
    const inventory = await prisma.inventory.findMany({
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
        inventoryTransactions: {
          where: {
            ...(seasonId ? { seasonId } : {}),
            ...(startDate && endDate
              ? {
                  date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                  },
                }
              : {}),
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
            season: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            date: "desc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Kategori bazında özet istatistikler
    const categorySummary = await prisma.inventory.groupBy({
      by: ["category"],
      _sum: {
        totalQuantity: true,
      },
      _count: {
        id: true,
      },
    });

    // Durum bazında özet istatistikler
    const statusSummary = await prisma.inventory.groupBy({
      by: ["status"],
      _sum: {
        totalQuantity: true,
      },
      _count: {
        id: true,
      },
    });

    // Son 30 günlük işlem istatistikleri
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTransactions = await prisma.inventoryTransaction.findMany({
      where: {
        date: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        inventory: {
          select: {
            name: true,
            category: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // İşlem tipi bazında özet
    const transactionTypeSummary = await prisma.inventoryTransaction.groupBy({
      by: ["type"],
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
      where: {
        date: {
          gte: thirtyDaysAgo,
        },
      },
    });

    return NextResponse.json({
      inventory,
      summary: {
        byCategory: categorySummary,
        byStatus: statusSummary,
        byTransactionType: transactionTypeSummary,
      },
      recentTransactions,
    });
  } catch (error) {
    console.error("Error generating inventory report:", error);
    return NextResponse.json(
      { error: "Envanter raporu oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
