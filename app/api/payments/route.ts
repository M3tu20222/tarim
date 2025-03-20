import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Ödeme geçmişini getir
export async function GET(request: Request) {
  try {
    // Yetkilendirme kontrolü
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const debtId = searchParams.get("debtId");
    const contributorId = searchParams.get("contributorId");

    let payments;

    if (debtId) {
      // Belirli bir borcun ödemelerini getir
      payments = await prisma.paymentHistory.findMany({
        where: {
          debtId,
        },
        include: {
          payer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          debt: true,
        },
        orderBy: {
          paymentDate: "desc",
        },
      });
    } else if (contributorId) {
      // Belirli bir katkı sahibinin ödemelerini getir
      payments = await prisma.paymentHistory.findMany({
        where: {
          contributorId,
        },
        include: {
          payer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          contributor: {
            include: {
              purchase: true,
            },
          },
        },
        orderBy: {
          paymentDate: "desc",
        },
      });
    } else {
      // Kullanıcının tüm ödemelerini getir
      if (userRole === "ADMIN") {
        // Admin tüm ödemeleri görebilir
        payments = await prisma.paymentHistory.findMany({
          include: {
            payer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            receiver: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            debt: true,
            contributor: {
              include: {
                purchase: true,
              },
            },
          },
          orderBy: {
            paymentDate: "desc",
          },
        });
      } else {
        // Kullanıcı kendi ödemelerini görebilir
        payments = await prisma.paymentHistory.findMany({
          where: {
            OR: [{ payerId: userId }, { receiverId: userId }],
          },
          include: {
            payer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            receiver: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            debt: true,
            contributor: {
              include: {
                purchase: true,
              },
            },
          },
          orderBy: {
            paymentDate: "desc",
          },
        });
      }
    }

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Ödemeler getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Yeni ödeme oluştur
export async function POST(request: Request) {
  try {
    // Yetkilendirme kontrolü
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    const {
      amount,
      paymentDate,
      paymentMethod,
      notes,
      debtId,
      contributorId,
      receiverId,
    } = await request.json();

    if (!amount || !paymentMethod || (!debtId && !contributorId)) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik" },
        { status: 400 }
      );
    }

    // İşlem başlat
    const result = await prisma.$transaction(async (tx) => {
      let debt;
      let contributor;
      let actualReceiverId = receiverId;

      // Borç ödemesi
      if (debtId) {
        debt = await tx.debt.findUnique({
          where: { id: debtId },
        });

        if (!debt) {
          throw new Error("Borç bulunamadı");
        }

        actualReceiverId = debt.creditorId;

        // Borç durumunu güncelle
        if (amount >= debt.amount) {
          // Tam ödeme
          await tx.debt.update({
            where: { id: debtId },
            data: {
              status: "PAID",
              paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            },
          });
        } else {
          // Kısmi ödeme
          await tx.debt.update({
            where: { id: debtId },
            data: {
              amount: debt.amount - amount,
              status: "PARTIALLY_PAID",
            },
          });
        }

        // Borçla ilişkili katkı sahibini bul
        if (debt.purchaseId) {
          contributor = await tx.purchaseContributor.findFirst({
            where: {
              purchaseId: debt.purchaseId,
              userId: debt.debtorId,
            },
          });

          if (contributor) {
            // Katkı sahibini güncelle
            await tx.purchaseContributor.update({
              where: { id: contributor.id },
              data: {
                actualContribution: { increment: amount },
                remainingAmount: { decrement: amount },
                hasPaid: amount >= (contributor.remainingAmount || 0),
                paymentDate:
                  amount >= (contributor.remainingAmount || 0)
                    ? new Date()
                    : null,
              },
            });
          }
        }
      }
      // Katkı sahibi ödemesi
      else if (contributorId) {
        contributor = await tx.purchaseContributor.findUnique({
          where: { id: contributorId },
          include: {
            purchase: true,
          },
        });

        if (!contributor) {
          throw new Error("Katkı sahibi bulunamadı");
        }

        if (!actualReceiverId) {
          // Alacaklıyı bul (kredi veren)
          const creditor = await tx.purchaseContributor.findFirst({
            where: {
              purchaseId: contributor.purchaseId,
              isCreditor: true,
            },
          });

          if (creditor) {
            actualReceiverId = creditor.userId;
          } else {
            throw new Error("Alacaklı bulunamadı");
          }
        }

        // Katkı sahibini güncelle
        await tx.purchaseContributor.update({
          where: { id: contributorId },
          data: {
            actualContribution: { increment: amount },
            remainingAmount: { decrement: amount },
            hasPaid: amount >= (contributor.remainingAmount || 0),
            paymentDate:
              amount >= (contributor.remainingAmount || 0) ? new Date() : null,
          },
        });

        // İlişkili borcu bul ve güncelle
        if (contributor.purchase?.id) {
          debt = await tx.debt.findFirst({
            where: {
              purchaseId: contributor.purchase.id,
              debtorId: contributor.userId,
            },
          });

          if (debt) {
            if (amount >= debt.amount) {
              // Tam ödeme
              await tx.debt.update({
                where: { id: debt.id },
                data: {
                  status: "PAID",
                  paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                },
              });
            } else {
              // Kısmi ödeme
              await tx.debt.update({
                where: { id: debt.id },
                data: {
                  amount: debt.amount - amount,
                  status: "PARTIALLY_PAID",
                },
              });
            }
          }
        }
      }

      // Ödeme geçmişi oluştur
      const payment = await tx.paymentHistory.create({
        data: {
          amount,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethod,
          notes,
          debtId: debt?.id,
          contributorId: contributor?.id,
          payerId: userId,
          receiverId: actualReceiverId,
        },
      });

      // Bildirim oluştur
      await tx.notification.create({
        data: {
          title: "Ödeme Alındı",
          message: `${amount} TL tutarında ödeme alındı.`,
          type: "DEBT",
          receiverId: actualReceiverId,
          senderId: userId,
        },
      });

      return payment;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ödeme oluşturulurken bir hata oluştu",
      },
      { status: 500 }
    );
  }
}
