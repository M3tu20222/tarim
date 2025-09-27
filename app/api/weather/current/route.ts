// ==========================================
// 🌤️ CURRENT WEATHER API ENDPOINT
// ==========================================

import { NextResponse } from 'next/server';
import { WeatherDataService } from '@/lib/weather/weather-service';

const weatherService = new WeatherDataService();

export async function GET() {
  try {
    const analysis = await weatherService.analyzeAgriculturalConditions();

    return NextResponse.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Weather API Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Weather data could not be fetched',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { latitude, longitude, elevation, name } = await request.json();

    // Custom location ile service oluştur
    const customWeatherService = new WeatherDataService({
      latitude: latitude || 38.574,
      longitude: longitude || 31.857,
      elevation: elevation || 1100,
      name: name || 'Custom Location'
    });

    const analysis = await customWeatherService.analyzeAgriculturalConditions();

    return NextResponse.json({
      success: true,
      data: analysis,
      location: { latitude, longitude, elevation, name },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Custom Weather API Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Custom weather data could not be fetched',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}