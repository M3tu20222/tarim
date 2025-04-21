import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// NotificationSummary importu kaldırıldı, tip çıkarımı kullanılacak

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Okunmamış bildirim sayısını hesapla
    const unreadCount = await prisma.notification.count({
      where: {
        receiverId: userId, // userId -> receiverId
        isRead: false,      // status: "UNREAD" -> isRead: false
      },
    });

    // Son 5 bildirimi getir
    const recentNotifications = await prisma.notification.findMany({
      where: {
        receiverId: userId, // userId -> receiverId
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    // Tip tanımı kaldırıldı, TypeScript tipi otomatik algılayacak
    const summary = {
      unreadCount,
      recentNotifications, // Tip uyuşmazlığı hatasını gidermek için explicit tip kaldırıldı
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching notification summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification summary" },
      { status: 500 }
    );
  }
}
