import type { Metadata } from "next";
import { getServerSideSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { WorkerSettings } from "@/components/worker/worker-settings";

// Add route segment config to explicitly mark this route as dynamic
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "İşçi Ayarları | Çiftlik Yönetimi",
  description: "İşçi ayarları sayfası",
};

export default async function WorkerSettingsPage() {
  const user = await getServerSideSession();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "WORKER") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">İşçi Ayarları</h1>
      <WorkerSettings userId={user.id} />
    </div>
  );
}
