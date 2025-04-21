import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Kullanıcının tüm okunmamış bildirimlerini okundu olarak işaretle
    const result = await prisma.notification.updateMany({
      where: {
        receiverId: userId, // userId -> receiverId
        isRead: false,      // status: "UNREAD" -> isRead: false
      },
      data: {
        isRead: true,       // status: "READ" -> isRead: true
        // readAt alanı modelde yok, kaldırıldı
      },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} notifications marked as read`,
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
