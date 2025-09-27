import { NextResponse } from 'next/server';
import { irrigationCoefficientsService } from '@/lib/irrigation/irrigation-coefficients';
import { WeatherDataService } from '@/lib/weather/weather-service';
import { prisma } from '@/lib/prisma';

interface IrrigationCalculationRequest {
  fieldId?: string;
  cropType: string;
  daysAfterPlanting: number;
  soilType?: string;
  plantingDate?: string;
}

export async function POST(request: Request) {
  try {
    const body: IrrigationCalculationRequest = await request.json();
    const { fieldId, cropType, daysAfterPlanting, soilType, plantingDate } = body;

    // Input validation
    if (!cropType || daysAfterPlanting < 0) {
      return NextResponse.json({
        success: false,
        error: 'Geçersiz parametreler: cropType ve daysAfterPlanting gerekli'
      }, { status: 400 });
    }

    // Field bilgilerini getir (eğer fieldId verilmişse)
    let field = null;
    let fieldSoilType = soilType || 'LOAM'; // Default

    if (fieldId) {
      field = await prisma.field.findUnique({
        where: { id: fieldId },
        select: {
          id: true,
          name: true,
          coordinates: true,
          soilType: true,
          crops: {
            select: {
              name: true,
              plantedDate: true,
              status: true
            }
          },
          fieldWells: {
            include: {
              well: {
                select: {
                  name: true,
                  latitude: true,
                  longitude: true
                }
              }
            }
          }
        }
      });

      if (field?.soilType) {
        fieldSoilType = field.soilType;
      }
    }

    // Weather service'i yapılandır
    const weatherService = new WeatherDataService();
    let locationSet = false;

    // Koordinat belirleme (field > well > default)
    if (field?.coordinates) {
      locationSet = weatherService.setLocationFromField(field.coordinates);
    } else if (field?.fieldWells && field.fieldWells.length > 0) {
      const wellsWithCoords = field.fieldWells.filter(fw =>
        fw.well.latitude && fw.well.longitude
      );
      if (wellsWithCoords.length > 0) {
        const well = wellsWithCoords[0].well;
        const coordString = `${well.latitude},${well.longitude}`;
        locationSet = weatherService.setLocationFromField(coordString);
      }
    }

    if (!locationSet) {
      await weatherService.setLocationFromWells();
    }

    // Hava durumu verilerini getir
    const analysis = await weatherService.analyzeAgriculturalConditions();

    // ET0 (Reference Evapotranspiration) hesapla
    const dailyET0 = analysis.current.temperature
      ? calculateET0(analysis.current)
      : 4.0; // Default 4mm/day

    // Yağış verisi
    const dailyRainfall = analysis.current.precipitation || 0;

    // Sulama ihtiyacı hesapla
    const irrigationNeed = irrigationCoefficientsService.calculateIrrigationNeed({
      cropType,
      daysAfterPlanting,
      referenceET0: dailyET0,
      soilType: fieldSoilType,
      rainfall: dailyRainfall,
      irrigationEfficiency: 0.85,
      climateAdjustment: 1.0
    });

    // Ürün katsayısı bilgileri
    const cropCoefficient = irrigationCoefficientsService.getCropCoefficient(cropType);
    const soilProperties = irrigationCoefficientsService.getSoilProperties(fieldSoilType);

    // Sezonluk takvim (eğer plantingDate verilmişse)
    let seasonalSchedule = null;
    if (plantingDate) {
      try {
        seasonalSchedule = irrigationCoefficientsService.generateSeasonalSchedule({
          cropType,
          plantingDate: new Date(plantingDate),
          soilType: fieldSoilType,
          avgET0: dailyET0,
          avgRainfall: dailyRainfall
        });
      } catch (error) {
        console.warn('Sezonluk takvim oluşturulamadı:', error);
      }
    }

    // Response oluştur
    const response = {
      success: true,
      data: {
        field: field ? {
          id: field.id,
          name: field.name,
          soilType: fieldSoilType
        } : null,
        cropInfo: cropCoefficient ? {
          name: cropCoefficient.displayName,
          currentKc: irrigationCoefficientsService.calculateKc(cropType, daysAfterPlanting),
          growthStage: determineGrowthStage(cropCoefficient, daysAfterPlanting),
          rootDepth: cropCoefficient.rootDepth,
          criticalDepletion: cropCoefficient.criticalDepletion
        } : null,
        soilInfo: soilProperties,
        weatherConditions: {
          temperature: analysis.current.temperature,
          humidity: analysis.current.humidity,
          precipitation: analysis.current.precipitation,
          windSpeed: analysis.current.windSpeed,
          dailyET0
        },
        irrigationCalculation: irrigationNeed,
        seasonalSchedule: seasonalSchedule?.slice(0, 8), // İlk 8 hafta
        recommendations: [
          ...irrigationNeed.recommendations,
          `🌱 Ürün gelişim aşaması: ${determineGrowthStage(cropCoefficient, daysAfterPlanting)}`,
          `💧 Günlük su ihtiyacı: ${irrigationNeed.cropETc.toFixed(1)} mm`,
          `⏰ Sulama sıklığı: ${irrigationNeed.irrigationFrequency} gün`,
          `📏 Uygulama miktarı: ${irrigationNeed.applicationDepth.toFixed(1)} mm`
        ],
        lastUpdate: new Date().toISOString()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Irrigation calculation API error:', error);

    return NextResponse.json({
      success: false,
      error: 'Sulama hesaplama hatası',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // Available crops and soil types listesi
    const availableCrops = irrigationCoefficientsService.getAvailableCrops();
    const availableSoilTypes = irrigationCoefficientsService.getAvailableSoilTypes();

    return NextResponse.json({
      success: true,
      data: {
        availableCrops,
        availableSoilTypes,
        description: 'Sulama hesaplama servisi - ürün ve toprak tipi seçenekleri'
      }
    });

  } catch (error) {
    console.error('Irrigation options API error:', error);

    return NextResponse.json({
      success: false,
      error: 'Sulama seçenekleri alınamadı'
    }, { status: 500 });
  }
}

/**
 * 🌡️ Reference Evapotranspiration (ET0) hesaplama
 * Simplified Penman equation for daily ET0
 */
function calculateET0(conditions: any): number {
  const temp = conditions.temperature || 20;
  const humidity = conditions.humidity || 60;
  const windSpeed = (conditions.windSpeed || 5) * 0.277778; // km/h to m/s

  // Simplified ET0 calculation (mm/day)
  // Based on Hargreaves equation with humidity and wind adjustments
  const tempRange = 15; // Assumed diurnal temperature range
  const baseET0 = 0.0023 * (temp + 17.8) * Math.sqrt(tempRange) * 1.8;

  // Wind adjustment
  const windAdjustment = 1 + (windSpeed - 2) * 0.1;

  // Humidity adjustment
  const humidityAdjustment = 1 + (60 - humidity) * 0.01;

  return Math.max(0.5, Math.min(10, baseET0 * windAdjustment * humidityAdjustment));
}

/**
 * 🌱 Gelişim aşaması belirleme
 */
function determineGrowthStage(cropCoefficient: any, daysAfterPlanting: number): string {
  if (!cropCoefficient) return 'Bilinmiyor';

  const stages = cropCoefficient.growthStages;

  if (daysAfterPlanting <= stages.initial) {
    return 'Başlangıç Dönemi';
  } else if (daysAfterPlanting <= stages.initial + stages.development) {
    return 'Gelişim Dönemi';
  } else if (daysAfterPlanting <= stages.initial + stages.development + stages.mid) {
    return 'Orta Dönem (Kritik)';
  } else {
    return 'Son Dönem (Olgunluk)';
  }
}

// Cache süresi ayarı (15 dakika)
export const revalidate = 60 * 15;