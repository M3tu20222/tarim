import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
// PrismaNotification ve NotificationType'ı Prisma'dan import et
import { Notification as PrismaNotification, NotificationType, NotificationStatus } from "@prisma/client";

type FrontendNotification = PrismaNotification;

interface NotificationSummary {
  unreadCount: number;
  recentNotifications: FrontendNotification[];
}

// Prisma modelini Frontend türüne dönüştüren yardımcı fonksiyon
function mapPrismaToFrontend(
  prismaNotification: PrismaNotification
): FrontendNotification {
  let status: NotificationStatus = "UNREAD";
  if (prismaNotification.isArchived) {
    status = "ARCHIVED";
  } else if (prismaNotification.isRead) {
    status = "READ";
  }

  // FrontendNotification türündeki 'type' alanının Prisma'nın NotificationType enum'u ile uyumlu olması gerekir.
  // Eğer types/notification-types.ts içindeki NotificationType farklıysa, onu da güncellemek gerekecek.
  // Şimdilik doğrudan atama yapıyoruz, çünkü Prisma'dan gelen type zaten doğru enum türünde.
  return {
    id: prismaNotification.id, // _id yerine id kullanılıyor Prisma'da
    userId: prismaNotification.receiverId, // receiverId -> userId
    type: prismaNotification.type, // Prisma'dan gelen enum değerini doğrudan kullan
    title: prismaNotification.title, // title eşleşiyor
    body: prismaNotification.message, // message -> body
    link: prismaNotification.link || undefined, // link eşleşiyor (null ise undefined)
    priority: prismaNotification.priority, // priority eşleşiyor
    status: status, // isRead/isArchived -> status
    methods: [], // Veritabanında yok, varsayılan boş dizi
    metadata: undefined, // Veritabanında yok, varsayılan undefined
    createdAt: prismaNotification.createdAt, // createdAt eşleşiyor
    updatedAt: prismaNotification.updatedAt, // updatedAt eşleşiyor
    readAt: prismaNotification.isRead ? prismaNotification.updatedAt : undefined, // Okunduysa updatedAt'i kullanabiliriz
  };
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const userId = session?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Okunmamış bildirim sayısını hesapla
    const unreadCount = await prisma.notification.count({
      where: {
        receiverId: userId,
        isRead: false,
        isArchived: false, // Arşivlenmemişleri de say
      },
    });

    // Son 5 okunmamış veya okunmuş (arşivlenmemiş) bildirimi getir
    const recentPrismaNotifications = await prisma.notification.findMany({
      where: {
        receiverId: userId,
        isArchived: false, // Arşivlenmemişleri getir
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    // Prisma sonuçlarını frontend türüne dönüştür
    const recentNotifications: FrontendNotification[] =
      recentPrismaNotifications.map(mapPrismaToFrontend);

    // Frontend'in beklediği summary nesnesini oluştur
    const summary: NotificationSummary = {
      unreadCount,
      recentNotifications,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching notification summary:", error);
    // Hata durumunda daha açıklayıcı bir mesaj döndür
    const errorMessage =
      error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
    return NextResponse.json(
      { error: "Failed to fetch notification summary", details: errorMessage },
      { status: 500 }
    );
  }
}
