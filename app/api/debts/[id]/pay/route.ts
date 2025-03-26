import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Borcu getir
    const debt = await prisma.debt.findUnique({
      where: { id: params.id },
      include: {
        paymentHistory: true,
      },
    });

    if (!debt) {
      return NextResponse.json({ error: "Borç bulunamadı" }, { status: 404 });
    }

    // İptal edilmiş borçlara ödeme yapılamaz
    if (debt.status === "CANCELLED") {
      return NextResponse.json(
        { error: "İptal edilmiş borçlara ödeme yapılamaz" },
        { status: 400 }
      );
    }

    const { amount, paymentMethod, paymentDate, notes } = await request.json();

    // Veri doğrulama
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Geçerli bir ödeme tutarı girilmelidir" },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Ödeme yöntemi seçilmelidir" },
        { status: 400 }
      );
    }

    // Toplam ödenen tutarı hesapla
    const totalPaid = debt.paymentHistory.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    const remainingAmount = debt.amount - totalPaid;

    // Ödeme tutarı kalan tutardan büyük olamaz
    if (amount > remainingAmount) {
      return NextResponse.json(
        {
          error: `Ödeme tutarı kalan borç tutarından (${remainingAmount.toFixed(2)} ₺) büyük olamaz`,
        },
        { status: 400 }
      );
    }

    // Ödeme kaydı oluştur
    const payment = await prisma.paymentHistory.create({
      data: {
        amount,
        paymentDate: new Date(paymentDate),
        paymentMethod,
        notes,
        debt: {
          connect: { id: params.id },
        },
        payer: {
          connect: { id: debt.debtorId },
        },
        receiver: {
          connect: { id: debt.creditorId },
        },
        // Contributor alanını ekleyelim - bu alan şemada zorunlu
        contributor: {
          // Burada bir PurchaseContributor bağlantısı gerekiyor
          // Ancak borç ödemelerinde bu alan kullanılmıyor, bu yüzden
          // şemayı değiştirmemiz gerekecek. Şimdilik geçici bir çözüm olarak:
          connect: {
            // Varsayılan bir contributor ID kullanabiliriz veya
            // bu alanı opsiyonel hale getirmek için şemayı güncellemeliyiz
            id: "default-contributor-id", // Bu ID'yi gerçek bir ID ile değiştirin
          },
        },
      },
    });

    // Yeni toplam ödenen tutarı hesapla
    const newTotalPaid = totalPaid + amount;
    const newRemainingAmount = debt.amount - newTotalPaid;

    // Borç durumunu güncelle
    let newStatus = debt.status;
    if (newRemainingAmount <= 0) {
      newStatus = "PAID";
    } else if (newTotalPaid > 0) {
      newStatus = "PARTIALLY_PAID";
    }

    await prisma.debt.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        paymentDate: newStatus === "PAID" ? new Date() : null,
      },
    });

    // Bildirim oluştur
    await prisma.notification.create({
      data: {
        title: "Borç Ödemesi",
        message: `${amount.toFixed(2)} ₺ tutarında borç ödemesi yapıldı. ${
          newStatus === "PAID"
            ? "Borç tamamen ödendi."
            : `Kalan borç: ${newRemainingAmount.toFixed(2)} ₺`
        }`,
        type: "DEBT",
        receiver: {
          connect: { id: debt.creditorId },
        },
        sender: {
          connect: { id: userId },
        },
      },
    });

    return NextResponse.json({
      message: "Ödeme başarıyla kaydedildi",
      payment,
      newStatus,
      remainingAmount: newRemainingAmount,
    });
  } catch (error) {
    console.error("Error recording debt payment:", error);
    return NextResponse.json(
      { error: "Ödeme kaydedilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
