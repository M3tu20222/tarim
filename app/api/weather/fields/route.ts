// ==========================================
// 🌾 TARLA BAZLI HAVA DURUMU API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { fieldWeatherService } from '@/lib/weather/field-weather-service';

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
    const summaryOnly = searchParams.get('summary') === 'true';

    if (fieldId) {
      // Tek tarla için detaylı hava durumu
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

      return NextResponse.json({
        success: true,
        data: fieldWeather,
        timestamp: new Date().toISOString()
      });
    }

    if (summaryOnly) {
      // Özet bilgiler
      const summary = await fieldWeatherService.getFieldsRiskSummary(
        user.id,
        user.role
      );

      return NextResponse.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      });
    }

    // Tüm tarlaların hava durumu verileri
    const fieldsWeather = await fieldWeatherService.getFieldsWeatherData(
      user.id,
      user.role
    );

    return NextResponse.json({
      success: true,
      data: {
        fields: fieldsWeather,
        count: fieldsWeather.length
      },
      timestamp: new Date().toISOString(),
      cacheExpires: 10 // 10 dakika cache
    });

  } catch (error) {
    console.error('Fields Weather API Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Tarla hava durumu verileri alınamadı',
      message: error instanceof Error ? error.message : 'Bilinmeyen hata'
    }, { status: 500 });
  }
}