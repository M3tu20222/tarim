"use client";

import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Notification, NotificationSummary } from "@/types/notification-types"; // İthalat satırını yeniden yazıyoruz
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

export function NotificationDropdown() {
  const [notificationSummary, setNotificationSummary] =
    useState<NotificationSummary>({
      unreadCount: 0,
      recentNotifications: [],
    });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotificationSummary();

    // Periyodik kontrol için timer
    const intervalId = setInterval(fetchNotificationSummary, 60000); // Her dakika kontrol et

    return () => clearInterval(intervalId);
  }, []);

  const fetchNotificationSummary = async () => {
    try {
      const response = await fetch("/api/notifications/summary");
      if (!response.ok) throw new Error("Bildirim özeti yüklenemedi");
      const data: NotificationSummary = await response.json(); // Dönen veriye açıkça tür atandı
      setNotificationSummary(data);
    } catch (error) {
      console.error("Bildirim özeti yükleme hatası:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "READ" }),
      });

      if (!response.ok) throw new Error("Bildirim güncellenemedi");

      // Bildirimleri güncelle
      setNotificationSummary((prev: NotificationSummary) => ({
        ...prev,
        unreadCount: Math.max(0, prev.unreadCount - 1),
        recentNotifications: prev.recentNotifications.map((n: Notification) =>
          n.id === id ? { ...n, status: "READ", readAt: new Date() } : n
        ),
      }));
    } catch (error) {
      console.error("Bildirim güncelleme hatası:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Bildirim güncellenirken bir hata oluştu",
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Bildirimler güncellenemedi");

      // Tüm bildirimleri okundu olarak işaretle
      setNotificationSummary((prev: NotificationSummary) => ({
        ...prev,
        unreadCount: 0,
        recentNotifications: prev.recentNotifications.map((n: Notification) => ({
          ...n,
          status: "READ",
          readAt: new Date(),
        })),
      }));
    } catch (error) {
      console.error("Toplu bildirim güncelleme hatası:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Bildirimler güncellenirken bir hata oluştu",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notificationSummary.unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 px-1 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px]"
              variant="destructive"
            >
              {notificationSummary.unreadCount > 99
                ? "99+"
                : notificationSummary.unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Bildirimler</span>
          {notificationSummary.unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 py-0 px-2 text-xs"
              onClick={markAllAsRead}
            >
              Tümünü Okundu İşaretle
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="py-6 px-4 text-center">
            <p className="text-sm text-muted-foreground">
              Bildirimler yükleniyor...
            </p>
          </div>
        ) : notificationSummary.recentNotifications.length === 0 ? (
          <div className="py-6 px-4 text-center">
            <p className="text-sm text-muted-foreground">
              Hiç bildiriminiz yok
            </p>
          </div>
        ) : (
          <>
            {notificationSummary.recentNotifications.map((notification: Notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-3"
              >
                <div className="flex w-full gap-2">
                  <Avatar className="h-8 w-8">
                    <Bell className="h-4 w-4" />
                  </Avatar>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">
                        {notification.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: tr,
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {notification.body}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {notification.status === "UNREAD" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 py-0 px-2 text-xs"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Okundu
                        </Button>
                      )}
                      {notification.link && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-6 py-0 px-2 text-xs"
                          asChild
                        >
                          <a href={notification.link}>Detaylar</a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="justify-center font-medium">
              <a href="/dashboard/notifications">Tüm Bildirimleri Görüntüle</a>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
