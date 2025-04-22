import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Okunmamış bildirim sayısını getir
export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si bulunamadı" },
        { status: 401 }
      );
    }

    // Okunmamış bildirimlerin sayısını getir
    const count = await prisma.notification.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json(
      { error: "Okunmamış bildirim sayısı alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
