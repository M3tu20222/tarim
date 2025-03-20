import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// import { getServerSession } from "next-auth"; // KALDIR
// import { authOptions } from "../../../auth/[...nextauth]/route"; // KALDIR (ve dosyayı sil)
import { getSession } from "@/lib/session"; // Kendi oturum kontrol fonksiyonunu ekle

// Pay a debt
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // const session = await getServerSession(authOptions); // KALDIR
    const session = await getSession(); // Kendi oturum kontrolünü kullan

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { paymentDate, partialAmount } = await request.json();

    // Get the debt
    const debt = await prisma.debt.findUnique({
      where: { id: params.id },
      include: {
        creditor: true,
        debtor: true,
      },
    });

    if (!debt) {
      return NextResponse.json({ error: "Debt not found" }, { status: 404 });
    }

    // Check if user is the debtor or an admin
    // if (debt.debtorId !== session.user.id && session.user.role !== "ADMIN") { // Hata burada
    if (debt.debtorId !== session.user?.id && session.user?.role !== "ADMIN") {
      // Düzeltme
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Handle partial payment
    if (partialAmount && partialAmount < debt.amount) {
      // Create a new debt for the remaining amount
      const remainingDebt = await prisma.debt.create({
        data: {
          amount: debt.amount - partialAmount,
          dueDate: debt.dueDate,
          status: "PENDING",
          description: `Remaining debt from ${
            debt.description || "original debt"
          }`,
          creditorId: debt.creditorId,
          debtorId: debt.debtorId,
          purchaseId: debt.purchaseId,
          invoiceId: debt.invoiceId,
        },
      });

      // Update the original debt
      const updatedDebt = await prisma.debt.update({
        where: { id: params.id },
        data: {
          amount: partialAmount,
          status: "PAID",
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        },
      });

      // Create notification for creditor
      await prisma.notification.create({
        data: {
          title: "Partial Debt Payment",
          message: `${debt.debtor.name} has made a partial payment of ${partialAmount} for their debt.`,
          type: "DEBT",
          receiverId: debt.creditorId,
          senderId: debt.debtorId,
        },
      });

      return NextResponse.json({
        paid: updatedDebt,
        remaining: remainingDebt,
        message: "Partial payment processed successfully",
      });
    } else {
      // Full payment
      const updatedDebt = await prisma.debt.update({
        where: { id: params.id },
        data: {
          status: "PAID",
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        },
      });

      // Create notification for creditor
      await prisma.notification.create({
        data: {
          title: "Debt Paid",
          message: `${debt.debtor.name} has paid their debt of ${debt.amount}.`,
          type: "DEBT",
          receiverId: debt.creditorId,
          senderId: debt.debtorId,
        },
      });

      return NextResponse.json({
        paid: updatedDebt,
        message: "Debt paid successfully",
      });
    }
  } catch (error) {
    console.error("Error paying debt:", error);
    return NextResponse.json(
      { error: "Failed to process debt payment" },
      { status: 500 }
    );
  }
}
