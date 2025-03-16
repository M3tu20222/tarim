import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Tüm sulama kayıtlarını getir
export async function GET() {
  try {
    const irrigationLogs = await prisma.irrigationLog.findMany({
      include: {
        field: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        worker: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });
    return NextResponse.json(irrigationLogs);
  } catch (error) {
    console.error("Error fetching irrigation logs:", error);
    return NextResponse.json(
      { error: "Sulama kayıtları getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Yeni sulama kaydı oluştur
export async function POST(request: Request) {
  try {
    const { date, amount, duration, method, notes, fieldId, workerId } =
      await request.json();

    // Sulama kaydı oluştur
    const irrigationLog = await prisma.irrigationLog.create({
      data: {
        date: new Date(date),
        amount,
        duration,
        method,
        notes,
        field: {
          connect: { id: fieldId },
        },
        worker: {
          connect: { id: workerId },
        },
      },
      include: {
        field: {
          select: {
            id: true,
            name: true,
            location: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        worker: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Tarla sahibine bildirim gönder
    await prisma.notification.create({
      data: {
        title: "Yeni Sulama Kaydı",
        message: `${irrigationLog.field.name} tarlasında yeni bir sulama kaydı oluşturuldu.`,
        type: "IRRIGATION",
        receiver: {
          connect: { id: irrigationLog.field.owner.id },
        },
        sender: {
          connect: { id: workerId },
        },
      },
    });

    return NextResponse.json(irrigationLog);
  } catch (error) {
    console.error("Error creating irrigation log:", error);
    return NextResponse.json(
      { error: "Sulama kaydı oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
