// ==========================================
// 🌤️ WEATHER DATA SERVICE - OPEN METEO API
// ==========================================

import { PrismaClient } from '@prisma/client';
import { irrigationCoefficientsService } from '@/lib/irrigation/irrigation-coefficients';

const prisma = new PrismaClient();

interface WeatherLocation {
  latitude: number;
  longitude: number;
  elevation: number;
  name: string;
}

interface WeatherConditions {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
  pressure?: number;
  visibility?: number;
}

interface SoilConditions {
  temperature: {
    surface: number;
    depth6cm: number;
    depth18cm: number;
    depth54cm: number;
  };
  moisture: {
    layer1: number; // 0-1cm
    layer2: number; // 1-3cm
    layer3: number; // 3-9cm
    layer4: number; // 9-27cm
    layer5: number; // 27-81cm
  };
}

interface AgriculturalAnalysis {
  timestamp: string;
  location: WeatherLocation;
  current: WeatherConditions;
  soil: SoilConditions;
  risks: RiskAlert[];
  recommendations: Recommendation[];
  irrigation: IrrigationPlan;
  disease: DiseaseRisk[];
}

interface RiskAlert {
  type: 'FROST' | 'WIND' | 'FLOOD' | 'DROUGHT' | 'DISEASE';
  level: 0 | 1 | 2 | 3 | 4;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timing: string;
  action: string;
  details?: Record<string, any>;
}

interface Recommendation {
  category: 'IRRIGATION' | 'CROP_TIMING' | 'FERTILIZATION' | 'PROTECTION';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  action: string;
  timing: string;
  reason: string;
}

interface IrrigationPlan {
  needed: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  amount: number; // mm
  startTime: string;
  duration: number; // minutes
  reason: string;
}

interface DiseaseRisk {
  disease: string;
  riskLevel: number; // 0-4
  probability: number; // %
  conditions: string;
  treatment?: string[];
  preventive?: string[];
}

export class WeatherDataService {
  private readonly baseURL = 'https://api.open-meteo.com/v1/forecast';
  private location: WeatherLocation = {
    latitude: 38.569,
    longitude: 31.837,
    elevation: 1100, // Aksaray ortalama rakım
    name: 'Yeşiloba, Türkiye'
  };
  private cache = new Map<string, any>();
  private cacheTimeout = 3 * 60 * 60 * 1000; // 3 saat

  constructor(customLocation?: Partial<WeatherLocation>) {
    if (customLocation) {
      this.location = { ...this.location, ...customLocation };
    }
  }

  // 🎯 Kuyu koordinatlarından dinamik konum seçimi
  async setLocationFromWells() {
    try {
      const response = await fetch('/api/wells?active=true');
      const data = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        const wells = data.data;

        // Koordinatları olan kuyuları filtrele
        const wellsWithCoords = wells.filter((well: any) =>
          well.latitude && well.longitude &&
          !isNaN(parseFloat(well.latitude)) &&
          !isNaN(parseFloat(well.longitude))
        );

        if (wellsWithCoords.length > 0) {
          // İlk geçerli kuyunun koordinatlarını kullan
          const well = wellsWithCoords[0];
          this.location = {
            ...this.location,
            latitude: parseFloat(well.latitude),
            longitude: parseFloat(well.longitude),
            name: `${well.name} (${this.location.name})`
          };

          console.log(`🎯 Weather lokasyonu güncellendi: ${well.name} - ${well.latitude},${well.longitude}`);
          return true;
        }
      }

      console.log('⚠️ Geçerli kuyu koordinatı bulunamadı, varsayılan lokasyon kullanılıyor');
      return false;
    } catch (error) {
      console.error('Kuyu koordinatları alınamadı:', error);
      return false;
    }
  }

  // 🗺️ Tarla koordinatından konum belirleme
  setLocationFromField(coordinates: string) {
    try {
      if (!coordinates || !coordinates.includes(',')) {
        console.log('⚠️ Geçersiz koordinat formatı');
        return false;
      }

      const [latStr, lngStr] = coordinates.split(',');
      const latitude = parseFloat(latStr.trim());
      const longitude = parseFloat(lngStr.trim());

      if (isNaN(latitude) || isNaN(longitude)) {
        console.log('⚠️ Koordinatlar sayısal değere dönüştürülemedi');
        return false;
      }

      // Türkiye sınırları kontrolü (yaklaşık)
      if (latitude < 35 || latitude > 42 || longitude < 25 || longitude > 45) {
        console.log('⚠️ Koordinatlar Türkiye sınırları dışında görünüyor');
        return false;
      }

      this.location = {
        ...this.location,
        latitude,
        longitude,
        name: `Tarla Lokasyonu (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`
      };

      console.log(`🗺️ Weather lokasyonu tarla koordinatından güncellendi: ${latitude}, ${longitude}`);
      return true;
    } catch (error) {
      console.error('Tarla koordinatı işlenemedi:', error);
      return false;
    }
  }

  // 🕐 Son veri çekilme zamanını kontrol et
  private async getLastFetchTime(location: string): Promise<Date | null> {
    try {
      const cached = await prisma.weatherCache.findUnique({
        where: { location },
        select: { lastFetched: true }
      });
      return cached?.lastFetched || null;
    } catch (error) {
      console.error('DB cache kontrol hatası:', error);
      return null;
    }
  }

  // 📦 Veritabanından cached veri çek
  private async getCachedWeatherData(location: string): Promise<any | null> {
    try {
      const cached = await prisma.weatherCache.findUnique({
        where: {
          location,
          expiresAt: { gte: new Date() } // Henüz expire olmamış
        }
      });
      return cached?.weatherData || null;
    } catch (error) {
      console.error('DB cache read hatası:', error);
      return null;
    }
  }

  // 💾 Veriyi veritabanına cache'le
  private async cacheWeatherData(location: string, data: any): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + this.cacheTimeout);

      await prisma.weatherCache.upsert({
        where: { location },
        update: {
          weatherData: data,
          lastFetched: new Date(),
          expiresAt,
          updatedAt: new Date()
        },
        create: {
          location,
          weatherData: data,
          expiresAt
        }
      });
    } catch (error) {
      console.error('DB cache write hatası:', error);
    }
  }

  // 🌤️ Kapsamlı hava durumu verisi çekme (3 saat cache ile)
  async fetchComprehensiveWeatherData(): Promise<any> {
    const locationKey = `${this.location.latitude}_${this.location.longitude}`;

    // Önce veritabanından kontrol et
    const cachedData = await this.getCachedWeatherData(locationKey);
    if (cachedData) {
      console.log('📦 Cache\'den veri alındı');
      return cachedData;
    }

    // Memory cache kontrolü (fallback)
    const memoryCacheKey = `weather_${Math.floor(Date.now() / this.cacheTimeout)}`;
    if (this.cache.has(memoryCacheKey)) {
      console.log('🧠 Memory cache\'den veri alındı');
      return this.cache.get(memoryCacheKey);
    }

    const params = new URLSearchParams({
      latitude: this.location.latitude.toString(),
      longitude: this.location.longitude.toString(),
      elevation: this.location.elevation.toString(),

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
      past_days: '7',
      forecast_days: '14'
    });

    try {
      const response = await fetch(`${this.baseURL}?${params}`);

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();

      // Memory cache'e kaydet (fallback)
      const memoryCacheKey = `weather_${Math.floor(Date.now() / this.cacheTimeout)}`;
      this.cache.set(memoryCacheKey, data);
      setTimeout(() => this.cache.delete(memoryCacheKey), this.cacheTimeout);

      // Veritabanına kaydet
      await this.cacheWeatherData(locationKey, data);
      console.log('🌐 Yeni veri API\'den alındı ve cache\'lendi');

      return data;
    } catch (error) {
      console.error('Weather API Error:', error);
      throw error;
    }
  }

  // 🌾 Tarımsal koşul analizi
  async analyzeAgriculturalConditions(): Promise<AgriculturalAnalysis> {
    const weatherData = await this.fetchComprehensiveWeatherData();

    const analysis: AgriculturalAnalysis = {
      timestamp: new Date().toISOString(),
      location: this.location,
      current: this.extractCurrentConditions(weatherData),
      soil: this.extractSoilConditions(weatherData),
      risks: [],
      recommendations: [],
      irrigation: this.calculateIrrigationPlan(weatherData),
      disease: this.analyzeDiseaseRisks(weatherData)
    };

    // Risk analizi
    analysis.risks = this.analyzeAllRisks(weatherData);

    // Öneriler
    analysis.recommendations = this.generateRecommendations(weatherData, analysis);

    return analysis;
  }

  private extractCurrentConditions(data: any): WeatherConditions {
    return {
      temperature: data.current?.temperature_2m || 0,
      humidity: data.current?.relative_humidity_2m || 0,
      precipitation: data.current?.precipitation || 0,
      windSpeed: data.current?.wind_speed_10m || 0,
      windDirection: data.current?.wind_direction_10m || 0
    };
  }

  private extractSoilConditions(data: any): SoilConditions {
    const hourly = data.hourly;
    const currentIndex = 0;

    return {
      temperature: {
        surface: hourly?.soil_temperature_0cm?.[currentIndex] || 0,
        depth6cm: hourly?.soil_temperature_6cm?.[currentIndex] || 0,
        depth18cm: hourly?.soil_temperature_18cm?.[currentIndex] || 0,
        depth54cm: hourly?.soil_temperature_54cm?.[currentIndex] || 0
      },
      moisture: {
        layer1: hourly?.soil_moisture_0_to_1cm?.[currentIndex] || 0,
        layer2: hourly?.soil_moisture_1_to_3cm?.[currentIndex] || 0,
        layer3: hourly?.soil_moisture_3_to_9cm?.[currentIndex] || 0,
        layer4: hourly?.soil_moisture_9_to_27cm?.[currentIndex] || 0,
        layer5: hourly?.soil_moisture_27_to_81cm?.[currentIndex] || 0
      }
    };
  }

  // 🧊 Don riski kontrolü
  private checkFrostRisk(data: any): RiskAlert | null {
    if (!data.daily?.temperature_2m_min) return null;

    for (let i = 0; i < Math.min(7, data.daily.temperature_2m_min.length); i++) {
      const minTemp = data.daily.temperature_2m_min[i];
      const date = data.daily.time[i];

      if (minTemp <= 0) {
        return {
          type: 'FROST',
          level: 4,
          severity: 'CRITICAL',
          timing: date,
          action: 'Don koruma sistemlerini hemen aktive edin! Kritik durum!',
          details: { temperature: minTemp, date }
        };
      } else if (minTemp <= 2) {
        return {
          type: 'FROST',
          level: 3,
          severity: 'HIGH',
          timing: date,
          action: 'Don riski yüksek - koruyucu önlemler alın',
          details: { temperature: minTemp, date }
        };
      } else if (minTemp <= 5) {
        return {
          type: 'FROST',
          level: 2,
          severity: 'MEDIUM',
          timing: date,
          action: 'Don riskini takip edin',
          details: { temperature: minTemp, date }
        };
      }
    }

    return null;
  }

  // 🌪️ Rüzgar riski kontrolü (özellikle batı rüzgarı)
  private checkWindRisk(data: any): RiskAlert | null {
    if (!data.hourly?.wind_speed_10m) return null;

    for (let i = 0; i < Math.min(168, data.hourly.wind_speed_10m.length); i++) {
      const speed = data.hourly.wind_speed_10m[i];
      const direction = data.hourly.wind_direction_10m[i];
      const gusts = data.hourly.wind_gusts_10m[i] || speed;

      // Batı rüzgarı kontrolü (260-280 derece arası)
      const isWestWind = direction >= 260 && direction <= 280;

      if (gusts > 60 || (isWestWind && gusts > 40)) {
        return {
          type: 'WIND',
          level: 4,
          severity: 'CRITICAL',
          timing: data.hourly.time[i],
          action: 'KRİTİK RÜZGAR UYARISI! Tüm tarla işlerini durdurun!',
          details: { speed: gusts, direction, isWestWind }
        };
      } else if (speed > 40 || (isWestWind && speed > 30)) {
        return {
          type: 'WIND',
          level: 3,
          severity: 'HIGH',
          timing: data.hourly.time[i],
          action: 'Yüksek rüzgar riski - koruma önlemleri alın',
          details: { speed, direction, isWestWind }
        };
      }
    }

    return null;
  }

  // 🌊 Sel/taşkın riski
  private checkFloodRisk(data: any): RiskAlert | null {
    if (!data.daily?.precipitation_sum) return null;

    let totalRain3Days = 0;
    for (let i = 0; i < Math.min(3, data.daily.precipitation_sum.length); i++) {
      totalRain3Days += data.daily.precipitation_sum[i] || 0;
    }

    if (totalRain3Days > 100) {
      return {
        type: 'FLOOD',
        level: 4,
        severity: 'CRITICAL',
        timing: 'Önümüzdeki 3 gün',
        action: 'SEL RİSKİ! Drenaj sistemlerini acil kontrol edin!',
        details: { rainfall: totalRain3Days }
      };
    } else if (totalRain3Days > 50) {
      return {
        type: 'FLOOD',
        level: 3,
        severity: 'HIGH',
        timing: 'Önümüzdeki 3 gün',
        action: 'Taşkın riski - su tahliye sistemlerini hazırlayın',
        details: { rainfall: totalRain3Days }
      };
    }

    return null;
  }

  // 🦠 Hastalık riski analizi
  private analyzeDiseaseRisks(data: any): DiseaseRisk[] {
    const risks: DiseaseRisk[] = [];

    if (!data.hourly) return risks;

    // Son 48 saat ortalama
    let avgHumidity = 0;
    let avgTemp = 0;
    const hours = Math.min(48, data.hourly.temperature_2m.length);

    for (let i = 0; i < hours; i++) {
      avgHumidity += data.hourly.relative_humidity_2m[i] || 0;
      avgTemp += data.hourly.temperature_2m[i] || 0;
    }

    avgHumidity /= hours;
    avgTemp /= hours;

    // Mantar hastalıkları
    if (avgHumidity > 85 && avgTemp >= 15 && avgTemp <= 25) {
      risks.push({
        disease: 'Mantar Hastalıkları (Külleme, Mildiyö)',
        riskLevel: 4,
        probability: 85,
        conditions: `Yüksek nem (%${avgHumidity.toFixed(1)}) + Ideal sıcaklık (${avgTemp.toFixed(1)}°C)`,
        treatment: ['Tebuconazole', 'Propiconazole'],
        preventive: ['Acil fungusit uygulaması', 'Havalandırma artırın']
      });
    } else if (avgHumidity > 75 && avgTemp >= 10 && avgTemp <= 30) {
      risks.push({
        disease: 'Erken Yanıklık, Septoria',
        riskLevel: 3,
        probability: 65,
        conditions: `Orta nem (%${avgHumidity.toFixed(1)}) + Uygun sıcaklık`,
        treatment: ['Chlorothalonil', 'Azoxystrobin'],
        preventive: ['Koruyucu ilaçlama planlayın']
      });
    }

    return risks;
  }

  // 💧 Sulama planı hesaplama
  private calculateIrrigationPlan(data: any): IrrigationPlan {
    const plan: IrrigationPlan = {
      needed: false,
      priority: 'LOW',
      amount: 0,
      startTime: '',
      duration: 0,
      reason: 'Analiz tamamlanamadı'
    };

    if (!data.daily || !data.hourly) return plan;

    const et0Today = data.daily.et0_fao_evapotranspiration?.[0] || 4;
    const rainToday = data.daily.rain_sum?.[0] || 0;
    const rainNext3Days = (data.daily.rain_sum?.[1] || 0) +
                         (data.daily.rain_sum?.[2] || 0) +
                         (data.daily.rain_sum?.[3] || 0);

    // Toprak nemi ortalama (0-27cm)
    const soilMoisture = (
      (data.hourly.soil_moisture_0_to_1cm?.[0] || 0) +
      (data.hourly.soil_moisture_1_to_3cm?.[0] || 0) +
      (data.hourly.soil_moisture_3_to_9cm?.[0] || 0) +
      (data.hourly.soil_moisture_9_to_27cm?.[0] || 0)
    ) / 4;

    const waterDeficit = et0Today - rainToday;

    if (soilMoisture < 0.2 && waterDeficit > 3) {
      plan.needed = true;
      plan.priority = 'URGENT';
      plan.amount = Math.round(waterDeficit * 10);
      plan.startTime = this.getOptimalIrrigationTime();
      plan.duration = Math.ceil(plan.amount * 6); // 6 dakika/mm
      plan.reason = `Toprak nemi kritik (%${(soilMoisture*100).toFixed(1)}) + Yüksek su açığı`;
    } else if (soilMoisture < 0.3 && waterDeficit > 1) {
      plan.needed = true;
      plan.priority = 'MEDIUM';
      plan.amount = Math.round(waterDeficit * 8);
      plan.startTime = 'Yarın sabah';
      plan.duration = Math.ceil(plan.amount * 6);
      plan.reason = 'Toprak nemi düşük, sulama planlayın';
    } else if (rainNext3Days > 10) {
      plan.needed = false;
      plan.priority = 'LOW';
      plan.reason = `Önümüzdeki 3 gün ${rainNext3Days.toFixed(1)}mm yağış bekleniyor`;
    } else {
      plan.needed = false;
      plan.priority = 'LOW';
      plan.reason = 'Toprak nemi yeterli';
    }

    return plan;
  }

  private getOptimalIrrigationTime(): string {
    const now = new Date();
    const hour = now.getHours();

    if (hour < 5) return '05:00';
    else if (hour >= 9 && hour < 18) return '18:00';
    else if (hour >= 21) return 'Yarın 05:00';
    else return 'Şimdi (optimal saat)';
  }

  private analyzeAllRisks(data: any): RiskAlert[] {
    const risks: RiskAlert[] = [];

    // Tüm risk analizlerini çalıştır
    const frostRisk = this.checkFrostRisk(data);
    const windRisk = this.checkWindRisk(data);
    const floodRisk = this.checkFloodRisk(data);

    if (frostRisk) risks.push(frostRisk);
    if (windRisk) risks.push(windRisk);
    if (floodRisk) risks.push(floodRisk);

    // Risk seviyesine göre sırala
    risks.sort((a, b) => b.level - a.level);

    return risks;
  }

  private generateRecommendations(data: any, analysis: AgriculturalAnalysis): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Sulama önerisi
    if (analysis.irrigation.needed) {
      recommendations.push({
        category: 'IRRIGATION',
        priority: analysis.irrigation.priority,
        action: `${analysis.irrigation.amount}mm sulama yapın`,
        timing: analysis.irrigation.startTime,
        reason: analysis.irrigation.reason
      });
    }

    // Risk bazlı öneriler
    for (const risk of analysis.risks) {
      recommendations.push({
        category: 'PROTECTION',
        priority: risk.severity === 'CRITICAL' ? 'URGENT' : 'HIGH',
        action: risk.action,
        timing: 'Hemen',
        reason: `${risk.type} riski tespit edildi`
      });
    }

    // Ekim/Hasat önerileri
    const soilTemp = analysis.soil.temperature.surface;
    if (soilTemp >= 12 && soilTemp <= 25) {
      recommendations.push({
        category: 'CROP_TIMING',
        priority: 'MEDIUM',
        action: 'Buğday/Arpa ekimi için uygun koşullar',
        timing: 'Bu hafta',
        reason: `Toprak sıcaklığı optimal (${soilTemp.toFixed(1)}°C)`
      });
    }

    return recommendations;
  }

  // 📅 7 günlük hava durumu tahmini
  async get7DayForecast() {
    const locationKey = `${this.location.latitude}_${this.location.longitude}`;

    // Önce veritabanından mevcut forecast'ları kontrol et
    const existingForecast = await prisma.weatherForecast.findMany({
      where: {
        location: locationKey,
        date: {
          gte: new Date(), // Bugünden başla
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 gün sonrasına kadar
        }
      },
      orderBy: { date: 'asc' }
    });

    // Eğer forecast verisi eksikse veya 3 saatten eskiyse yeniden çek
    if (existingForecast.length < 7 || (existingForecast[0] && new Date(existingForecast[0].createdAt).getTime() < Date.now() - this.cacheTimeout)) {
      await this.updateWeatherForecast(locationKey);

      // Güncellenmiş verileri tekrar çek
      const updatedForecast = await prisma.weatherForecast.findMany({
        where: {
          location: locationKey,
          date: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { date: 'asc' },
        take: 7
      });

      return this.formatForecastForDisplay(updatedForecast);
    }

    return this.formatForecastForDisplay(existingForecast);
  }

  // 🔄 Hava durumu tahmini güncelle
  private async updateWeatherForecast(locationKey: string) {
    try {
      const weatherData = await this.fetchComprehensiveWeatherData();

      // Eski forecast verilerini temizle
      await prisma.weatherForecast.deleteMany({
        where: { location: locationKey }
      });

      // Yeni forecast verilerini kaydet
      const forecastData = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        date.setHours(12, 0, 0, 0); // Öğlen saati

        forecastData.push({
          location: locationKey,
          date,
          minTemp: weatherData.daily?.temperature_2m_min?.[i] || 0,
          maxTemp: weatherData.daily?.temperature_2m_max?.[i] || 0,
          humidity: weatherData.daily?.precipitation_probability_max?.[i] || 0,
          precipitation: weatherData.daily?.precipitation_sum?.[i] || 0,
          windSpeed: weatherData.daily?.wind_speed_10m_max?.[i] || 0,
          weatherCode: 0, // OpenMeteo weather code
          description: this.getWeatherDescription(weatherData.daily?.precipitation_sum?.[i] || 0),
          soilMoisture: null,
          irrigationNeed: (weatherData.daily?.precipitation_sum?.[i] || 0) < 2, // 2mm'den az yağış varsa sulama gerekli
          riskLevel: this.calculateDailyRisk(weatherData, i)
        });
      }

      await prisma.weatherForecast.createMany({
        data: forecastData
      });

    } catch (error) {
      console.error('Forecast güncelleme hatası:', error);
    }
  }

  // 🎨 Forecast verilerini display için formatla
  private formatForecastForDisplay(forecast: any[]) {
    return forecast.map(day => ({
      date: day.date,
      dateStr: new Date(day.date).toLocaleDateString('tr-TR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      }),
      minTemp: `${Math.round(day.minTemp)}°`,
      maxTemp: `${Math.round(day.maxTemp)}°`,
      precipitation: `${day.precipitation.toFixed(1)}mm`,
      humidity: `${day.humidity}%`,
      windSpeed: `${day.windSpeed.toFixed(1)} km/h`,
      description: day.description,
      irrigationNeed: day.irrigationNeed,
      riskLevel: day.riskLevel,
      riskColor: this.getRiskColor(day.riskLevel)
    }));
  }

  // 🌦️ Hava durumu açıklaması
  private getWeatherDescription(precipitation: number): string {
    if (precipitation > 10) return 'Yağmurlu';
    if (precipitation > 2) return 'Hafif Yağmur';
    if (precipitation > 0.1) return 'Sisli';
    return 'Güneşli';
  }

  // ⚠️ Günlük risk seviyesi hesapla
  private calculateDailyRisk(data: any, dayIndex: number): number {
    let risk = 0;

    const minTemp = data.daily?.temperature_2m_min?.[dayIndex] || 10;
    const maxTemp = data.daily?.temperature_2m_max?.[dayIndex] || 20;
    const windSpeed = data.daily?.wind_speed_10m_max?.[dayIndex] || 0;
    const precipitation = data.daily?.precipitation_sum?.[dayIndex] || 0;

    // Don riski
    if (minTemp <= 0) risk = Math.max(risk, 4);
    else if (minTemp <= 2) risk = Math.max(risk, 3);
    else if (minTemp <= 5) risk = Math.max(risk, 2);

    // Rüzgar riski
    if (windSpeed > 60) risk = Math.max(risk, 4);
    else if (windSpeed > 40) risk = Math.max(risk, 3);
    else if (windSpeed > 25) risk = Math.max(risk, 2);

    // Sel riski
    if (precipitation > 50) risk = Math.max(risk, 4);
    else if (precipitation > 25) risk = Math.max(risk, 3);
    else if (precipitation > 10) risk = Math.max(risk, 2);

    return risk;
  }

  // 🎨 Risk seviyesine göre renk
  private getRiskColor(level: number): string {
    switch (level) {
      case 4: return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100';
      case 3: return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100';
      case 2: return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100';
      case 1: return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100';
      default: return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100';
    }
  }

  // 🕐 Son veri çekilme zamanını public method olarak döndür
  async getLastUpdateInfo() {
    const locationKey = `${this.location.latitude}_${this.location.longitude}`;
    const lastFetch = await this.getLastFetchTime(locationKey);

    if (!lastFetch) {
      return { message: 'Henüz veri çekilmedi', hoursAgo: null, needsUpdate: true };
    }

    const hoursAgo = Math.floor((Date.now() - lastFetch.getTime()) / (1000 * 60 * 60));
    const needsUpdate = hoursAgo >= 3;

    return {
      message: `${hoursAgo} saat önce güncellendi`,
      hoursAgo,
      needsUpdate,
      lastFetch
    };
  }

  // 📊 Dashboard özet verisi
  async getDashboardSummary() {
    const analysis = await this.analyzeAgriculturalConditions();

    return {
      location: analysis.location.name,
      lastUpdate: analysis.timestamp,
      current: {
        temperature: `${analysis.current.temperature.toFixed(1)}°C`,
        humidity: `${analysis.current.humidity.toFixed(0)}%`,
        windSpeed: `${analysis.current.windSpeed.toFixed(1)} km/h`,
        precipitation: `${analysis.current.precipitation.toFixed(1)} mm`
      },
      soil: {
        avgMoisture: `${((analysis.soil.moisture.layer1 + analysis.soil.moisture.layer2 + analysis.soil.moisture.layer3) / 3 * 100).toFixed(1)}%`,
        surfaceTemp: `${analysis.soil.temperature.surface.toFixed(1)}°C`
      },
      alerts: analysis.risks.length,
      irrigation: {
        needed: analysis.irrigation.needed,
        priority: analysis.irrigation.priority,
        amount: analysis.irrigation.amount
      },
      diseaseRisk: analysis.disease.length > 0 ? analysis.disease[0].riskLevel : 0
    };
  }
}