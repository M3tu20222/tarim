import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client"; // Prisma tiplerini import et

// Bildirimleri listele
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prisma sorgusu için where koşulunu oluştur
    const where: Prisma.NotificationWhereInput = { receiverId: userId }; // userId -> receiverId

    // Duruma göre filtrele (okunmuş/okunmamış)
    if (status === "READ") {
      where.isRead = true; // status -> isRead
    } else if (status === "UNREAD") {
      where.isRead = false; // status -> isRead
    }
    // status belirtilmemişse veya geçersizse, isRead filtresi uygulanmaz

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// Yeni bildirim oluştur
export async function POST(request: NextRequest) {
  try {
    // Gelen veriyi Prisma tipiyle eşleştir
    const data: Prisma.NotificationUncheckedCreateInput = await request.json();
    const userRole = request.headers.get("x-user-role");

    // Sadece admin ve owner bildirim oluşturabilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Prisma modeline uygun veri objesi oluştur
    const notificationData: Prisma.NotificationUncheckedCreateInput = {
      receiverId: data.receiverId, // userId -> receiverId
      senderId: data.senderId,     // senderId eklendi (varsa)
      processId: data.processId,   // processId eklendi (varsa)
      type: data.type,             // type (geçersizse Prisma hata verir)
      title: data.title,
      message: data.message,       // body -> message
      // isRead varsayılan olarak false olacak (modelde @default(false))
      // link, priority, status, methods, metadata modelde yok, kaldırıldı
    };

    const notification = await prisma.notification.create({
      data: notificationData,
    });

    // methods alanı kaldırıldığı için e-posta/SMS gönderme mantığı kaldırıldı

    return NextResponse.json(notification);
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

// Yardımcı fonksiyonlar
// Yardımcı fonksiyonlar (çağrılmadığı için şimdilik yorum satırı yapıldı veya kaldırılabilir)
/*
async function sendEmailNotification(notification: any) {
  // E-posta gönderme işlemi burada gerçekleştirilecek
  console.log(
    `Email notification sent to user ${notification.receiverId}: ${notification.title}` // userId -> receiverId
  );
}

async function sendSmsNotification(notification: any) {
  // SMS gönderme işlemi burada gerçekleştirilecek
  console.log(
    `SMS notification sent to user ${notification.receiverId}: ${notification.title}` // userId -> receiverId
  );
}
*/
