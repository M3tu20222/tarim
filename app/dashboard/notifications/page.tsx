 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationList } from "@/components/notifications/notification-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getSession, getServerSideSession } from "@/lib/session"; // getServerSideSession import edildi
import { redirect } from "next/navigation";

export default async function NotificationsPage() {
  const session = await getServerSideSession(); // getSession yerine getServerSideSession kullanıldı

  console.log("Session object in notifications page:", session); // Session objesini logla

  if (!session) {
    redirect("/login");
  }

  const userRole = session.role || "USER";
  const isAdmin = userRole === "ADMIN";
  const isOwner = userRole === "OWNER";
  const canSendNotifications = isAdmin || isOwner;

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bildirimler</h1>
        {canSendNotifications && (
          <Button asChild>
            <Link href="/dashboard/notifications/send">Bildirim Gönder</Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue="received">
        <TabsList className="mb-4">
          <TabsTrigger value="received">Gelen Bildirimler</TabsTrigger>
          {canSendNotifications && (
            <TabsTrigger value="sent">Gönderilen Bildirimler</TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="system">Sistem Bildirimleri</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="received">
          <NotificationList
            userId={session.id}
            role={session.role}
            type="received"
          />
        </TabsContent>

        {canSendNotifications && (
          <TabsContent value="sent">
            <NotificationList
              userId={session.id}
              role={session.role}
              type="sent"
              showSent={true}
            />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="system">
            <NotificationList
              userId={session.id}
              role={session.role}
              type="system"
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
