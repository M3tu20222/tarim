"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import {
  Notification,
  NotificationPriority,
  NotificationStatus,
} from "@/types/notification-types";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Bell,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  AlertCircle,
} from "lucide-react";

interface NotificationListProps {
  initialNotifications?: Notification[];
  limit?: number;
}

export function NotificationList({
  initialNotifications = [],
  limit = 10,
}: NotificationListProps) {
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);
  const [isLoading, setIsLoading] = useState<boolean>(
    initialNotifications.length === 0
  );
  const { toast } = useToast();

  useEffect(() => {
    if (initialNotifications.length === 0) {
      fetchNotifications();
    }
  }, [initialNotifications]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notifications?limit=${limit}`);
      if (!response.ok) throw new Error("Bildirimler yüklenemedi");
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error("Bildirim yükleme hatası:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Bildirimler yüklenirken bir hata oluştu",
      });
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
      setNotifications(
        notifications.map((n) =>
          n.id === id
            ? { ...n, status: "READ" as NotificationStatus, readAt: new Date() }
            : n
        )
      );

      toast({
        title: "Bildirim okundu olarak işaretlendi",
        duration: 3000,
      });
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
      setNotifications(
        notifications.map((n) =>
          n.status === "UNREAD"
            ? { ...n, status: "READ" as NotificationStatus, readAt: new Date() }
            : n
        )
      );

      const data = await response.json();
      toast({
        title: `${data.count} bildirim okundu olarak işaretlendi`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Toplu bildirim güncelleme hatası:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Bildirimler güncellenirken bir hata oluştu",
      });
    }
  };

  const getPriorityIcon = (priority: NotificationPriority) => {
    switch (priority) {
      case "LOW":
        return <Info className="h-4 w-4 text-blue-400" />;
      case "MEDIUM":
        return <Info className="h-4 w-4 text-green-400" />;
      case "HIGH":
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case "URGENT":
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case "LOW":
        return "bg-blue-100 text-blue-800";
      case "MEDIUM":
        return "bg-green-100 text-green-800";
      case "HIGH":
        return "bg-amber-100 text-amber-800";
      case "URGENT":
        return "bg-red-100 text-red-800";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Bildirimler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 animate-pulse"
              >
                <div className="w-10 h-10 rounded-full bg-muted"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 w-1/2 bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Bildirimler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Hiç bildiriminiz yok</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Yeni bildirimler geldiğinde burada görünecek
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center">
        <div className="flex-1">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Bildirimler
          </CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={markAllAsRead}
          disabled={!notifications.some((n) => n.status === "UNREAD")}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Tümünü Okundu İşaretle
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start gap-4 p-4 rounded-lg ${
                notification.status === "UNREAD" ? "bg-muted/40" : ""
              }`}
            >
              <Avatar
                className={`${notification.status === "UNREAD" ? "bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground"}`}
              >
                {getPriorityIcon(notification.priority)}
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{notification.title}</h4>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getPriorityColor(notification.priority)}`}
                  >
                    {notification.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {notification.body}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                      locale: tr,
                    })}
                  </span>
                  {notification.status === "UNREAD" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 py-0 px-2"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      <span className="text-xs">Okundu İşaretle</span>
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
