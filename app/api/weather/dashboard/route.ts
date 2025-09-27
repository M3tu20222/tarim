// ==========================================
// 📊 WEATHER DASHBOARD API ENDPOINT
// ==========================================

import { NextResponse } from 'next/server';
import { WeatherDataService } from '@/lib/weather/weather-service';

const weatherService = new WeatherDataService();

export async function GET() {
  try {
    const summary = await weatherService.getDashboardSummary();
    const updateInfo = await weatherService.getLastUpdateInfo();

    return NextResponse.json({
      success: true,
      data: {
        ...summary,
        updateInfo
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Weather Dashboard API Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Weather dashboard data could not be fetched',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}