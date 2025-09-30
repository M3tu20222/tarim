// TEST ENDPOINT - OpenMeteo'dan veri gelip gelmediğini kontrol et
// PUBLIC endpoint - auth gerekmez
import { NextResponse } from 'next/server';
import { fetchOpenMeteoBatch } from '@/lib/weather/openMeteoClient';

export async function GET() {
  try {
    console.log('🧪 TEST: OpenMeteo veri çekme başladı...');

    const testCoords = [{
      fieldId: 'test-field',
      fieldName: 'Test Field',
      latitude: 38.573835,
      longitude: 31.853110
    }];

    const result = await fetchOpenMeteoBatch(testCoords, {
      forecastDays: 16
    });

    console.log('✅ TEST: Veri geldi!', {
      dailyCount: result[0]?.daily.length,
      hourlyCount: result[0]?.hourly.length,
      firstDaily: result[0]?.daily[0],
      firstHourly: result[0]?.hourly[0]
    });

    return NextResponse.json({
      success: true,
      message: 'OpenMeteo API çalışıyor!',
      data: {
        dailyCount: result[0]?.daily.length || 0,
        hourlyCount: result[0]?.hourly.length || 0,
        sampleDaily: result[0]?.daily.slice(0, 3),
        sampleHourly: result[0]?.hourly.slice(0, 3)
      }
    });
  } catch (error) {
    console.error('❌ TEST HATASI:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}