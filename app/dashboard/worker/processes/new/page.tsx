import type { Metadata } from "next";
import { getServerSideSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { WorkerProcessForm } from "@/components/worker/worker-process-form";

export const metadata: Metadata = {
  title: "Yeni İşlem Kaydı | İşçi Paneli",
  description: "Yeni işlem kaydı oluştur",
};

export default async function NewProcessPage() {
  const user = await getServerSideSession();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "WORKER") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Yeni İşlem Kaydı</h1>
      <WorkerProcessForm userId={user.id} />
    </div>
  );
}
