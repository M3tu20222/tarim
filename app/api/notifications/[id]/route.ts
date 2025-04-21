import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationUpdateInput } from "@/types/notification-types";

// Bildirim detaylarını getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: params.id },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Kullanıcı sadece kendi bildirimlerini görebilir
    if (notification.receiverId !== userId) { // userId -> receiverId
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(notification);
  } catch (error) {
    console.error("Error fetching notification:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification" },
      { status: 500 }
    );
  }
}

// Bildirim durumunu güncelle (okundu olarak işaretle, arşivle)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const data: NotificationUpdateInput = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Önce bildirimi kontrol et
    const existingNotification = await prisma.notification.findUnique({
      where: { id: params.id },
    });

    if (!existingNotification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Kullanıcı sadece kendi bildirimlerini güncelleyebilir
    if (existingNotification.receiverId !== userId) { // userId -> receiverId
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Bildirimi güncelle
    // Bildirimi güncelle (okundu olarak işaretle)
    const notification = await prisma.notification.update({
      where: { id: params.id },
      data: {
        isRead: true, // status -> isRead, ve değeri true olarak ayarla
        // readAt alanı modelde yok, kaldırıldı
      },
    });

    return NextResponse.json(notification);
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}

// Bildirimi sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Önce bildirimi kontrol et
    const existingNotification = await prisma.notification.findUnique({
      where: { id: params.id },
    });

    if (!existingNotification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    // Kullanıcı sadece kendi bildirimlerini silebilir veya admin tüm bildirimleri silebilir
    if (existingNotification.receiverId !== userId && userRole !== "ADMIN") { // userId -> receiverId
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Bildirimi sil
    await prisma.notification.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
