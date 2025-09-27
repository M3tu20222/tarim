import { NextResponse } from 'next/server';
import { WeatherDataService } from '@/lib/weather/weather-service';

// 📅 7 günlük hava durumu tahmini API
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    // Eğer koordinat verilmezse varsayılan lokasyon kullan
    const weatherService = lat && lng
      ? new WeatherDataService({ latitude: parseFloat(lat), longitude: parseFloat(lng) })
      : new WeatherDataService();

    // Son güncelleme bilgisi
    const updateInfo = await weatherService.getLastUpdateInfo();

    // 7 günlük tahmin verisi
    const forecast = await weatherService.get7DayForecast();

    return NextResponse.json({
      success: true,
      data: {
        forecast,
        updateInfo,
        location: {
          latitude: weatherService['location'].latitude,
          longitude: weatherService['location'].longitude,
          name: weatherService['location'].name
        }
      }
    });

  } catch (error) {
    console.error('Weather forecast API error:', error);

    return NextResponse.json({
      success: false,
      error: 'Hava durumu tahmini alınamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    }, { status: 500 });
  }
}

// Cache süresi ayarı (3 saat)
export const revalidate = 10800; // 3 hours