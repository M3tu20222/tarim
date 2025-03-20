import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

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
          // worker ilişkisi doğru
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
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date, amount, duration, method, notes, fieldId, workerId } =
      await request.json();

    const irrigationLog = await prisma.irrigationLog.create({
      data: {
        date: new Date(date),
        amount,
        duration,
        method,
        notes,
        field: { connect: { id: fieldId } }, // fieldId ile ilişkilendir
        worker: { connect: { id: workerId } }, // workerId ile ilişkilendir
      },
      include: {
        // İlişkileri include et
        field: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        worker: {
          // include içinde worker ilişkisi
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Tarla sahibine bildirim gönder.
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      include: {
        owners: {
          // owner yerine owners (çoğul) kullan
          select: {
            // Hangi alanların seçileceğini belirt
            id: true,
          },
        },
      },
    });

    if (field && field.owners && field.owners.length > 0) {
      // Birden fazla sahip olabileceği için döngü kullan
      for (const owner of field.owners) {
        await prisma.notification.create({
          data: {
            title: "Yeni Sulama Kaydı",
            message: `${field.name} tarlasında yeni bir sulama kaydı oluşturuldu.`,
            type: "IRRIGATION",
            receiverId: owner.id, // owner.id kullan
            senderId: session.user.id, // session.user.id kullan (workerId yerine)
          },
        });
      }
    }

    return NextResponse.json(irrigationLog);
  } catch (error) {
    console.error("Error creating irrigation log:", error);
    return NextResponse.json(
      { error: "Sulama kaydı oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
