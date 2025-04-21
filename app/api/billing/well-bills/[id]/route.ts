import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Belirli bir kuyu faturasını getir
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

    // Sadece admin ve sahip kullanıcılar kuyu faturalarını görebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const id = params.id;

    // Kuyu faturasını getir
    const wellBill = await prisma.wellBill.findUnique({
      where: { id },
      include: {
        well: {
          select: {
            id: true,
            name: true,
          },
        },
        billingPeriod: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        ownerBills: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            fieldUsages: {
              include: {
                field: {
                  select: {
                    id: true,
                    name: true,
                    location: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!wellBill) {
      return NextResponse.json(
        { error: "Kuyu faturası bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json(wellBill);
  } catch (error) {
    console.error("Error fetching well bill:", error);
    return NextResponse.json(
      { error: "Kuyu faturası getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Kuyu faturasını güncelle
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

    // Sadece admin ve sahip kullanıcılar kuyu faturasını güncelleyebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const id = params.id;
    const { totalAmount, invoiceNumber, invoiceDate, status } =
      await request.json();

    // Veri doğrulama
    if (totalAmount === undefined) {
      return NextResponse.json(
        { error: "Toplam tutar zorunludur" },
        { status: 400 }
      );
    }

    // Kuyu faturasını güncelle
    const wellBill = await prisma.wellBill.update({
      where: { id },
      data: {
        totalAmount,
        invoiceNumber,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
        status: status || "PENDING",
      },
    });

    return NextResponse.json(wellBill);
  } catch (error) {
    console.error("Error updating well bill:", error);
    return NextResponse.json(
      { error: "Kuyu faturası güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Kuyu faturasını sil
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

    // Sadece admin ve sahip kullanıcılar kuyu faturasını silebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const id = params.id;

    // İlişkili tarla sahibi faturalarını kontrol et
    const ownerBillsCount = await prisma.ownerBill.count({
      where: { wellBillId: id },
    });

    if (ownerBillsCount > 0) {
      // İlişkili tüm verileri sil (transaction ile)
      await prisma.$transaction([
        // Önce tarla kullanımlarını sil
        prisma.fieldBillUsage.deleteMany({
          where: {
            ownerBill: {
              wellBillId: id,
            },
          },
        }),
        // Sonra ödemeleri sil
        prisma.billPayment.deleteMany({
          where: {
            OR: [
              { wellBillId: id },
              {
                ownerBill: {
                  wellBillId: id,
                },
              },
            ],
          },
        }),
        // Sonra tarla sahibi faturalarını sil
        prisma.ownerBill.deleteMany({
          where: { wellBillId: id },
        }),
        // En son kuyu faturasını sil
        prisma.wellBill.delete({
          where: { id },
        }),
      ]);
    } else {
      // Sadece kuyu faturasını sil
      await prisma.wellBill.delete({
        where: { id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting well bill:", error);
    return NextResponse.json(
      { error: "Kuyu faturası silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
