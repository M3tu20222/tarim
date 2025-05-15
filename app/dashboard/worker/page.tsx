import type { Metadata } from "next";
import { getServerSideSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { WorkerOverview } from "@/components/worker/worker-overview";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import Link from "next/link";

// Add route segment config to explicitly mark this route as dynamic
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "İşçi Paneli | Çiftlik Yönetimi",
  description: "İşçi paneli genel bakış",
};

async function getWorkerData(userId: string) {
  try {
    // Get worker's assigned well
    const workerWellAssignment = await prisma.workerWellAssignment.findFirst({
      where: { workerId: userId },
      include: {
        well: true,
      },
    });

    // Get fields associated with the assigned well
    const fields = workerWellAssignment
      ? await prisma.field.findMany({
          where: {
            fieldWells: {
              some: {
                wellId: workerWellAssignment.wellId,
              },
            },
            status: "ACTIVE",
          },
          include: {
            crops: {
              where: {
                status: "GROWING",
              },
              orderBy: {
                plantedDate: "desc",
              },
              take: 1,
            },
            owners: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        })
      : [];

    // Get recent processes by this worker
    const recentProcesses = await prisma.process.findMany({
      where: {
        workerId: userId,
      },
      include: {
        field: true,
        season: true,
      },
      orderBy: {
        date: "desc",
      },
      take: 5,
    });

    // Get recent irrigation logs by this worker
    const recentIrrigations = await prisma.irrigationLog.findMany({
      where: {
        createdBy: userId,
      },
      include: {
        well: true,
        fieldUsages: {
          include: {
            field: true,
          },
        },
      },
      orderBy: {
        startDateTime: "desc",
      },
      take: 5,
    });

    // Get stats
    const stats = {
      assignedWell: workerWellAssignment?.well || null,
      fieldCount: fields.length,
      processCount: await prisma.process.count({
        where: {
          workerId: userId,
          date: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30)),
          },
        },
      }),
      irrigationCount: await prisma.irrigationLog.count({
        where: {
          createdBy: userId,
          startDateTime: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30)),
          },
        },
      }),
    };

    return {
      assignedWell: workerWellAssignment?.well || null,
      fields,
      recentProcesses,
      recentIrrigations,
      stats,
    };
  } catch (error) {
    console.error("Error fetching worker data:", error);
    return null;
  }
}

export default async function WorkerDashboardPage() {
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

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">İşçi Paneli</h1>
        <Link href="/dashboard/worker/settings">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Ayarlar
          </Button>
        </Link>
      </div>

      <WorkerOverview
        assignedWell={data.assignedWell}
        fields={data.fields}
        recentProcesses={data.recentProcesses}
        recentIrrigations={data.recentIrrigations}
        stats={data.stats}
      />
    </div>
  );
}
