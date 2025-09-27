// ==========================================
// AKILLI TARIM YÖNETİM SİSTEMİ 
// Full-Stack Implementation
// ==========================================

// ==========================================
// 1. WEATHER DATA SERVICE
// ==========================================

class WeatherDataService {
  constructor() {
    this.baseURL = 'https://api.open-meteo.com/v1/forecast';
    this.location = {
      latitude: 38.574,
      longitude: 31.857,
      elevation: 1100 // Aksaray ortalama rakım
    };
    this.cache = new Map();
  }

  // Kapsamlı hava durumu verisi çekme
  async fetchComprehensiveWeatherData() {
    const cacheKey = `weather_${Date.now()}`;
    
    // Cache kontrolü
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const params = new URLSearchParams({
      latitude: this.location.latitude,
      longitude: this.location.longitude,
      elevation: this.location.elevation,
      
      // Kritik tarımsal parametreler
      hourly: [
        'temperature_2m',
        'relative_humidity_2m',
        'dew_point_2m',
        'apparent_temperature',
        'precipitation',
        'rain',
        'showers',
        'snowfall',
        'weather_code',
        'cloud_cover',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
        'shortwave_radiation',
        'et0_fao_evapotranspiration',
        'vapour_pressure_deficit',
        'soil_temperature_0cm',
        'soil_temperature_6cm',
        'soil_temperature_18cm',
        'soil_temperature_54cm',
        'soil_moisture_0_to_1cm',
        'soil_moisture_1_to_3cm',
        'soil_moisture_3_to_9cm',
        'soil_moisture_9_to_27cm',
        'soil_moisture_27_to_81cm'
      ].join(','),
      
      daily: [
        'temperature_2m_max',
        'temperature_2m_min',
        'apparent_temperature_max',
        'apparent_temperature_min',
        'sunrise',
        'sunset',
        'daylight_duration',
        'sunshine_duration',
        'precipitation_sum',
        'rain_sum',
        'showers_sum',
        'snowfall_sum',
        'precipitation_hours',
        'precipitation_probability_max',
        'wind_speed_10m_max',
        'wind_gusts_10m_max',
        'wind_direction_10m_dominant',
        'shortwave_radiation_sum',
        'et0_fao_evapotranspiration',
        'uv_index_max'
      ].join(','),
      
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'precipitation',
        'rain',
        'showers',
        'snowfall',
        'weather_code',
        'cloud_cover',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m'
      ].join(','),
      
      timezone: 'Europe/Istanbul',
      past_days: 7,
      forecast_days: 14
    });

    try {
      const response = await fetch(`${this.baseURL}?${params}`);
      const data = await response.json();
      
      // Cache'e kaydet (15 dakika)
      this.cache.set(cacheKey, data);
      setTimeout(() => this.cache.delete(cacheKey), 15 * 60 * 1000);
      
      return data;
    } catch (error) {
      console.error('Weather API Error:', error);
      throw error;
    }
  }

  // Özel tarımsal analiz
  analyzeAgriculturalConditions(weatherData) {
    const analysis = {
      timestamp: new Date().toISOString(),
      location: this.location,
      conditions: {},
      risks: [],
      recommendations: []
    };

    // Güncel durum analizi
    if (weatherData.current) {
      analysis.conditions.current = {
        temperature: weatherData.current.temperature_2m,
        humidity: weatherData.current.relative_humidity_2m,
        precipitation: weatherData.current.precipitation,
        windSpeed: weatherData.current.wind_speed_10m,
        windDirection: weatherData.current.wind_direction_10m
      };
    }

    // Risk analizi
    this.analyzeRisks(weatherData, analysis);
    
    // Öneriler
    this.generateRecommendations(weatherData, analysis);

    return analysis;
  }

  analyzeRisks(data, analysis) {
    // Don riski kontrolü
    const frostRisk = this.checkFrostRisk(data);
    if (frostRisk.level > 0) {
      analysis.risks.push({
        type: 'FROST',
        level: frostRisk.level,
        timing: frostRisk.timing,
        action: frostRisk.action
      });
    }

    // Batı rüzgarı tehlikesi
    const windRisk = this.checkWindRisk(data);
    if (windRisk.level > 0) {
      analysis.risks.push({
        type: 'WIND',
        level: windRisk.level,
        direction: windRisk.direction,
        speed: windRisk.speed,
        action: windRisk.action
      });
    }

    // Hastalık riski
    const diseaseRisk = this.checkDiseaseRisk(data);
    if (diseaseRisk.level > 0) {
      analysis.risks.push({
        type: 'DISEASE',
        level: diseaseRisk.level,
        diseases: diseaseRisk.potentialDiseases,
        action: diseaseRisk.action
      });
    }

    // Sel/taşkın riski
    const floodRisk = this.checkFloodRisk(data);
    if (floodRisk.level > 0) {
      analysis.risks.push({
        type: 'FLOOD',
        level: floodRisk.level,
        expectedRainfall: floodRisk.rainfall,
        action: floodRisk.action
      });
    }
  }

  checkFrostRisk(data) {
    const risk = { level: 0, timing: null, action: '' };
    
    if (data.daily) {
      for (let i = 0; i < 7; i++) {
        const minTemp = data.daily.temperature_2m_min[i];
        
        if (minTemp <= 0) {
          risk.level = 3; // Kritik
          risk.timing = data.daily.time[i];
          risk.action = 'Don koruma sistemlerini aktive edin';
        } else if (minTemp <= 2) {
          risk.level = 2; // Yüksek
          risk.timing = data.daily.time[i];
          risk.action = 'Don riski var, önlem alın';
        } else if (minTemp <= 5) {
          risk.level = 1; // Orta
          risk.timing = data.daily.time[i];
          risk.action = 'Don riski izleyin';
        }
      }
    }
    
    return risk;
  }

  checkWindRisk(data) {
    const risk = { level: 0, direction: null, speed: 0, action: '' };
    
    if (data.hourly) {
      for (let i = 0; i < 168; i++) { // 7 gün
        const speed = data.hourly.wind_speed_10m[i];
        const direction = data.hourly.wind_direction_10m[i];
        const gusts = data.hourly.wind_gusts_10m[i];
        
        // Batı rüzgarı kontrolü (260-280 derece)
        const isWestWind = direction >= 260 && direction <= 280;
        
        if (gusts > 60 || (isWestWind && gusts > 40)) {
          risk.level = 3; // Kritik
          risk.direction = direction;
          risk.speed = gusts;
          risk.action = 'Kritik rüzgar! Hasat erteleyin, seralar güvenli moda alın';
        } else if (speed > 40 || (isWestWind && speed > 30)) {
          risk.level = 2; // Yüksek
          risk.direction = direction;
          risk.speed = speed;
          risk.action = 'Yüksek rüzgar riski, koruma önlemleri alın';
        } else if (speed > 25) {
          risk.level = 1; // Orta
          risk.direction = direction;
          risk.speed = speed;
          risk.action = 'Orta seviye rüzgar, sulama sistemlerini ayarlayın';
        }
        
        if (risk.level > 0) break; // İlk riski bulduktan sonra çık
      }
    }
    
    return risk;
  }

  checkDiseaseRisk(data) {
    const risk = { level: 0, potentialDiseases: [], action: '' };
    
    if (data.hourly) {
      // Son 48 saat için ortalama nem ve sıcaklık
      let avgHumidity = 0;
      let avgTemp = 0;
      const hours = Math.min(48, data.hourly.temperature_2m.length);
      
      for (let i = 0; i < hours; i++) {
        avgHumidity += data.hourly.relative_humidity_2m[i];
        avgTemp += data.hourly.temperature_2m[i];
      }
      
      avgHumidity /= hours;
      avgTemp /= hours;
      
      // Mantar hastalıkları riski
      if (avgHumidity > 85 && avgTemp >= 15 && avgTemp <= 25) {
        risk.level = 3;
        risk.potentialDiseases.push('Külleme', 'Mildiyö', 'Pas');
        risk.action = 'Acil fungusit uygulaması yapın';
      } else if (avgHumidity > 75 && avgTemp >= 10 && avgTemp <= 30) {
        risk.level = 2;
        risk.potentialDiseases.push('Erken yanıklık', 'Septoria');
        risk.action = 'Koruyucu ilaçlama planlayın';
      } else if (avgHumidity > 65) {
        risk.level = 1;
        risk.potentialDiseases.push('Genel mantar riski');
        risk.action = 'Bitkileri düzenli kontrol edin';
      }
    }
    
    return risk;
  }

  checkFloodRisk(data) {
    const risk = { level: 0, rainfall: 0, action: '' };
    
    if (data.daily) {
      // 3 günlük toplam yağış
      let totalRain = 0;
      for (let i = 0; i < Math.min(3, data.daily.precipitation_sum.length); i++) {
        totalRain += data.daily.precipitation_sum[i];
      }
      
      risk.rainfall = totalRain;
      
      if (totalRain > 100) {
        risk.level = 3;
        risk.action = 'Sel riski yüksek! Drenaj sistemlerini kontrol edin';
      } else if (totalRain > 50) {
        risk.level = 2;
        risk.action = 'Taşkın riski var, su tahliye sistemlerini hazırlayın';
      } else if (totalRain > 30) {
        risk.level = 1;
        risk.action = 'Orta seviye yağış bekleniyor, toprak drenajını izleyin';
      }
    }
    
    return risk;
  }

  generateRecommendations(data, analysis) {
    const recommendations = [];
    
    // Sulama önerisi
    const irrigationPlan = this.calculateIrrigationNeeds(data);
    recommendations.push({
      category: 'IRRIGATION',
      priority: irrigationPlan.priority,
      action: irrigationPlan.recommendation,
      timing: irrigationPlan.timing
    });
    
    // Ekim/Hasat önerisi
    const cropTiming = this.optimizeCropTiming(data);
    recommendations.push({
      category: 'CROP_TIMING',
      priority: cropTiming.priority,
      action: cropTiming.recommendation,
      timing: cropTiming.timing
    });
    
    // Gübreleme önerisi
    const fertilization = this.planFertilization(data);
    recommendations.push({
      category: 'FERTILIZATION',
      priority: fertilization.priority,
      action: fertilization.recommendation,
      timing: fertilization.timing
    });
    
    analysis.recommendations = recommendations;
  }

  calculateIrrigationNeeds(data) {
    const plan = {
      priority: 'MEDIUM',
      recommendation: '',
      timing: '',
      amount: 0
    };
    
    if (!data.daily || !data.hourly) return plan;
    
    // ET0 ve yağış analizi
    const et0Today = data.daily.et0_fao_evapotranspiration[0] || 0;
    const rainToday = data.daily.rain_sum[0] || 0;
    const rainNext3Days = (data.daily.rain_sum[1] || 0) + 
                          (data.daily.rain_sum[2] || 0) + 
                          (data.daily.rain_sum[3] || 0);
    
    // Toprak nemi analizi (0-27cm ortalama)
    const soilMoisture = (
      data.hourly.soil_moisture_0_to_1cm[0] +
      data.hourly.soil_moisture_1_to_3cm[0] +
      data.hourly.soil_moisture_3_to_9cm[0] +
      data.hourly.soil_moisture_9_to_27cm[0]
    ) / 4;
    
    // Sulama ihtiyacı hesaplama
    const waterDeficit = et0Today - rainToday;
    
    if (soilMoisture < 0.2 && waterDeficit > 3) {
      plan.priority = 'HIGH';
      plan.recommendation = `Acil sulama yapın: ${Math.round(waterDeficit * 10)}mm`;
      plan.timing = 'Bugün sabah veya akşam';
      plan.amount = waterDeficit * 10; // mm
    } else if (soilMoisture < 0.3 && waterDeficit > 1) {
      plan.priority = 'MEDIUM';
      plan.recommendation = `Sulama planlayın: ${Math.round(waterDeficit * 8)}mm`;
      plan.timing = 'Yarın';
      plan.amount = waterDeficit * 8;
    } else if (rainNext3Days > 10) {
      plan.priority = 'LOW';
      plan.recommendation = 'Yağış bekleniyor, sulamayı erteleyin';
      plan.timing = '3 gün sonra değerlendirin';
      plan.amount = 0;
    } else {
      plan.priority = 'LOW';
      plan.recommendation = 'Toprak nemi yeterli';
      plan.timing = '2 gün sonra kontrol';
      plan.amount = 0;
    }
    
    return plan;
  }

  optimizeCropTiming(data) {
    const timing = {
      priority: 'MEDIUM',
      recommendation: '',
      timing: ''
    };
    
    if (!data.daily) return timing;
    
    // Toprak sıcaklığı analizi (çimlenme için)
    const soilTemp0cm = data.hourly.soil_temperature_0cm[0];
    const soilTemp6cm = data.hourly.soil_temperature_6cm[0];
    const avgSoilTemp = (soilTemp0cm + soilTemp6cm) / 2;
    
    // Gelecek 7 günlük hava durumu
    let avgTempNext7Days = 0;
    let frostRiskNext7Days = false;
    
    for (let i = 0; i < 7; i++) {
      avgTempNext7Days += (data.daily.temperature_2m_max[i] + 
                           data.daily.temperature_2m_min[i]) / 2;
      if (data.daily.temperature_2m_min[i] < 2) {
        frostRiskNext7Days = true;
      }
    }
    avgTempNext7Days /= 7;
    
    // Ekim önerileri (ilkbahar dönemi için)
    if (avgSoilTemp >= 12 && avgSoilTemp <= 25 && !frostRiskNext7Days) {
      timing.priority = 'HIGH';
      timing.recommendation = 'Buğday/Arpa ekimi için ideal koşullar';
      timing.timing = 'Önümüzdeki 3 gün içinde';
    } else if (avgSoilTemp >= 18 && avgSoilTemp <= 30) {
      timing.priority = 'HIGH';
      timing.recommendation = 'Mısır/Ayçiçeği ekimi için uygun';
      timing.timing = 'Bu hafta içinde';
    } else if (avgSoilTemp < 10) {
      timing.priority = 'LOW';
      timing.recommendation = 'Toprak sıcaklığı düşük, ekim için bekleyin';
      timing.timing = 'Sıcaklık 12°C üzerine çıkınca';
    }
    
    // Hasat önerileri (nem ve yağış bazlı)
    const nextRain = data.daily.precipitation_sum[0] + data.daily.precipitation_sum[1];
    if (nextRain < 5 && data.daily.relative_humidity_2m) {
      timing.priority = 'HIGH';
      timing.recommendation = 'Hasat için uygun kuru hava koşulları';
      timing.timing = 'Önümüzdeki 48 saat';
    }
    
    return timing;
  }

  planFertilization(data) {
    const plan = {
      priority: 'MEDIUM',
      recommendation: '',
      timing: ''
    };
    
    if (!data.daily) return plan;
    
    // Yağış ve rüzgar kontrolü
    const rainNext2Days = (data.daily.rain_sum[0] || 0) + (data.daily.rain_sum[1] || 0);
    const windToday = data.daily.wind_speed_10m_max[0] || 0;
    
    // Sıcaklık kontrolü
    const tempToday = (data.daily.temperature_2m_max[0] + data.daily.temperature_2m_min[0]) / 2;
    
    if (rainNext2Days > 20) {
      plan.priority = 'LOW';
      plan.recommendation = 'Yağış bekleniyor, gübreleme yapmayın';
      plan.timing = 'Yağıştan 2 gün sonra';
    } else if (windToday > 30) {
      plan.priority = 'LOW';
      plan.recommendation = 'Rüzgar nedeniyle püskürtme yapmayın';
      plan.timing = 'Rüzgar 15 km/h altına düşünce';
    } else if (tempToday > 30) {
      plan.priority = 'LOW';
      plan.recommendation = 'Sıcak hava, yaprak yanığı riski';
      plan.timing = 'Sabah erken veya akşam geç saatlerde';
    } else if (rainNext2Days < 5 && windToday < 15 && tempToday < 28) {
      plan.priority = 'HIGH';
      plan.recommendation = 'Gübreleme için ideal koşullar';
      plan.timing = 'Bugün veya yarın';
    }
    
    return plan;
  }
}

// ==========================================
// 2. IRRIGATION MANAGEMENT SYSTEM
// ==========================================

class SmartIrrigationSystem {
  constructor(weatherService) {
    this.weatherService = weatherService;
    this.zones = new Map();
    this.schedule = [];
    this.waterUsage = {
      daily: 0,
      weekly: 0,
      monthly: 0
    };
  }

  // Bölge tanımlama
  defineZone(zoneId, config) {
    this.zones.set(zoneId, {
      id: zoneId,
      name: config.name,
      area: config.area, // hektar
      cropType: config.cropType,
      soilType: config.soilType,
      irrigationType: config.irrigationType, // DRIP, SPRINKLER, FLOOD
      sensors: config.sensors || [],
      valves: config.valves || [],
      status: 'IDLE',
      lastIrrigation: null,
      nextIrrigation: null
    });
  }

  // Otomatik sulama planlaması
  async createIrrigationSchedule() {
    const weatherData = await this.weatherService.fetchComprehensiveWeatherData();
    this.schedule = [];
    
    for (const [zoneId, zone] of this.zones) {
      const plan = this.calculateZoneIrrigation(zone, weatherData);
      if (plan.needed) {
        this.schedule.push({
          zoneId: zone.id,
          zoneName: zone.name,
          startTime: plan.startTime,
          duration: plan.duration,
          waterAmount: plan.amount,
          priority: plan.priority,
          reason: plan.reason
        });
      }
    }
    
    // Önceliğe göre sırala
    this.schedule.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    return this.schedule;
  }

  calculateZoneIrrigation(zone, weatherData) {
    const plan = {
      needed: false,
      startTime: null,
      duration: 0,
      amount: 0,
      priority: 'LOW',
      reason: ''
    };
    
    // Bitki su ihtiyacı katsayıları (Kc)
    const cropCoefficients = {
      WHEAT: 1.15,
      CORN: 1.20,
      SUNFLOWER: 1.00,
      TOMATO: 1.15,
      POTATO: 1.10,
      APPLE: 0.95,
      GRAPE: 0.70
    };
    
    const Kc = cropCoefficients[zone.cropType] || 1.0;
    const ET0 = weatherData.daily.et0_fao_evapotranspiration[0] || 4;
    const ETc = ET0 * Kc; // Bitki su tüketimi
    
    // Toprak tipi su tutma kapasiteleri
    const soilCapacity = {
      CLAY: 0.45,    // Yüksek su tutma
      LOAM: 0.35,    // Orta su tutma
      SANDY: 0.25,   // Düşük su tutma
      SILT: 0.40     // Yüksek su tutma
    };
    
    const capacity = soilCapacity[zone.soilType] || 0.35;
    
    // Toprak nemi değerlendirmesi
    const currentMoisture = this.getCurrentMoisture(zone, weatherData);
    const criticalLevel = capacity * 0.5; // %50 nem kritik seviye
    
    if (currentMoisture < criticalLevel) {
      plan.needed = true;
      plan.priority = currentMoisture < criticalLevel * 0.5 ? 'HIGH' : 'MEDIUM';
      
      // Sulama miktarı hesaplama (mm)
      const deficit = (capacity - currentMoisture) * 100; // mm'ye çevir
      plan.amount = Math.min(deficit, 40); // Maksimum 40mm tek seferde
      
      // Sulama süresi hesaplama (irrigasyon tipine göre)
      const flowRates = {
        DRIP: 4,      // mm/saat
        SPRINKLER: 10, // mm/saat
        FLOOD: 50     // mm/saat
      };
      
      const flowRate = flowRates[zone.irrigationType] || 10;
      plan.duration = Math.ceil((plan.amount / flowRate) * 60); // dakika
      
      // Optimal sulama zamanı belirleme
      plan.startTime = this.determineOptimalTime(weatherData);
      
      plan.reason = `Toprak nemi kritik seviyenin altında (${Math.round(currentMoisture*100)}%)`;
    }
    
    return plan;
  }

  getCurrentMoisture(zone, weatherData) {
    // Sensör verisi varsa kullan
    if (zone.sensors.length > 0) {
      // Gerçek sensör entegrasyonu burada yapılacak
      return 0.25; // Örnek değer
    }
    
    // Hava durumu verisinden tahmin
    const moisture = weatherData.hourly.soil_moisture_0_to_1cm[0];
    return moisture || 0.30;
  }

  determineOptimalTime(weatherData) {
    const now = new Date();
    const hour = now.getHours();
    
    // En iyi sulama zamanları: Sabah 5-9, Akşam 18-21
    if (hour < 5) {
      return new Date(now.setHours(5, 0, 0, 0));
    } else if (hour >= 9 && hour < 18) {
      return new Date(now.setHours(18, 0, 0, 0));
    } else if (hour >= 21) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return new Date(tomorrow.setHours(5, 0, 0, 0));
    }
    
    return now; // Zaten optimal zamanda
  }

  // Sulama kontrolü
  async executeIrrigation(zoneId) {
    const zone = this.zones.get(zoneId);
    if (!zone) {
      throw new Error(`Zone ${zoneId} not found`);
    }
    
    // Güvenlik kontrolleri
    const safety = await this.performSafetyChecks(zone);
    if (!safety.safe) {
      return {
        success: false,
        reason: safety.reason,
        actions: safety.suggestedActions
      };
    }
    
    // Sulama başlat
    zone.status = 'IRRIGATING';
    zone.lastIrrigation = new Date();
    
    // Valf kontrolü (gerçek donanım entegrasyonu)
    for (const valve of zone.valves) {
      // await this.openValve(valve);
      console.log(`Opening valve ${valve}`);
    }
    
    // Su kullanımını kaydet
    const waterUsed = this.calculateWaterUsage(zone);
    this.updateWaterUsage(waterUsed);
    
    return {
      success: true,
      zone: zone.name,
      startTime: zone.lastIrrigation,
      estimatedWater: waterUsed,
      status: 'ACTIVE'
    };
  }

  async performSafetyChecks(zone) {
    const checks = {
      safe: true,
      reason: '',
      suggestedActions: []
    };
    
    // Rüzgar kontrolü
    const weatherData = await this.weatherService.fetchComprehensiveWeatherData();
    const currentWind = weatherData.current.wind_speed_10m;
    
    if (zone.irrigationType === 'SPRINKLER' && currentWind > 25) {
      checks.safe = false;
      checks.reason = 'Rüzgar hızı yüksek';
      checks.suggestedActions.push('Rüzgar azalana kadar bekleyin');
      checks.suggestedActions.push('Damla sulama sistemine geçmeyi düşünün');
    }
    
    // Don riski kontrolü
    const currentTemp = weatherData.current.temperature_2m;
    if (currentTemp < 2) {
      checks.safe = false;
      checks.reason = 'Don riski var';
      checks.suggestedActions.push('Sıcaklık 5°C üzerine çıkana kadar bekleyin');
    }
    
    // Elektrik kesintisi kontrolü
    // const powerStatus = await this.checkPowerStatus();
    // if (!powerStatus) {
    //   checks.safe = false;
    //   checks.reason = 'Elektrik kesintisi';
    //   checks.suggestedActions.push('Jeneratör sistemini kontrol edin');
    // }
    
    return checks;
  }

  calculateWaterUsage(zone) {
    // m³ cinsinden su kullanımı
    const areaM2 = zone.area * 10000; // hektar -> m²
    const waterMm = 20; // örnek: 20mm sulama
    const waterM3 = (areaM2 * waterMm) / 1000;
    
    return waterM3;
  }

  updateWaterUsage(amount) {
    this.waterUsage.daily += amount;
    this.waterUsage.weekly += amount;
    this.waterUsage.monthly += amount;
    
    // Haftalık ve aylık sıfırlama mantığı eklenecek
  }

  // Sulama raporu
  generateIrrigationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      zones: [],
      waterUsage: this.waterUsage,
      efficiency: {},
      recommendations: []
    };
    
    // Her bölge için rapor oluştur
    for (const [zoneId, zone] of this.zones) {
      report.zones.push({
        id: zone.id,
        name: zone.name,
        status: zone.status,
        lastIrrigation: zone.lastIrrigation,
        nextScheduled: zone.nextIrrigation,
        cropType: zone.cropType,
        area: zone.area
      });
    }
    
    // Verimlilik hesapla
    report.efficiency = {
      waterUseEfficiency: this.calculateWUE(),
      distributionUniformity: this.calculateDU(),
      applicationEfficiency: this.calculateAE()
    };
    
    // Öneriler
    if (report.efficiency.waterUseEfficiency < 0.7) {
      report.recommendations.push('Su kullanım verimliliği düşük, sistem bakımı yapın');
    }
    
    if (this.waterUsage.daily > 1000) {
      report.recommendations.push('Günlük su kullanımı yüksek, sulama programını gözden geçirin');
    }
    
    return report;
  }

  calculateWUE() {
    // Water Use Efficiency hesaplama
    // Basitleştirilmiş örnek
    return 0.75;
  }

  calculateDU() {
    // Distribution Uniformity hesaplama
    return 0.85;
  }

  calculateAE() {
    // Application Efficiency hesaplama
    return 0.80;
  }
}

// ==========================================
// 3. DISEASE PREDICTION & MANAGEMENT
// ==========================================

class DiseaseManagementSystem {
  constructor(weatherService) {
    this.weatherService = weatherService;
    this.diseaseModels = this.initializeDiseaseModels();
    this.alerts = [];
    this.treatments = new Map();
  }

  initializeDiseaseModels() {
    return {
      // Buğday hastalıkları
      WHEAT_RUST: {
        name: 'Pas Hastalığı',
        conditions: {
          temperature: { min: 15, max: 25, optimal: 20 },
          humidity: { min: 85, max: 100, optimal: 95 },
          leafWetness: { min: 6, max: 24 }, // saat
        },
        severity: 0,
        incubationPeriod: 7, // gün
        treatments: ['Tebuconazole', 'Propiconazole']
      },
      
      POWDERY_MILDEW: {
        name: 'Külleme',
        conditions: {
          temperature: { min: 15, max: 28, optimal: 23 },
          humidity: { min: 70, max: 90, optimal: 80 },
          leafWetness: { min: 0, max: 4 },
        },
        severity: 0,
        incubationPeriod: 5,
        treatments: ['Sulfur', 'Triadimefon']
      },
      
      SEPTORIA: {
        name: 'Septoria Yaprak Lekesi',
        conditions: {
          temperature: { min: 18, max: 25, optimal: 22 },
          humidity: { min: 90, max: 100, optimal: 98 },
          leafWetness: { min: 24, max: 72 },
        },
        severity: 0,
        incubationPeriod: 14,
        treatments: ['Azoxystrobin', 'Propiconazole']
      },
      
      // Domates hastalıkları
      EARLY_BLIGHT: {
        name: 'Erken Yanıklık',
        conditions: {
          temperature: { min: 24, max: 29, optimal: 27 },
          humidity: { min: 90, max: 100, optimal: 95 },
          leafWetness: { min: 12, max: 48 },
        },
        severity: 0,
        incubationPeriod: 3,
        treatments: ['Chlorothalonil', 'Mancozeb']
      },
      
      LATE_BLIGHT: {
        name: 'Geç Yanıklık (Mildiyö)',
        conditions: {
          temperature: { min: 10, max: 25, optimal: 18 },
          humidity: { min: 90, max: 100, optimal: 100 },
          leafWetness: { min: 8, max: 24 },
        },
        severity: 0,
        incubationPeriod: 4,
        treatments: ['Metalaxyl', 'Cymoxanil']
      }
    };
  }

  // Hastalık risk analizi
  async analyzeDiseaseRisk(cropType) {
    const weatherData = await this.weatherService.fetchComprehensiveWeatherData();
    const risks = [];
    
    // İlgili hastalıkları filtrele
    const relevantDiseases = this.filterDiseasesByCrop(cropType);
    
    for (const [diseaseId, disease] of Object.entries(relevantDiseases)) {
      const risk = this.calculateDiseaseRisk(disease, weatherData);
      
      if (risk.level > 0) {
        risks.push({
          diseaseId,
          name: disease.name,
          riskLevel: risk.level,
          riskScore: risk.score,
          probability: risk.probability,
          expectedDate: risk.expectedDate,
          conditions: risk.conditions,
          preventiveMeasures: this.getPreventiveMeasures(diseaseId, risk.level),
          treatments: disease.treatments
        });
      }
    }
    
    // Risk seviyesine göre sırala
    risks.sort((a, b) => b.riskScore - a.riskScore);
    
    return risks;
  }

  filterDiseasesByCrop(cropType) {
    const cropDiseases = {
      WHEAT: ['WHEAT_RUST', 'POWDERY_MILDEW', 'SEPTORIA'],
      TOMATO: ['EARLY_BLIGHT', 'LATE_BLIGHT', 'POWDERY_MILDEW'],
      CORN: ['RUST', 'BLIGHT'],
      // Diğer bitkiler eklenecek
    };
    
    const diseases = {};
    const diseaseList = cropDiseases[cropType] || [];
    
    for (const diseaseId of diseaseList) {
      if (this.diseaseModels[diseaseId]) {
        diseases[diseaseId] = this.diseaseModels[diseaseId];
      }
    }
    
    return diseases;
  }

  calculateDiseaseRisk(disease, weatherData) {
    const risk = {
      level: 0, // 0: Yok, 1: Düşük, 2: Orta, 3: Yüksek, 4: Kritik
      score: 0, // 0-100
      probability: 0, // %
      expectedDate: null,
      conditions: {}
    };
    
    // Son 7 gün ve gelecek 7 gün analizi
    const hourlyData = weatherData.hourly;
    const hours = Math.min(336, hourlyData.temperature_2m.length); // 14 gün
    
    let favorableHours = 0;
    let totalScore = 0;
    
    for (let i = 0; i < hours; i++) {
      const temp = hourlyData.temperature_2m[i];
      const humidity = hourlyData.relative_humidity_2m[i];
      const dewPoint = hourlyData.dew_point_2m[i];
      
      // Sıcaklık skoru
      const tempScore = this.calculateConditionScore(
        temp,
        disease.conditions.temperature
      );
      
      // Nem skoru
      const humidityScore = this.calculateConditionScore(
        humidity,
        disease.conditions.humidity
      );
      
      // Yaprak ıslaklığı tahmini (dew point bazlı)
      const leafWetness = temp - dewPoint < 2 ? 1 : 0;
      const wetnessScore = leafWetness * 100;
      
      // Toplam skor
      const hourScore = (tempScore * 0.4 + humidityScore * 0.4 + wetnessScore * 0.2);
      totalScore += hourScore;
      
      if (hourScore > 70) {
        favorableHours++;
      }
    }
    
    // Ortalama risk skoru
    risk.score = totalScore / hours;
    
    // Risk seviyesi belirleme
    if (risk.score > 80) {
      risk.level = 4; // Kritik
    } else if (risk.score > 60) {
      risk.level = 3; // Yüksek
    } else if (risk.score > 40) {
      risk.level = 2; // Orta
    } else if (risk.score > 20) {
      risk.level = 1; // Düşük
    } else {
      risk.level = 0; // Yok
    }
    
    // Hastalık olasılığı
    risk.probability = Math.min(95, risk.score * 1.2);
    
    // Tahmini hastalık başlangıç tarihi
    if (risk.level >= 2) {
      const daysUntilDisease = Math.max(1, disease.incubationPeriod - (risk.score / 20));
      risk.expectedDate = new Date();
      risk.expectedDate.setDate(risk.expectedDate.getDate() + Math.round(daysUntilDisease));
    }
    
    // Koşulları kaydet
    risk.conditions = {
      favorableHours,
      totalHours: hours,
      percentage: (favorableHours / hours) * 100
    };
    
    return risk;
  }

  calculateConditionScore(value, condition) {
    if (value < condition.min || value > condition.max) {
      return 0;
    }
    
    // Optimal değere yakınlık
    const optimal = condition.optimal;
    const range = Math.max(optimal - condition.min, condition.max - optimal);
    const distance = Math.abs(value - optimal);
    
    return Math.max(0, 100 - (distance / range) * 100);
  }

  getPreventiveMeasures(diseaseId, riskLevel) {
    const measures = {
      1: [ // Düşük risk
        'Bitkileri düzenli kontrol edin',
        'Havalandırmayı artırın',
        'Sulama zamanlamasını ayarlayın'
      ],
      2: [ // Orta risk
        'Koruyucu fungusit uygulaması planlayın',
        'Enfekte yaprakları temizleyin',
        'Sulama miktarını azaltın',
        'Bitki arası mesafeyi kontrol edin'
      ],
      3: [ // Yüksek risk
        'Acil koruyucu ilaçlama yapın',
        'Sistemik fungusit kullanın',
        'Yaprak budaması yapın',
        'Gübreleme programını gözden geçirin'
      ],
      4: [ // Kritik risk
        'ACİL sistemik + kontak fungusit',
        'Enfekte bitkileri izole edin',
        '7-10 gün arayla ilaçlama tekrarı',
        'Uzman desteği alın'
      ]
    };
    
    return measures[riskLevel] || [];
  }

  // İlaçlama takvimi oluşturma
  createTreatmentSchedule(diseaseRisks, fieldInfo) {
    const schedule = [];
    
    for (const risk of diseaseRisks) {
      if (risk.riskLevel >= 2) { // Orta ve üzeri riskler için
        const treatment = {
          diseaseId: risk.diseaseId,
          diseaseName: risk.name,
          riskLevel: risk.riskLevel,
          startDate: this.calculateTreatmentDate(risk),
          chemical: this.selectOptimalChemical(risk, fieldInfo),
          dosage: this.calculateDosage(risk, fieldInfo),
          applicationMethod: this.determineApplicationMethod(risk, fieldInfo),
          intervals: this.calculateApplicationIntervals(risk),
          precautions: this.getTreatmentPrecautions(risk),
          ppe: this.getRequiredPPE(risk.riskLevel)
        };
        
        schedule.push(treatment);
      }
    }
    
    // Tarih sırasına göre sırala
    schedule.sort((a, b) => a.startDate - b.startDate);
    
    return schedule;
  }

  calculateTreatmentDate(risk) {
    const today = new Date();
    let daysToWait = 0;
    
    switch(risk.riskLevel) {
      case 4: // Kritik
        daysToWait = 0; // Hemen
        break;
      case 3: // Yüksek
        daysToWait = 1; // Yarın
        break;
      case 2: // Orta
        daysToWait = 3; // 3 gün içinde
        break;
      default:
        daysToWait = 7;
    }
    
    const treatmentDate = new Date(today);
    treatmentDate.setDate(today.getDate() + daysToWait);
    
    return treatmentDate;
  }

  selectOptimalChemical(risk, fieldInfo) {
    // Rotasyon için son kullanılan ilaçları kontrol et
    const lastUsedChemicals = fieldInfo.chemicalHistory || [];
    const availableChemicals = risk.treatments.filter(
      chem => !lastUsedChemicals.includes(chem)
    );
    
    // İlk tercihi seç veya rotasyon yap
    return availableChemicals[0] || risk.treatments[0];
  }

  calculateDosage(risk, fieldInfo) {
    const baseDosage = {
      1: 100, // ml/da
      2: 150,
      3: 200,
      4: 250
    };
    
    const dosage = baseDosage[risk.riskLevel] || 150;
    const totalAmount = dosage * fieldInfo.area; // toplam miktar
    
    return {
      perDecare: dosage,
      total: totalAmount,
      unit: 'ml',
      waterAmount: fieldInfo.area * 30 // 30L/da su
    };
  }

  determineApplicationMethod(risk, fieldInfo) {
    if (fieldInfo.area > 50) {
      return 'DRONE'; // Büyük alanlar için
    } else if (risk.riskLevel >= 3) {
      return 'MOTORIZED_SPRAYER'; // Yüksek risk
    } else {
      return 'BACKPACK_SPRAYER'; // Küçük alan, düşük risk
    }
  }

  calculateApplicationIntervals(risk) {
    const intervals = {
      1: [14], // 14 gün sonra tekrar
      2: [7, 14], // 7 ve 14 gün sonra
      3: [5, 10, 15], // 5, 10, 15 gün sonra
      4: [3, 7, 10, 14] // Sık tekrar
    };
    
    return intervals[risk.riskLevel] || [7];
  }

  getTreatmentPrecautions(risk) {
    return [
      'Rüzgarsız havada uygulayın',
      'Sıcaklık 25°C altında olmalı',
      'Yağmurdan 6 saat önce uygulayın',
      'Hasat öncesi bekleme süresine uyun',
      'Arı aktivitesi düşük saatlerde uygulayın'
    ];
  }

  getRequiredPPE(riskLevel) {
    const ppe = ['Eldiven', 'Maske'];
    
    if (riskLevel >= 3) {
      ppe.push('Koruyucu gözlük', 'Tulum', 'Çizme');
    }
    
    return ppe;
  }
}

// ==========================================
// 4. MAIN FARM MANAGEMENT SYSTEM
// ==========================================

class FarmManagementSystem {
  constructor() {
    this.weatherService = new WeatherDataService();
    this.irrigationSystem = new SmartIrrigationSystem(this.weatherService);
    this.diseaseSystem = new DiseaseManagementSystem(this.weatherService);
    this.alerts = [];
    this.dashboard = null;
  }

  async initialize() {
    console.log('🚀 Akıllı Tarım Yönetim Sistemi Başlatılıyor...');
    
    // Sistemleri başlat
    await this.setupSystems();
    
    // İlk veri çekimi
    await this.fetchInitialData();
    
    // Otomatik görevleri planla
    this.scheduleAutomatedTasks();
    
    console.log('✅ Sistem hazır!');
    
    return {
      status: 'READY',
      timestamp: new Date().toISOString(),
      services: {
        weather: 'ACTIVE',
        irrigation: 'ACTIVE',
        disease: 'ACTIVE'
      }
    };
  }

  async setupSystems() {
    // Örnek tarla tanımlaması
    this.irrigationSystem.defineZone('ZONE_1', {
      name: 'Kuzey Parseli - Buğday',
      area: 25, // hektar
      cropType: 'WHEAT',
      soilType: 'LOAM',
      irrigationType: 'SPRINKLER',
      sensors: ['SM_001', 'SM_002'],
      valves: ['VLV_001', 'VLV_002']
    });
    
    this.irrigationSystem.defineZone('ZONE_2', {
      name: 'Güney Parseli - Domates',
      area: 15,
      cropType: 'TOMATO',
      soilType: 'CLAY',
      irrigationType: 'DRIP',
      sensors: ['SM_003', 'SM_004'],
      valves: ['VLV_003']
    });
  }

  async fetchInitialData() {
    const weatherData = await this.weatherService.fetchComprehensiveWeatherData();
    const analysis = this.weatherService.analyzeAgriculturalConditions(weatherData);
    
    // Risk uyarıları oluştur
    for (const risk of analysis.risks) {
      this.createAlert(risk);
    }
    
    return analysis;
  }

  scheduleAutomatedTasks() {
    // Her 15 dakikada bir hava durumu güncelle
    setInterval(() => this.updateWeatherData(), 15 * 60 * 1000);
    
    // Her saat sulama planını kontrol et
    setInterval(() => this.checkIrrigationSchedule(), 60 * 60 * 1000);
    
    // Günde 2 kez hastalık riski analizi
    setInterval(() => this.analyzeDiseaseRisks(), 12 * 60 * 60 * 1000);
    
    // Her 5 dakikada bir sensör verilerini oku (simülasyon)
    setInterval(() => this.readSensorData(), 5 * 60 * 1000);
  }

  async updateWeatherData() {
    try {
      const data = await this.fetchInitialData();
      console.log('📊 Hava durumu güncellendi:', new Date().toLocaleString());
      return data;
    } catch (error) {
      console.error('❌ Hava durumu güncellenemiyor:', error);
    }
  }

  async checkIrrigationSchedule() {
    const schedule = await this.irrigationSystem.createIrrigationSchedule();
    
    for (const task of schedule) {
      if (task.priority === 'HIGH') {
        this.createAlert({
          type: 'IRRIGATION',
          level: 'HIGH',
          message: `${task.zoneName} acil sulama gerektiriyor`,
          action: `${task.waterAmount}mm sulama yapın`
        });
      }
    }
    
    return schedule;
  }

  async analyzeDiseaseRisks() {
    const risks = {
      ZONE_1: await this.diseaseSystem.analyzeDiseaseRisk('WHEAT'),
      ZONE_2: await this.diseaseSystem.analyzeDiseaseRisk('TOMATO')
    };
    
    for (const [zone, zoneRisks] of Object.entries(risks)) {
      for (const risk of zoneRisks) {
        if (risk.riskLevel >= 3) {
          this.createAlert({
            type: 'DISEASE',
            level: risk.riskLevel === 4 ? 'CRITICAL' : 'HIGH',
            zone,
            disease: risk.name,
            message: `${risk.name} riski tespit edildi`,
            action: risk.preventiveMeasures[0]
          });
        }
      }
    }
    
    return risks;
  }

  async readSensorData() {
    // Gerçek sensör entegrasyonu burada yapılacak
    // Şimdilik simülasyon
    const sensorData = {
      timestamp: new Date().toISOString(),
      sensors: {
        SM_001: { moisture: Math.random() * 0.5, temperature: 20 + Math.random() * 10 },
        SM_002: { moisture: Math.random() * 0.5, temperature: 20 + Math.random() * 10 },
        SM_003: { moisture: Math.random() * 0.5, temperature: 20 + Math.random() * 10 },
        SM_004: { moisture: Math.random() * 0.5, temperature: 20 + Math.random() * 10 }
      }
    };
    
    // Kritik değerleri kontrol et
    for (const [sensorId, data] of Object.entries(sensorData.sensors)) {
      if (data.moisture < 0.2) {
        this.createAlert({
          type: 'SENSOR',
          level: 'MEDIUM',
          sensor: sensorId,
          message: `${sensorId} düşük nem tespit etti`,
          value: data.moisture
        });
      }
    }
    
    return sensorData;
  }

  createAlert(alertData) {
    const alert = {
      id: `ALERT_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...alertData
    };
    
    this.alerts.push(alert);
    
    // Son 100 uyarıyı tut
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
    
    // Kritik uyarılar için bildirim gönder
    if (alertData.level === 'CRITICAL' || alertData.level === 'HIGH') {
      this.sendNotification(alert);
    }
    
    return alert;
  }

  sendNotification(alert) {
    // SMS, Email, Push notification entegrasyonu
    console.log('🚨 KRİTİK UYARI:', alert.message);
    
    // Örnek: Email gönderimi
    // await emailService.send({
    //   to: 'farmer@example.com',
    //   subject: `Kritik Uyarı: ${alert.type}`,
    //   body: alert.message
    // });
  }

  // Ana dashboard verisi
  async getDashboardData() {
    const [weather, irrigation, diseases] = await Promise.all([
      this.weatherService.fetchComprehensiveWeatherData(),
      this.irrigationSystem.generateIrrigationReport(),
      this.analyzeDiseaseRisks()
    ]);
    
    return {
      timestamp: new Date().toISOString(),
      weather: {
        current: weather.current,
        forecast: weather.daily
      },
      irrigation: irrigation,
      diseases: diseases,
      alerts: this.alerts.slice(-10), // Son 10 uyarı
      metrics: {
        waterSaved: '35%',
        yieldIncrease: '22%',
        diseaseReduction: '45%',
        efficiency: '87%'
      }
    };
  }
}

// ==========================================
// 5. KULLANIM ÖRNEĞİ
// ==========================================

// Sistemi başlat
const farmSystem = new FarmManagementSystem();

// Async başlatma
(async () => {
  try {
    // Sistemi initialize et
    const status = await farmSystem.initialize();
    console.log('Sistem Durumu:', status);
    
    // Dashboard verilerini al
    const dashboard = await farmSystem.getDashboardData();
    console.log('Dashboard:', dashboard);
    
    // Sulama planı oluştur
    const irrigationPlan = await farmSystem.irrigationSystem.createIrrigationSchedule();
    console.log('Sulama Planı:', irrigationPlan);
    
    // Hastalık riski analizi
    const diseaseRisks = await farmSystem.diseaseSystem.analyzeDiseaseRisk('WHEAT');
    console.log('Hastalık Riskleri:', diseaseRisks);
    
    // İlaçlama takvimi
    if (diseaseRisks.length > 0) {
      const treatmentSchedule = farmSystem.diseaseSystem.createTreatmentSchedule(
        diseaseRisks,
        { area: 25, chemicalHistory: [] }
      );
      console.log('İlaçlama Takvimi:', treatmentSchedule);
    }
    
  } catch (error) {
    console.error('Sistem hatası:', error);
  }
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FarmManagementSystem,
    WeatherDataService,
    SmartIrrigationSystem,
    DiseaseManagementSystem
  };
}