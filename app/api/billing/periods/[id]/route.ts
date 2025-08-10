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

/*
  Mevcut PUT ve DELETE metodları 'Season' modeli üzerinde işlem yapıyordu
  ve bu API endpoint'i için yanlıştı. İleride kafa karışıklığı yaratmaması
  için bu metodlar yorum satırı haline getirilmiştir. Gerekirse
  'WellBillingPeriod' modeli için yeniden yazılabilirler.

// Fatura dönemini güncelle
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  // ... WellBillingPeriod için güncelleme mantığı ...
}

// Fatura dönemini sil
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // ... WellBillingPeriod için silme mantığı ...
}
*/
