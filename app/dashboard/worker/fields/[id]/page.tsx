import type { Metadata } from "next";
import { getServerSideSession } from "@/lib/session"; // Değiştirildi: lib/auth -> lib/session, getUserFromCookie -> getServerSideSession
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { WorkerFieldDetail } from "@/components/worker/worker-field-detail";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tarla Detayı | Çiftlik Yönetimi",
  description: "Tarla detayları ve işlemler",
};

async function getFieldData(fieldId: string, userId: string) {
  try {
    // Check if worker has access to this field via well assignment
    const workerWellAssignment = await prisma.workerWellAssignment.findFirst({
      where: { workerId: userId },
    });

    if (!workerWellAssignment) {
      return null;
    }

    // Check if field is connected to the assigned well
    const fieldWell = await prisma.fieldWell.findFirst({
      where: {
        fieldId,
        wellId: workerWellAssignment.wellId,
      },
    });

    if (!fieldWell) {
      return null;
    }

    // Get field details
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      include: {
        crops: {
          orderBy: {
            plantedDate: "desc",
          },
        },
        owners: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        fieldWells: {
          include: {
            well: true,
          },
        },
      },
    });

    if (!field) {
      return null;
    }

    // Get recent processes for this field
    const recentProcesses = await prisma.process.findMany({
      where: {
        fieldId,
      },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
          },
        },
        inventoryUsages: {
          include: {
            inventory: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
      take: 5,
    });

    // Get recent irrigations for this field
    const recentIrrigations = await prisma.irrigationLog.findMany({
      where: {
        fieldUsages: {
          some: {
            fieldId,
          },
        },
      },
      include: {
        well: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startDateTime: "desc",
      },
      take: 5,
    });

    // Get inventory for field owners
    const ownerIds = field.owners.map((owner) => owner.userId);

    const inventory = await prisma.inventory.findMany({
      where: {
        ownerships: {
          some: {
            userId: {
              in: ownerIds,
            },
          },
        },
        category: {
          in: ["FERTILIZER", "PESTICIDE", "SEED"],
        },
        totalQuantity: {
          gt: 0,
        },
      },
      include: {
        ownerships: {
          where: {
            userId: {
              in: ownerIds,
            },
          },
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
    });

    return {
      field,
      recentProcesses,
      recentIrrigations,
      inventory,
    };
  } catch (error) {
    console.error("Error fetching field data:", error);
    return null;
  }
}

export default async function WorkerFieldDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getServerSideSession(); // Değiştirildi: getUserFromCookie -> getServerSideSession

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "WORKER") {
    redirect("/dashboard");
  }

  const data = await getFieldData(params.id, user.id);

  if (!data) {
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
                Tarla bulunamadı veya erişim izniniz yok
              </h3>
              <p className="mt-2 text-sm text-red-700">
                Bu tarlaya erişim izniniz olmayabilir veya tarla silinmiş
                olabilir.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
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

      <WorkerFieldDetail
        field={data.field}
        recentProcesses={data.recentProcesses}
        recentIrrigations={data.recentIrrigations}
        inventory={data.inventory}
      />
    </div>
  );
}
