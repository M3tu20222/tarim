import { prisma } from "@/lib/prisma";
import { CropPeriodStatus, Prisma, PrismaClient } from "@prisma/client";
import { ActiveCropPeriodResult } from "@/lib/types/crop-period";

/**
 * Belirli bir tarla için aktif CropPeriod'u bul
 *
 * Aktif statüs: PREPARATION, SEEDING, IRRIGATION, FERTILIZING
 * Inactive statüs: HARVESTING, CLOSED
 *
 * @param fieldId - Tarla ID'si
 * @param tx - Prisma transaction client (opsiyonel)
 * @returns Aktif CropPeriod veya null
 */
export async function getActiveCropPeriod(
  fieldId: string,
  tx?: PrismaClient | Prisma.TransactionClient
) {
  const prismaInstance = tx || prisma;

  try {
    const activePeriod = await prismaInstance.cropPeriod.findFirst({
      where: {
        fieldId,
        status: {
          in: ["PREPARATION", "SEEDING", "IRRIGATION", "FERTILIZING"] as CropPeriodStatus[]
        }
      },
      orderBy: { startDate: "desc" }, // En yeni olanı al
      include: {
        crop: true,
        field: true,
        season: true
      }
    });

    return activePeriod;
  } catch (error) {
    console.error(`Error getting active crop period for field ${fieldId}:`, error);
    throw new Error(`Failed to get active crop period: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Belirli bir tarla için aktif CropPeriod'u bul (Result format)
 *
 * @param fieldId - Tarla ID'si
 * @returns Sonuç nesnesi (found, period, message)
 */
export async function getActiveCropPeriodWithResult(
  fieldId: string
): Promise<ActiveCropPeriodResult> {
  try {
    const period = await getActiveCropPeriod(fieldId);

    if (period) {
      return {
        found: true,
        period,
        message: `Aktif CropPeriod bulundu: ${period.status}`
      };
    }

    return {
      found: false,
      period: null,
      message: "Aktif CropPeriod bulunamadı - PREPARATION dönem oluşturmayı düşünün"
    };
  } catch (error) {
    return {
      found: false,
      period: null,
      message: `Hata: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Belirli bir tarla için tüm açık dönemleri bul
 * (CLOSED değil olanlar)
 */
export async function getOpenCropPeriods(fieldId: string) {
  try {
    const openPeriods = await prisma.cropPeriod.findMany({
      where: {
        fieldId,
        status: {
          not: "CLOSED"
        }
      },
      orderBy: { startDate: "desc" },
      include: {
        crop: true,
        processes: { take: 5 },
        irrigationLogs: { take: 5 }
      }
    });

    return openPeriods;
  } catch (error) {
    console.error(`Error getting open crop periods for field ${fieldId}:`, error);
    throw new Error(`Failed to get open crop periods: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Belirli bir tarla ve sezon için tüm dönemleri bul
 */
export async function getCropPeriodsForFieldAndSeason(
  fieldId: string,
  seasonId: string
) {
  try {
    const periods = await prisma.cropPeriod.findMany({
      where: {
        fieldId,
        seasonId
      },
      orderBy: { startDate: "desc" },
      include: {
        crop: true,
        _count: {
          select: {
            processes: true,
            irrigationLogs: true,
            fieldExpenses: true
          }
        }
      }
    });

    return periods;
  } catch (error) {
    console.error(`Error getting crop periods for field ${fieldId} and season ${seasonId}:`, error);
    throw new Error(`Failed to get crop periods: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Belirli bir crop için aktif dönem bul
 */
export async function getActivePeriodForCrop(cropId: string) {
  try {
    const period = await prisma.cropPeriod.findFirst({
      where: {
        cropId,
        status: {
          in: ["PREPARATION", "SEEDING", "IRRIGATION", "FERTILIZING", "HARVESTING"] as CropPeriodStatus[]
        }
      },
      include: {
        crop: true,
        field: true,
        season: true
      }
    });

    return period;
  } catch (error) {
    console.error(`Error getting active period for crop ${cropId}:`, error);
    throw new Error(`Failed to get active period for crop: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * En yakın gelecekteki dönem başladı mı kontrolü
 * (Eğer CLOSED dönem varsa ve bugün startDate'den sonraysayılıyorsa yeni PREPARATION başlamış demek)
 */
export async function hasNewPeriodStartedAfterHarvest(
  fieldId: string,
  harvestDate: Date
): Promise<boolean> {
  try {
    const newPeriod = await prisma.cropPeriod.findFirst({
      where: {
        fieldId,
        startDate: {
          gt: harvestDate
        },
        status: "PREPARATION"
      }
    });

    return !!newPeriod;
  } catch (error) {
    console.error(`Error checking for new period after harvest:`, error);
    return false;
  }
}

