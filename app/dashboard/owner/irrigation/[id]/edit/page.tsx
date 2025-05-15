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
        inventoryUsages: {
          include: {
            inventory: true, // Envanter detaylarını almak için (opsiyonel, gerekirse)
            ownerUsages: true, // Sahip kullanımlarını dahil et
          },
        },
      },
    });

    if (!irrigationLog) {
      return null;
    }

    // Form için veriyi hazırla
    const startDate = new Date(irrigationLog.startDateTime);
    const startTime = `${startDate.getHours().toString().padStart(2, "0")}:${startDate.getMinutes().toString().padStart(2, "0")}`;

    // Form için veriyi IrrigationFormValues'a uygun hale getir
    return {
      id: irrigationLog.id, // ID'yi ekle
      date: startDate,
      startTime: startTime,
      duration: irrigationLog.duration,
      notes: irrigationLog.notes ?? undefined, // null ise undefined yap
      fieldIrrigations: irrigationLog.fieldUsages.map(fu => ({
        fieldId: fu.fieldId,
        percentage: fu.percentage,
      })),
      inventoryUsages: irrigationLog.inventoryUsages.flatMap(iu =>
        iu.ownerUsages.map(ownerUsage => ({
          ownerId: ownerUsage.ownerId,
          inventoryId: iu.inventoryId,
          quantity: ownerUsage.quantity, // Sahip başına düşen miktar
          // unitPrice: iu.unitPrice, // Eğer IrrigationInventoryUsage'da unitPrice varsa
        }))
      ),
    };
  } catch (error) {
    console.error("Error fetching irrigation log:", error);
    return null;
  }
}

export default async function EditIrrigationPage({
  params,
}: {
  params: { id: string }; // Doğru fonksiyon imzası
}) {
  const { id } = params; // ID'yi doğru şekilde al
  const formattedIrrigationLog = await getIrrigationLog(id); // Formatlanmış veriyi al

  if (!formattedIrrigationLog) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Sulama Kaydını Düzenle</h1>
      {/* Formatlanmış veriyi IrrigationForm'a aktar */}
      <IrrigationForm initialData={formattedIrrigationLog} />
    </div>
  );
}
