import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSideSession } from "@/lib/session";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSideSession();
    if (!session?.id || (session.role !== "ADMIN" && session.role !== "OWNER")) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
    }

    const periodId = params.id;
    if (!periodId) {
      return NextResponse.json({ error: "Dönem ID'si gerekli." }, { status: 400 });
    }

    // Transaction ile ilişkili tüm verileri sil
    const result = await prisma.$transaction(async (tx) => {
      // 1. Bu döneme ait dağıtımları bul
      const distributions = await tx.wellBillDistribution.findMany({
        where: { wellBillingPeriodId: periodId },
        select: { debtId: true },
      });

      // 2. İlişkili borçları sil
      const debtIds = distributions
        .map((d) => d.debtId)
        .filter((id): id is string => id !== null);
        
      if (debtIds.length > 0) {
        await tx.debt.deleteMany({
          where: { id: { in: debtIds } },
        });
      }

      // 3. Dağıtım kayıtlarını sil
      await tx.wellBillDistribution.deleteMany({
        where: { wellBillingPeriodId: periodId },
      });

      // 4. Bu faturadan kaynaklanan tarla giderlerini sil
      await tx.fieldExpense.deleteMany({
        where: {
          sourceType: "WELL_BILL",
          sourceId: periodId,
        },
      });
      
      // 5. Fatura kullanım kayıtlarını sil (WellBillingIrrigationUsage)
      await tx.wellBillingIrrigationUsage.deleteMany({
        where: { wellBillingPeriodId: periodId },
      });

      // 6. Son olarak fatura dönemini sil
      const deletedPeriod = await tx.wellBillingPeriod.delete({
        where: { id: periodId },
      });

      return deletedPeriod;
    });

    return NextResponse.json({ message: "Fatura dönemi ve ilişkili tüm kayıtlar başarıyla silindi.", data: result });

  } catch (error: any) {
    console.error("Fatura dönemi silinirken hata oluştu:", error);
    if (error.code === 'P2025') { // Prisma'nın "kayıt bulunamadı" hatası
        return NextResponse.json({ error: "Silinecek fatura dönemi bulunamadı." }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Sunucu hatası oluştu." }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params: { id } }: { params: { id: string } }
) {
  if (!id) {
    return NextResponse.json({ error: "Dönem ID'si gerekli." }, { status: 400 });
  }

  try {
    const period = await prisma.wellBillingPeriod.findUnique({
      where: { id },
      include: {
        well: true,
        distributions: {
          include: {
            owner: {
              select: {
                name: true,
                email: true,
              },
            },
            field: {
              select: {
                name: true,
              },
            },
            debt: true,
          },
          orderBy: [
            {
              owner: {
                name: "asc",
              },
            },
            {
              field: {
                name: "asc",
              },
            },
          ],
        },
      },
    });

    if (!period) {
      return NextResponse.json({ error: "Dönem bulunamadı." }, { status: 404 });
    }

    return NextResponse.json(period);
  } catch (error) {
    console.error("Failed to fetch period details:", error);
    return NextResponse.json(
      { error: "Sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
