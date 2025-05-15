"use client";

import { useState, useEffect, useCallback } from "react"; // useCallback eklendi
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider"; // useAuth import edildi
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Bell,
  Check,
  CheckCheck,
  Info,
  AlertTriangle,
  DollarSign,
  Droplet,
  FileText,
  Send,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type {
  NotificationType,
  NotificationListType,
} from "@/types/notification-types";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
  } | null;
  receiver: {
    id: string;
    name: string;
  };
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  link?: string;
}

interface NotificationListProps {
  userId?: string;
  role?: string;
  limit?: number;
  showActions?: boolean;
  onlyUnread?: boolean;
  type?: NotificationListType;
  showSent?: boolean;
  className?: string;
}

export function NotificationList({
  // userId prop'u korunuyor, ancak context'ten gelen öncelikli olacak
  userId: propUserId, // Prop adını değiştirelim ki context ile karışmasın
  role = "USER",
  limit = 10,
  showActions = true,
  onlyUnread = false,
  type,
  showSent = false,
  className = "",
}: NotificationListProps) { // Props tipi orijinal haliyle kalıyor
  const { user, isLoading: authLoading } = useAuth(); // useAuth hook'u kullanıldı
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();
  // API URL'yi doğrudan boş string olarak ayarla, çünkü Next.js API'leri için tam URL gerekmez
  const apiUrl = "";

  // fetchNotifications fonksiyonunu useCallback ile sarmala
  const fetchNotifications = useCallback(async (newPage = 1, currentUserId?: string) => {
    // Eğer geçerli bir kullanıcı ID'si yoksa veya auth hala yükleniyorsa fetch etme
    if (!currentUserId) {
       console.log("Fetch notifications skipped: No user ID provided.");
       setLoading(false); // Yükleniyor durumunu kapat
       setNotifications([]); // Listeyi temizle
       setHasMore(false);
       return;
    }
     console.log(`Fetching notifications for user: ${currentUserId}, page: ${newPage}`);

    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      // userId query parametresi eklenmiyor, header'a eklenecek

      if (limit) queryParams.append("limit", limit.toString());
      if (onlyUnread) queryParams.append("isRead", "false");
      if (type) {
        if (type === "received" || type === "sent" || type === "system") {
          queryParams.append("listType", type);
        } else {
          queryParams.append("type", type);
        }
      }
      if (newPage > 1) queryParams.append("page", newPage.toString());
      if (showSent) queryParams.append("showSent", "true");

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Header'a kullanıcı ID'sini ekle
      if (currentUserId) {
        headers["x-user-id"] = currentUserId;
      } else {
         // Bu durum yukarıdaki kontrolle engellendi, ancak yine de log bırakalım
         console.warn("User ID became unavailable unexpectedly before fetch header.");
         setLoading(false);
         return;
      }


      const url = `/api/notifications?${queryParams.toString()}`;
      console.log("Fetching notifications from URL:", url);
      console.log("With headers:", headers);

      const response = await fetch(url, { headers });

      if (response.ok) {
        try {
          const data = await response.json();
          console.log("Data received from notifications API:", data); // API'den gelen veriyi logla

          // API doğrudan notifications dizisi döndürüyor, data.notifications değil
          if (Array.isArray(data)) {
            if (newPage === 1) {
              setNotifications(data);
            } else {
              setNotifications((prev) => [...prev, ...data]);
            }
            // Şimdilik pagination desteği yok, hasMore'u false yap
            setHasMore(false);
            setPage(1);
          } else if (data.notifications) {
            // Eğer API yapısı değişirse ve data.notifications dönerse
            if (newPage === 1) {
              setNotifications(data.notifications || []);
            } else {
              setNotifications((prev) => [...prev, ...(data.notifications || [])]);
            }
            setHasMore(data.pagination?.page < data.pagination?.totalPages);
            setPage(data.pagination?.page || 1);
          } else {
            console.error("Unexpected API response format:", data);
            setNotifications([]);
            setHasMore(false);
          }
        } catch (jsonError) {
          console.error("Error parsing notifications JSON:", jsonError); // JSON parse hatasını logla
          setNotifications([]); // Hata durumunda listeyi temizle
          setHasMore(false);
        }
      } else {
         console.error("Error fetching notifications: Response not OK", response.status, response.statusText); // Response not OK durumunu logla
         setNotifications([]); // Hata durumunda listeyi temizle
         setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching notifications (network or other):", error); // Diğer hataları logla
      // Hata durumunda da yükleniyor durumunu kapat
      setNotifications([]); // Hata durumunda listeyi temizle
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  // useCallback bağımlılıkları: prop'lardan gelenler ve apiUrl
  }, [limit, onlyUnread, type, showSent, apiUrl]);


  // useEffect'i user.id (context) ve propUserId'ye bağımlı hale getir
  useEffect(() => {
    // Kullanılacak ID'yi belirle: Önce context, sonra prop
    const effectiveUserId = user?.id || propUserId;

    console.log("NotificationList useEffect çalıştı");
    console.log("Auth loading:", authLoading);
    console.log("User from context:", user);
    console.log("User ID from props:", propUserId);
    console.log("Effective user ID:", effectiveUserId);

    // Auth yükleniyorsa veya geçerli bir ID yoksa bekle
    if (authLoading) {
      console.log("Auth is loading, waiting to fetch notifications...");
      setLoading(true); // Yükleniyor durumunu göster
      return;
    }

    if (effectiveUserId) {
      console.log(`User ID available (${effectiveUserId}), triggering initial fetch.`);
      console.log("User object from useAuth:", user); // user objesini logla
      fetchNotifications(1, effectiveUserId); // İlk sayfayı geçerli ID ile fetch et
    } else {
       // Auth yüklendi ama geçerli ID yok
       console.log("Auth loaded but no effective user ID, clearing notifications.");
       console.log("User object from useAuth:", user); // user objesini logla
       setNotifications([]); // Bildirimleri temizle
       setLoading(false); // Yükleniyor durumunu kapat
       setHasMore(false);
    }
  // Bağımlılıklar: context'ten user.id, prop'tan userId, authLoading ve fetchNotifications
  }, [user?.id, propUserId, authLoading, fetchNotifications]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchNotifications(page + 1);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/notifications/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isRead: true }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === id
              ? { ...notification, isRead: true }
              : notification
          )
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(
        `${apiUrl}/api/notifications/mark-all-read`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notification) => ({ ...notification, isRead: true }))
        );
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/notifications/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.filter((notification) => notification.id !== id)
        );
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    if (notification.link) {
      // Eğer link bir process sayfasına yönlendiriyorsa, önce process'in var olup olmadığını kontrol et
      if (notification.link.includes('/processes/')) {
        try {
          // Process ID'yi linkten çıkar
          const processId = notification.link.split('/processes/')[1];

          // Process'in var olup olmadığını kontrol et
          const response = await fetch(`/api/processes/${processId}`, {
            headers: {
              "x-user-id": user?.id || "",
              "x-user-role": user?.role || "",
            },
          });

          if (response.ok) {
            // Process varsa, linke yönlendir
            router.push(notification.link);
          } else {
            // Process yoksa, kullanıcıya bilgi ver
            console.error(`Process with ID ${processId} not found`);
            alert("Bu işlem artık mevcut değil. İşlem silinmiş olabilir.");
            // Bildirimi sil veya arşivle
            deleteNotification(notification.id);
          }
        } catch (error) {
          console.error("Error checking process existence:", error);
          router.push(notification.link);
        }
      } else {
        // Diğer linkler için doğrudan yönlendir
        router.push(notification.link);
      }
    } else if (notification.relatedEntityId && notification.relatedEntityType) {
      // Eğer ilgili entity varsa, ona yönlendir
      const entityType = notification.relatedEntityType.toLowerCase();
      router.push(
        `/dashboard/owner/${entityType}s/${notification.relatedEntityId}`
      );
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "PAYMENT_DUE":
      case "PAYMENT_RECEIVED":
        return <DollarSign className="h-5 w-5 text-blue-500" />;
      case "PROCESS_COMPLETED":
        return <CheckCheck className="h-5 w-5 text-green-500" />;
      case "TASK_ASSIGNED":
        return <FileText className="h-5 w-5 text-purple-500" />;
      case "INVENTORY_LOW":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "DEBT_REMINDER":
        return <DollarSign className="h-5 w-5 text-red-500" />;
      case "IRRIGATION_SCHEDULED":
      case "IRRIGATION_COMPLETED":
        return <Droplet className="h-5 w-5 text-blue-500" />;
      case "SYSTEM_ALERT":
        return <Info className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationBadge = (type: NotificationType) => {
    switch (type) {
      case "PAYMENT_DUE":
        return <Badge variant="destructive">Ödeme Gerekli</Badge>;
      case "PAYMENT_RECEIVED":
        return <Badge variant="success">Ödeme Alındı</Badge>;
      case "PROCESS_COMPLETED":
        return <Badge variant="success">Tamamlandı</Badge>;
      case "TASK_ASSIGNED":
        return <Badge variant="secondary">Görev</Badge>;
      case "INVENTORY_LOW":
        return <Badge variant="warning">Stok Uyarısı</Badge>;
      case "DEBT_REMINDER":
        return <Badge variant="destructive">Borç Hatırlatma</Badge>;
      case "IRRIGATION_SCHEDULED":
        return <Badge variant="outline">Sulama Planlandı</Badge>;
      case "IRRIGATION_COMPLETED":
        return <Badge variant="success">Sulama Tamamlandı</Badge>;
      case "SYSTEM_ALERT":
        return <Badge variant="destructive">Sistem Uyarısı</Badge>;
      default:
        return <Badge variant="secondary">Bildirim</Badge>;
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div className={className}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="mb-4">
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-8 w-20 mr-2" />
              <Skeleton className="h-8 w-20" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Bell className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">
            {showSent
              ? "Henüz bildirim göndermediniz."
              : "Henüz bildiriminiz bulunmamaktadır."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {showActions && notifications.some((n) => !n.isRead) && !showSent && (
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            Tümünü Okundu İşaretle
          </Button>
        </div>
      )}

      {notifications.map((notification) => {
        console.log("Rendering notification:", notification.id, notification.title); // Log buraya taşındı
        return ( // Return ifadesi eklendi
          <Card
            key={notification.id}
            className={`mb-4 cursor-pointer transition-colors hover:bg-accent/50 ${
              !notification.isRead && !showSent
                ? "border-l-4 border-l-primary"
                : ""
            }`}
            onClick={(e) => {
              if (!showSent) {
                // Eğer link bir process sayfasına yönlendiriyorsa, önce process'in var olup olmadığını kontrol et
                if (notification.link && notification.link.includes('/processes/')) {
                  e.preventDefault(); // Varsayılan davranışı engelle
                }
                handleNotificationClick(notification);
              }
            }}
          >
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div className="flex items-start gap-2">
                <div className="mt-1">
                  {showSent ? (
                    <Send className="h-5 w-5 text-primary" />
                  ) : (
                    getNotificationIcon(notification.type)
                  )}
                </div>
                <div>
                  <CardTitle className="text-base">
                    {notification.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                      locale: tr,
                    })}
                  </CardDescription>
                </div>
              </div>
              <div>{getNotificationBadge(notification.type)}</div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{notification.message}</p>

              {showSent && notification.receiver && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Alıcı:</span>
                  <div className="flex items-center gap-1">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback>
                        {notification.receiver.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">
                      {notification.receiver.name}
                    </span>
                  </div>
                </div>
              )}

              {!showSent && notification.sender && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Gönderen:</span>
                  <div className="flex items-center gap-1">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback>
                        {notification.sender.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">
                      {notification.sender.name}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
            {showActions && !showSent && (
              <CardFooter className="flex justify-end gap-2 pt-0">
                {!notification.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Okundu
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                >
                  Sil
                </Button>
              </CardFooter>
            )}
          </Card>
        );
      })} {/* Return ifadesi kaldırıldı */}

      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? "Yükleniyor..." : "Daha Fazla Yükle"}
          </Button>
        </div>
      )}
    </div>
  );
}
