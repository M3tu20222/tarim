import type { Metadata } from "next";
import { getServerSideSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ProcessDetails } from "@/components/processes/process-details";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "İşlem Detayı | Çiftlik Yönetimi",
  description: "İşlem detayları",
};

async function getProcessData(processId: string, userId: string) {
  try {
    // Get worker's assigned well
    const workerWellAssignment = await prisma.workerWellAssignment.findFirst({
      where: { workerId: userId },
    });

    if (!workerWellAssignment) {
      return null;
    }

    // Get process details
    const process = await prisma.process.findUnique({
      where: { id: processId },
      include: {
        field: {
          include: {
            fieldWells: true,
          },
        },
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        season: true,
        inventoryUsages: {
          include: {
            inventory: true,
          },
        },
        equipmentUsages: {
          include: {
            equipment: true,
          },
        },
      },
    });

    if (!process) {
      return null;
    }

    // Check if the process is related to a field connected to the worker's well
    if (process.field) {
      const fieldConnectedToWell = process.field.fieldWells.some(
        (fieldWell) => fieldWell.wellId === workerWellAssignment.wellId
      );

      if (!fieldConnectedToWell && process.workerId !== userId) {
        return null;
      }
    } else if (process.workerId !== userId) {
      // If no field, only allow access if the worker created the process
      return null;
    }

    return process;
  } catch (error) {
    console.error("Error fetching process data:", error);
    return null;
  }
}

export default async function WorkerProcessDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getServerSideSession();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "WORKER") {
    redirect("/dashboard");
  }

  const process = await getProcessData(params.id, user.id);

  if (!process) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/worker">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Geri
          </Button>
        </Link>
      </div>

      <ProcessDetails process={process} />
    </div>
  );
}
