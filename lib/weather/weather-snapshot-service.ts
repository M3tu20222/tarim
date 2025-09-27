import { PrismaClient } from '@prisma/client';
import { WeatherDataService } from './weather-service';

const prisma = new PrismaClient();

/**
 * 🌤️ Weather Snapshot Service
 * Process/Irrigation sırasında hava durumu verilerini kaydetme servisi
 */
export class WeatherSnapshotService {
  private weatherService: WeatherDataService;

  constructor() {
    this.weatherService = new WeatherDataService();
  }

  /**
   * 📸 Process için hava durumu snapshot'ı oluştur
   */
  async captureProcessWeatherSnapshot(processId: string, fieldId?: string) {
    try {
      // Field koordinatlarını kullan (varsa)
      if (fieldId) {
        await this.setLocationFromField(fieldId);
      } else {
        // Fallback: Kuyu koordinatları
        await this.weatherService.setLocationFromWells();
      }

      const analysis = await this.weatherService.analyzeAgriculturalConditions();
      const current = analysis.current;
      const risks = analysis.risks;

      const snapshot = await prisma.processWeatherSnapshot.create({
        data: {
          processId,
          timestamp: new Date(),
          location: {
            latitude: this.weatherService['location'].latitude,
            longitude: this.weatherService['location'].longitude,
            name: this.weatherService['location'].name
          },
          temperature: current.temperature || 0,
          humidity: current.humidity || 0,
          windSpeed: current.windSpeed || 0,
          precipitation: current.precipitation || 0,
          soilMoisture: this.extractSoilMoisture(analysis),
          weatherCode: 0, // TODO: Extract from API
          description: this.getWeatherDescription(current),
          riskLevel: this.calculateOverallRisk(risks),
          risks: risks,
          irrigationAdvice: analysis.irrigation || null
        }
      });

      console.log(`📸 Process ${processId} için weather snapshot oluşturuldu`);
      return snapshot;

    } catch (error) {
      console.error(`Process weather snapshot hatası:`, error);
      throw error;
    }
  }

  /**
   * 🚿 Irrigation için hava durumu snapshot'ı oluştur
   */
  async captureIrrigationWeatherSnapshot(irrigationLogId: string, fieldId?: string) {
    try {
      // Field koordinatlarını kullan (varsa)
      if (fieldId) {
        await this.setLocationFromField(fieldId);
      } else {
        // Fallback: Kuyu koordinatları
        await this.weatherService.setLocationFromWells();
      }

      const analysis = await this.weatherService.analyzeAgriculturalConditions();
      const current = analysis.current;
      const risks = analysis.risks;

      const snapshot = await prisma.processWeatherSnapshot.create({
        data: {
          irrigationLogId,
          timestamp: new Date(),
          location: {
            latitude: this.weatherService['location'].latitude,
            longitude: this.weatherService['location'].longitude,
            name: this.weatherService['location'].name
          },
          temperature: current.temperature || 0,
          humidity: current.humidity || 0,
          windSpeed: current.windSpeed || 0,
          precipitation: current.precipitation || 0,
          soilMoisture: this.extractSoilMoisture(analysis),
          weatherCode: 0,
          description: this.getWeatherDescription(current),
          riskLevel: this.calculateOverallRisk(risks),
          risks: risks,
          irrigationAdvice: analysis.irrigation || null
        }
      });

      console.log(`🚿 Irrigation ${irrigationLogId} için weather snapshot oluşturuldu`);
      return snapshot;

    } catch (error) {
      console.error(`Irrigation weather snapshot hatası:`, error);
      throw error;
    }
  }

  /**
   * 🗺️ Field ID'den koordinat belirleme
   */
  private async setLocationFromField(fieldId: string) {
    try {
      const field = await prisma.field.findUnique({
        where: { id: fieldId },
        select: {
          coordinates: true,
          name: true,
          fieldWells: {
            include: {
              well: {
                select: {
                  latitude: true,
                  longitude: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (!field) {
        console.log('⚠️ Field bulunamadı, default lokasyon kullanılıyor');
        return false;
      }

      // 1. Öncelik: Field koordinatları
      if (field.coordinates) {
        const locationSet = this.weatherService.setLocationFromField(field.coordinates);
        if (locationSet) return true;
      }

      // 2. Fallback: İlişkili kuyu koordinatları
      if (field.fieldWells && field.fieldWells.length > 0) {
        const wellsWithCoords = field.fieldWells.filter(fw =>
          fw.well.latitude && fw.well.longitude
        );

        if (wellsWithCoords.length > 0) {
          const well = wellsWithCoords[0].well;
          const coordString = `${well.latitude},${well.longitude}`;
          return this.weatherService.setLocationFromField(coordString);
        }
      }

      return false;
    } catch (error) {
      console.error('Field lokasyon belirleme hatası:', error);
      return false;
    }
  }

  /**
   * 💧 Toprak nemi çıkarma
   */
  private extractSoilMoisture(analysis: any): number {
    if (analysis.soil && analysis.soil.moisture) {
      const moisture = analysis.soil.moisture;
      // Üst katman nemlerinin ortalaması
      return (moisture.layer1 + moisture.layer2 + moisture.layer3) / 3;
    }
    return 0.3; // Default %30
  }

  /**
   * 🌦️ Hava durumu açıklaması
   */
  private getWeatherDescription(current: any): string {
    const temp = current.temperature || 0;
    const humidity = current.humidity || 0;
    const precipitation = current.precipitation || 0;

    if (precipitation > 5) return 'Yağmurlu';
    if (precipitation > 0.5) return 'Hafif Yağmur';
    if (humidity > 85) return 'Nemli';
    if (temp > 30) return 'Sıcak';
    if (temp < 5) return 'Soğuk';
    return 'Açık';
  }

  /**
   * ⚠️ Genel risk seviyesi hesaplama
   */
  private calculateOverallRisk(risks: any[]): number {
    if (!risks || risks.length === 0) return 0;

    const maxRisk = Math.max(...risks.map(risk => risk.level || 0));
    return Math.min(4, maxRisk);
  }

  /**
   * 📊 Process/Irrigation için weather snapshot'larını getir
   */
  async getWeatherSnapshots(options: {
    processId?: string;
    irrigationLogId?: string;
    limit?: number;
  }) {
    const { processId, irrigationLogId, limit = 10 } = options;

    const where: any = {};
    if (processId) where.processId = processId;
    if (irrigationLogId) where.irrigationLogId = irrigationLogId;

    return await prisma.processWeatherSnapshot.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }

  /**
   * 🗓️ Tarih aralığında weather snapshot'larını getir (Timeline için)
   */
  async getWeatherSnapshotsInRange(startDate: Date, endDate: Date, fieldId?: string) {
    try {
      const where: any = {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      };

      // Field'a bağlı process/irrigation'ları filtrele
      if (fieldId) {
        where.OR = [
          {
            process: {
              fieldId: fieldId
            }
          },
          {
            irrigationLog: {
              fieldId: fieldId
            }
          }
        ];
      }

      return await prisma.processWeatherSnapshot.findMany({
        where,
        include: {
          process: {
            select: {
              id: true,
              type: true,
              description: true
            }
          },
          irrigationLog: {
            select: {
              id: true,
              duration: true,
              amount: true,
              method: true
            }
          }
        },
        orderBy: { timestamp: 'asc' }
      });

    } catch (error) {
      console.error('Weather snapshots range query hatası:', error);
      throw error;
    }
  }
}