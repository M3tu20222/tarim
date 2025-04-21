import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PaymentHistory,
  FieldOwnerExpense,
  Debt,
  DebtStatus,
  PaymentMethod,
} from "@prisma/client"; // Gerekli türleri içe aktar

// Tarla sahibi gideri için ödeme yap
export async function POST(
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

    const fieldOwnerExpenseId = params.id; // Bu ID FieldOwnerExpense ID'si
    const { amount, paymentDate, method, notes } = (await request.json()) as {
      amount: number;
      paymentDate: string;
      method: PaymentMethod;
      notes?: string;
    };

    // Veri doğrulama
    if (!amount || !paymentDate || !method || amount <= 0) {
      return NextResponse.json(
        { error: "Tutar, ödeme tarihi ve ödeme yöntemi zorunludur" },
        { status: 400 }
      );
    }

    // Tarla sahibi giderini getir
    const fieldOwnerExpense = await prisma.fieldOwnerExpense.findUnique({
      where: { id: fieldOwnerExpenseId },
      include: {
        user: true, // Borçlu kullanıcı bilgisi için
        processCost: true, // İlişkili işlem maliyeti
      },
    });

    if (!fieldOwnerExpense) {
      return NextResponse.json(
        { error: "Tarla sahibi gideri bulunamadı" },
        { status: 404 }
      );
    }

    // Yetki kontrolü (Sadece admin veya ilgili sahip ödeme yapabilir)
    if (userRole !== "ADMIN" && fieldOwnerExpense.userId !== userId) {
      return NextResponse.json(
        { error: "Bu gider için ödeme yapma yetkiniz yok" },
        { status: 403 }
      );
    }

    // İlgili borcu bul (Varsayım: Debt.description processCostId içeriyor veya başka bir ilişki var)
    // Bu kısım projenin borç yönetim mantığına göre uyarlanmalı.
    // Örnek olarak processCostId'ye göre arama yapalım:
    const relatedDebt = await prisma.debt.findFirst({
      where: {
        debtorId: fieldOwnerExpense.userId,
        // Varsayım: description alanı 'ProcessCost:processCostId' formatında
        description: `ProcessCost:${fieldOwnerExpense.processCostId}`,
        // Veya daha sağlam bir ilişki alanı varsa o kullanılmalı
      },
      include: {
        paymentHistory: true, // Mevcut ödemeleri getir
      },
    });

    if (!relatedDebt) {
      return NextResponse.json(
        { error: "Bu gidere ait ödenecek borç kaydı bulunamadı" },
        { status: 404 } // Veya 400 Bad Request
      );
    }

    // Ödeme tutarı kontrolü
    const totalPaid = relatedDebt.paymentHistory.reduce(
      (sum: number, payment: PaymentHistory) => sum + payment.amount,
      0
    );
    const remainingAmount = relatedDebt.amount - totalPaid;

    if (amount > remainingAmount) {
      return NextResponse.json(
        {
          error: `Ödeme tutarı kalan borçtan (${remainingAmount.toFixed(
            2
          )} TL) fazla olamaz`,
        },
        { status: 400 }
      );
    }

    // Transaction başlat
    const paymentResult = await prisma.$transaction(async (tx) => {
      // Ödeme kaydı oluştur (PaymentHistory)
      const newPayment = await tx.paymentHistory.create({
        data: {
          debtId: relatedDebt.id, // Borç kaydına bağla
          payerId: userId, // Ödeyen kullanıcı (gider sahibi)
          receiverId: relatedDebt.creditorId, // Alacaklı (borcun sahibi)
          amount,
          paymentDate: new Date(paymentDate),
          paymentMethod: method, // 'method' -> 'paymentMethod' olarak düzeltildi
          notes,
          // contributorId alanı schema'da zorunlu değil, PurchaseContributor ile ilgili
          // Eğer bu ödeme bir PurchaseContributor ile ilişkiliyse, o ID de eklenmeli.
          // Şimdilik FieldOwnerExpense ödemesi olduğu için boş bırakılabilir veya null atanabilir.
        },
      });

      // Toplam ödeme tutarını hesapla
      const newTotalPaid = totalPaid + amount;

      // Borç durumunu güncelle
      let newDebtStatus: DebtStatus = relatedDebt.status;
      if (newTotalPaid >= relatedDebt.amount) {
        newDebtStatus = DebtStatus.PAID;
      } else if (newTotalPaid > 0) {
        newDebtStatus = DebtStatus.PARTIALLY_PAID;
      }

      const updatedDebt = await tx.debt.update({
        where: { id: relatedDebt.id },
        data: {
          status: newDebtStatus,
          paymentDate: newDebtStatus === DebtStatus.PAID ? new Date() : null, // Tamamen ödendiyse ödeme tarihini güncelle
        },
      });

      // FieldOwnerExpense'in kendisinde bir durum güncellemesi gerekmiyor,
      // çünkü ödeme durumu Debt üzerinden takip ediliyor.

      // ProcessCost veya FieldExpense durum güncellemesi de schema'da yok.

      return { newPayment, updatedDebt };
    });

    return NextResponse.json(paymentResult.newPayment); // Sadece yeni ödeme kaydını döndür
  } catch (error) {
    console.error("Error making payment:", error);
    return NextResponse.json(
      { error: "Ödeme yapılırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
