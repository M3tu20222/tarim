import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { WeatherSnapshotService } from "@/lib/weather/weather-snapshot-service";

const weatherSnapshotService = new WeatherSnapshotService();

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
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startDateTime: "desc",
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

    const { date, amount, duration, method, notes, fieldId, wellId } =
      await request.json();

    const irrigationLog = await prisma.irrigationLog.create({
      data: {
        startDateTime: new Date(date),
        date: new Date(date),
        amount,
        duration,
        method,
        notes,
        fieldId,
        wellId,
        createdBy: session.id,
      },
      include: {
        field: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        user: {
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
          select: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (field && field.owners && field.owners.length > 0) {
      for (const ownership of field.owners) {
        await prisma.notification.create({
          data: {
            title: "Yeni Sulama Kaydı",
            message: `${field.name} tarlasında yeni bir sulama kaydı oluşturuldu.`,
            type: "IRRIGATION",
            receiverId: ownership.user.id,
            senderId: session.id,
          },
        });
      }
    }

    // 🚿 Hava durumu snapshot'ı oluştur (async, hata durumunda irrigation'ı etkilemesin)
    try {
      await weatherSnapshotService.captureIrrigationWeatherSnapshot(irrigationLog.id, fieldId);
      console.log(`✅ Irrigation ${irrigationLog.id} için weather snapshot oluşturuldu`);
    } catch (snapshotError) {
      console.warn(`⚠️ Irrigation ${irrigationLog.id} weather snapshot hatası:`, snapshotError);
      // Snapshot hatası irrigation'ı etkilemesin
    }

    return NextResponse.json({
      ...irrigationLog,
      weatherSnapshotCaptured: true
    });
  } catch (error) {
    console.error("Error creating irrigation log:", error);
    return NextResponse.json(
      { error: "Sulama kaydı oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
