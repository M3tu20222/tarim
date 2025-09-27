import { NextResponse } from 'next/server';
import { WeatherDataService } from '@/lib/weather/weather-service';
import { prisma } from '@/lib/prisma';

// 📍 Tarla bazlı hava durumu API
export async function GET(request: Request, { params }: { params: { fieldId: string } }) {
  try {
    const fieldId = params.fieldId;

    // Tarla bilgilerini getir
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      select: {
        id: true,
        name: true,
        coordinates: true,
        location: true,
        crops: {
          select: {
            name: true,
            status: true
          }
        },
        fieldWells: {
          include: {
            well: {
              select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true
              }
            }
          }
        }
      }
    });

    if (!field) {
      return NextResponse.json({
        success: false,
        error: 'Tarla bulunamadı'
      }, { status: 404 });
    }

    const weatherService = new WeatherDataService();
    let locationSet = false;

    // 1. Öncelik: Tarla koordinatları
    if (field.coordinates) {
      locationSet = weatherService.setLocationFromField(field.coordinates);
    }

    // 2. Fallback: İlişkili kuyu koordinatları
    if (!locationSet && field.fieldWells && field.fieldWells.length > 0) {
      const wellsWithCoords = field.fieldWells.filter(fw =>
        fw.well.latitude && fw.well.longitude
      );

      if (wellsWithCoords.length > 0) {
        const well = wellsWithCoords[0].well;
        const coordString = `${well.latitude},${well.longitude}`;
        locationSet = weatherService.setLocationFromField(coordString);
      }
    }

    // 3. Final fallback: Default lokasyon (otomatik kuyu seçimi)
    if (!locationSet) {
      await weatherService.setLocationFromWells();
    }

    // Hava durumu verisini al
    const analysis = await weatherService.analyzeAgriculturalConditions();
    const forecast = await weatherService.get7DayForecast();
    const updateInfo = await weatherService.getLastUpdateInfo();

    return NextResponse.json({
      success: true,
      data: {
        field: {
          id: field.id,
          name: field.name,
          location: field.location,
          coordinates: field.coordinates,
          crops: field.crops,
          wellCount: field.fieldWells?.length || 0
        },
        weather: {
          analysis,
          forecast,
          updateInfo
        }
      }
    });

  } catch (error) {
    console.error('Field weather API error:', error);

    return NextResponse.json({
      success: false,
      error: 'Tarla hava durumu verisi alınamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    }, { status: 500 });
  }
}

// Cache süresi ayarı (1 saat)
export const revalidate = 60 * 60;