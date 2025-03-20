import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BellIcon,
  CheckIcon,
  CreditCardIcon,
  DropletIcon,
  TractorIcon,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Bildirimler | Tarım Yönetim Sistemi",
  description: "Tarım Yönetim Sistemi bildirimleri",
};

// Örnek bildirim verileri
const notifications = [
  {
    id: "notif-1",
    title: "Sulama Zamanı",
    description: "Merkez Tarla için sulama zamanı geldi.",
    date: "2023-06-20T08:30:00",
    type: "irrigation",
    read: false,
  },
  {
    id: "notif-2",
    title: "Borç Hatırlatması",
    description:
      "Ahmet Yılmaz'a olan 350₺ borcunuz için son ödeme tarihi yaklaşıyor.",
    date: "2023-06-19T14:15:00",
    type: "debt",
    read: false,
  },
  {
    id: "notif-3",
    title: "Yeni Alış",
    description:
      "Mehmet Demir 'Gübre' alışı yaptı ve sizi katkı sahibi olarak ekledi.",
    date: "2023-06-18T11:45:00",
    type: "purchase",
    read: true,
  },
  {
    id: "notif-4",
    title: "Tarla İşlemi Tamamlandı",
    description: "Dere Kenarı tarlasında gübreleme işlemi tamamlandı.",
    date: "2023-06-17T16:20:00",
    type: "field",
    read: true,
  },
  {
    id: "notif-5",
    title: "Borç Ödendi",
    description: "Ali Kaya size olan 250₺ borcunu ödedi.",
    date: "2023-06-16T09:10:00",
    type: "payment",
    read: true,
  },
];

// Bildirim tipine göre ikon ve renk belirleme
function getNotificationIcon(type: string) {
  switch (type) {
    case "irrigation":
      return <DropletIcon className="h-4 w-4 text-blue-500" />;
    case "debt":
      return <CreditCardIcon className="h-4 w-4 text-red-500" />;
    case "purchase":
      return <CreditCardIcon className="h-4 w-4 text-green-500" />;
    case "field":
      return <TractorIcon className="h-4 w-4 text-amber-500" />;
    case "payment":
      return <CheckIcon className="h-4 w-4 text-green-500" />;
    default:
      return <BellIcon className="h-4 w-4 text-gray-500" />;
  }
}

export default function NotificationsPage() {
  const unreadNotifications = notifications.filter((notif) => !notif.read);
  const readNotifications = notifications.filter((notif) => notif.read);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Bildirimler</h1>
        <Button variant="outline" size="sm">
          Tümünü Okundu İşaretle
        </Button>
      </div>

      <Tabs defaultValue="unread" className="w-full">
        <TabsList>
          <TabsTrigger value="unread">
            Okunmamış
            {unreadNotifications.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadNotifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">Tümü</TabsTrigger>
          <TabsTrigger value="read">Okunmuş</TabsTrigger>
        </TabsList>
        <TabsContent value="unread" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Okunmamış Bildirimler</CardTitle>
              <CardDescription>Henüz okumadığınız bildirimler</CardDescription>
            </CardHeader>
            <CardContent>
              {unreadNotifications.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                  <p className="text-sm text-muted-foreground">
                    Okunmamış bildiriminiz bulunmamaktadır.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {unreadNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-start gap-4 rounded-lg border p-4 bg-muted/30"
                    >
                      <div className="mt-1 rounded-full bg-background p-2 shadow-sm">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{notification.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {new Date(notification.date).toLocaleDateString()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tüm Bildirimler</CardTitle>
              <CardDescription>Tüm bildirimleriniz</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 rounded-lg border p-4 ${
                      !notification.read ? "bg-muted/30" : ""
                    }`}
                  >
                    <div className="mt-1 rounded-full bg-background p-2 shadow-sm">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p
                          className={`${
                            notification.read ? "" : "font-medium"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {new Date(notification.date).toLocaleDateString()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="read" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Okunmuş Bildirimler</CardTitle>
              <CardDescription>
                Daha önce okuduğunuz bildirimler
              </CardDescription>
            </CardHeader>
            <CardContent>
              {readNotifications.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                  <p className="text-sm text-muted-foreground">
                    Okunmuş bildiriminiz bulunmamaktadır.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {readNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-start gap-4 rounded-lg border p-4"
                    >
                      <div className="mt-1 rounded-full bg-background p-2 shadow-sm">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p>{notification.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {new Date(notification.date).toLocaleDateString()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
