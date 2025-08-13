import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Belirli bir fatura dönemini getir
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı kimliği veya rolü eksik" },
        { status: 401 }
      );
    }

    // Yetkilendirme: Sadece admin ve sahipler bu veriyi görebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const period = await prisma.wellBillingPeriod.findUnique({
      where: { id },
      include: {
        well: true, // Kuyu bilgilerini dahil et
        distributions: {
          orderBy: {
            createdAt: 'asc', // Dağıtımları oluşturulma tarihine göre sırala
          },
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            field: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!period) {
      return NextResponse.json(
        { error: "Fatura dönemi bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json(period);
  } catch (error) {
    console.error("Error fetching billing period:", error);
    return NextResponse.json(
      { error: "Fatura dönemi getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Fatura dönemini sil
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı kimliği veya rolü eksik" },
        { status: 401 }
      );
    }

    // Yetkilendirme: Sadece admin ve sahipler silebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    // İlişkili kayıtları ve ana kaydı tek bir transaction içinde sil
    await prisma.$transaction(async (tx) => {
      // Önce bu döneme ait borçları bul ve sil (veya başka bir işlem yap)
      // Bu örnekte, dağıtıma bağlı borçları siliyoruz.
      const distributions = await tx.wellBillDistribution.findMany({
        where: { wellBillingPeriodId: id },
        select: { debtId: true },
      });
      const debtIds = distributions.map(d => d.debtId).filter((debtId): debtId is string => debtId !== null);
      
      if (debtIds.length > 0) {
        // Borçlara bağlı ödeme geçmişini sil
        await tx.paymentHistory.deleteMany({
          where: { debtId: { in: debtIds } },
        });
        // Borçları sil
        await tx.debt.deleteMany({
          where: { id: { in: debtIds } },
        });
      }

      // İlişkili dağıtımları sil
      await tx.wellBillDistribution.deleteMany({
        where: { wellBillingPeriodId: id },
      });

      // İlişkili sulama kullanımlarını sil
      await tx.wellBillingIrrigationUsage.deleteMany({
        where: { wellBillingPeriodId: id },
      });

      // Son olarak fatura dönemini sil
      await tx.wellBillingPeriod.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting billing period:", error);
    return NextResponse.json(
      { error: "Fatura dönemi silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
