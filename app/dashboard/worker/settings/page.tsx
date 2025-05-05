import type { Metadata } from "next";
import { getServerSideSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { WorkerSettings } from "@/components/worker/worker-settings";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "İşçi Ayarları | Çiftlik Yönetimi",
  description: "İşçi ayarlarını düzenleyin",
};

async function getWorkerData(userId: string) {
  try {
    const worker = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Get all wells for selection
    const wells = await prisma.well.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        depth: true,
        capacity: true,
      },
    });

    // Get worker's assigned well if any
    const workerWellAssignment = await prisma.workerWellAssignment.findFirst({
      where: { workerId: userId },
      include: {
        well: true,
      },
    });

    return {
      worker,
      wells,
      assignedWell: workerWellAssignment?.well || null,
    };
  } catch (error) {
    console.error("Error fetching worker data:", error);
    return null;
  }
}

export default async function WorkerSettingsPage() {
  const user = await getServerSideSession();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "WORKER") {
    redirect("/dashboard");
  }

  const data = await getWorkerData(user.id);

  if (!data) {
    return (
      <div className="container mx-auto py-10">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Veri yüklenirken bir hata oluştu
              </h3>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Add check for null worker data
  if (!data.worker) {
    return (
      <div className="container mx-auto py-10">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                İşçi bilgileri yüklenemedi.
              </h3>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">İşçi Ayarları</h1>
      <WorkerSettings
        worker={data.worker}
        wells={data.wells}
        assignedWell={data.assignedWell}
      />
    </div>
  );
}
