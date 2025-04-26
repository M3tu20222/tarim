import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { IrrigationForm } from "@/components/irrigation/irrigation-form";

const prisma = new PrismaClient();

async function getIrrigationLog(id: string) {
  try {
    const irrigationLog = await prisma.irrigationLog.findUnique({
      where: { id },
      include: {
        fieldUsages: true,
        inventoryUsages: true,
      },
    });

    if (!irrigationLog) {
      return null;
    }

    // Form için veriyi hazırla
    const startDate = new Date(irrigationLog.startDateTime);
    const startTime = `${startDate.getHours().toString().padStart(2, "0")}:${startDate.getMinutes().toString().padStart(2, "0")}`;

    return {
      ...irrigationLog,
      startDate,
      startTime,
    };
  } catch (error) {
    console.error("Error fetching irrigation log:", error);
    return null;
  }
}

export default async function EditIrrigationPage({
  params,
}: {
  params: { id: string };
}) {
  const irrigationLog = await getIrrigationLog(params.id);

  if (!irrigationLog) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Sulama Kaydını Düzenle</h1>
      <IrrigationForm initialData={irrigationLog} />
    </div>
  );
}
