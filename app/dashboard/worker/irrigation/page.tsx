import type { Metadata } from "next";
import { getServerSideSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { WorkerIrrigationList } from "@/components/worker/worker-irrigation-list";

// Add route segment config to explicitly mark this route as dynamic
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Sulama Kayıtlarım | İşçi Paneli",
  description: "Sulama kayıtlarınızı görüntüleyin ve yönetin",
};

export default async function WorkerIrrigationPage() {
  const user = await getServerSideSession();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "WORKER") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Sulama Kayıtlarım</h1>
      <WorkerIrrigationList userId={user.id} />
    </div>
  );
}
