import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// import { getServerSession } from "next-auth"; // KALDIR
// import { authOptions } from "../auth/[...nextauth]/route"; // KALDIR (ve dosyayı sil)
import { getSession } from "@/lib/session"; // Kendi oturum kontrol fonksiyonunu ekle

// Get all debts
export async function GET(request: Request) {
  try {
    // const session = await getServerSession(authOptions); // KALDIR
    const session = await getSession(); // Kendi oturum kontrolünü kullan

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const type = searchParams.get("type"); // 'given' or 'taken'

    const where: any = {};

    if (userId) {
      if (type === "given") {
        where.creditorId = userId;
      } else if (type === "taken") {
        where.debtorId = userId;
      } else {
        where.OR = [{ creditorId: userId }, { debtorId: userId }];
      }
    }

    if (status) {
      where.status = status;
    }

    const debts = await prisma.debt.findMany({
      where,
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
        purchase: true,
        invoice: true,
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    return NextResponse.json(debts);
  } catch (error) {
    console.error("Error fetching debts:", error);
    return NextResponse.json(
      { error: "Failed to fetch debts" },
      { status: 500 }
    );
  }
}

// Create a new debt
export async function POST(request: Request) {
  try {
    // const session = await getServerSession(authOptions); // KALDIR
    const session = await getSession(); // Kendi oturum kontrolünü kullan

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const {
      amount,
      dueDate,
      status,
      description,
      creditorId,
      debtorId,
      purchaseId,
      invoiceId,
    } = await request.json();

    // Validate input
    if (!amount || !dueDate || !creditorId || !debtorId) {
      return NextResponse.json(
        { error: "Required fields are missing" },
        { status: 400 }
      );
    }

    const debt = await prisma.debt.create({
      data: {
        amount,
        dueDate: new Date(dueDate),
        status: status || "PENDING",
        description,
        creditorId,
        debtorId,
        purchaseId,
        invoiceId,
      },
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
      },
    });

    // Create notification for debtor
    await prisma.notification.create({
      data: {
        title: "New Debt Created",
        message: `You have a new debt of ${amount} due on ${new Date(
          dueDate
        ).toLocaleDateString()}`,
        type: "DEBT",
        receiverId: debtorId,
        senderId: creditorId,
      },
    });

    return NextResponse.json(debt, { status: 201 });
  } catch (error) {
    console.error("Error creating debt:", error);
    return NextResponse.json(
      { error: "Failed to create debt" },
      { status: 500 }
    );
  }
}
