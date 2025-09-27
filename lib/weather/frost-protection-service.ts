// ==========================================
// ❄️ GECE SOĞUĞU VE DON RİSKİ YÖNETİM SİSTEMİ
// ==========================================

import { HourlyWeatherRecord } from './types';

export interface FrostRiskAnalysis {
  frostRiskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  minTemperature: number;
  frostStartHour?: number;
  frostEndHour?: number;
  riskFactors: {
    isCriticalTemperature: boolean;
    isNighttime: boolean;
    hasHighHumidity: boolean;
    hasLowWind: boolean;
    soilTemperature: number;
  };
  irrigationWarning: {
    shouldAvoidIrrigation: boolean;
    safestHours: number[];
    dangerousHours: number[];
    recommendations: string[];
  };
  protectionMeasures: string[];
  cropDamageRisk: {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    vulnerableCrops: string[];
    estimatedDamage: number; // Percentage
  };
}

export interface IrrigationFrostCheck {
  isSafeToIrrigate: boolean;
  currentTemperature: number;
  nextHourTemperature: number;
  soilTemperature: number;
  riskLevel: 'SAFE' | 'CAUTION' | 'AVOID' | 'DANGEROUS';
  timeUntilSafe?: number; // Hours
  recommendations: string[];
  alternativeMethods: string[];
}

export class FrostProtectionService {
  // Kritik sıcaklık eşikleri (°C)
  private readonly TEMPERATURE_THRESHOLDS = {
    FROST_WARNING: 5,      // Don uyarısı
    LIGHT_FROST: 2,        // Hafif don
    MODERATE_FROST: 0,     // Orta don
    SEVERE_FROST: -2,      // Şiddetli don
    CRITICAL_FROST: -5     // Kritik don
  };

  // Ürün hassasiyet seviyeleri
  private readonly CROP_SENSITIVITY = {
    'TOMATO': { threshold: 4, vulnerability: 'HIGH' },
    'PEPPER': { threshold: 4, vulnerability: 'HIGH' },
    'CORN': { threshold: 2, vulnerability: 'MEDIUM' },
    'WHEAT': { threshold: -2, vulnerability: 'LOW' },
    'BARLEY': { threshold: -3, vulnerability: 'LOW' },
    'OATS': { threshold: -2, vulnerability: 'LOW' },
    'BEAN': { threshold: 3, vulnerability: 'HIGH' },
    'CHICKPEA': { threshold: 1, vulnerability: 'MEDIUM' },
    'SUNFLOWER': { threshold: 1, vulnerability: 'MEDIUM' },
    'COTTON': { threshold: 5, vulnerability: 'HIGH' }
  };

  /**
   * Gece soğuğu ve don riskini analiz eder
   */
  analyzeFrostRisk(
    hourlyData: HourlyWeatherRecord[],
    currentTime = new Date()
  ): FrostRiskAnalysis {
    const currentHour = currentTime.getHours();

    // Gece saatleri (20:00 - 08:00) analizi
    const nightHours = this.getNightHoursData(hourlyData, currentHour);
    const minTemp = this.findMinimumTemperature(nightHours);
    const frostPeriod = this.calculateFrostPeriod(nightHours);

    // Risk faktörleri
    const riskFactors = this.calculateRiskFactors(nightHours[0] || {}, minTemp);

    // Risk seviyesi belirleme
    const frostRiskLevel = this.determineFrostRiskLevel(minTemp, riskFactors);

    // Sulama uyarısı
    const irrigationWarning = this.generateIrrigationWarning(
      nightHours,
      frostRiskLevel,
      currentHour
    );

    // Koruma önlemleri
    const protectionMeasures = this.generateProtectionMeasures(frostRiskLevel, minTemp);

    // Ürün hasarı riski
    const cropDamageRisk = this.assessCropDamageRisk(minTemp, frostRiskLevel);

    return {
      frostRiskLevel,
      minTemperature: minTemp,
      frostStartHour: frostPeriod.startHour,
      frostEndHour: frostPeriod.endHour,
      riskFactors,
      irrigationWarning,
      protectionMeasures,
      cropDamageRisk
    };
  }

  /**
   * Sulama öncesi don kontrolü
   */
  checkIrrigationFrostRisk(
    hourlyData: HourlyWeatherRecord[],
    plannedHour?: number
  ): IrrigationFrostCheck {
    const currentHour = plannedHour || new Date().getHours();
    const currentData = hourlyData[0] || {};
    const nextHourData = hourlyData[1] || {};

    const currentTemp = currentData.temperature2m || 0;
    const nextTemp = nextHourData.temperature2m || 0;
    const soilTemp = currentData.soilTemperature0cm || currentTemp;

    // Risk seviyesi belirleme
    let riskLevel: IrrigationFrostCheck['riskLevel'] = 'SAFE';

    if (currentTemp <= this.TEMPERATURE_THRESHOLDS.SEVERE_FROST) {
      riskLevel = 'DANGEROUS';
    } else if (currentTemp <= this.TEMPERATURE_THRESHOLDS.MODERATE_FROST) {
      riskLevel = 'AVOID';
    } else if (currentTemp <= this.TEMPERATURE_THRESHOLDS.LIGHT_FROST) {
      riskLevel = 'CAUTION';
    } else if (currentTemp <= this.TEMPERATURE_THRESHOLDS.FROST_WARNING) {
      riskLevel = 'CAUTION';
    }

    // Gece saatlerinde ek risk
    if (this.isNighttime(currentHour) && currentTemp < 10) {
      if (riskLevel === 'SAFE') riskLevel = 'CAUTION';
    }

    const isSafeToIrrigate = riskLevel === 'SAFE' || riskLevel === 'CAUTION';

    // Güvenli zaman hesaplama
    const timeUntilSafe = this.calculateTimeUntilSafe(hourlyData, currentHour);

    // Öneriler
    const recommendations = this.generateFrostIrrigationRecommendations(
      riskLevel,
      currentTemp,
      nextTemp,
      soilTemp
    );

    // Alternatif yöntemler
    const alternativeMethods = this.generateAlternativeMethods(riskLevel, currentTemp);

    return {
      isSafeToIrrigate,
      currentTemperature: currentTemp,
      nextHourTemperature: nextTemp,
      soilTemperature: soilTemp,
      riskLevel,
      timeUntilSafe,
      recommendations,
      alternativeMethods
    };
  }

  /**
   * Gece saatlerinin verilerini alır
   */
  private getNightHoursData(
    hourlyData: HourlyWeatherRecord[],
    currentHour: number
  ): HourlyWeatherRecord[] {
    const nightData: HourlyWeatherRecord[] = [];

    // Akşam 20:00'dan sabah 08:00'a kadar
    for (let i = 0; i < 24 && i < hourlyData.length; i++) {
      const hour = (currentHour + i) % 24;
      if (this.isNighttime(hour)) {
        nightData.push(hourlyData[i]);
      }
    }

    return nightData;
  }

  /**
   * Gece saati kontrolü (20:00-08:00)
   */
  private isNighttime(hour: number): boolean {
    return hour >= 20 || hour <= 8;
  }

  /**
   * Minimum sıcaklığı bulur
   */
  private findMinimumTemperature(nightData: HourlyWeatherRecord[]): number {
    if (nightData.length === 0) return 0;

    return Math.min(...nightData.map(data => data.temperature2m || 0));
  }

  /**
   * Don periyodunu hesaplar
   */
  private calculateFrostPeriod(nightData: HourlyWeatherRecord[]): {
    startHour?: number;
    endHour?: number;
  } {
    let startHour: number | undefined;
    let endHour: number | undefined;

    for (let i = 0; i < nightData.length; i++) {
      const temp = nightData[i].temperature2m || 0;

      if (temp <= this.TEMPERATURE_THRESHOLDS.LIGHT_FROST) {
        if (startHour === undefined) {
          startHour = i;
        }
        endHour = i;
      }
    }

    return { startHour, endHour };
  }

  /**
   * Risk faktörlerini hesaplar
   */
  private calculateRiskFactors(
    currentData: HourlyWeatherRecord,
    minTemp: number
  ): FrostRiskAnalysis['riskFactors'] {
    const currentHour = new Date().getHours();

    return {
      isCriticalTemperature: minTemp <= this.TEMPERATURE_THRESHOLDS.MODERATE_FROST,
      isNighttime: this.isNighttime(currentHour),
      hasHighHumidity: (currentData.relativeHumidity2m || 0) > 80,
      hasLowWind: (currentData.windSpeed10m || 0) < 5,
      soilTemperature: currentData.soilTemperature0cm || minTemp
    };
  }

  /**
   * Don risk seviyesini belirler
   */
  private determineFrostRiskLevel(
    minTemp: number,
    riskFactors: FrostRiskAnalysis['riskFactors']
  ): FrostRiskAnalysis['frostRiskLevel'] {
    if (minTemp <= this.TEMPERATURE_THRESHOLDS.CRITICAL_FROST) {
      return 'CRITICAL';
    } else if (minTemp <= this.TEMPERATURE_THRESHOLDS.SEVERE_FROST) {
      return 'HIGH';
    } else if (minTemp <= this.TEMPERATURE_THRESHOLDS.MODERATE_FROST) {
      return 'MEDIUM';
    } else if (minTemp <= this.TEMPERATURE_THRESHOLDS.LIGHT_FROST) {
      return 'LOW';
    } else {
      return 'NONE';
    }
  }

  /**
   * Sulama uyarısı oluşturur
   */
  private generateIrrigationWarning(
    nightData: HourlyWeatherRecord[],
    riskLevel: FrostRiskAnalysis['frostRiskLevel'],
    currentHour: number
  ): FrostRiskAnalysis['irrigationWarning'] {
    const shouldAvoidIrrigation = riskLevel === 'MEDIUM' || riskLevel === 'HIGH' || riskLevel === 'CRITICAL';

    // Güvenli saatler (sıcaklık > 5°C)
    const safestHours: number[] = [];
    const dangerousHours: number[] = [];

    for (let i = 0; i < 24; i++) {
      const hour = (currentHour + i) % 24;
      const temp = nightData[i]?.temperature2m || 0;

      if (temp > this.TEMPERATURE_THRESHOLDS.FROST_WARNING) {
        safestHours.push(hour);
      } else if (temp <= this.TEMPERATURE_THRESHOLDS.LIGHT_FROST) {
        dangerousHours.push(hour);
      }
    }

    const recommendations = this.generateIrrigationWarningRecommendations(
      riskLevel,
      shouldAvoidIrrigation
    );

    return {
      shouldAvoidIrrigation,
      safestHours: safestHours.slice(0, 6),
      dangerousHours,
      recommendations
    };
  }

  /**
   * Sulama uyarı önerilerini oluşturur
   */
  private generateIrrigationWarningRecommendations(
    riskLevel: FrostRiskAnalysis['frostRiskLevel'],
    shouldAvoid: boolean
  ): string[] {
    const recommendations: string[] = [];

    switch (riskLevel) {
      case 'CRITICAL':
        recommendations.push(
          '🚨 KRİTİK DON RİSKİ!',
          'TÜM SULAMA İŞLEMLERİNİ DURDURUN',
          'Bitkileri koruma altına alın',
          'Acil koruma önlemleri uygulayın'
        );
        break;

      case 'HIGH':
        recommendations.push(
          '❄️ Yüksek don riski!',
          'Sulama yapmayın - bitkileri dondurir',
          'Sıcak saatleri bekleyin (10:00-15:00)',
          'Damla sulama bile riskli'
        );
        break;

      case 'MEDIUM':
        recommendations.push(
          '⚠️ Orta seviye don riski',
          'Gece sulamasından kaçının',
          'Sabah güneş çıktıktan sonra sulayın',
          'Toprak sıcaklığını kontrol edin'
        );
        break;

      case 'LOW':
        recommendations.push(
          '🌡️ Hafif don riski',
          'Dikkatli sulama yapabilirsiniz',
          'Gündüz saatlerini tercih edin',
          'Toprak nemini fazla artırmayın'
        );
        break;

      default:
        recommendations.push(
          '✅ Don riski yok',
          'Normal sulama programınızı sürdürün'
        );
    }

    return recommendations;
  }

  /**
   * Koruma önlemlerini oluşturur
   */
  private generateProtectionMeasures(
    riskLevel: FrostRiskAnalysis['frostRiskLevel'],
    minTemp: number
  ): string[] {
    const measures: string[] = [];

    switch (riskLevel) {
      case 'CRITICAL':
        measures.push(
          'Acil ısıtma sistemleri kurun',
          'Antifreeze kimyasalları uygulayın',
          'Örtü sistemleri devreye alın',
          'Rüzgar makineleri çalıştırın',
          'Acil koruma bariyerleri kurun'
        );
        break;

      case 'HIGH':
        measures.push(
          'Koruyucu örtüler serin',
          'Isıtma sistemlerini hazırlayın',
          'Rüzgar koruma bariyerleri kurun',
          'Su püskürtme sistemini hazırlayın',
          'Hassas bitkileri koruma altına alın'
        );
        break;

      case 'MEDIUM':
        measures.push(
          'Hafif örtü örtün',
          'Mulçlama yapın',
          'Su toplama alanlarını boşaltın',
          'Rüzgar kesiciler yerleştirin'
        );
        break;

      case 'LOW':
        measures.push(
          'İzleme sistemlerini aktif tutun',
          'Koruma malzemelerini hazır bulundurun',
          'Hava durumunu takip edin'
        );
        break;

      default:
        measures.push('Normal koruma önlemleri yeterli');
    }

    measures.push(`Minimum sıcaklık: ${minTemp}°C`);

    return measures;
  }

  /**
   * Ürün hasarı riskini değerlendirir
   */
  private assessCropDamageRisk(
    minTemp: number,
    riskLevel: FrostRiskAnalysis['frostRiskLevel']
  ): FrostRiskAnalysis['cropDamageRisk'] {
    const vulnerableCrops: string[] = [];
    let estimatedDamage = 0;
    let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

    // Ürün hassasiyetlerini kontrol et
    for (const [crop, sensitivity] of Object.entries(this.CROP_SENSITIVITY)) {
      if (minTemp <= sensitivity.threshold) {
        vulnerableCrops.push(crop);

        // Hasar oranını hesapla
        const tempDiff = sensitivity.threshold - minTemp;
        let cropDamage = 0;

        if (sensitivity.vulnerability === 'HIGH') {
          cropDamage = Math.min(tempDiff * 20, 95);
        } else if (sensitivity.vulnerability === 'MEDIUM') {
          cropDamage = Math.min(tempDiff * 15, 70);
        } else {
          cropDamage = Math.min(tempDiff * 10, 50);
        }

        estimatedDamage = Math.max(estimatedDamage, cropDamage);
      }
    }

    // Risk seviyesi belirleme
    if (estimatedDamage > 80) {
      level = 'CRITICAL';
    } else if (estimatedDamage > 50) {
      level = 'HIGH';
    } else if (estimatedDamage > 20) {
      level = 'MEDIUM';
    }

    return {
      level,
      vulnerableCrops,
      estimatedDamage: Math.round(estimatedDamage)
    };
  }

  /**
   * Güvenli zamana kadar olan süreyi hesaplar
   */
  private calculateTimeUntilSafe(
    hourlyData: HourlyWeatherRecord[],
    currentHour: number
  ): number | undefined {
    for (let i = 1; i < Math.min(hourlyData.length, 24); i++) {
      const temp = hourlyData[i].temperature2m || 0;
      const hour = (currentHour + i) % 24;

      // Güvenli sıcaklık ve gündüz saati
      if (temp > this.TEMPERATURE_THRESHOLDS.FROST_WARNING && !this.isNighttime(hour)) {
        return i;
      }
    }

    return undefined;
  }

  /**
   * Don riski sulama önerilerini oluşturur
   */
  private generateFrostIrrigationRecommendations(
    riskLevel: IrrigationFrostCheck['riskLevel'],
    currentTemp: number,
    nextTemp: number,
    soilTemp: number
  ): string[] {
    const recommendations: string[] = [];

    switch (riskLevel) {
      case 'DANGEROUS':
        recommendations.push(
          '🚨 SULAMA YASAK!',
          'Su bitkiyi donduracak',
          'Sıcaklık yükselene kadar bekleyin',
          'Acil koruma önlemleri alın'
        );
        break;

      case 'AVOID':
        recommendations.push(
          '❄️ Sulama önerilmez',
          'Don riski çok yüksek',
          'Gündüz saatlerini bekleyin',
          'Toprak sıcaklığını ölçün'
        );
        break;

      case 'CAUTION':
        recommendations.push(
          '⚠️ Dikkatli olun',
          'Çok az miktarda sulayın',
          'Toprak sıcaklığını kontrol edin',
          'Hava ısınana kadar beklemek daha iyi'
        );
        break;

      default:
        recommendations.push(
          '✅ Sulama güvenli',
          'Normal sulama yapabilirsiniz'
        );
    }

    recommendations.push(
      `Mevcut: ${currentTemp}°C, Sonraki saat: ${nextTemp}°C`,
      `Toprak sıcaklığı: ${soilTemp}°C`
    );

    return recommendations;
  }

  /**
   * Alternatif yöntemler önerir
   */
  private generateAlternativeMethods(
    riskLevel: IrrigationFrostCheck['riskLevel'],
    currentTemp: number
  ): string[] {
    const methods: string[] = [];

    if (riskLevel === 'DANGEROUS' || riskLevel === 'AVOID') {
      methods.push(
        'Gündüz saatlerinde (10:00-15:00) sulama',
        'Sera içi sıcak su uygulaması',
        'Isıtmalı sulama sistemi',
        'İlkbahar başında erken sulama'
      );
    } else if (riskLevel === 'CAUTION') {
      methods.push(
        'Düşük basınçlı damla sulama',
        'Toprak ısıtması ile birlikte sulama',
        'Gündüz öncesi hafif nemlendireme'
      );
    } else {
      methods.push(
        'Normal sulama yöntemleri',
        'Fıskiye sulama uygun',
        'Damla sulama optimal'
      );
    }

    return methods;
  }
}

export const frostProtectionService = new FrostProtectionService();