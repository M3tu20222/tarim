// ==========================================
// 📅 16 GÜNLÜK HAVA DURUMU TAHMİNİ API
// Cache + Database sistemi ile optimize edilmiş
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fetchOpenMeteoBatch } from '@/lib/weather/openMeteoClient';

// Cache süresi: 6 saat
const CACHE_DURATION_HOURS = 6;

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
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Tarla bilgilerini al
    let field;
    if (fieldId) {
      field = await prisma.field.findFirst({
        where: {
          id: fieldId,
          // Erişim kontrolü
          ...(user.role === 'OWNER' && {
            owners: {
              some: { userId: user.id }
            }
          })
        },
        select: {
          id: true,
          name: true,
          location: true,
          coordinates: true
        }
      });
    } else {
      // İlk tarla
      field = await prisma.field.findFirst({
        where: {
          coordinates: { not: null },
          ...(user.role === 'OWNER' && {
            owners: {
              some: { userId: user.id }
            }
          })
        },
        select: {
          id: true,
          name: true,
          location: true,
          coordinates: true
        }
      });
    }

    if (!field || !field.coordinates) {
      return NextResponse.json(
        { error: 'Koordinatı olan tarla bulunamadı' },
        { status: 404 }
      );
    }

    // Koordinatları parse et (CSV veya JSON formatında olabilir)
    let coords;
    try {
      if (typeof field.coordinates === 'string' && field.coordinates.includes(',')) {
        // CSV format: "38.575906,31.849755" veya "38.573835, 31.853110" (boşluklu)
        const [lat, lng] = field.coordinates.split(',').map(s => Number(s.trim()));
        coords = { latitude: lat, longitude: lng };
      } else if (typeof field.coordinates === 'string') {
        // JSON format
        coords = JSON.parse(field.coordinates);
      } else {
        // Already an object
        coords = field.coordinates;
      }
    } catch (error) {
      console.error('Coordinate parsing error:', error, 'field.coordinates:', field.coordinates);
      return NextResponse.json(
        { error: 'Koordinat formatı geçersiz' },
        { status: 400 }
      );
    }

    const now = new Date();
    const cacheThreshold = new Date(now.getTime() - CACHE_DURATION_HOURS * 60 * 60 * 1000);

    // Database'den cache kontrolü
    if (!forceRefresh) {
      const cachedData = await prisma.weatherDailySummary.findMany({
        where: {
          fieldId: field.id,
          source: 'FORECAST',
          date: { gte: now },
          updatedAt: { gte: cacheThreshold }
        },
        orderBy: { date: 'asc' },
        take: 16
      });

      // Cache'de hourly yok, bu yüzden her zaman API'den çek
      // CACHE DEVRE DIŞI - Hourly verisi için
      console.log('⚠️ Cache bulundu ama hourly için API\'ye gidiyoruz');
    }

    // Cache yoksa veya eski, API'den çek
    const weatherData = await fetchOpenMeteoBatch([{
      fieldId: field.id,
      latitude: coords.latitude,
      longitude: coords.longitude
    }], {
      forecastDays: 16
    });

    if (weatherData.length === 0) {
      return NextResponse.json(
        { error: 'Hava durumu verisi alınamadı' },
        { status: 500 }
      );
    }

    const weather = weatherData[0];

    console.log('🌤️ Weather data received:', {
      dailyCount: weather.daily.length,
      hourlyCount: weather.hourly.length,
      firstDay: weather.daily[0],
      firstHour: weather.hourly[0]
    });

    // Daily verilerini formatla ve database'e kaydet
    const dailyForecast = await Promise.all(weather.daily.map(async (day, index) => {
      const forecastDate = new Date(day.date);

      // Database'e kaydet (upsert)
      await prisma.weatherDailySummary.upsert({
        where: {
          fieldId_date_source: {
            fieldId: field.id,
            date: forecastDate,
            source: 'FORECAST'
          }
        },
        update: {
          latitude: weather.latitude,
          longitude: weather.longitude,
          tMaxC: day.tMaxC || 0,
          tMinC: day.tMinC || 0,
          precipitationSumMm: day.precipitationSumMm || 0,
          shortwaveRadiationSumMj: day.shortwaveRadiationSumMj || 0,
          et0FaoEvapotranspiration: day.et0FaoEvapotranspiration || 0,
          rainfallProbability: day.rainfallProbability || 0,
          updatedAt: now
        },
        create: {
          fieldId: field.id,
          source: 'FORECAST',
          date: forecastDate,
          latitude: weather.latitude,
          longitude: weather.longitude,
          tMaxC: day.tMaxC || 0,
          tMinC: day.tMinC || 0,
          precipitationSumMm: day.precipitationSumMm || 0,
          shortwaveRadiationSumMj: day.shortwaveRadiationSumMj || 0,
          et0FaoEvapotranspiration: day.et0FaoEvapotranspiration || 0,
          rainfallProbability: day.rainfallProbability || 0
        }
      });

      return {
        date: day.date,
        tempMax: day.tMaxC || 0,
        tempMin: day.tMinC || 0,
        precipitation: day.precipitationSumMm || 0,
        precipitationProbability: day.rainfallProbability || 0,
        windSpeed: 0, // Daily'de windSpeed yok
        windDirection: 0,
        radiation: day.shortwaveRadiationSumMj || 0,
        et0: day.et0FaoEvapotranspiration || 0
      };
    }));

    // Hourly verilerini formatla (16 gün = 384 saat)
    const hourlyForecast = weather.hourly.slice(0, 16 * 24).map(hour => ({
      time: hour.timestamp.toISOString(),
      temperature: hour.temperature2m || 0,
      humidity: hour.relativeHumidity2m || 0,
      precipitation: hour.precipitationMm || 0,
      windSpeed: hour.windSpeed10m || 0,
      windDirection: hour.windDirection10m || 0,
      windGusts: hour.windGusts10m || hour.windSpeed10m || 0,
      radiation: hour.shortwaveRadiation || 0,
      et0: hour.et0FaoEvapotranspiration || 0,
      soilTemp: hour.soilTemperature0cm || 0,
      soilMoisture: hour.soilMoisture0_1cm || 0
    }));

    console.log('📦 Hourly forecast prepared:', {
      totalHours: hourlyForecast.length,
      firstHour: hourlyForecast[0],
      lastHour: hourlyForecast[hourlyForecast.length - 1]
    });

    return NextResponse.json({
      success: true,
      data: {
        field: {
          id: field.id,
          name: field.name,
          location: field.location,
          coordinates: {
            latitude: weather.latitude,
            longitude: weather.longitude
          }
        },
        daily: dailyForecast,
        hourly: hourlyForecast,
        summary: {
          totalDays: dailyForecast.length,
          avgTempMax: dailyForecast.length > 0
            ? dailyForecast.reduce((sum, d) => sum + (d.tempMax || 0), 0) / dailyForecast.length
            : 0,
          avgTempMin: dailyForecast.length > 0
            ? dailyForecast.reduce((sum, d) => sum + (d.tempMin || 0), 0) / dailyForecast.length
            : 0,
          totalPrecipitation: dailyForecast.reduce((sum, d) => sum + (d.precipitation || 0), 0),
          maxWindSpeed: dailyForecast.length > 0
            ? Math.max(...dailyForecast.map(d => d.windSpeed || 0))
            : 0
        }
      },
      timestamp: new Date().toISOString(),
      cached: false,
      nextUpdate: new Date(now.getTime() + CACHE_DURATION_HOURS * 60 * 60 * 1000).toISOString()
    });

  } catch (error) {
    console.error('16-day forecast API Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Hava durumu tahmin verileri alınamadı',
      message: error instanceof Error ? error.message : 'Bilinmeyen hata'
    }, { status: 500 });
  }
}