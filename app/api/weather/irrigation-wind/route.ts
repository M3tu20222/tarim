// ==========================================
// 🌬️ RÜZGAR BAZLI SULAMA ANALİZ API
// ==========================================

import { NextResponse } from 'next/server';
import { windIrrigationService } from '@/lib/weather/irrigation-wind-service';
import { fetchOpenMeteoBatch } from '@/lib/weather/openMeteoClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = parseFloat(searchParams.get('lat') || '38.575906');
    const longitude = parseFloat(searchParams.get('lng') || '31.849755');
    const cropType = searchParams.get('crop') || 'WHEAT';

    // Hava durumu verilerini al
    const coordinates = [{
      fieldId: 'analysis',
      fieldName: 'Analiz Alanı',
      latitude,
      longitude
    }];

    const weatherData = await fetchOpenMeteoBatch(coordinates);

    if (!weatherData || weatherData.length === 0) {
      throw new Error('Hava durumu verileri alınamadı');
    }

    const hourlyData = weatherData[0].hourly;

    // Rüzgar bazlı sulama analizi
    const irrigationAnalysis = windIrrigationService.analyzeIrrigationSafety(hourlyData);

    // Ürün yanıklık riski analizi
    const burnRisk = windIrrigationService.analyzeCropBurnRisk(hourlyData, cropType);

    // Yaprak ıslaklık analizi (hastalık riski)
    const leafWetness = windIrrigationService.calculateLeafWetnessDuration(hourlyData);

    // Mevcut rüzgar koşulları
    const currentConditions = {
      windSpeed: hourlyData[0]?.windSpeed10m || 0,
      windDirection: hourlyData[0]?.windDirection10m || 0,
      windGusts: hourlyData[0]?.windGusts10m,
      temperature: hourlyData[0]?.temperature2m || 0,
      humidity: hourlyData[0]?.relativeHumidity2m || 0,
      soilTemperature: hourlyData[0]?.soilTemperature0cm || 0,
      soilMoisture: hourlyData[0]?.soilMoisture0_1cm || 0
    };

    // Genel sulama önerisi
    const overallRecommendation = generateOverallRecommendation(
      irrigationAnalysis,
      burnRisk,
      leafWetness
    );

    return NextResponse.json({
      success: true,
      data: {
        location: { latitude, longitude },
        cropType,
        currentConditions,
        irrigationAnalysis,
        burnRisk,
        leafWetness,
        overallRecommendation,
        safestHours: irrigationAnalysis.safestHours,
        nextUpdate: new Date(Date.now() + 3600000).toISOString() // 1 saat sonra
      },
      timestamp: new Date().toISOString(),
      cacheExpires: 30 // 30 dakika cache
    });

  } catch (error) {
    console.error('Irrigation Wind Analysis API Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Rüzgar analizi tamamlanamadı',
      message: error instanceof Error ? error.message : 'Bilinmeyen hata',
      data: null
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      latitude = 38.575906,
      longitude = 31.849755,
      cropType = 'WHEAT',
      fieldConditions,
      plannedIrrigationTime
    } = body;

    // Hava durumu verilerini al
    const coordinates = [{
      fieldId: 'custom-analysis',
      fieldName: 'Özel Analiz',
      latitude,
      longitude
    }];

    const weatherData = await fetchOpenMeteoBatch(coordinates);

    if (!weatherData || weatherData.length === 0) {
      throw new Error('Hava durumu verileri alınamadı');
    }

    const hourlyData = weatherData[0].hourly;

    // Özel sulama zamanlaması analizi
    const customAnalysis = analyzeCustomIrrigationTiming(
      hourlyData,
      plannedIrrigationTime,
      cropType,
      fieldConditions
    );

    return NextResponse.json({
      success: true,
      data: customAnalysis,
      timestamp: new Date().toISOString(),
      parameters: { latitude, longitude, cropType, fieldConditions, plannedIrrigationTime }
    });

  } catch (error) {
    console.error('Custom Irrigation Wind Analysis API Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Özel sulama analizi tamamlanamadı',
      message: error instanceof Error ? error.message : 'Bilinmeyen hata'
    }, { status: 500 });
  }
}

/**
 * Genel sulama önerisini oluşturur
 */
function generateOverallRecommendation(
  irrigation: any,
  burnRisk: any,
  leafWetness: any
): {
  action: 'IRRIGATE_NOW' | 'IRRIGATE_CAREFULLY' | 'WAIT' | 'STOP';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  bestMethod: 'sprinkler' | 'drip' | 'manual';
  estimatedDelay?: number;
} {
  const reasons: string[] = [];
  let action: 'IRRIGATE_NOW' | 'IRRIGATE_CAREFULLY' | 'WAIT' | 'STOP' = 'IRRIGATE_NOW';
  let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  let bestMethod: 'sprinkler' | 'drip' | 'manual' = 'sprinkler';

  // Kritik durum kontrolü
  if (irrigation.windRiskLevel === 'CRITICAL' || burnRisk.riskLevel === 'CRITICAL') {
    action = 'STOP';
    priority = 'CRITICAL';
    bestMethod = 'manual';
    reasons.push('Kritik rüzgar/yanıklık riski - tüm sulama durdurulmalı');
  }
  // Batı rüzgarı kontrolü
  else if (irrigation.riskFactors.isWestWind && burnRisk.riskLevel === 'HIGH') {
    action = 'WAIT';
    priority = 'HIGH';
    bestMethod = 'drip';
    reasons.push('Batı rüzgarı + yüksek sıcaklık - yanıklık riski');
  }
  // Yüksek rüzgar
  else if (irrigation.windRiskLevel === 'HIGH') {
    action = 'WAIT';
    priority = 'MEDIUM';
    bestMethod = 'drip';
    reasons.push('Yüksek rüzgar hızı - fıskiye etkisiz');
  }
  // Orta risk
  else if (irrigation.windRiskLevel === 'MEDIUM') {
    action = 'IRRIGATE_CAREFULLY';
    priority = 'MEDIUM';
    bestMethod = irrigation.irrigationMethod;
    reasons.push('Dikkatli sulama - düşük basınç önerilir');
  }
  // Düşük risk
  else {
    action = 'IRRIGATE_NOW';
    priority = 'LOW';
    bestMethod = 'sprinkler';
    reasons.push('İdeal sulama koşulları');
  }

  // Hastalık riski ekle
  if (leafWetness.diseaseRisk === 'HIGH') {
    if (action === 'IRRIGATE_NOW') {
      action = 'IRRIGATE_CAREFULLY';
    }
    reasons.push('Yüksek hastalık riski - yaprak ıslaklığını artırmayın');
  }

  return {
    action,
    priority,
    reasons,
    bestMethod,
    estimatedDelay: irrigation.waitUntilHour
  };
}

/**
 * Özel sulama zamanlaması analizi
 */
function analyzeCustomIrrigationTiming(
  hourlyData: any[],
  plannedTime: string,
  cropType: string,
  fieldConditions: any
): any {
  const plannedHour = new Date(plannedTime).getHours();

  // Planlanan saatteki hava durumu
  const plannedWeather = hourlyData[plannedHour] || hourlyData[0];

  // O saatteki risk analizi
  const hourlyAnalysis = windIrrigationService.analyzeIrrigationSafety([plannedWeather]);
  const burnRisk = windIrrigationService.analyzeCropBurnRisk([plannedWeather], cropType);

  // Alan koşullarına göre risk faktörleri
  const fieldRiskFactors = calculateFieldRiskFactors(fieldConditions, plannedWeather);

  // Alternatif zaman önerileri
  const alternatives = windIrrigationService.analyzeIrrigationSafety(hourlyData).safestHours;

  return {
    plannedTime,
    plannedHour,
    isRecommended: hourlyAnalysis.isIrrigationSafe && burnRisk.riskLevel !== 'CRITICAL',
    riskAnalysis: {
      wind: hourlyAnalysis,
      burn: burnRisk,
      field: fieldRiskFactors
    },
    alternatives: alternatives.slice(0, 3), // En iyi 3 alternatif
    recommendations: generateTimingRecommendations(hourlyAnalysis, burnRisk, fieldRiskFactors),
    estimatedEfficiency: calculateIrrigationEfficiency(hourlyAnalysis, plannedWeather),
    waterSavingTips: generateWaterSavingTips(hourlyAnalysis, fieldConditions)
  };
}

/**
 * Alan koşullarına göre risk faktörlerini hesaplar
 */
function calculateFieldRiskFactors(fieldConditions: any, weather: any): any {
  return {
    soilType: fieldConditions?.soilType || 'UNKNOWN',
    drainage: fieldConditions?.drainage || 'MEDIUM',
    slope: fieldConditions?.slope || 'FLAT',
    exposure: fieldConditions?.exposure || 'OPEN',
    riskScore: 'MEDIUM', // Simplified calculation
    specificRisks: []
  };
}

/**
 * Zamanlama önerilerini oluşturur
 */
function generateTimingRecommendations(
  windAnalysis: any,
  burnRisk: any,
  fieldFactors: any
): string[] {
  const recommendations: string[] = [];

  if (windAnalysis.isIrrigationSafe && burnRisk.riskLevel === 'LOW') {
    recommendations.push('✅ Planlanan zaman ideal');
  } else {
    recommendations.push('⚠️ Planlanan zamanda risk var');

    if (windAnalysis.windRiskLevel === 'HIGH') {
      recommendations.push('Rüzgar çok yüksek - başka saat seçin');
    }

    if (burnRisk.riskLevel === 'HIGH') {
      recommendations.push('Yanıklık riski - gece saatlerini tercih edin');
    }
  }

  return recommendations;
}

/**
 * Sulama verimliliğini hesaplar
 */
function calculateIrrigationEfficiency(windAnalysis: any, weather: any): number {
  let efficiency = 100;

  // Rüzgar etkisi
  efficiency -= windAnalysis.windSpeedKmh * 2;

  // Sıcaklık etkisi
  if (weather.temperature2m > 25) {
    efficiency -= (weather.temperature2m - 25) * 3;
  }

  // Nem etkisi
  if (weather.relativeHumidity2m < 50) {
    efficiency -= (50 - weather.relativeHumidity2m) * 1.5;
  }

  return Math.max(Math.round(efficiency), 20);
}

/**
 * Su tasarrufu ipuçları
 */
function generateWaterSavingTips(windAnalysis: any, fieldConditions: any): string[] {
  const tips: string[] = [];

  if (windAnalysis.windSpeedKmh > 10) {
    tips.push('Damla sulama ile %30 su tasarrufu sağlayabilirsiniz');
  }

  if (windAnalysis.riskFactors.isWestWind) {
    tips.push('Gece sulamayla buharlaşmayı %40 azaltın');
  }

  tips.push('Toprak nemini ölçerek gereksiz sulamayı önleyin');
  tips.push('Mulçlama ile toprak nemini koruyun');

  return tips;
}