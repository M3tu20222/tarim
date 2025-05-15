"use client"; // NotificationList "use client" olduğu için bu sayfa da client component olmalı

import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationList } from "@/components/notifications/notification-list"; // NotificationList componentini import edin (yolunu kontrol edin)
import { useAuth } from "@/components/auth-provider"; // userId almak için
import { useState, useEffect } from "react";

// Metadata'yı bu şekilde tanımlamak client component'lerde doğrudan çalışmaz.
// Eğer metadata'ya ihtiyacınız varsa, layout.tsx üzerinden veya server component ile sarmalayarak yapmanız gerekir.
// Şimdilik metadata kısmını yorum satırına alıyorum veya kaldırıyorum.
// export const metadata: Metadata = {
//   title: "Bildirimler | Tarım Yönetim Sistemi",
//   description: "Tarım Yönetim Sistemi bildirimleri",
// };

export default function NotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  // Okunmamış bildirim sayısını almak için (isteğe bağlı, NotificationList kendi içinde halledebilir)
  // Bu örnekte, NotificationList'in kendisi zaten okunmamışları filtreleyebiliyor.
  // Ama bir badge için genel bir sayı isterseniz bu kullanılabilir.
  useEffect(() => {
    if (user?.id && !authLoading) {
      const fetchUnreadCount = async () => {
        try {
          const response = await fetch(
            `${apiUrl}/api/notifications/unread-count`,
            {
              headers: {
                "x-user-id": user.id,
              },
            }
          );
          if (response.ok) {
            const data = await response.json();
            setUnreadCount(data.count);
          }
        } catch (error) {
          console.error("Error fetching unread count:", error);
        }
      };
      fetchUnreadCount();
    }
  }, [user?.id, authLoading, apiUrl]);

  if (authLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Bildirimler</h1>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Bildirimler</h1>
        <p>Bildirimleri görüntülemek için lütfen giriş yapın.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Bildirimler</h1>
        {/* "Tümünü Okundu İşaretle" butonu NotificationList içinde zaten var,
            ama isterseniz burada genel bir tane de tutabilirsiniz.
            NotificationList'e bu işlevi dışarıdan tetikleme prop'u eklenebilir.
            Şimdilik NotificationList içindeki yeterli olacaktır.
        */}
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Tümü</TabsTrigger>
          <TabsTrigger value="unread">
            Okunmamış
            {/*
              Okunmamış sayısı için NotificationList'ten bir callback alabilir
              veya yukarıdaki gibi ayrı bir API isteği ile sayıyı gösterebilirsiniz.
              Şimdilik NotificationList `onlyUnread` prop'u ile kendi içinde filtreleyeceği için
              bu badge'i dinamik yapmak ek çalışma gerektirir.
              Basitlik adına, sayıyı şimdilik göstermeyebiliriz veya
              NotificationList'in içine bir `onUnreadCountChange` prop'u ekleyebiliriz.
            */}
            {/* {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount}
              </Badge>
            )} */}
          </TabsTrigger>
          <TabsTrigger value="sent">Gönderilenler</TabsTrigger>
          {/* "Okunmuş" tabı için özel bir filtre yok,
              "Tümü" listesinden client-side filtreleme yapılabilir
              veya API'nize `isRead=true` filtresi ekleyebilirsiniz.
              Şimdilik kaldırıyorum, "Tümü" zaten okunmuşları da içerir. */}
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tüm Bildirimler</CardTitle>
              <CardDescription>Alınan tüm bildirimleriniz.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* userId prop'u NotificationList içinde auth context'ten alınacak şekilde güncellenmişti,
                  o yüzden burada tekrar göndermeye gerek yok, context'ten alacak. */}
              <NotificationList
                key="all-notifications" // Farklı listeler için key vermek iyi bir pratiktir
                type="received" // Sadece alınanları göster
                showActions={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unread" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Okunmamış Bildirimler</CardTitle>
              <CardDescription>
                Henüz okunmamış ve size gelen bildirimler.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationList
                key="unread-notifications"
                onlyUnread={true}
                type="received" // Sadece alınanları göster
                showActions={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Gönderilen Bildirimler</CardTitle>
              <CardDescription>
                Sizin gönderdiğiniz bildirimler.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationList
                key="sent-notifications"
                showSent={true} // NotificationList'e bu prop'u eklemiştik.
                // API'nizin `listType=sent` veya benzeri bir filtreyi desteklemesi gerekir.
                // Ya da `NotificationList` içindeki `fetchNotifications` `showSent` prop'una göre farklı bir sorgu yapmalı.
                // Sizin kodunuzda `showSent` query param olarak ekleniyor, bu doğru.
                // Ayrıca `type="sent"` olarak da ayarlanabilir. Sizin kodunuzda `listType` olarak kullanılıyor.
                type="sent"
                showActions={false} // Gönderilenler için genelde okundu/sil gibi eylemler olmaz.
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
