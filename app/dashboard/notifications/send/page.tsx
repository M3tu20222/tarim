import { NotificationSendForm } from "@/components/notifications/notification-send-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function SendNotificationPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Yetki kontrolü
  if (session.role !== "ADMIN" && session.role !== "OWNER") {
    redirect("/dashboard/notifications");
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/notifications">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Bildirim Gönder</h1>
      </div>

      <div className="max-w-2xl mx-auto">
        <NotificationSendForm userId={session.id} role={session.role} />
      </div>
    </div>
  );
}
