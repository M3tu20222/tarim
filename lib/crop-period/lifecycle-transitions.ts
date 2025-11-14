import { prisma } from "@/lib/prisma";
import { CropPeriodStatus, Prisma, PrismaClient } from "@prisma/client";
import { canTransitionTo, LifecycleTransitionResult, FinalizeCropPeriodResult } from "@/lib/types/crop-period";
import { getActiveCropPeriod } from "./get-active-period";

/**
 * PREPARATION → SEEDING geçişini tetikle
 * Crop oluşturulduğunda çağrılır
 *
 * @param fieldId - Tarla ID'si
 * @param cropId - Crop ID'si
 * @param tx - Transaction client
 */
export async function updateCropPeriodToSeeding(
  fieldId: string,
  cropId: string,
  tx?: PrismaClient | Prisma.TransactionClient
): Promise<LifecycleTransitionResult> {
  const prismaInstance = tx || prisma;

  try {
    // Aktif PREPARATION dönemini bul
    const activePeriod = await prismaInstance.cropPeriod.findFirst({
      where: {
        fieldId,
        status: "PREPARATION",
        cropId: null
      },
      orderBy: { startDate: "desc" }
    });

    if (activePeriod) {
      // Var olanı güncelle
      const updated = await prismaInstance.cropPeriod.update({
        where: { id: activePeriod.id },
        data: {
          cropId,
          status: "SEEDING" as CropPeriodStatus
        }
      });

      return {
        success: true,
        oldStatus: "PREPARATION" as CropPeriodStatus,
        newStatus: "SEEDING" as CropPeriodStatus,
        message: `CropPeriod PREPARATION → SEEDING: ${updated.id}`
      };
    }

    // Eğer PREPARATION dönem yoksa, yeni sezon'da ilk ekim → Yeni PREPARATION oluştur
    const season = await prismaInstance.season.findFirst({
      where: { isActive: true }
    });

    if (!season) {
      return {
        success: false,
        message: "Aktif sezon bulunamadı"
      };
    }

    const newPeriod = await prismaInstance.cropPeriod.create({
      data: {
        fieldId,
        seasonId: season.id,
        cropId,
        startDate: new Date(),
        status: "SEEDING" as CropPeriodStatus
      }
    });

    return {
      success: true,
      newStatus: "SEEDING" as CropPeriodStatus,
      message: `Yeni CropPeriod oluşturuldu (ilk ekim): ${newPeriod.id}`
    };
  } catch (error) {
    return {
      success: false,
      message: `SEEDING geçişi hatası: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * SEEDING → IRRIGATION geçişini tetikle
 * İlk sulama kaydı oluşturulduğunda çağrılır
 */
export async function updateCropPeriodToIrrigation(
  fieldId: string,
  tx?: PrismaClient | Prisma.TransactionClient
): Promise<LifecycleTransitionResult> {
  const prismaInstance = tx || prisma;

  try {
    const activePeriod = await prismaInstance.cropPeriod.findFirst({
      where: {
        fieldId,
        status: "SEEDING"
      }
    });

    if (!activePeriod) {
      return {
        success: false,
        message: "SEEDING durumundaki CropPeriod bulunamadı"
      };
    }

    if (!canTransitionTo("SEEDING" as CropPeriodStatus, "IRRIGATION" as CropPeriodStatus)) {
      return {
        success: false,
        message: "SEEDING → IRRIGATION geçişine izin verilmiyor"
      };
    }

    const updated = await prismaInstance.cropPeriod.update({
      where: { id: activePeriod.id },
      data: { status: "IRRIGATION" as CropPeriodStatus }
    });

    return {
      success: true,
      oldStatus: "SEEDING" as CropPeriodStatus,
      newStatus: "IRRIGATION" as CropPeriodStatus,
      message: `CropPeriod SEEDING → IRRIGATION: ${updated.id}`
    };
  } catch (error) {
    return {
      success: false,
      message: `IRRIGATION geçişi hatası: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * IRRIGATION → FERTILIZING geçişini tetikle
 * İlk gübreleme process'i oluşturulduğunda çağrılır
 */
export async function updateCropPeriodToFertilizing(
  fieldId: string,
  tx?: PrismaClient | Prisma.TransactionClient
): Promise<LifecycleTransitionResult> {
  const prismaInstance = tx || prisma;

  try {
    const activePeriod = await prismaInstance.cropPeriod.findFirst({
      where: {
        fieldId,
        status: "IRRIGATION"
      }
    });

    if (!activePeriod) {
      return {
        success: false,
        message: "IRRIGATION durumundaki CropPeriod bulunamadı"
      };
    }

    if (!canTransitionTo("IRRIGATION" as CropPeriodStatus, "FERTILIZING" as CropPeriodStatus)) {
      return {
        success: false,
        message: "IRRIGATION → FERTILIZING geçişine izin verilmiyor"
      };
    }

    const updated = await prismaInstance.cropPeriod.update({
      where: { id: activePeriod.id },
      data: { status: "FERTILIZING" as CropPeriodStatus }
    });

    return {
      success: true,
      oldStatus: "IRRIGATION" as CropPeriodStatus,
      newStatus: "FERTILIZING" as CropPeriodStatus,
      message: `CropPeriod IRRIGATION → FERTILIZING: ${updated.id}`
    };
  } catch (error) {
    return {
      success: false,
      message: `FERTILIZING geçişi hatası: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * * → HARVESTING geçişini tetikle
 * Harvest kaydı oluşturulduğunda çağrılır
 */
export async function updateCropPeriodToHarvesting(
  cropId: string,
  fieldId: string,
  tx?: PrismaClient | Prisma.TransactionClient
): Promise<LifecycleTransitionResult> {
  const prismaInstance = tx || prisma;

  try {
    const activePeriod = await prismaInstance.cropPeriod.findFirst({
      where: {
        fieldId,
        cropId,
        status: {
          in: ["SEEDING", "IRRIGATION", "FERTILIZING"] as CropPeriodStatus[]
        }
      }
    });

    if (!activePeriod) {
      return {
        success: false,
        message: "Aktif CropPeriod bulunamadı (HARVESTING'e hazırlanmak için)"
      };
    }

    if (!canTransitionTo(activePeriod.status, "HARVESTING" as CropPeriodStatus)) {
      return {
        success: false,
        message: `${activePeriod.status} → HARVESTING geçişine izin verilmiyor`
      };
    }

    const updated = await prismaInstance.cropPeriod.update({
      where: { id: activePeriod.id },
      data: { status: "HARVESTING" as CropPeriodStatus }
    });

    return {
      success: true,
      oldStatus: activePeriod.status,
      newStatus: "HARVESTING" as CropPeriodStatus,
      message: `CropPeriod ${activePeriod.status} → HARVESTING: ${updated.id}`
    };
  } catch (error) {
    return {
      success: false,
      message: `HARVESTING geçişi hatası: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * HARVESTING → CLOSED geçişini tetikle
 * Hasat tamamlandığında çağrılır
 * Otomatik olarak yeni PREPARATION dönem oluşturur
 */
export async function finalizeCropPeriod(
  cropPeriodId: string,
  tx?: PrismaClient | Prisma.TransactionClient
): Promise<FinalizeCropPeriodResult> {
  const prismaInstance = tx || prisma;

  try {
    // Mevcut dönem'i bul
    const currentPeriod = await prismaInstance.cropPeriod.findUnique({
      where: { id: cropPeriodId }
    });

    if (!currentPeriod) {
      return {
        success: false,
        message: "CropPeriod bulunamadı"
      };
    }

    if (currentPeriod.status !== "HARVESTING") {
      return {
        success: false,
        message: `Sadece HARVESTING durumundaki dönemler kapatılabilir. Mevcut durum: ${currentPeriod.status}`
      };
    }

    // Dönem'i CLOSED yap
    const closedPeriod = await prismaInstance.cropPeriod.update({
      where: { id: cropPeriodId },
      data: {
        status: "CLOSED" as CropPeriodStatus,
        endDate: new Date()
      }
    });

    // OTOMATIK: Yeni PREPARATION dönem oluştur
    const newPeriod = await prismaInstance.cropPeriod.create({
      data: {
        fieldId: currentPeriod.fieldId,
        seasonId: currentPeriod.seasonId,
        // cropId: null, // Henüz ürün belirlenmeyecek
        startDate: new Date(),
        status: "PREPARATION" as CropPeriodStatus
      }
    });

    return {
      success: true,
      closedPeriod,
      newPeriod,
      message: `Dönem kapatıldı ve yeni PREPARATION dönem oluşturuldu`
    };
  } catch (error) {
    return {
      success: false,
      message: `Dönem sonlandırma hatası: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Dönem'in hangi statüye geçebileceğini bul (helper)
 */
export function getValidNextStatuses(currentStatus: CropPeriodStatus): CropPeriodStatus[] {
  const validTransitions: Record<CropPeriodStatus, CropPeriodStatus[]> = {
    PREPARATION: ["SEEDING", "CLOSED"],
    SEEDING: ["IRRIGATION", "HARVESTING", "CLOSED"],
    IRRIGATION: ["FERTILIZING", "HARVESTING", "CLOSED"],
    FERTILIZING: ["HARVESTING", "CLOSED"],
    HARVESTING: ["CLOSED"],
    CLOSED: []
  };

  return validTransitions[currentStatus] || [];
}

