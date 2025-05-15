import type { Metadata } from "next";
import { getServerSideSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { WorkerIrrigationForm } from "@/components/worker/worker-irrigation-form";

export const metadata: Metadata = {
  title: "Yeni Sulama Kaydı | İşçi Paneli",
  description: "Yeni sulama kaydı oluştur",
};

export default async function NewIrrigationPage() {
  const user = await getServerSideSession();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "WORKER") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Yeni Sulama Kaydı</h1>
      <WorkerIrrigationForm userId={user.id} />
    </div>
  );
}
