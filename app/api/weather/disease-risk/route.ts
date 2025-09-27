// ==========================================
// 🦠 DISEASE RISK ANALYSIS API
// ==========================================

import { NextResponse } from 'next/server';
import { WeatherDataService } from '@/lib/weather/weather-service';

const weatherService = new WeatherDataService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cropType = searchParams.get('crop') || 'WHEAT';

    const analysis = await weatherService.analyzeAgriculturalConditions();

    // Hastalık risklerini filtrele ve detaylandır
    const diseaseRisks = analysis.disease.map(risk => ({
      ...risk,
      cropType,
      weatherConditions: {
        temperature: analysis.current.temperature,
        humidity: analysis.current.humidity,
        soilTemp: analysis.soil.temperature.surface
      },
      preventiveMeasures: getPreventiveMeasures(risk.disease, risk.riskLevel),
      treatmentSchedule: getTreatmentSchedule(risk.disease, risk.riskLevel),
      expectedCost: calculateTreatmentCost(risk.riskLevel, cropType)
    }));

    return NextResponse.json({
      success: true,
      data: {
        cropType,
        totalRisks: diseaseRisks.length,
        highRisks: diseaseRisks.filter(r => r.riskLevel >= 3).length,
        risks: diseaseRisks,
        overallRiskLevel: Math.max(...diseaseRisks.map(r => r.riskLevel), 0),
        recommendations: generateDiseaseRecommendations(diseaseRisks)
      },
      timestamp: new Date().toISOString(),
      location: analysis.location.name
    });
  } catch (error) {
    console.error('Disease Risk API Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Disease risk analysis could not be completed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { cropType, fieldConditions, symptoms } = await request.json();

    const analysis = await weatherService.analyzeAgriculturalConditions();

    // Custom risk analysis based on field conditions and symptoms
    const customAnalysis = await analyzeCustomDiseaseRisk(
      analysis,
      { cropType, fieldConditions, symptoms }
    );

    return NextResponse.json({
      success: true,
      data: customAnalysis,
      timestamp: new Date().toISOString(),
      parameters: { cropType, fieldConditions, symptoms }
    });
  } catch (error) {
    console.error('Custom Disease Analysis API Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Custom disease analysis could not be completed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getPreventiveMeasures(disease: string, riskLevel: number): string[] {
  const baseMeasures = [
    'Bitkileri düzenli kontrol edin',
    'Havalandırmayı artırın',
    'Sulama zamanlamasını ayarlayın'
  ];

  if (riskLevel >= 2) {
    baseMeasures.push(
      'Koruyucu fungusit uygulaması planlayın',
      'Enfekte yaprakları temizleyin',
      'Bitki arası mesafeyi kontrol edin'
    );
  }

  if (riskLevel >= 3) {
    baseMeasures.push(
      'Acil koruyucu ilaçlama yapın',
      'Sistemik fungusit kullanın',
      'Gübreleme programını gözden geçirin'
    );
  }

  if (riskLevel >= 4) {
    baseMeasures.push(
      'ACİL sistemik + kontak fungusit',
      'Enfekte bitkileri izole edin',
      '7-10 gün arayla ilaçlama tekrarı',
      'Uzman desteği alın'
    );
  }

  return baseMeasures;
}

function getTreatmentSchedule(disease: string, riskLevel: number) {
  const treatments: Record<string, string[]> = {
    'Mantar Hastalıkları (Külleme, Mildiyö)': [
      'Tebuconazole',
      'Propiconazole',
      'Azoxystrobin'
    ],
    'Erken Yanıklık, Septoria': [
      'Chlorothalonil',
      'Mancozeb',
      'Azoxystrobin'
    ]
  };

  const schedule = {
    immediateAction: riskLevel >= 3,
    chemicals: treatments[disease] || ['Genel fungusit'],
    dosage: `${100 + (riskLevel * 50)} ml/da`,
    intervals: riskLevel >= 3 ? [3, 7, 14] : [7, 14],
    applicationMethod: riskLevel >= 3 ? 'Sistemik + Kontak' : 'Koruyucu',
    ppe: [
      'Eldiven',
      'Maske',
      ...(riskLevel >= 3 ? ['Tulum', 'Gözlük'] : [])
    ]
  };

  return schedule;
}

function calculateTreatmentCost(riskLevel: number, cropType: string): number {
  // Base cost per decare
  const baseCost = 150; // TL/da
  const riskMultiplier = 1 + (riskLevel * 0.3);

  const cropMultiplier: Record<string, number> = {
    'TOMATO': 1.5,
    'GRAPE': 1.3,
    'APPLE': 1.4,
    'WHEAT': 1.0,
    'CORN': 1.1
  };

  return Math.round(baseCost * riskMultiplier * (cropMultiplier[cropType] || 1.0));
}

function generateDiseaseRecommendations(risks: any[]): string[] {
  const recommendations: string[] = [];

  const highRisks = risks.filter(r => r.riskLevel >= 3);
  const mediumRisks = risks.filter(r => r.riskLevel === 2);

  if (highRisks.length > 0) {
    recommendations.push(
      '🚨 ACIL: Yüksek hastalık riski tespit edildi!',
      `${highRisks.length} hastalık için acil müdahale gerekli`,
      'Sistemik fungusit uygulamasını hemen başlatın'
    );
  }

  if (mediumRisks.length > 0) {
    recommendations.push(
      '⚠️ Orta seviye risk: Koruyucu önlemler alın',
      'Haftalık bitki kontrolü yapın',
      'Havalandırma ve sulama programını gözden geçirin'
    );
  }

  if (risks.length === 0) {
    recommendations.push(
      '✅ Hastalık riski düşük',
      'Mevcut koruyucu programı sürdürün',
      'Haftalık izlemeye devam edin'
    );
  }

  return recommendations;
}

async function analyzeCustomDiseaseRisk(analysis: any, params: any) {
  const { cropType, fieldConditions, symptoms } = params;

  // Symptom-based disease identification
  const possibleDiseases = identifyDiseasesBySymptoms(symptoms);

  // Risk calculation based on field conditions
  const riskFactors = calculateRiskFactors(analysis, fieldConditions);

  return {
    cropType,
    fieldConditions,
    symptoms,
    possibleDiseases,
    riskFactors,
    overallRisk: Math.max(...possibleDiseases.map(d => d.probability), 0),
    recommendations: generateCustomRecommendations(possibleDiseases, riskFactors),
    urgentActions: getUrgentActions(possibleDiseases),
    estimatedCost: calculateTotalTreatmentCost(possibleDiseases, cropType)
  };
}

function identifyDiseasesBySymptoms(symptoms: string[]): any[] {
  const diseaseSymptoms: Record<string, string[]> = {
    'Külleme': ['beyaz toz', 'yaprak lekesi', 'solma'],
    'Mildiyö': ['sarı leke', 'yaprak altı beyaz', 'kahverengi leke'],
    'Pas': ['turuncu leke', 'kabarcık', 'yaprak kuruması'],
    'Septoria': ['koyu leke', 'halka şekli', 'yaprak sararmasi']
  };

  const matches = [];
  for (const [disease, diseaseSymptoms] of Object.entries(diseaseSymptoms)) {
    const matchCount = symptoms.filter(s =>
      diseaseSymptoms.some(ds => s.toLowerCase().includes(ds.toLowerCase()))
    ).length;

    if (matchCount > 0) {
      matches.push({
        disease,
        probability: Math.min((matchCount / diseaseSymptoms.length) * 100, 95),
        matchedSymptoms: symptoms.filter(s =>
          diseaseSymptoms.some(ds => s.toLowerCase().includes(ds.toLowerCase()))
        )
      });
    }
  }

  return matches.sort((a, b) => b.probability - a.probability);
}

function calculateRiskFactors(analysis: any, fieldConditions: any): any {
  return {
    weather: {
      temperature: analysis.current.temperature,
      humidity: analysis.current.humidity,
      riskScore: analysis.current.humidity > 85 ? 'HIGH' : 'MEDIUM'
    },
    field: {
      drainage: fieldConditions.drainage || 'UNKNOWN',
      density: fieldConditions.plantDensity || 'NORMAL',
      previousTreatment: fieldConditions.lastTreatment || 'NONE'
    },
    overall: 'MEDIUM' // Simplified calculation
  };
}

function generateCustomRecommendations(diseases: any[], riskFactors: any): string[] {
  const recommendations = [];

  if (diseases.length > 0) {
    const highProbDiseases = diseases.filter(d => d.probability > 70);

    if (highProbDiseases.length > 0) {
      recommendations.push(
        `Yüksek olasılıkla ${highProbDiseases[0].disease} tespit edildi`,
        'Acil fungusit uygulaması yapın',
        'Enfekte alanları izole edin'
      );
    }
  }

  if (riskFactors.weather.riskScore === 'HIGH') {
    recommendations.push(
      'Hava koşulları hastalık gelişimine uygun',
      'Koruyucu ilaçlama programını hızlandırın'
    );
  }

  return recommendations;
}

function getUrgentActions(diseases: any[]): string[] {
  const urgentActions = [];
  const highRiskDiseases = diseases.filter(d => d.probability > 80);

  if (highRiskDiseases.length > 0) {
    urgentActions.push(
      '24 saat içinde sistemik fungusit uygulayın',
      'Enfekte bitki kısımlarını derhal temizleyin',
      'Sulama sistemini kontrol edin',
      'Uzman görüşü alın'
    );
  }

  return urgentActions;
}

function calculateTotalTreatmentCost(diseases: any[], cropType: string): number {
  if (diseases.length === 0) return 0;

  const avgProbability = diseases.reduce((sum, d) => sum + d.probability, 0) / diseases.length;
  const riskLevel = avgProbability > 80 ? 4 : avgProbability > 60 ? 3 : 2;

  return calculateTreatmentCost(riskLevel, cropType);
}