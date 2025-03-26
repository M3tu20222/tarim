import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Belirli bir borcu getir
export async function GET(
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

    const debt = await prisma.debt.findUnique({
      where: { id: params.id },
      include: {
        creditor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        debtor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        paymentHistory: {
          include: {
            payer: {
              select: {
                id: true,
                name: true,
              },
            },
            receiver: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            paymentDate: "desc",
          },
        },
      },
    });

    if (!debt) {
      return NextResponse.json({ error: "Borç bulunamadı" }, { status: 404 });
    }

    // Sadece admin, sahip, alacaklı veya borçlu kullanıcılar borcu görebilir
    if (
      userRole !== "ADMIN" &&
      userRole !== "OWNER" &&
      debt.creditorId !== userId &&
      debt.debtorId !== userId
    ) {
      return NextResponse.json(
        { error: "Bu borcu görüntüleme yetkiniz yok" },
        { status: 403 }
      );
    }

    return NextResponse.json(debt);
  } catch (error) {
    console.error("Error fetching debt:", error);
    return NextResponse.json(
      { error: "Borç getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Borcu güncelle
export async function PUT(
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

    // Sadece admin ve sahip kullanıcılar borç güncelleyebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const debt = await prisma.debt.findUnique({
      where: { id: params.id },
    });

    if (!debt) {
      return NextResponse.json({ error: "Borç bulunamadı" }, { status: 404 });
    }

    // Ödenmiş veya iptal edilmiş borçlar güncellenemez
    if (debt.status === "PAID" || debt.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Ödenmiş veya iptal edilmiş borçlar güncellenemez" },
        { status: 400 }
      );
    }

    const { amount, dueDate, description, creditorId, debtorId, reason } =
      await request.json();

    // Veri doğrulama
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Borç tutarı pozitif bir sayı olmalıdır" },
        { status: 400 }
      );
    }

    if (!dueDate) {
      return NextResponse.json(
        { error: "Vade tarihi zorunludur" },
        { status: 400 }
      );
    }

    if (!creditorId) {
      return NextResponse.json(
        { error: "Alacaklı seçilmelidir" },
        { status: 400 }
      );
    }

    if (!debtorId) {
      return NextResponse.json(
        { error: "Borçlu seçilmelidir" },
        { status: 400 }
      );
    }

    // Borcu güncelle
    const updatedDebt = await prisma.debt.update({
      where: { id: params.id },
      data: {
        amount,
        dueDate: new Date(dueDate),
        description,
        reason,
        creditor: {
          connect: { id: creditorId },
        },
        debtor: {
          connect: { id: debtorId },
        },
      },
    });

    // Bildirim oluştur
    await prisma.notification.create({
      data: {
        title: "Borç Güncellendi",
        message: `${amount.toFixed(2)} ₺ tutarındaki borç kaydı güncellendi. Vade tarihi: ${new Date(dueDate).toLocaleDateString("tr-TR")}`,
        type: "DEBT",
        receiver: {
          connect: { id: debtorId },
        },
        sender: {
          connect: { id: userId },
        },
      },
    });

    return NextResponse.json(updatedDebt);
  } catch (error) {
    console.error("Error updating debt:", error);
    return NextResponse.json(
      { error: "Borç güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Borcu sil
export async function DELETE(
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

    // Sadece admin ve sahip kullanıcılar borç silebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const debt = await prisma.debt.findUnique({
      where: { id: params.id },
      include: {
        paymentHistory: true,
      },
    });

    if (!debt) {
      return NextResponse.json({ error: "Borç bulunamadı" }, { status: 404 });
    }

    // Ödeme geçmişi varsa borç silinemez
    if (debt.paymentHistory.length > 0) {
      return NextResponse.json(
        {
          error:
            "Bu borç silinemez çünkü ödeme geçmişi var. Bunun yerine iptal etmeyi deneyin.",
        },
        { status: 400 }
      );
    }

    // Borcu sil
    await prisma.debt.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Borç başarıyla silindi" });
  } catch (error) {
    console.error("Error deleting debt:", error);
    return NextResponse.json(
      { error: "Borç silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
