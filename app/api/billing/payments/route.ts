import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client"; // Prisma türlerini içe aktaralım

// Tüm ödeme geçmişini getir
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
    const payerIdParam = searchParams.get("payerId");
    const receiverIdParam = searchParams.get("receiverId");
    const debtIdParam = searchParams.get("debtId");
    const contributorIdParam = searchParams.get("contributorId");

    // Filtreleme koşullarını oluştur
    const where: Prisma.PaymentHistoryWhereInput = {};

    // Admin tüm ödemeleri görebilir
    if (userRole !== "ADMIN") {
      // Diğer kullanıcılar sadece kendilerinin yaptığı veya aldığı ödemeleri görebilir
      where.OR = [
        { payerId: userId },
        { receiverId: userId },
      ];
    }

    // URL parametrelerine göre ek filtreler
    if (payerIdParam) {
        // Eğer admin değilse ve kendi dışındaki birini filtrelemeye çalışıyorsa engelle
        if (userRole !== "ADMIN" && payerIdParam !== userId && !where.OR?.some(c => c.payerId === payerIdParam)) {
             return NextResponse.json({ error: "Yetkisiz filtreleme" }, { status: 403 });
        }
        where.payerId = payerIdParam;
    }
    if (receiverIdParam) {
        if (userRole !== "ADMIN" && receiverIdParam !== userId && !where.OR?.some(c => c.receiverId === receiverIdParam)) {
            return NextResponse.json({ error: "Yetkisiz filtreleme" }, { status: 403 });
       }
        where.receiverId = receiverIdParam;
    }
    if (debtIdParam) where.debtId = debtIdParam;
    if (contributorIdParam) where.contributorId = contributorIdParam;


    // Ödeme geçmişini getir
    const paymentHistories = await prisma.paymentHistory.findMany({
      where,
      include: {
        payer: { // Ödeyen kullanıcı
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        receiver: { // Alan kullanıcı
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        debt: { // İlişkili borç (varsa)
            select: { id: true, description: true, amount: true, status: true }
        },
        contributor: { // İlişkili alış katılımcısı (varsa)
            include: {
                user: { select: { id: true, name: true } },
                purchase: { select: { id: true, product: true } }
            }
        }
      },
      orderBy: {
        paymentDate: "desc",
      },
    });

    return NextResponse.json(paymentHistories);
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return NextResponse.json(
      { error: "Ödeme geçmişi getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
