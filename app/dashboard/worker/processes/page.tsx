import type { Metadata } from "next";
import { getServerSideSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { WorkerProcessList } from "@/components/worker/worker-process-list";

// Add route segment config to explicitly mark this route as dynamic
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "İşlem Görevlerim | İşçi Paneli",
  description: "İşlem görevlerinizi görüntüleyin ve yönetin",
};

export default async function WorkerProcessPage() {
  const user = await getServerSideSession();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "WORKER") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">İşlem Görevlerim</h1>
      <WorkerProcessList userId={user.id} />
    </div>
  );
}
