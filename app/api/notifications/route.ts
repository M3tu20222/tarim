import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Kullanıcının bildirimlerini getir
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si gereklidir" },
        { status: 400 }
      );
    }

    const notifications = await prisma.notification.findMany({
      where: {
        receiverId: userId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Bildirimler getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Bildirimi okundu olarak işaretle
export async function PUT(request: Request) {
  try {
    const { id } = await request.json();

    const notification = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json(notification);
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Bildirim güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
