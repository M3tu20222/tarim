// ==========================================
// 💧 IRRIGATION RECOMMENDATIONS API
// ==========================================

import { NextResponse } from 'next/server';
import { WeatherDataService } from '@/lib/weather/weather-service';

const weatherService = new WeatherDataService();

export async function GET() {
  try {
    const analysis = await weatherService.analyzeAgriculturalConditions();

    // Sulama önerileri extract et
    const irrigationPlan = {
      needed: analysis.irrigation.needed,
      priority: analysis.irrigation.priority,
      amount: analysis.irrigation.amount,
      startTime: analysis.irrigation.startTime,
      duration: analysis.irrigation.duration,
      reason: analysis.irrigation.reason,
      soilMoisture: {
        current: analysis.soil.moisture,
        surfaceTemp: analysis.soil.temperature.surface
      },
      weather: {
        temperature: analysis.current.temperature,
        humidity: analysis.current.humidity,
        precipitation: analysis.current.precipitation
      },
      risks: analysis.risks.filter(risk =>
        risk.type === 'FROST' || risk.type === 'WIND' || risk.type === 'FLOOD'
      )
    };

    return NextResponse.json({
      success: true,
      data: irrigationPlan,
      timestamp: new Date().toISOString(),
      location: analysis.location.name
    });
  } catch (error) {
    console.error('Irrigation API Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Irrigation recommendations could not be fetched',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { cropType, soilType, area, currentMoisture } = await request.json();

    const analysis = await weatherService.analyzeAgriculturalConditions();

    // Customize irrigation plan based on crop and soil type
    const customPlan = calculateCustomIrrigationPlan(
      analysis,
      { cropType, soilType, area, currentMoisture }
    );

    return NextResponse.json({
      success: true,
      data: customPlan,
      timestamp: new Date().toISOString(),
      parameters: { cropType, soilType, area, currentMoisture }
    });
  } catch (error) {
    console.error('Custom Irrigation API Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Custom irrigation plan could not be calculated',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function calculateCustomIrrigationPlan(analysis: any, params: any) {
  const { cropType, soilType, area, currentMoisture } = params;

  // Crop coefficients (Kc)
  const cropCoefficients: Record<string, number> = {
    'WHEAT': 1.15,
    'CORN': 1.20,
    'TOMATO': 1.15,
    'SUNFLOWER': 1.00,
    'POTATO': 1.10,
    'APPLE': 0.95,
    'GRAPE': 0.70
  };

  // Soil water holding capacity
  const soilCapacity: Record<string, number> = {
    'CLAY': 0.45,
    'LOAM': 0.35,
    'SANDY': 0.25,
    'SILT': 0.40
  };

  const kc = cropCoefficients[cropType] || 1.0;
  const capacity = soilCapacity[soilType] || 0.35;
  const moisture = currentMoisture || analysis.soil.moisture.layer1;

  // Calculate ETc (Crop Evapotranspiration)
  const et0 = 4; // Default ET0, should come from weather data
  const etc = et0 * kc;

  // Calculate irrigation need
  const criticalLevel = capacity * 0.5;
  const waterDeficit = etc - (analysis.current.precipitation || 0);

  let irrigationAmount = 0;
  let priority = 'LOW';
  let reason = 'No irrigation needed';

  if (moisture < criticalLevel && waterDeficit > 0) {
    irrigationAmount = Math.min((capacity - moisture) * 100, 40); // Max 40mm
    priority = moisture < criticalLevel * 0.5 ? 'URGENT' : 'HIGH';
    reason = `${cropType} için kritik nem seviyesi`;
  }

  // Calculate total water needed for the area
  const totalWaterM3 = (area * irrigationAmount * 10); // area(ha) * mm * 10 = m³

  return {
    ...analysis.irrigation,
    cropSpecific: {
      cropType,
      cropCoefficient: kc,
      soilType,
      soilCapacity: capacity,
      currentMoisture: moisture,
      criticalMoisture: criticalLevel,
      etc: etc,
      customAmount: irrigationAmount,
      customPriority: priority,
      customReason: reason,
      totalWaterM3: totalWaterM3,
      estimatedCost: totalWaterM3 * 2.5, // 2.5 TL/m³ (örnek fiyat)
      duration: Math.ceil(irrigationAmount * 6) // 6 dakika/mm
    }
  };
}