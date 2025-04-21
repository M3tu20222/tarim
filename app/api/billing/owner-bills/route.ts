import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client"; // Prisma türlerini içe aktaralım

// Tüm tarla sahibi giderlerini getir
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
    const processCostId = searchParams.get("processCostId"); // wellBillId -> processCostId
    // const seasonId = searchParams.get("seasonId"); // billingPeriodId -> seasonId (şimdilik kaldırıldı)
    // const debtStatus = searchParams.get("status"); // status -> debtStatus (şimdilik kaldırıldı)

    // Filtreleme koşullarını oluştur
    const where: Prisma.FieldOwnerExpenseWhereInput = {};

    // Admin tüm giderleri görebilir
    if (userRole !== "ADMIN") {
       // Sahip veya işçi sadece kendiyle ilgili giderleri görebilir (Bu mantık projeye göre değişebilir)
       // Şimdilik sadece kendi giderlerini görmesini sağlıyoruz.
       where.userId = userId;
    }

    if (processCostId) {
        where.processCostId = processCostId;
    }
    // Sezon ve Durum filtreleri şimdilik kaldırıldı, gerekirse daha sonra eklenebilir.
    // if (seasonId) {
    //     where.processCost = { process: { seasonId: seasonId } };
    // }
    // Status filtresi için ilgili Debt'leri ayrıca çekip filtrelemek gerekebilir.

    // Tarla sahibi giderlerini getir
    const fieldOwnerExpenses = await prisma.fieldOwnerExpense.findMany({
      where,
      include: {
        user: { // Giderin sahibi olan kullanıcı
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        processCost: { // İlişkili işlem maliyeti
          include: {
            process: { // İşlemin kendisi
              include: {
                field: { // İşlemin yapıldığı tarla
                  select: { id: true, name: true },
                },
                season: { // İşlemin ait olduğu sezon
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        fieldOwnership: { // Giderin ait olduğu tarla sahipliği
            include: {
              field: { // Sahipliğin ait olduğu tarla
                select: { id: true, name: true },
              },
            },
          },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

     // İsteğe bağlı: Her gider için ilgili borç durumunu ekle (Performans etkilenebilir)
     const expensesWithDebtStatus = await Promise.all(
        fieldOwnerExpenses.map(async (expense) => {
            const relatedDebt = await prisma.debt.findFirst({
                where: {
                    debtorId: expense.userId,
                    description: `ProcessCost:${expense.processCostId}`,
                },
                select: { status: true, amount: true, paymentHistory: { select: { amount: true } } }
            });
            const totalPaid = relatedDebt?.paymentHistory.reduce((sum, p) => sum + p.amount, 0) ?? 0;
            const remainingAmount = (relatedDebt?.amount ?? 0) - totalPaid;
            return {
                ...expense,
                debtStatus: relatedDebt?.status ?? null,
                remainingAmount: remainingAmount,
                totalPaid: totalPaid,
            };
        })
    );

    // Durum filtresini burada uygula (eğer debtStatus parametresi varsa)
    // const filteredExpenses = debtStatus
    //     ? expensesWithDebtStatus.filter(exp => exp.debtStatus === debtStatus)
    //     : expensesWithDebtStatus;


    return NextResponse.json(expensesWithDebtStatus); // Filtrelenmiş veya tüm sonuçları döndür
  } catch (error) {
    console.error("Error fetching field owner expenses:", error);
    return NextResponse.json(
      { error: "Tarla sahibi giderleri getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
