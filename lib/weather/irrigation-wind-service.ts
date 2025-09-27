// ==========================================
// 🌬️ RÜZGAR BAZLI SULAMA YÖNETİM SİSTEMİ
// ==========================================

import { HourlyWeatherRecord } from './types';

export interface WindIrrigationAnalysis {
  isIrrigationSafe: boolean;
  windRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  windSpeedKmh: number;
  windDirection: number;
  windDirectionText: string;
  recommendations: string[];
  safestHours: { hour: number; windSpeed: number; direction: string }[];
  riskFactors: {
    isWestWind: boolean;
    isHighSpeed: boolean;
    hasGusts: boolean;
    gustSpeed?: number;
  };
  irrigationMethod: 'sprinkler' | 'drip' | 'delayed';
  waitUntilHour?: number;
}

export interface CropBurnRisk {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  cropType: string;
  isWestWind: boolean;
  temperature: number;
  humidity: number;
  recommendations: string[];
  preventiveMeasures: string[];
}

export class WindIrrigationService {
  // Rüzgar yönü dereceleri (0-360°)
  private readonly WIND_DIRECTIONS = {
    NORTH: { min: 337.5, max: 22.5, name: 'Kuzey' },
    NORTHEAST: { min: 22.5, max: 67.5, name: 'Kuzeydoğu' },
    EAST: { min: 67.5, max: 112.5, name: 'Doğu' },
    SOUTHEAST: { min: 112.5, max: 157.5, name: 'Güneydoğu' },
    SOUTH: { min: 157.5, max: 202.5, name: 'Güney' },
    SOUTHWEST: { min: 202.5, max: 247.5, name: 'Güneybatı' },
    WEST: { min: 247.5, max: 292.5, name: 'Batı' },
    NORTHWEST: { min: 292.5, max: 337.5, name: 'Kuzeybatı' }
  };

  // Fıskiye sulama için kritik rüzgar hızları (km/h)
  private readonly WIND_SPEED_THRESHOLDS = {
    SPRINKLER_SAFE: 10,      // Fıskiye güvenli
    SPRINKLER_CAUTION: 15,   // Dikkatli fıskiye
    SPRINKLER_AVOID: 20,     // Fıskiye kaçın
    CRITICAL_LEVEL: 30       // Kritik seviye
  };

  /**
   * Rüzgar yönünü derece cinsinden metne çevirir
   */
  getWindDirectionText(degrees: number): string {
    if (degrees >= this.WIND_DIRECTIONS.NORTH.min || degrees <= this.WIND_DIRECTIONS.NORTH.max) {
      return this.WIND_DIRECTIONS.NORTH.name;
    }

    for (const [key, direction] of Object.entries(this.WIND_DIRECTIONS)) {
      if (key === 'NORTH') continue;
      if (degrees > direction.min && degrees <= direction.max) {
        return direction.name;
      }
    }

    return 'Belirsiz';
  }

  /**
   * Batı rüzgarı kontrolü
   */
  isWestWind(degrees: number): boolean {
    const westRange = this.WIND_DIRECTIONS.WEST;
    return degrees > westRange.min && degrees <= westRange.max;
  }

  /**
   * Güneybatı rüzgarı kontrolü (batı rüzgarına yakın)
   */
  isSouthwestWind(degrees: number): boolean {
    const swRange = this.WIND_DIRECTIONS.SOUTHWEST;
    return degrees > swRange.min && degrees <= swRange.max;
  }

  /**
   * Ana sulama güvenlik analizi
   */
  analyzeIrrigationSafety(
    hourlyData: HourlyWeatherRecord[],
    currentHour = new Date().getHours()
  ): WindIrrigationAnalysis {
    const currentData = hourlyData[0] || {};
    const windSpeed = currentData.windSpeed10m || 0;
    const windDirection = currentData.windDirection10m || 0;
    const windGusts = currentData.windGusts10m;

    const windDirectionText = this.getWindDirectionText(windDirection);
    const isWestWind = this.isWestWind(windDirection);
    const isSouthwestWind = this.isSouthwestWind(windDirection);

    // Risk faktörleri
    const riskFactors = {
      isWestWind: isWestWind || isSouthwestWind,
      isHighSpeed: windSpeed > this.WIND_SPEED_THRESHOLDS.SPRINKLER_CAUTION,
      hasGusts: !!windGusts && windGusts > windSpeed + 5,
      gustSpeed: windGusts
    };

    // Risk seviyesi hesaplama
    let windRiskLevel: WindIrrigationAnalysis['windRiskLevel'] = 'LOW';

    if (windSpeed > this.WIND_SPEED_THRESHOLDS.CRITICAL_LEVEL) {
      windRiskLevel = 'CRITICAL';
    } else if (windSpeed > this.WIND_SPEED_THRESHOLDS.SPRINKLER_AVOID) {
      windRiskLevel = 'HIGH';
    } else if (windSpeed > this.WIND_SPEED_THRESHOLDS.SPRINKLER_CAUTION || riskFactors.isWestWind) {
      windRiskLevel = 'MEDIUM';
    }

    // Sulama güvenliği
    const isIrrigationSafe = windRiskLevel === 'LOW' ||
                           (windRiskLevel === 'MEDIUM' && !riskFactors.isWestWind);

    // Sulama yöntemi önerisi
    let irrigationMethod: WindIrrigationAnalysis['irrigationMethod'] = 'sprinkler';

    if (windRiskLevel === 'HIGH' || windRiskLevel === 'CRITICAL') {
      irrigationMethod = 'drip';
    } else if (windRiskLevel === 'MEDIUM' && riskFactors.isWestWind) {
      irrigationMethod = 'delayed';
    }

    // En güvenli saatleri bul (sonraki 24 saat)
    const safestHours = this.findSafestIrrigationHours(hourlyData);

    // Öneriler oluştur
    const recommendations = this.generateWindRecommendations(
      windRiskLevel,
      riskFactors,
      windSpeed,
      windDirectionText
    );

    // Bekleme saati önerisi
    const waitUntilHour = irrigationMethod === 'delayed'
      ? this.calculateBestWaitTime(hourlyData, currentHour)
      : undefined;

    return {
      isIrrigationSafe,
      windRiskLevel,
      windSpeedKmh: Math.round(windSpeed),
      windDirection,
      windDirectionText,
      recommendations,
      safestHours,
      riskFactors,
      irrigationMethod,
      waitUntilHour
    };
  }

  /**
   * En güvenli sulama saatlerini bulur
   */
  private findSafestIrrigationHours(hourlyData: HourlyWeatherRecord[]):
    { hour: number; windSpeed: number; direction: string }[] {

    return hourlyData
      .slice(0, 24) // Sonraki 24 saat
      .map((data, index) => ({
        hour: index,
        windSpeed: data.windSpeed10m || 0,
        direction: this.getWindDirectionText(data.windDirection10m || 0),
        isWestWind: this.isWestWind(data.windDirection10m || 0)
      }))
      .filter(hour =>
        hour.windSpeed <= this.WIND_SPEED_THRESHOLDS.SPRINKLER_CAUTION &&
        !hour.isWestWind
      )
      .sort((a, b) => a.windSpeed - b.windSpeed)
      .slice(0, 6); // En iyi 6 saat
  }

  /**
   * En iyi bekleme zamanını hesaplar
   */
  private calculateBestWaitTime(hourlyData: HourlyWeatherRecord[], currentHour: number): number {
    const safestHours = this.findSafestIrrigationHours(hourlyData);

    if (safestHours.length > 0) {
      const nextSafeHour = safestHours[0].hour;
      return (currentHour + nextSafeHour) % 24;
    }

    // Gece saatleri genelde daha güvenli (02:00-06:00)
    return currentHour > 18 ? 2 : 22;
  }

  /**
   * Rüzgar önerilerini oluşturur
   */
  private generateWindRecommendations(
    riskLevel: WindIrrigationAnalysis['windRiskLevel'],
    riskFactors: WindIrrigationAnalysis['riskFactors'],
    windSpeed: number,
    direction: string
  ): string[] {
    const recommendations: string[] = [];

    switch (riskLevel) {
      case 'LOW':
        recommendations.push(
          '✅ Fıskiye sulama güvenli',
          'Normal sulama programınızı sürdürün',
          'Rüzgar koşulları ideal'
        );
        break;

      case 'MEDIUM':
        if (riskFactors.isWestWind) {
          recommendations.push(
            '⚠️ BATI RÜZGARI TESPİT EDİLDİ!',
            'Ekinlerde yanıklık riski var',
            'Sulamayı 2-3 saat erteleyin',
            'Damla sulama tercih edin'
          );
        } else {
          recommendations.push(
            '⚠️ Orta seviye rüzgar',
            'Fıskiye basıncını azaltın',
            'Sulama süresini artırın',
            'Rüzgar yönünü takip edin'
          );
        }
        break;

      case 'HIGH':
        recommendations.push(
          '🚨 Yüksek rüzgar riski!',
          'Fıskiye sulamayı DURDURUN',
          'Damla sulama sistemine geçin',
          'Gece saatlerini bekleyin'
        );
        if (riskFactors.hasGusts) {
          recommendations.push(`Esinti ${riskFactors.gustSpeed} km/h`);
        }
        break;

      case 'CRITICAL':
        recommendations.push(
          '💀 KRİTİK RÜZGAR KOŞULLARI!',
          'TÜM SULAMA İŞLEMLERİNİ DURDURUN',
          'Ekipmanları güvence altına alın',
          'Hava durumu düzelene kadar bekleyin'
        );
        break;
    }

    recommendations.push(`Rüzgar: ${Math.round(windSpeed)} km/h ${direction} yönünde`);

    return recommendations;
  }

  /**
   * Ürün yanıklık risk analizi (Batı rüzgarı + sıcaklık)
   */
  analyzeCropBurnRisk(
    hourlyData: HourlyWeatherRecord[],
    cropType: string = 'WHEAT'
  ): CropBurnRisk {
    const currentData = hourlyData[0] || {};
    const temperature = currentData.temperature2m || 0;
    const humidity = currentData.relativeHumidity2m || 0;
    const windDirection = currentData.windDirection10m || 0;
    const windSpeed = currentData.windSpeed10m || 0;

    const isWestWind = this.isWestWind(windDirection) || this.isSouthwestWind(windDirection);

    let riskLevel: CropBurnRisk['riskLevel'] = 'LOW';

    // Risk hesaplama algoritması
    if (isWestWind && temperature > 25 && humidity < 50 && windSpeed > 15) {
      riskLevel = 'CRITICAL';
    } else if (isWestWind && temperature > 20 && humidity < 60) {
      riskLevel = 'HIGH';
    } else if (isWestWind && temperature > 15) {
      riskLevel = 'MEDIUM';
    }

    const recommendations = this.generateBurnRiskRecommendations(riskLevel, {
      isWestWind,
      temperature,
      humidity,
      windSpeed,
      cropType
    });

    const preventiveMeasures = this.generatePreventiveMeasures(riskLevel, cropType);

    return {
      riskLevel,
      cropType,
      isWestWind,
      temperature,
      humidity,
      recommendations,
      preventiveMeasures
    };
  }

  /**
   * Yanıklık riski önerilerini oluşturur
   */
  private generateBurnRiskRecommendations(
    riskLevel: CropBurnRisk['riskLevel'],
    conditions: {
      isWestWind: boolean;
      temperature: number;
      humidity: number;
      windSpeed: number;
      cropType: string;
    }
  ): string[] {
    const { isWestWind, temperature, humidity, windSpeed, cropType } = conditions;
    const recommendations: string[] = [];

    if (riskLevel === 'CRITICAL') {
      recommendations.push(
        '🔥 KRİTİK YANIKLIK RİSKİ!',
        'Acil koruyucu sulama yapın',
        'Gölgeleme sistemleri kurun',
        'Sıcak saatlerde sulama yapmayın',
        'Yaprakları nemlendirin'
      );
    } else if (riskLevel === 'HIGH') {
      recommendations.push(
        '🌡️ Yüksek yanıklık riski',
        'Koruyucu sulama planlayın',
        'Öğlen saatlerinde gölge sağlayın',
        'Nem oranını artırın'
      );
    } else if (riskLevel === 'MEDIUM') {
      recommendations.push(
        '⚠️ Orta seviye risk',
        'Bitkileri gözlemleyin',
        'Su stresine dikkat edin',
        'Sabah sulaması tercih edin'
      );
    } else {
      recommendations.push(
        '✅ Yanıklık riski düşük',
        'Normal sulama programını sürdürün'
      );
    }

    recommendations.push(
      `Sıcaklık: ${temperature}°C, Nem: ${humidity}%`,
      `Rüzgar: ${windSpeed} km/h ${isWestWind ? '(Batı yönü)' : ''}`
    );

    return recommendations;
  }

  /**
   * Koruyucu önlemler
   */
  private generatePreventiveMeasures(
    riskLevel: CropBurnRisk['riskLevel'],
    cropType: string
  ): string[] {
    const measures: string[] = [];

    switch (riskLevel) {
      case 'CRITICAL':
        measures.push(
          'Acil gölgeleme sistemi kur',
          'Soğuk su ile yaprak yıkama',
          'Reflektör örtüler kullan',
          'Serinletici kimyasallar uygula'
        );
        break;

      case 'HIGH':
        measures.push(
          'Koruyucu sulama yap',
          'Gölge bezleri ger',
          'Kaolin kili uygula',
          'Su stresini önle'
        );
        break;

      case 'MEDIUM':
        measures.push(
          'Düzenli nem kontrolü',
          'Sabah erkenden sula',
          'Yaprak yüzeyini kontrol et',
          'Stres belirtilerini izle'
        );
        break;

      default:
        measures.push(
          'Normal bakım sürdür',
          'Haftalık kontroller yap'
        );
    }

    return measures;
  }

  /**
   * Yaprak ıslaklık süresi hesaplama (hastalık riski için)
   */
  calculateLeafWetnessDuration(hourlyData: HourlyWeatherRecord[]): {
    wetnessDurationHours: number;
    diseaseRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    recommendations: string[];
  } {
    let wetHours = 0;

    // Son 24 saatteki yaprak ıslaklık koşullarını analiz et
    for (const data of hourlyData.slice(0, 24)) {
      const humidity = data.relativeHumidity2m || 0;
      const temperature = data.temperature2m || 0;
      const precipitation = data.precipitationMm || 0;

      // Yaprak ıslaklık koşulları:
      // - Nem > 85% ve sıcaklık 5-30°C arası
      // - Yağış var
      // - Çiğ noktası hesaplaması
      if (
        (humidity > 85 && temperature > 5 && temperature < 30) ||
        precipitation > 0
      ) {
        wetHours++;
      }
    }

    let diseaseRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

    if (wetHours > 12) {
      diseaseRisk = 'HIGH';
    } else if (wetHours > 6) {
      diseaseRisk = 'MEDIUM';
    }

    const recommendations = this.generateWetnessRecommendations(wetHours, diseaseRisk);

    return {
      wetnessDurationHours: wetHours,
      diseaseRisk,
      recommendations
    };
  }

  /**
   * Yaprak ıslaklık önerileri
   */
  private generateWetnessRecommendations(
    wetHours: number,
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  ): string[] {
    const recommendations: string[] = [];

    switch (riskLevel) {
      case 'HIGH':
        recommendations.push(
          '🦠 Yüksek hastalık riski!',
          `${wetHours} saat yaprak ıslaklığı`,
          'Fungisit uygulaması planlayın',
          'Havalandırmayı artırın',
          'Koruyucu ilaçlama yapın'
        );
        break;

      case 'MEDIUM':
        recommendations.push(
          '⚠️ Orta seviye hastalık riski',
          'Bitkileri yakından izleyin',
          'Koruyucu önlemler alın',
          'Havalandırma sağlayın'
        );
        break;

      default:
        recommendations.push(
          '✅ Hastalık riski düşük',
          'Normal kontrolleri sürdürün'
        );
    }

    return recommendations;
  }
}

export const windIrrigationService = new WindIrrigationService();