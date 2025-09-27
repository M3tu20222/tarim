/**
 * 💧 Irrigation Coefficients Service
 * Ürün bazında sulama katsayıları ve ETc hesaplama sistemi
 * FAO-56 standardına göre evapotranspiration hesaplamaları
 */

interface CropCoefficient {
  name: string;
  displayName: string;
  kc: {
    initial: number;    // Başlangıç dönemi
    development: number; // Gelişim dönemi
    mid: number;        // Orta dönem
    late: number;       // Son dönem
  };
  growthStages: {
    initial: number;    // gün
    development: number; // gün
    mid: number;        // gün
    late: number;       // gün
  };
  rootDepth: number;    // cm
  criticalDepletion: number; // 0-1 arası
  description: string;
}

interface SoilProperties {
  type: 'CLAY' | 'LOAM' | 'SANDY' | 'SILT';
  waterHoldingCapacity: number; // mm/m
  infiltrationRate: number; // mm/hour
  fieldCapacity: number; // %
  wiltingPoint: number; // %
  description: string;
}

interface IrrigationNeed {
  cropETc: number;           // mm/day
  referenceET0: number;      // mm/day
  effectiveRainfall: number; // mm/day
  netIrrigation: number;     // mm/day
  grossIrrigation: number;   // mm/day (efficiency losses included)
  irrigationFrequency: number; // days
  applicationDepth: number;   // mm per irrigation
  seasonalNeed: number;      // mm total
  recommendations: string[];
}

export class IrrigationCoefficientsService {
  private cropCoefficients: Record<string, CropCoefficient> = {
    wheat: {
      name: 'wheat',
      displayName: 'Buğday',
      kc: { initial: 0.3, development: 0.7, mid: 1.15, late: 0.4 },
      growthStages: { initial: 15, development: 25, mid: 50, late: 30 },
      rootDepth: 150,
      criticalDepletion: 0.55,
      description: 'Kış buğdayı - soğuğa dayanıklı'
    },
    corn: {
      name: 'corn',
      displayName: 'Mısır',
      kc: { initial: 0.3, development: 0.7, mid: 1.20, late: 0.6 },
      growthStages: { initial: 20, development: 35, mid: 40, late: 30 },
      rootDepth: 180,
      criticalDepletion: 0.55,
      description: 'Tatlı mısır - yüksek su ihtiyacı'
    },
    sunflower: {
      name: 'sunflower',
      displayName: 'Ayçiçeği',
      kc: { initial: 0.35, development: 0.7, mid: 1.00, late: 0.35 },
      growthStages: { initial: 25, development: 35, mid: 45, late: 25 },
      rootDepth: 120,
      criticalDepletion: 0.45,
      description: 'Yağlık ayçiçeği - orta su ihtiyacı'
    },
    tomato: {
      name: 'tomato',
      displayName: 'Domates',
      kc: { initial: 0.6, development: 0.8, mid: 1.15, late: 0.7 },
      growthStages: { initial: 30, development: 40, mid: 40, late: 15 },
      rootDepth: 70,
      criticalDepletion: 0.40,
      description: 'Salçalık domates - sık sulama gerekli'
    },
    potato: {
      name: 'potato',
      displayName: 'Patates',
      kc: { initial: 0.5, development: 0.75, mid: 1.10, late: 0.85 },
      growthStages: { initial: 25, development: 30, mid: 30, late: 30 },
      rootDepth: 60,
      criticalDepletion: 0.35,
      description: 'Sofralık patates - kritik nem seviyesi'
    },
    apple: {
      name: 'apple',
      displayName: 'Elma',
      kc: { initial: 0.45, development: 0.6, mid: 0.95, late: 0.75 },
      growthStages: { initial: 30, development: 50, mid: 90, late: 30 },
      rootDepth: 200,
      criticalDepletion: 0.50,
      description: 'Meyve ağacı - derin kök sistemi'
    },
    grape: {
      name: 'grape',
      displayName: 'Üzüm',
      kc: { initial: 0.3, development: 0.5, mid: 0.70, late: 0.45 },
      growthStages: { initial: 20, development: 40, mid: 60, late: 40 },
      rootDepth: 150,
      criticalDepletion: 0.45,
      description: 'Şaraplık üzüm - düşük su ihtiyacı'
    },
    cotton: {
      name: 'cotton',
      displayName: 'Pamuk',
      kc: { initial: 0.35, development: 0.7, mid: 1.15, late: 0.5 },
      growthStages: { initial: 30, development: 50, mid: 55, late: 45 },
      rootDepth: 170,
      criticalDepletion: 0.65,
      description: 'Lifli pamuk - yüksek su ihtiyacı'
    },
    rice: {
      name: 'rice',
      displayName: 'Pirinç',
      kc: { initial: 1.05, development: 1.10, mid: 1.20, late: 0.90 },
      growthStages: { initial: 30, development: 30, mid: 60, late: 30 },
      rootDepth: 50,
      criticalDepletion: 0.20,
      description: 'Su altı pirinci - sürekli su gerekli'
    },
    cucumber: {
      name: 'cucumber',
      displayName: 'Salatalık',
      kc: { initial: 0.6, development: 0.8, mid: 1.00, late: 0.75 },
      growthStages: { initial: 20, development: 30, mid: 30, late: 15 },
      rootDepth: 80,
      criticalDepletion: 0.50,
      description: 'Sera salatalığı - yüksek nem gerekli'
    }
  };

  private soilProperties: Record<string, SoilProperties> = {
    CLAY: {
      type: 'CLAY',
      waterHoldingCapacity: 200, // mm/m
      infiltrationRate: 2, // mm/hour
      fieldCapacity: 45,
      wiltingPoint: 25,
      description: 'Kil toprak - yüksek su tutma, yavaş drenaj'
    },
    LOAM: {
      type: 'LOAM',
      waterHoldingCapacity: 170, // mm/m
      infiltrationRate: 8, // mm/hour
      fieldCapacity: 35,
      wiltingPoint: 15,
      description: 'Balçık toprak - ideal su tutma ve drenaj'
    },
    SANDY: {
      type: 'SANDY',
      waterHoldingCapacity: 100, // mm/m
      infiltrationRate: 20, // mm/hour
      fieldCapacity: 25,
      wiltingPoint: 8,
      description: 'Kumlu toprak - düşük su tutma, hızlı drenaj'
    },
    SILT: {
      type: 'SILT',
      waterHoldingCapacity: 180, // mm/m
      infiltrationRate: 5, // mm/hour
      fieldCapacity: 40,
      wiltingPoint: 18,
      description: 'Siltli toprak - yüksek su tutma, orta drenaj'
    }
  };

  /**
   * 🌱 Ürün Kc katsayısını hesaplama (DAP - Days After Planting)
   */
  calculateKc(cropType: string, daysAfterPlanting: number): number {
    const crop = this.getCropCoefficient(cropType);
    if (!crop) return 1.0; // Default Kc

    const stages = crop.growthStages;
    let currentStage: keyof typeof crop.kc;
    let stageProgress: number;

    if (daysAfterPlanting <= stages.initial) {
      currentStage = 'initial';
      stageProgress = daysAfterPlanting / stages.initial;
    } else if (daysAfterPlanting <= stages.initial + stages.development) {
      currentStage = 'development';
      const stageStart = stages.initial;
      stageProgress = (daysAfterPlanting - stageStart) / stages.development;
    } else if (daysAfterPlanting <= stages.initial + stages.development + stages.mid) {
      currentStage = 'mid';
      stageProgress = 1.0; // Mid stage is constant
    } else {
      currentStage = 'late';
      const stageStart = stages.initial + stages.development + stages.mid;
      stageProgress = Math.min(1.0, (daysAfterPlanting - stageStart) / stages.late);
    }

    // Linear interpolation for development and late stages
    if (currentStage === 'development') {
      return crop.kc.initial + (crop.kc.mid - crop.kc.initial) * stageProgress;
    } else if (currentStage === 'late') {
      return crop.kc.mid + (crop.kc.late - crop.kc.mid) * stageProgress;
    } else {
      return crop.kc[currentStage];
    }
  }

  /**
   * 💧 Sulama ihtiyacı hesaplama
   */
  calculateIrrigationNeed(params: {
    cropType: string;
    daysAfterPlanting: number;
    referenceET0: number; // mm/day
    soilType: string;
    rainfall: number; // mm/day
    irrigationEfficiency?: number; // 0-1
    climateAdjustment?: number; // 0-1
  }): IrrigationNeed {
    const {
      cropType,
      daysAfterPlanting,
      referenceET0,
      soilType,
      rainfall,
      irrigationEfficiency = 0.85,
      climateAdjustment = 1.0
    } = params;

    const crop = this.getCropCoefficient(cropType);
    const soil = this.getSoilProperties(soilType);

    if (!crop || !soil) {
      throw new Error(`Bilinmeyen ürün tipi veya toprak tipi: ${cropType}, ${soilType}`);
    }

    // 1. Kc katsayısını hesapla
    const kc = this.calculateKc(cropType, daysAfterPlanting);

    // 2. ETc (Crop Evapotranspiration) hesapla
    const cropETc = referenceET0 * kc * climateAdjustment;

    // 3. Etkili yağış hesapla (USDA SCS method)
    const effectiveRainfall = this.calculateEffectiveRainfall(rainfall);

    // 4. Net sulama ihtiyacı
    const netIrrigation = Math.max(0, cropETc - effectiveRainfall);

    // 5. Brüt sulama ihtiyacı (efficiency losses)
    const grossIrrigation = netIrrigation / irrigationEfficiency;

    // 6. Sulama sıklığı hesapla
    const irrigationFrequency = this.calculateIrrigationFrequency(
      crop,
      soil,
      netIrrigation
    );

    // 7. Uygulama derinliği
    const applicationDepth = netIrrigation * irrigationFrequency;

    // 8. Sezonluk toplam ihtiyaç
    const totalGrowthDays = Object.values(crop.growthStages).reduce((sum, days) => sum + days, 0);
    const seasonalNeed = cropETc * totalGrowthDays;

    // 9. Öneriler oluştur
    const recommendations = this.generateIrrigationRecommendations({
      crop,
      soil,
      netIrrigation,
      grossIrrigation,
      irrigationFrequency,
      applicationDepth,
      daysAfterPlanting
    });

    return {
      cropETc,
      referenceET0,
      effectiveRainfall,
      netIrrigation,
      grossIrrigation,
      irrigationFrequency,
      applicationDepth,
      seasonalNeed,
      recommendations
    };
  }

  /**
   * 🌧️ Etkili yağış hesaplama (USDA-SCS method)
   */
  private calculateEffectiveRainfall(dailyRainfall: number): number {
    if (dailyRainfall <= 0) return 0;
    if (dailyRainfall < 5) return dailyRainfall * 0.9;
    if (dailyRainfall < 15) return 4.5 + (dailyRainfall - 5) * 0.8;
    return 12.5 + (dailyRainfall - 15) * 0.6;
  }

  /**
   * 📅 Sulama sıklığı hesaplama
   */
  private calculateIrrigationFrequency(
    crop: CropCoefficient,
    soil: SoilProperties,
    netIrrigation: number
  ): number {
    if (netIrrigation <= 0) return 0;

    // Available water capacity (AWC)
    const awc = soil.waterHoldingCapacity * (crop.rootDepth / 100); // mm

    // Management Allowed Depletion (MAD)
    const mad = awc * crop.criticalDepletion;

    // Irrigation frequency (days)
    const frequency = Math.max(1, Math.floor(mad / netIrrigation));

    // Soil type adjustments
    if (soil.type === 'SANDY') return Math.max(1, frequency - 1);
    if (soil.type === 'CLAY') return frequency + 1;

    return frequency;
  }

  /**
   * 💡 Sulama önerileri oluşturma
   */
  private generateIrrigationRecommendations(params: {
    crop: CropCoefficient;
    soil: SoilProperties;
    netIrrigation: number;
    grossIrrigation: number;
    irrigationFrequency: number;
    applicationDepth: number;
    daysAfterPlanting: number;
  }): string[] {
    const { crop, soil, netIrrigation, grossIrrigation, irrigationFrequency, applicationDepth, daysAfterPlanting } = params;
    const recommendations: string[] = [];

    // Sulama ihtiyacı değerlendirmesi
    if (netIrrigation < 2) {
      recommendations.push('✅ Düşük sulama ihtiyacı - mevcut nem yeterli');
    } else if (netIrrigation < 5) {
      recommendations.push('⚠️ Orta düzeyde sulama gerekli');
    } else {
      recommendations.push('🚨 Yüksek sulama ihtiyacı - acil müdahale');
    }

    // Gelişim dönemine göre öneriler
    const totalDays = Object.values(crop.growthStages).reduce((sum, days) => sum + days, 0);
    const stagePercentage = (daysAfterPlanting / totalDays) * 100;

    if (stagePercentage < 25) {
      recommendations.push('🌱 Başlangıç dönemi - sık ve az sulama uygulayın');
    } else if (stagePercentage < 50) {
      recommendations.push('📈 Gelişim dönemi - sulama miktarını artırın');
    } else if (stagePercentage < 75) {
      recommendations.push('🌾 Kritik dönem - su stresinden kaçının');
    } else {
      recommendations.push('🍂 Olgunluk dönemi - sulama miktarını azaltın');
    }

    // Toprak tipine göre öneriler
    if (soil.type === 'SANDY') {
      recommendations.push('🏖️ Kumlu toprak - sık sulama gerekli (günde 1-2 kez)');
    } else if (soil.type === 'CLAY') {
      recommendations.push('🧱 Killi toprak - yavaş ve derin sulama uygulayın');
    } else {
      recommendations.push('🌍 İdeal toprak - standart sulama programı uygulayın');
    }

    // Sulama zamanlaması önerileri
    if (irrigationFrequency <= 1) {
      recommendations.push('⏰ Günlük sulama gerekli');
    } else if (irrigationFrequency <= 3) {
      recommendations.push(`⏰ ${irrigationFrequency} günde bir sulama yapın`);
    } else {
      recommendations.push(`⏰ Haftada 1-2 kez sulama yeterli`);
    }

    // Uygulama derinliği önerileri
    if (applicationDepth > 50) {
      recommendations.push('💧 Derin sulama - yüzey akış riskine dikkat');
    } else if (applicationDepth < 10) {
      recommendations.push('💧 Hafif sulama - toprak nemini kontrol edin');
    }

    return recommendations;
  }

  /**
   * 🔍 Ürün katsayısı getirme
   */
  getCropCoefficient(cropType: string): CropCoefficient | null {
    const normalizedType = cropType.toLowerCase().trim();
    return this.cropCoefficients[normalizedType] || null;
  }

  /**
   * 🔍 Toprak özelliklerini getirme
   */
  getSoilProperties(soilType: string): SoilProperties | null {
    const normalizedType = soilType.toUpperCase() as keyof typeof this.soilProperties;
    return this.soilProperties[normalizedType] || null;
  }

  /**
   * 📊 Mevcut ürün listesi getirme
   */
  getAvailableCrops(): Array<{ name: string; displayName: string; description: string }> {
    return Object.values(this.cropCoefficients).map(crop => ({
      name: crop.name,
      displayName: crop.displayName,
      description: crop.description
    }));
  }

  /**
   * 📊 Mevcut toprak tipleri getirme
   */
  getAvailableSoilTypes(): Array<{ type: string; description: string }> {
    return Object.values(this.soilProperties).map(soil => ({
      type: soil.type,
      description: soil.description
    }));
  }

  /**
   * 📈 Sezonluk sulama takvimi oluşturma
   */
  generateSeasonalSchedule(params: {
    cropType: string;
    plantingDate: Date;
    soilType: string;
    avgET0: number;
    avgRainfall: number;
  }): Array<{
    date: Date;
    daysAfterPlanting: number;
    stage: string;
    kc: number;
    irrigationNeed: number;
    recommendations: string[];
  }> {
    const { cropType, plantingDate, soilType, avgET0, avgRainfall } = params;
    const crop = this.getCropCoefficient(cropType);

    if (!crop) return [];

    const schedule = [];
    const totalDays = Object.values(crop.growthStages).reduce((sum, days) => sum + days, 0);

    for (let day = 1; day <= totalDays; day += 7) { // Weekly schedule
      const currentDate = new Date(plantingDate);
      currentDate.setDate(currentDate.getDate() + day);

      const irrigationNeed = this.calculateIrrigationNeed({
        cropType,
        daysAfterPlanting: day,
        referenceET0: avgET0,
        soilType,
        rainfall: avgRainfall
      });

      let stage = 'initial';
      if (day > crop.growthStages.initial) stage = 'development';
      if (day > crop.growthStages.initial + crop.growthStages.development) stage = 'mid';
      if (day > crop.growthStages.initial + crop.growthStages.development + crop.growthStages.mid) stage = 'late';

      schedule.push({
        date: currentDate,
        daysAfterPlanting: day,
        stage,
        kc: this.calculateKc(cropType, day),
        irrigationNeed: irrigationNeed.netIrrigation,
        recommendations: irrigationNeed.recommendations.slice(0, 2) // İlk 2 öneri
      });
    }

    return schedule;
  }
}

// Singleton instance
export const irrigationCoefficientsService = new IrrigationCoefficientsService();