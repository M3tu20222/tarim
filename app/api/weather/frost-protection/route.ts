// ==========================================
// ❄️ DON KORUMASI API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { frostProtectionService } from '@/lib/weather/frost-protection-service';
import { fieldWeatherService } from '@/lib/weather/field-weather-service';
import { fetchOpenMeteoBatch } from '@/lib/weather/openMeteoClient';

export async function GET(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json(
        { error: 'Giriş yapmanız gerekiyor' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fieldId = searchParams.get('fieldId');
    const latitude = parseFloat(searchParams.get('lat') || '38.575906');
    const longitude = parseFloat(searchParams.get('lng') || '31.849755');

    let weatherData;

    if (fieldId) {
      // Belirli bir tarla için don analizi
      const fieldWeather = await fieldWeatherService.getSingleFieldWeather(
        fieldId,
        user.id,
        user.role
      );

      if (!fieldWeather) {
        return NextResponse.json(
          { error: 'Tarla bulunamadı veya erişim yetkiniz yok' },
          { status: 404 }
        );
      }

      // Tarla koordinatlarıyla hava durumu al
      const coordinates = [{
        fieldId: fieldWeather.fieldId,
        fieldName: fieldWeather.fieldName,
        latitude: fieldWeather.coordinates.latitude,
        longitude: fieldWeather.coordinates.longitude
      }];

      const batch = await fetchOpenMeteoBatch(coordinates);
      weatherData = batch[0];
    } else {
      // Genel konum için don analizi
      const coordinates = [{
        fieldId: 'general',
        fieldName: 'Genel Bölge',
        latitude,
        longitude
      }];

      const batch = await fetchOpenMeteoBatch(coordinates);
      weatherData = batch[0];
    }

    if (!weatherData) {
      throw new Error('Hava durumu verileri alınamadı');
    }

    // Don risk analizi
    const frostAnalysis = frostProtectionService.analyzeFrostRisk(weatherData.hourly);

    // Sulama kontrolü
    const irrigationCheck = frostProtectionService.checkIrrigationFrostRisk(weatherData.hourly);

    // Mevcut koşullar
    const currentConditions = {
      temperature: weatherData.hourly[0]?.temperature2m || 0,
      humidity: weatherData.hourly[0]?.relativeHumidity2m || 0,
      windSpeed: weatherData.hourly[0]?.windSpeed10m || 0,
      soilTemperature: weatherData.hourly[0]?.soilTemperature0cm || 0,
      soilMoisture: weatherData.hourly[0]?.soilMoisture0_1cm || 0
    };

    // Gelişmiş öneriler
    const enhancedRecommendations = generateEnhancedFrostRecommendations(
      frostAnalysis,
      irrigationCheck,
      currentConditions
    );

    return NextResponse.json({
      success: true,
      data: {
        location: {
          fieldId: weatherData.fieldId,
          fieldName: weatherData.fieldName,
          latitude: weatherData.latitude,
          longitude: weatherData.longitude
        },
        currentConditions,
        frostAnalysis,
        irrigationCheck,
        enhancedRecommendations,
        alerts: generateFrostAlerts(frostAnalysis, irrigationCheck),
        nextUpdate: new Date(Date.now() + 1800000).toISOString(), // 30 dakika sonra
        hourlyForecast: weatherData.hourly.slice(0, 24).map(hour => ({
          time: hour.timestamp,
          temperature: hour.temperature2m,
          soilTemperature: hour.soilTemperature0cm,
          humidity: hour.relativeHumidity2m,
          windSpeed: hour.windSpeed10m
        }))
      },
      timestamp: new Date().toISOString(),
      cacheExpires: 15 // 15 dakika cache
    });

  } catch (error) {
    console.error('Frost Protection API Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Don koruması analizi tamamlanamadı',
      message: error instanceof Error ? error.message : 'Bilinmeyen hata'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json(
        { error: 'Giriş yapmanız gerekiyor' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      fieldId,
      cropType = 'WHEAT',
      plantingDate,
      expectedMinTemp,
      protectionMeasures = []
    } = body;

    // Tarla bazlı don risk analizi
    const fieldWeather = fieldId
      ? await fieldWeatherService.getSingleFieldWeather(fieldId, user.id, user.role)
      : null;

    if (fieldId && !fieldWeather) {
      return NextResponse.json(
        { error: 'Tarla bulunamadı' },
        { status: 404 }
      );
    }

    // Hava durumu verilerini al
    const coordinates = fieldWeather ? [{
      fieldId: fieldWeather.fieldId,
      fieldName: fieldWeather.fieldName,
      latitude: fieldWeather.coordinates.latitude,
      longitude: fieldWeather.coordinates.longitude
    }] : [{
      fieldId: 'custom',
      fieldName: 'Özel Analiz',
      latitude: 38.575906,
      longitude: 31.849755
    }];

    const weatherBatch = await fetchOpenMeteoBatch(coordinates);

    if (!weatherBatch || weatherBatch.length === 0) {
      throw new Error('Hava durumu verileri alınamadı');
    }

    const weatherData = weatherBatch[0];

    // Özel don analizi
    const customAnalysis = analyzeCustomFrostRisk(
      weatherData.hourly,
      {
        cropType,
        plantingDate,
        expectedMinTemp,
        protectionMeasures
      }
    );

    return NextResponse.json({
      success: true,
      data: customAnalysis,
      timestamp: new Date().toISOString(),
      parameters: { fieldId, cropType, plantingDate, expectedMinTemp, protectionMeasures }
    });

  } catch (error) {
    console.error('Custom Frost Analysis API Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Özel don analizi tamamlanamadı',
      message: error instanceof Error ? error.message : 'Bilinmeyen hata'
    }, { status: 500 });
  }
}

/**
 * Gelişmiş don önerilerini oluşturur
 */
function generateEnhancedFrostRecommendations(
  frostAnalysis: any,
  irrigationCheck: any,
  conditions: any
): any {
  const recommendations = {
    immediate: [] as string[],
    preventive: [] as string[],
    longTerm: [] as string[],
    irrigation: [] as string[],
    equipment: [] as string[]
  };

  // Acil önlemler
  if (frostAnalysis.frostRiskLevel === 'CRITICAL') {
    recommendations.immediate.push(
      'ACİL: Tüm sulama işlemlerini durdurun',
      'Hassas bitkileri koruma altına alın',
      'Isıtma sistemlerini devreye alın',
      'Antifreeze kimyasalları uygulayın'
    );
  } else if (frostAnalysis.frostRiskLevel === 'HIGH') {
    recommendations.immediate.push(
      'Gece sulamasından kaçının',
      'Koruyucu örtüler hazırlayın',
      'Hassas alanları kontrol edin'
    );
  }

  // Koruyucu önlemler
  if (frostAnalysis.frostRiskLevel !== 'NONE') {
    recommendations.preventive.push(
      'Mulçlama yapın',
      'Rüzgar kesiciler kurun',
      'Toprak nemini koruyun',
      'Su birikintilerini boşaltın'
    );
  }

  // Uzun vadeli öneriler
  recommendations.longTerm.push(
    'Don dayanıklı çeşitler tercih edin',
    'Mikro iklim alanları oluşturun',
    'Otomatik koruma sistemi kurun',
    'Erken uyarı sistemi devreye alın'
  );

  // Sulama önerileri
  if (irrigationCheck.isSafeToIrrigate) {
    recommendations.irrigation.push(
      'Gündüz saatlerinde sulayın',
      'Toprak sıcaklığını kontrol edin'
    );
  } else {
    recommendations.irrigation.push(
      'Sulama yapmayın - don riski var',
      `${irrigationCheck.timeUntilSafe || 6} saat bekleyin`,
      'Sıcaklık yükselene kadar erteleyin'
    );
  }

  // Ekipman önerileri
  if (conditions.temperature < 5) {
    recommendations.equipment.push(
      'Termometre yerleştirin',
      'Otomatik sulama kontrol valfi',
      'Don sensörü sistemi',
      'Koruyucu örtü malzemeleri'
    );
  }

  return recommendations;
}

/**
 * Don uyarıları oluşturur
 */
function generateFrostAlerts(frostAnalysis: any, irrigationCheck: any): any[] {
  const alerts = [];

  if (frostAnalysis.frostRiskLevel === 'CRITICAL') {
    alerts.push({
      type: 'CRITICAL',
      title: 'Kritik Don Riski',
      message: `Minimum sıcaklık ${frostAnalysis.minTemperature}°C olacak`,
      action: 'Acil koruma önlemleri alın',
      icon: '🚨'
    });
  }

  if (frostAnalysis.frostRiskLevel === 'HIGH') {
    alerts.push({
      type: 'WARNING',
      title: 'Yüksek Don Riski',
      message: 'Gece saatlerinde dikkatli olun',
      action: 'Koruyucu önlemler alın',
      icon: '⚠️'
    });
  }

  if (!irrigationCheck.isSafeToIrrigate) {
    alerts.push({
      type: 'INFO',
      title: 'Sulama Uyarısı',
      message: 'Don riski nedeniyle sulama önerilmez',
      action: 'Gündüz saatlerini bekleyin',
      icon: '💧'
    });
  }

  if (frostAnalysis.cropDamageRisk.level === 'HIGH') {
    alerts.push({
      type: 'WARNING',
      title: 'Ürün Hasar Riski',
      message: `%${frostAnalysis.cropDamageRisk.estimatedDamage} hasar riski`,
      action: 'Hassas ürünleri koruyun',
      icon: '🌾'
    });
  }

  return alerts;
}

/**
 * Özel don risk analizi
 */
function analyzeCustomFrostRisk(hourlyData: any[], params: any): any {
  const { cropType, plantingDate, expectedMinTemp, protectionMeasures } = params;

  // Temel don analizi
  const baseFrostAnalysis = frostProtectionService.analyzeFrostRisk(hourlyData);

  // Ürün özel analizi
  const cropSpecificRisk = calculateCropSpecificRisk(
    baseFrostAnalysis.minTemperature,
    cropType,
    plantingDate
  );

  // Koruma önlemlerinin etkinliği
  const protectionEffectiveness = evaluateProtectionMeasures(
    protectionMeasures,
    baseFrostAnalysis.frostRiskLevel
  );

  return {
    baseFrostAnalysis,
    cropSpecificRisk,
    protectionEffectiveness,
    customRecommendations: generateCustomRecommendations(
      cropSpecificRisk,
      protectionEffectiveness,
      expectedMinTemp
    ),
    economicImpact: calculateEconomicImpact(
      cropSpecificRisk,
      protectionMeasures
    )
  };
}

/**
 * Ürün özel risk hesaplama
 */
function calculateCropSpecificRisk(minTemp: number, cropType: string, plantingDate?: string): any {
  const cropSensitivity: Record<string, { threshold: number; damage: number }> = {
    'TOMATO': { threshold: 4, damage: 80 },
    'PEPPER': { threshold: 4, damage: 85 },
    'CORN': { threshold: 2, damage: 60 },
    'WHEAT': { threshold: -2, damage: 30 },
    'BEAN': { threshold: 3, damage: 70 }
  };

  const sensitivity = cropSensitivity[cropType] || { threshold: 0, damage: 50 };
  const tempDiff = sensitivity.threshold - minTemp;

  return {
    cropType,
    threshold: sensitivity.threshold,
    riskLevel: tempDiff > 0 ? 'HIGH' : 'LOW',
    estimatedDamage: tempDiff > 0 ? Math.min(tempDiff * 20, sensitivity.damage) : 0,
    criticalHours: tempDiff > 2 ? 6 : tempDiff > 0 ? 3 : 0
  };
}

/**
 * Koruma önlemlerinin etkinliğini değerlendir
 */
function evaluateProtectionMeasures(measures: string[], riskLevel: string): any {
  const effectiveness = {
    coverage: 0,
    temperatureBoost: 0,
    cost: 0,
    recommendations: [] as string[]
  };

  measures.forEach(measure => {
    switch (measure) {
      case 'COVER':
        effectiveness.coverage += 30;
        effectiveness.temperatureBoost += 2;
        effectiveness.cost += 100;
        break;
      case 'HEATING':
        effectiveness.coverage += 50;
        effectiveness.temperatureBoost += 4;
        effectiveness.cost += 500;
        break;
      case 'MULCHING':
        effectiveness.coverage += 20;
        effectiveness.temperatureBoost += 1;
        effectiveness.cost += 50;
        break;
      case 'WINDBREAK':
        effectiveness.coverage += 15;
        effectiveness.temperatureBoost += 1;
        effectiveness.cost += 200;
        break;
    }
  });

  if (effectiveness.coverage < 70 && riskLevel === 'HIGH') {
    effectiveness.recommendations.push('Ek koruma önlemleri gerekli');
  }

  return effectiveness;
}

/**
 * Özel öneriler oluştur
 */
function generateCustomRecommendations(
  cropRisk: any,
  protection: any,
  expectedMinTemp?: number
): string[] {
  const recommendations = [];

  if (cropRisk.riskLevel === 'HIGH') {
    recommendations.push(`${cropRisk.cropType} için kritik sıcaklık altında!`);
    recommendations.push(`%${cropRisk.estimatedDamage} hasar riski var`);
  }

  if (protection.coverage < 50) {
    recommendations.push('Koruma kapsamını artırın');
  }

  if (expectedMinTemp && expectedMinTemp < cropRisk.threshold) {
    recommendations.push('Beklenen sıcaklık kritik seviyenin altında');
  }

  return recommendations;
}

/**
 * Ekonomik etki hesaplama
 */
function calculateEconomicImpact(cropRisk: any, protectionMeasures: string[]): any {
  const baseValue = 10000; // TL/dönüm
  const potentialLoss = (baseValue * cropRisk.estimatedDamage) / 100;
  const protectionCost = protectionMeasures.length * 150; // Ortalama maliyet

  return {
    potentialLoss,
    protectionCost,
    netSaving: potentialLoss - protectionCost,
    costBenefit: potentialLoss > 0 ? (potentialLoss - protectionCost) / protectionCost : 0
  };
}