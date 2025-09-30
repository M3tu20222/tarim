// ==========================================
// 🌾 TARLA BAZLI HAVA DURUMU SERVİSİ
// ==========================================

import { prisma } from '@/lib/prisma';
import { fetchOpenMeteoBatch } from './openMeteoClient';
import { FieldCoordinate, LocationWeatherBatch } from './types';
import { windIrrigationService } from './irrigation-wind-service';
import { frostProtectionService } from './frost-protection-service';

export interface FieldWeatherData {
  fieldId: string;
  fieldName: string;
  location: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  weather: {
    current: {
      temperature: number;
      humidity: number;
      windSpeed: number;
      windDirection: number;
      windDirectionText: string;
      precipitation: number;
      pressure: number;
      soilTemperature: number;
      soilMoisture: number;
    };
    forecast: any[];
  };
  risks: {
    wind: any;
    frost: any;
    irrigation: any;
  };
  recommendations: string[];
  lastUpdate: string;
}

export class FieldWeatherService {
  /**
   * Kullanıcının erişebildiği tarlalar için hava durumu verilerini getirir
   */
  async getFieldsWeatherData(userId: string, userRole: string): Promise<FieldWeatherData[]> {
    try {
      // Kullanıcının erişebildiği tarlaları al
      const fields = await this.getUserAccessibleFields(userId, userRole);

      if (fields.length === 0) {
        return [];
      }

      // Koordinatları OpenMeteo formatına çevir
      const coordinates = fields
        .filter(field => field.coordinates)
        .map(field => this.parseFieldCoordinates(field));

      if (coordinates.length === 0) {
        return [];
      }

      // Toplu hava durumu verilerini al
      const weatherBatch = await fetchOpenMeteoBatch(coordinates);

      // Her tarla için detaylı analiz yap
      const fieldWeatherData = await Promise.all(
        weatherBatch.map(async (weather) => {
          const field = fields.find(f => f.id === weather.fieldId);
          if (!field) return null;

          return this.processFieldWeatherData(field, weather);
        })
      );

      return fieldWeatherData.filter(Boolean) as FieldWeatherData[];
    } catch (error) {
      console.error('Field weather data fetch error:', error);
      throw new Error('Tarla hava durumu verileri alınamadı');
    }
  }

  /**
   * Tek bir tarla için detaylı hava durumu analizi
   */
  async getSingleFieldWeather(fieldId: string, userId: string, userRole: string): Promise<FieldWeatherData | null> {
    try {
      // Tarla erişim kontrolü
      const field = await this.getFieldWithAccess(fieldId, userId, userRole);
      if (!field || !field.coordinates) {
        return null;
      }

      // Koordinatları parse et
      const coordinate = this.parseFieldCoordinates(field);

      // Hava durumu verilerini al
      const weatherBatch = await fetchOpenMeteoBatch([coordinate]);

      if (weatherBatch.length === 0) {
        return null;
      }

      return this.processFieldWeatherData(field, weatherBatch[0]);
    } catch (error) {
      console.error('Single field weather error:', error);
      return null;
    }
  }

  /**
   * Kullanıcının erişebildiği tarlaları getirir
   */
  private async getUserAccessibleFields(userId: string, userRole: string) {
    if (userRole === 'ADMIN') {
      // Admin tüm tarlalara erişebilir
      return prisma.field.findMany({
        where: {
          coordinates: { not: null }
        },
        select: {
          id: true,
          name: true,
          location: true,
          coordinates: true,
          size: true,
          soilType: true
        }
      });
    } else {
      // Owner sadece sahip olduğu tarlalara erişebilir
      const ownerships = await prisma.fieldOwnership.findMany({
        where: { userId },
        include: {
          field: {
            select: {
              id: true,
              name: true,
              location: true,
              coordinates: true,
              size: true,
              soilType: true
            }
          }
        }
      });

      return ownerships
        .map(o => o.field)
        .filter(field => field.coordinates);
    }
  }

  /**
   * Belirli bir tarla için erişim kontrolü ile bilgi getirir
   */
  private async getFieldWithAccess(fieldId: string, userId: string, userRole: string) {
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      select: {
        id: true,
        name: true,
        location: true,
        coordinates: true,
        size: true,
        soilType: true
      }
    });

    if (!field) return null;

    // Erişim kontrolü
    if (userRole !== 'ADMIN') {
      const ownership = await prisma.fieldOwnership.findFirst({
        where: {
          fieldId,
          userId
        }
      });

      if (!ownership) return null;
    }

    return field;
  }

  /**
   * Tarla koordinatlarını parse eder
   */
  private parseFieldCoordinates(field: any): FieldCoordinate {
    try {
      // Coordinates formatı: "38.575906,31.849755" veya JSON
      let coordinates;

      if (field.coordinates.includes(',')) {
        // CSV format
        const [lat, lng] = field.coordinates.split(',').map(Number);
        coordinates = { latitude: lat, longitude: lng };
      } else {
        // JSON format
        coordinates = JSON.parse(field.coordinates);
      }

      return {
        fieldId: field.id,
        fieldName: field.name,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      };
    } catch (error) {
      console.error('Coordinate parsing error for field:', field.id, error);
      // Fallback to default coordinates
      return {
        fieldId: field.id,
        fieldName: field.name,
        latitude: 38.575906,
        longitude: 31.849755
      };
    }
  }

  /**
   * Tarla hava durumu verilerini işler ve analiz eder
   */
  private async processFieldWeatherData(
    field: any,
    weather: LocationWeatherBatch
  ): Promise<FieldWeatherData> {
    const currentHourly = weather.hourly[0] || {};
    const currentDaily = weather.daily[0] || {};

    // Mevcut hava durumu
    const current = {
      temperature: currentHourly.temperature2m || 0,
      humidity: currentHourly.relativeHumidity2m || 0,
      windSpeed: currentHourly.windSpeed10m || 0,
      windDirection: currentHourly.windDirection10m || 0,
      windDirectionText: this.getWindDirectionText(currentHourly.windDirection10m || 0),
      precipitation: currentHourly.precipitationMm || 0,
      pressure: currentHourly.surfacePressure || 1013,
      soilTemperature: currentHourly.soilTemperature0cm || currentHourly.temperature2m || 0,
      soilMoisture: currentHourly.soilMoisture0_1cm || 0
    };

    // Risk analizleri
    const windAnalysis = windIrrigationService.analyzeIrrigationSafety(weather.hourly);
    const frostAnalysis = frostProtectionService.analyzeFrostRisk(weather.hourly);
    const irrigationCheck = frostProtectionService.checkIrrigationFrostRisk(weather.hourly);

    // Öneriler oluştur
    const recommendations = this.generateFieldRecommendations(
      windAnalysis,
      frostAnalysis,
      irrigationCheck,
      current,
      field
    );

    return {
      fieldId: field.id,
      fieldName: field.name,
      location: field.location,
      coordinates: {
        latitude: weather.latitude,
        longitude: weather.longitude
      },
      weather: {
        current,
        forecast: weather.daily.slice(1, 8) // 7 günlük tahmin
      },
      risks: {
        wind: {
          level: windAnalysis.windRiskLevel,
          isWestWind: windAnalysis.riskFactors.isWestWind,
          isSafeToIrrigate: windAnalysis.isIrrigationSafe,
          recommendations: windAnalysis.recommendations.slice(0, 3)
        },
        frost: {
          level: frostAnalysis.frostRiskLevel,
          minTemperature: frostAnalysis.minTemperature,
          shouldAvoidIrrigation: frostAnalysis.irrigationWarning.shouldAvoidIrrigation,
          recommendations: frostAnalysis.irrigationWarning.recommendations.slice(0, 3)
        },
        irrigation: {
          isSafe: irrigationCheck.isSafeToIrrigate,
          riskLevel: irrigationCheck.riskLevel,
          timeUntilSafe: irrigationCheck.timeUntilSafe,
          recommendations: irrigationCheck.recommendations.slice(0, 3)
        }
      },
      recommendations,
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Rüzgar yönünü metne çevirir
   */
  private getWindDirectionText(degrees: number): string {
    const directions = [
      'Kuzey', 'Kuzeydoğu', 'Doğu', 'Güneydoğu',
      'Güney', 'Güneybatı', 'Batı', 'Kuzeybatı'
    ];
    const index = Math.round(degrees / 45) % 8;
    return directions[index] || 'Belirsiz';
  }

  /**
   * Tarla için özel öneriler oluşturur
   */
  private generateFieldRecommendations(
    windAnalysis: any,
    frostAnalysis: any,
    irrigationCheck: any,
    current: any,
    field: any
  ): string[] {
    const recommendations: string[] = [];

    // Kritik uyarılar önce
    if (frostAnalysis.frostRiskLevel === 'CRITICAL') {
      recommendations.push('🚨 KRİTİK DON RİSKİ! Acil koruma önlemleri alın');
    }

    if (windAnalysis.riskFactors.isWestWind && windAnalysis.windRiskLevel === 'HIGH') {
      recommendations.push('🌪️ Batı rüzgarı riski! Fıskiye sulamayı durdurun');
    }

    // Sulama önerileri
    if (!windAnalysis.isIrrigationSafe) {
      recommendations.push('💧 Sulama güvenli değil - rüzgar kesilene kadar bekleyin');
    } else if (irrigationCheck.isSafeToIrrigate) {
      recommendations.push('✅ Sulama için uygun koşullar');
    }

    // Toprak tipi bazlı öneriler
    if (field.soilType === 'SANDY' && current.soilMoisture < 30) {
      recommendations.push('🏖️ Kumlu toprak - daha sık ama az miktarda sulayın');
    } else if (field.soilType === 'CLAY' && current.soilMoisture > 70) {
      recommendations.push('🧱 Killi toprak - aşırı sulama yapmayın');
    }

    // Genel öneriler
    if (current.temperature > 30) {
      recommendations.push('🌡️ Yüksek sıcaklık - sabah erken veya akşam sulayın');
    }

    if (current.humidity > 85) {
      recommendations.push('💨 Yüksek nem - hastalık riskine dikkat edin');
    }

    return recommendations.slice(0, 5); // En fazla 5 öneri
  }

  /**
   * Tüm tarla risk özetini getirir
   */
  async getFieldsRiskSummary(userId: string, userRole: string) {
    const fieldsData = await this.getFieldsWeatherData(userId, userRole);

    const summary = {
      totalFields: fieldsData.length,
      criticalRisks: fieldsData.filter(f =>
        f.risks.wind.level === 'CRITICAL' ||
        f.risks.frost.level === 'CRITICAL'
      ).length,
      highRisks: fieldsData.filter(f =>
        f.risks.wind.level === 'HIGH' ||
        f.risks.frost.level === 'HIGH'
      ).length,
      irrigationSafeFields: fieldsData.filter(f =>
        f.risks.wind.isSafeToIrrigate &&
        f.risks.irrigation.isSafe
      ).length,
      westWindFields: fieldsData.filter(f =>
        f.risks.wind.isWestWind
      ).length,
      frostRiskFields: fieldsData.filter(f =>
        f.risks.frost.level !== 'NONE'
      ).length,
    };

    return {
      summary,
      fields: fieldsData
    };
  }
}

export const fieldWeatherService = new FieldWeatherService();