import type { Metadata } from "next";
import { getServerSideSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { WorkerFieldDetail } from "@/components/worker/worker-field-detail";

export const metadata: Metadata = {
  title: "Tarla Detayı | İşçi Paneli",
  description: "Tarla detay sayfası",
};

async function getFieldData(fieldId: string, userId: string) {
  try {
    // İşçinin atanmış kuyusunu kontrol et
    const workerWellAssignment = await prisma.workerWellAssignment.findFirst({
      where: { workerId: userId },
      include: {
        well: true,
      },
    });

    if (!workerWellAssignment) {
      return null;
    }

    // Tarlanın işçinin atanmış kuyusuna bağlı olup olmadığını kontrol et
    const field = await prisma.field.findFirst({
      where: {
        id: fieldId,
        fieldWells: {
          some: {
            wellId: workerWellAssignment.wellId,
          },
        },
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
        processes: {
          where: {
            workerId: userId,
          },
          orderBy: {
            date: "desc",
          },
          take: 5,
        },
      },
    });

    if (!field) {
      return null;
    }

    // Tarla için son sulamalar
    const irrigations = await prisma.irrigationLog.findMany({
      where: {
        fieldUsages: {
          some: {
            fieldId,
          },
        },
        createdBy: userId,
      },
      include: {
        well: true,
      },
      orderBy: {
        startDateTime: "desc",
      },
      take: 5,
    });

    return {
      field,
      irrigations,
      well: workerWellAssignment.well,
    };
  } catch (error) {
    console.error("Error fetching field data:", error);
    return null;
  }
}

export default async function FieldDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // params'ı await ile kullanmak için
  const id = params.id;

  const user = await getServerSideSession();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "WORKER") {
    redirect("/dashboard");
  }

  const data = await getFieldData(id, user.id);

  if (!data) {
    redirect("/dashboard/worker");
  }

  return (
    <div className="container mx-auto py-10">
      <WorkerFieldDetail
        field={data.field}
        irrigations={data.irrigations}
        well={data.well}
        userId={user.id}
      />
    </div>
  );
}
