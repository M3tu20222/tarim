import { ProcessedWeatherData, ProcessedHourlyData, ProcessedDailyData } from '../types';

export interface WeatherMetrics {
  comfort: {
    heatIndex: number[];
    dewPoint: number[];
    comfortLevel: string[];
    uvRisk: string[];
  };
  agricultural: {
    growingDegreeDays: number[];
    chillHours: number;
    frostRisk: string[];
    soilMoistureStatus: string[];
    evapotranspiration: number[];
  };
  alerts: {
    weather: WeatherAlert[];
    agricultural: AgriculturalAlert[];
  };
  statistics: {
    temperatureStats: TemperatureStats;
    precipitationStats: PrecipitationStats;
    soilStats: SoilStats;
  };
}

export interface WeatherAlert {
  type: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  timeRange: string;
  severity: number; // 1-5
}

export interface AgriculturalAlert {
  type: 'frost' | 'drought' | 'optimal' | 'heat_stress';
  crop: string;
  message: string;
  recommendations: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface TemperatureStats {
  min: number;
  max: number;
  average: number;
  range: number;
  extremeDays: number;
}

export interface PrecipitationStats {
  total: number;
  rainyDays: number;
  maxDaily: number;
  avgIntensity: number;
  droughtRisk: boolean;
}

export interface SoilStats {
  avgTemperature: number;
  avgMoisture: number;
  moistureVariation: number;
  optimalDays: number;
}

// Heat Index calculation (feels like temperature)
export const calculateHeatIndex = (temp: number, humidity: number): number => {
  if (temp < 27) return temp; // Heat index only relevant for high temperatures

  const t = temp;
  const h = humidity;

  // Rothfusz equation
  let hi = -8.78469475556 +
           1.61139411 * t +
           2.33854883889 * h +
           -0.14611605 * t * h +
           -0.012308094 * t * t +
           -0.0164248277778 * h * h +
           0.002211732 * t * t * h +
           0.00072546 * t * h * h +
           -0.000003582 * t * t * h * h;

  return Math.round(hi * 10) / 10;
};

// Dew Point calculation
export const calculateDewPoint = (temp: number, humidity: number): number => {
  const a = 17.27;
  const b = 237.7;

  const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100);
  const dewPoint = (b * alpha) / (a - alpha);

  return Math.round(dewPoint * 10) / 10;
};

// Growing Degree Days calculation (base 10°C for most crops)
export const calculateGrowingDegreeDays = (maxTemp: number, minTemp: number, baseTemp: number = 10): number => {
  const avgTemp = (maxTemp + minTemp) / 2;
  return Math.max(0, avgTemp - baseTemp);
};

// Chill Hours calculation (hours below 7°C)
export const calculateChillHours = (hourlyData: ProcessedHourlyData[]): number => {
  return hourlyData.filter(hour => hour.temperature < 7).length;
};

// Evapotranspiration calculation (simplified Penman-Monteith)
export const calculateEvapotranspiration = (
  temp: number,
  humidity: number,
  windSpeed: number,
  solarRadiation: number = 20 // Estimated MJ/m²/day
): number => {
  const deltaT = 4098 * (0.6108 * Math.exp(17.27 * temp / (temp + 237.3))) / Math.pow(temp + 237.3, 2);
  const gamma = 0.665; // Psychrometric constant
  const u2 = windSpeed * 4.87 / Math.log(67.8 * 10 - 5.42); // Wind speed at 2m height

  const et0 = (0.408 * deltaT * solarRadiation + gamma * 900 / (temp + 273) * u2 * (0.01 * (100 - humidity))) /
              (deltaT + gamma * (1 + 0.34 * u2));

  return Math.round(et0 * 10) / 10;
};

// Comfort level assessment
export const assessComfortLevel = (temp: number, humidity: number, windSpeed: number): string => {
  const heatIndex = calculateHeatIndex(temp, humidity);

  if (heatIndex > 40) return 'Çok Sıcak - Tehlikeli';
  if (heatIndex > 32) return 'Sıcak - Dikkatli Olun';
  if (heatIndex >= 18 && heatIndex <= 25 && humidity >= 40 && humidity <= 70) return 'Mükemmel';
  if (heatIndex >= 15 && heatIndex <= 30) return 'Rahat';
  if (heatIndex < 10) return 'Soğuk';
  if (heatIndex < 0) return 'Çok Soğuk - Tehlikeli';

  return 'Orta';
};

// Frost risk assessment
export const assessFrostRisk = (minTemp: number, humidity: number): string => {
  if (minTemp <= -2) return 'Yoğun Don - Kritik Risk';
  if (minTemp <= 0) return 'Don Riski - Yüksek';
  if (minTemp <= 3 && humidity > 80) return 'Hafif Don Riski - Orta';
  if (minTemp <= 5) return 'Don Olasılığı - Düşük';
  return 'Don Riski Yok';
};

// Soil moisture status
export const assessSoilMoistureStatus = (moisture: number): string => {
  if (moisture > 0.4) return 'Çok Nemli - Su Baskını Riski';
  if (moisture > 0.3) return 'Nemli - Optimal';
  if (moisture > 0.2) return 'Orta Nem - İyi';
  if (moisture > 0.15) return 'Düşük Nem - Sulama Gerekli';
  if (moisture > 0.1) return 'Kuru - Acil Sulama';
  return 'Çok Kuru - Kritik';
};

// UV Risk assessment (simplified based on temperature and time)
export const assessUVRisk = (temp: number, hour: number): string => {
  if (hour < 10 || hour > 16) return 'Düşük';
  if (temp < 15) return 'Düşük';
  if (temp < 25) return 'Orta';
  if (temp < 35) return 'Yüksek';
  return 'Çok Yüksek';
};

// Generate weather alerts
export const generateWeatherAlerts = (data: ProcessedWeatherData): WeatherAlert[] => {
  const alerts: WeatherAlert[] = [];

  // High temperature alert
  const maxTemp = Math.max(...data.dailyData.map(d => d.temperature_max));
  if (maxTemp > 35) {
    alerts.push({
      type: 'warning',
      title: 'Yüksek Sıcaklık Uyarısı',
      message: `Sıcaklık ${maxTemp.toFixed(1)}°C'ye kadar çıkacak. Sıcak çarpması riskine dikkat edin.`,
      timeRange: 'Önümüzdeki 7 gün',
      severity: maxTemp > 40 ? 5 : 3
    });
  }

  // Frost alert
  const minTemp = Math.min(...data.dailyData.map(d => d.temperature_min));
  if (minTemp <= 2) {
    alerts.push({
      type: 'danger',
      title: 'Don Uyarısı',
      message: `Sıcaklık ${minTemp.toFixed(1)}°C'ye kadar düşecek. Bitkileri koruyun.`,
      timeRange: 'Önümüzdeki 7 gün',
      severity: minTemp <= 0 ? 5 : 4
    });
  }

  // Heavy rain alert
  const maxPrecip = Math.max(...data.dailyData.map(d => d.precipitation_sum || 0));
  if (maxPrecip > 25) {
    alerts.push({
      type: 'warning',
      title: 'Şiddetli Yağış Uyarısı',
      message: `Günlük yağış ${maxPrecip.toFixed(1)}mm'ye kadar çıkabilir. Su baskını riskine dikkat.`,
      timeRange: 'Önümüzdeki 7 gün',
      severity: maxPrecip > 50 ? 4 : 3
    });
  }

  // Strong wind alert
  const maxWind = Math.max(...data.dailyData.map(d => d.wind_speed_max));
  if (maxWind > 40) {
    alerts.push({
      type: 'warning',
      title: 'Kuvvetli Rüzgar Uyarısı',
      message: `Rüzgar hızı ${maxWind.toFixed(0)} km/s'ye kadar çıkacak. İlaçlama yapmayın.`,
      timeRange: 'Önümüzdeki 7 gün',
      severity: maxWind > 60 ? 4 : 3
    });
  }

  return alerts.sort((a, b) => b.severity - a.severity);
};

// Generate agricultural alerts
export const generateAgriculturalAlerts = (data: ProcessedWeatherData): AgriculturalAlert[] => {
  const alerts: AgriculturalAlert[] = [];

  // Corn specific alerts
  const nightTemps = data.hourlyData.filter(h => {
    const hour = h.fullTime.getHours();
    return hour >= 22 || hour <= 6;
  }).map(h => h.temperature);

  const minNightTemp = Math.min(...nightTemps);

  if (minNightTemp < 5) {
    alerts.push({
      type: 'frost',
      crop: 'Mısır',
      message: 'Gece sıcaklığı 5°C altına düşecek. Çimlenme dönemindeki mısır için risk.',
      recommendations: [
        'Ekimi erteleyin',
        'Mevcut fideler için koruma önlemleri alın',
        'Toprak sıcaklığını kontrol edin'
      ],
      priority: 'critical'
    });
  }

  // Soil moisture alerts
  const avgSoilMoisture = data.hourlyData.reduce((sum, h) => sum + h.soil_moisture, 0) / data.hourlyData.length;

  if (avgSoilMoisture < 0.15) {
    alerts.push({
      type: 'drought',
      crop: 'Genel',
      message: 'Toprak nemi kritik seviyenin altında. Acil sulama gerekli.',
      recommendations: [
        'Derhal sulama yapın',
        'Toprak nemini günlük kontrol edin',
        'Malç örtü kullanın'
      ],
      priority: 'high'
    });
  }

  // Optimal planting conditions
  const idealDays = data.dailyData.filter(day =>
    day.temperature_max >= 20 &&
    day.temperature_max <= 25 &&
    day.temperature_min >= 10 &&
    (day.precipitation_sum || 0) < 5
  );

  if (idealDays.length >= 3) {
    alerts.push({
      type: 'optimal',
      crop: 'Genel',
      message: `${idealDays.length} gün ideal ekim koşulları mevcut.`,
      recommendations: [
        'Ekim için uygun dönem',
        'Toprak hazırlığını tamamlayın',
        'Tohum kalitesini kontrol edin'
      ],
      priority: 'medium'
    });
  }

  return alerts.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};

// Calculate comprehensive weather metrics
export const calculateWeatherMetrics = (data: ProcessedWeatherData): WeatherMetrics => {
  const hourlyData = data.hourlyData;
  const dailyData = data.dailyData;

  // Comfort metrics
  const heatIndex = hourlyData.map(h => calculateHeatIndex(h.temperature, h.humidity));
  const dewPoint = hourlyData.map(h => calculateDewPoint(h.temperature, h.humidity));
  const comfortLevel = hourlyData.map(h => assessComfortLevel(h.temperature, h.humidity, h.wind_speed));
  const uvRisk = hourlyData.map(h => assessUVRisk(h.temperature, h.fullTime.getHours()));

  // Agricultural metrics
  const growingDegreeDays = dailyData.map(d => calculateGrowingDegreeDays(d.temperature_max, d.temperature_min));
  const chillHours = calculateChillHours(hourlyData);
  const frostRisk = dailyData.map(d => assessFrostRisk(d.temperature_min, 80)); // Assuming 80% humidity for frost calculation
  const soilMoistureStatus = hourlyData.map(h => assessSoilMoistureStatus(h.soil_moisture));
  const evapotranspiration = hourlyData.map(h => calculateEvapotranspiration(h.temperature, h.humidity, h.wind_speed));

  // Statistics
  const temperatures = [...hourlyData.map(h => h.temperature), ...dailyData.map(d => d.temperature_max), ...dailyData.map(d => d.temperature_min)];
  const precipitations = dailyData.map(d => d.precipitation_sum || 0);
  const soilTemperatures = hourlyData.map(h => h.soil_temperature);
  const soilMoistures = hourlyData.map(h => h.soil_moisture);

  const temperatureStats: TemperatureStats = {
    min: Math.min(...temperatures),
    max: Math.max(...temperatures),
    average: temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length,
    range: Math.max(...temperatures) - Math.min(...temperatures),
    extremeDays: dailyData.filter(d => d.temperature_max > 35 || d.temperature_min < 0).length
  };

  const precipitationStats: PrecipitationStats = {
    total: precipitations.reduce((sum, p) => sum + p, 0),
    rainyDays: precipitations.filter(p => p > 0.1).length,
    maxDaily: Math.max(...precipitations),
    avgIntensity: precipitations.filter(p => p > 0).reduce((sum, p) => sum + p, 0) / precipitations.filter(p => p > 0).length || 0,
    droughtRisk: precipitations.reduce((sum, p) => sum + p, 0) < 10
  };

  const soilStats: SoilStats = {
    avgTemperature: soilTemperatures.reduce((sum, temp) => sum + temp, 0) / soilTemperatures.length,
    avgMoisture: soilMoistures.reduce((sum, moisture) => sum + moisture, 0) / soilMoistures.length,
    moistureVariation: Math.max(...soilMoistures) - Math.min(...soilMoistures),
    optimalDays: dailyData.filter(d => d.temperature_max >= 20 && d.temperature_max <= 30).length
  };

  return {
    comfort: {
      heatIndex,
      dewPoint,
      comfortLevel,
      uvRisk
    },
    agricultural: {
      growingDegreeDays,
      chillHours,
      frostRisk,
      soilMoistureStatus,
      evapotranspiration
    },
    alerts: {
      weather: generateWeatherAlerts(data),
      agricultural: generateAgriculturalAlerts(data)
    },
    statistics: {
      temperatureStats,
      precipitationStats,
      soilStats
    }
  };
};