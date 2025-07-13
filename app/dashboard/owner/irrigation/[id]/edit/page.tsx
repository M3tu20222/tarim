import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { IrrigationForm } from "@/components/irrigation/irrigation-form";

const prisma = new PrismaClient();

async function getIrrigationLog(id: string) {
  try {
    const irrigationLog = await prisma.irrigationLog.findUnique({
      where: { id },
      include: {
        well: true,
        season: true,
        fieldUsages: true,
        inventoryUsages: {
          include: {
            ownerUsages: true,
          },
        },
      },
    });

    if (!irrigationLog) {
      return null;
    }

    const startDate = new Date(irrigationLog.startDateTime);
    const startTime = `${startDate.getHours().toString().padStart(2, "0")}:${startDate.getMinutes().toString().padStart(2, "0")}`;

    // Envanter verisini formun beklediği "inventoryGroups" formatına dönüştür
    const inventoryGroups = irrigationLog.inventoryUsages.map(iu => {
      // Her sahip için hangi stoktan düşüldüğünü belirle
      const allocations = iu.ownerUsages.reduce((acc, ownerUsage) => {
        // Bu örnekte, her sahibin kendi payının ana envanterden düştüğünü varsayıyoruz.
        // Eğer daha karmaşık bir stok yönetimi varsa (örn. her sahibin farklı stokları),
        // ownerUsage'da bu bilgiyi tutan bir alan olması gerekir.
        // Şimdilik, ana inventoryId'yi her sahip için kullanıyoruz.
        acc[ownerUsage.ownerId] = iu.inventoryId;
        return acc;
      }, {} as Record<string, string>);

      return {
        inventoryTypeId: iu.inventoryId, // Formda 'tür' olarak bu kullanılıyor
        totalQuantity: iu.quantity,
        allocations: allocations,
      };
    });

    return {
      id: irrigationLog.id,
      date: startDate,
      startTime: startTime,
      duration: irrigationLog.duration,
      wellId: irrigationLog.wellId,
      seasonId: irrigationLog.seasonId,
      notes: irrigationLog.notes ?? undefined,
      fieldIrrigations: irrigationLog.fieldUsages.map(fu => ({
        fieldId: fu.fieldId,
        percentage: fu.percentage,
      })),
      inventoryGroups: inventoryGroups, // Dönüştürülmüş veriyi ekle
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
  // Next.js 13+ için params nesnesini await etmemiz gerekiyor
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const formattedIrrigationLog = await getIrrigationLog(id); // Formatlanmış veriyi al

  if (!formattedIrrigationLog) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Sulama Kaydını Düzenle</h1>
      {/* Formatlanmış veriyi ve ID'yi IrrigationForm'a aktar */}
      <IrrigationForm
        initialData={formattedIrrigationLog}
        irrigationId={id}
      />
    </div>
  );
}
