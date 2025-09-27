import { prisma } from "@/lib/prisma";
import { weatherCache } from "@/lib/weather/cache";

// Crop Coefficient (Kc) values for different growth stages
export const CROP_COEFFICIENTS = {
  // Genel bitki turleri icin Kc degerleri
  initial: 0.4,      // Baslangic donemi
  development: 0.7,  // Gelisme donemi
  mid: 1.15,         // Tepe gelisme donemi
  late: 0.8,         // Hasat oncesi donem

  // Bitki turlerine gore ozel Kc degerleri
  crops: {
    wheat: { initial: 0.4, development: 0.7, mid: 1.15, late: 0.4 },
    corn: { initial: 0.3, development: 0.7, mid: 1.2, late: 0.6 },
    tomato: { initial: 0.6, development: 0.8, mid: 1.15, late: 0.8 },
    cucumber: { initial: 0.6, development: 0.8, mid: 1.0, late: 0.75 },
    pepper: { initial: 0.6, development: 0.8, mid: 1.05, late: 0.9 },
    potato: { initial: 0.5, development: 0.75, mid: 1.15, late: 0.75 },
  }
} as const;

// Stress coefficient (Ks) - Su stresi katsayisi
export const getStressCoefficient = (
  soilMoisture: number,
  fieldCapacity: number = 100
): number => {
  const moistureRatio = soilMoisture / fieldCapacity;

  if (moistureRatio >= 0.7) return 1.0;      // Stres yok
  if (moistureRatio >= 0.5) return 0.9;      // Hafif stres
  if (moistureRatio >= 0.3) return 0.7;      // Orta stres
  return 0.5;                                // Yuksek stres
};

// Fenoloji safhasina gore Kc degerini hesapla
export const getCropCoefficient = (
  cropName: string,
  phenologyStage?: string | null
): number => {
  const cropKey = cropName.toLowerCase() as keyof typeof CROP_COEFFICIENTS.crops;
  const cropData = CROP_COEFFICIENTS.crops[cropKey];

  if (cropData && phenologyStage) {
    const stageKey = phenologyStage as keyof typeof cropData;
    return cropData[stageKey] || CROP_COEFFICIENTS.mid;
  }

  // Default degerler
  switch (phenologyStage) {
    case 'initial': return CROP_COEFFICIENTS.initial;
    case 'development': return CROP_COEFFICIENTS.development;
    case 'mid': return CROP_COEFFICIENTS.mid;
    case 'late': return CROP_COEFFICIENTS.late;
    default: return CROP_COEFFICIENTS.mid; // Default orta donem
  }
};

// Gunluk ETc hesaplama
export interface DailyWaterConsumption {
  date: string;
  eto: number;           // Reference evapotranspiration (mm)
  kc: number;            // Crop coefficient
  ks: number;            // Stress coefficient
  etc: number;           // Crop evapotranspiration (mm)
  precipitation: number; // Yagis (mm)
  netNeed: number;      // Net su ihtiyaci (ETc - Rain)
  status: 'low' | 'medium' | 'high';
  recommendation: string;
}

// Haftalik su bilancosu
export interface WeeklyWaterBalance {
  totalEtc: number;
  totalRain: number;
  netNeed: number;
  avgDailyEtc: number;
  nextIrrigationDate: Date | null;
  irrigationFrequency: number; // Gun cinsinden
  recommendations: string[];
}

// Hibrit su tuketimi verisi
export interface WaterConsumptionData {
  fieldId: string;
  fieldName: string;
  cropName: string;
  lastUpdated: Date;
  today: DailyWaterConsumption;
  weekly: WeeklyWaterBalance;
}

// Ana hesaplama servisi
export class WaterConsumptionService {
  // Gunluk ETc hesapla
  static calculateDailyETc(
    eto: number,
    kc: number,
    ks: number = 1.0
  ): number {
    return eto * kc * ks;
  }

  // Su ihtiyaci durumunu belirle
  static getWaterStatus(etc: number): {
    status: 'low' | 'medium' | 'high';
    recommendation: string;
  } {
    if (etc < 3) {
      return {
        status: 'low',
        recommendation: 'Su ihtiyaci dusuk. Sulama gerekmez.',
      };
    } else if (etc < 6) {
      return {
        status: 'medium',
        recommendation: 'Su ihtiyaci orta seviyede. 1-2 gun icinde sulama planlayin.',
      };
    } else {
      return {
        status: 'high',
        recommendation: 'Su ihtiyaci yuksek. En kisa zamanda sulama yapin.',
      };
    }
  }

  // Tarla icin su tuketimi verisini getir
  static async getWaterConsumptionForField(
    fieldId: string
  ): Promise<WaterConsumptionData | null> {
    try {
      // Cache'den kontrol et
      const cached = weatherCache.getWaterConsumptionData(fieldId);
      if (cached) {
        return cached;
      }
      // Tarla bilgilerini getir
      const field = await prisma.field.findUnique({
        where: { id: fieldId },
        include: {
          crops: {
            where: { status: { not: 'HARVESTED' } },
            orderBy: { plantedDate: 'desc' },
            take: 1
          },
          agroDailyFeatures: {
            orderBy: { date: 'desc' },
            take: 1
          },
          weatherSnapshots: {
            orderBy: { timestamp: 'desc' },
            take: 1
          },
          weatherDailySummaries: {
            orderBy: { date: 'desc' },
            take: 7
          }
        }
      });

      if (!field) {
        return null;
      }

      const activeCrop = field.crops?.[0] ?? null;
      const cropName = activeCrop?.name ?? 'Genel Bitki';
      const latestAgro = field.agroDailyFeatures?.[0];
      const dailySummaries = field.weatherDailySummaries ?? [];

      if (dailySummaries.length === 0) {
        return null;
      }

      // Bugunun verilerini hesapla
      const todayData = dailySummaries[0];
      const kc = getCropCoefficient(cropName, latestAgro?.phenologyStage);
      const ks = 1.0;

      const todayETc = this.calculateDailyETc(
        todayData.et0FaoEvapotranspiration ?? 0,
        kc,
        ks
      );

      const todayRain = todayData.precipitationSumMm ?? 0;
      const todayNetNeed = Math.max(0, todayETc - todayRain);
      const todayStatus = this.getWaterStatus(todayETc);

      // 7 gunluk verileri hesapla
      let totalEtc = 0;
      let totalRain = 0;

      for (const day of dailySummaries) {
        const dayEtc = this.calculateDailyETc(
          day.et0FaoEvapotranspiration ?? 0,
          kc,
          ks,
        );
        totalEtc += dayEtc;
        totalRain += day.precipitationSumMm ?? 0;
      }

      const netWeeklyNeed = Math.max(0, totalEtc - totalRain);
      const daysCount = Math.max(1, dailySummaries.length);
      const avgDailyEtc = totalEtc / daysCount;

      const irrigationFrequencyRaw = avgDailyEtc > 0 ? Math.ceil(20 / avgDailyEtc) : 7;
      const irrigationFrequency = (
        Number.isFinite(irrigationFrequencyRaw) && irrigationFrequencyRaw > 0
          ? irrigationFrequencyRaw
          : 7
      );
      const nextIrrigationDays = netWeeklyNeed > 15 ? 1 : irrigationFrequency;
      const nextIrrigationDate = new Date(
        Date.now() + nextIrrigationDays * 24 * 60 * 60 * 1000,
      );

      const result: WaterConsumptionData = {
        fieldId: field.id,
        fieldName: field.name,
        cropName,
        lastUpdated: new Date(),
        today: {
          date: todayData.date.toISOString().split('T')[0],
          eto: todayData.et0FaoEvapotranspiration ?? 0,
          kc,
          ks,
          etc: todayETc,
          precipitation: todayRain,
          netNeed: todayNetNeed,
          status: todayStatus.status,
          recommendation: todayStatus.recommendation
        },
        weekly: {
          totalEtc,
          totalRain,
          netNeed: netWeeklyNeed,
          avgDailyEtc,
          nextIrrigationDate,
          irrigationFrequency,
          recommendations: [
            `7 gunluk toplam su tuketimi: ${totalEtc.toFixed(1)} mm`,
            `Yagis miktari: ${totalRain.toFixed(1)} mm`,
            `Net su ihtiyaci: ${netWeeklyNeed.toFixed(1)} mm`,
            `Onerilen sulama araligi: ${irrigationFrequency} gun`
          ]
        }
      };

      // Cache'e kaydet
      weatherCache.setWaterConsumptionData(fieldId, result);

      return result;
    } catch (error) {
      console.error('Water consumption calculation error:', error);
      return null;
    }
  }

  // Tum tarlalar icin su tuketimi verisini getir
  static async getWaterConsumptionForUser(
    userId: string
  ): Promise<WaterConsumptionData[]> {
    try {
      // User cache'i kontrol et
      const cached = weatherCache.getUserWaterData(userId);
      if (cached) {
        return cached;
      }
      const fields = await prisma.field.findMany({
        where: {
          owners: {
            some: {
              userId: userId
            }
          }
        },
        select: { id: true }
      });

      const results = await Promise.all(
        fields.map(field => this.getWaterConsumptionForField(field.id))
      );

      const validResults = results.filter((result): result is WaterConsumptionData => result !== null);

      // User cache'e kaydet
      weatherCache.setUserWaterData(userId, validResults);

      return validResults;
    } catch (error) {
      console.error('User water consumption calculation error:', error);
      return [];
    }
  }
}
