import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FieldOwnerExpense } from "@prisma/client"; // Gerekli türü içe aktarabiliriz

// Belirli bir tarla sahibi giderini getir
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
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // Tarla sahibi giderini getir
    const fieldOwnerExpense = await prisma.fieldOwnerExpense.findUnique({
      where: { id },
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
                  select: { id: true, name: true, location: true },
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
        // 'payments' ilişkisi FieldOwnerExpense'de yok, Debt üzerinden takip ediliyor.
        // 'billingPeriod' ilişkisi yok, periodStart/End veya season kullanılabilir.
        // 'fieldUsages' ilişkisi yok.
      },
    });

    if (!fieldOwnerExpense) {
      return NextResponse.json(
        { error: "Tarla sahibi gideri bulunamadı" },
        { status: 404 }
      );
    }

    // Yetki kontrolü (Admin veya ilgili sahip görebilir)
    if (userRole !== "ADMIN" && fieldOwnerExpense.userId !== userId) {
      return NextResponse.json(
        { error: "Bu gideri görüntüleme yetkiniz yok" },
        { status: 403 }
      );
    }

    // İlgili borcun durumunu da ekleyebiliriz (opsiyonel)
    const relatedDebt = await prisma.debt.findFirst({
        where: {
            debtorId: fieldOwnerExpense.userId,
            description: `ProcessCost:${fieldOwnerExpense.processCostId}`,
        },
        select: { status: true, amount: true, paymentHistory: { select: { amount: true } } }
    });

    const totalPaid = relatedDebt?.paymentHistory.reduce((sum, p) => sum + p.amount, 0) ?? 0;
    const remainingAmount = (relatedDebt?.amount ?? 0) - totalPaid;


    // Yanıta borç durumunu ekle
    const responseData = {
        ...fieldOwnerExpense,
        debtStatus: relatedDebt?.status ?? null,
        remainingAmount: remainingAmount,
        totalPaid: totalPaid,
    };


    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching field owner expense:", error);
    return NextResponse.json(
      { error: "Tarla sahibi gideri getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// // Tarla sahibi giderini güncelle (FieldOwnerExpense'de status alanı yok, bu mantık Debt üzerinden yürümeli)
// // Bu PUT isteğinin amacı netleştirilmeli. Şimdilik yorum satırı yapıldı.
// export async function PUT(
//   request: Request,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const userId = request.headers.get("x-user-id");
//     const userRole = request.headers.get("x-user-role");

//     if (!userId || !userRole) {
//       return NextResponse.json(
//         { error: "Kullanıcı ID'si veya rolü eksik" },
//         { status: 401 }
//       );
//     }

//     // Yetkilendirme (Örn: Sadece Admin)
//     if (userRole !== "ADMIN") {
//       return NextResponse.json(
//         { error: "Bu işlem için yetkiniz yok" },
//         { status: 403 }
//       );
//     }

//     const id = params.id;
//     // Güncellenecek alanlar FieldOwnerExpense modeline göre belirlenmeli
//     const { /* guncellenecekAlanlar */ } = await request.json();

//     // // Veri doğrulama
//     // if (!guncellenecekAlanlar) {
//     //   return NextResponse.json({ error: "Güncellenecek veri eksik" }, { status: 400 });
//     // }

//     // // Tarla sahibi giderini güncelle
//     // const updatedFieldOwnerExpense = await prisma.fieldOwnerExpense.update({
//     //   where: { id },
//     //   data: {
//     //     /* guncellenecekAlanlar */
//     //   },
//     // });

//     // return NextResponse.json(updatedFieldOwnerExpense);

//     return NextResponse.json({ message: "Güncelleme endpoint'i henüz implemente edilmedi." }, { status: 501 });

//   } catch (error) {
//     console.error("Error updating field owner expense:", error);
//     return NextResponse.json(
//       { error: "Tarla sahibi gideri güncellenirken bir hata oluştu" },
//       { status: 500 }
//     );
//   }
// }
