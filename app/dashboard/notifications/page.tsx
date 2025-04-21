import { NotificationList } from "@/components/notifications/notification-list";

export const metadata = {
  title: "Bildirimler",
  description: "Tüm bildirimlerinizi görüntüleyin ve yönetin",
};

export default function NotificationsPage() {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">Bildirimler</h2>
        <p className="text-muted-foreground">
          Tüm bildirimlerinizi görüntüleyin ve yönetin
        </p>
      </div>
      <NotificationList limit={50} />
    </div>
  );
}
