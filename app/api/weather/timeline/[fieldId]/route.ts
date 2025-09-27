import { NextResponse } from 'next/server';
import { WeatherSnapshotService } from '@/lib/weather/weather-snapshot-service';

const weatherSnapshotService = new WeatherSnapshotService();

interface TimelineQuery {
  startDate?: string;
  endDate?: string;
  includeProcesses?: boolean;
  includeIrrigation?: boolean;
  limit?: number;
}

export async function GET(request: Request, { params }: { params: { fieldId: string } }) {
  try {
    const fieldId = params.fieldId;
    const { searchParams } = new URL(request.url);

    // Query parametrelerini parse et
    const query: TimelineQuery = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      includeProcesses: searchParams.get('includeProcesses') === 'true',
      includeIrrigation: searchParams.get('includeIrrigation') === 'true',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    };

    // Tarih aralığını belirle (default: son 30 gün)
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 gün önce

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({
        success: false,
        error: 'Geçersiz tarih formatı'
      }, { status: 400 });
    }

    if (startDate > endDate) {
      return NextResponse.json({
        success: false,
        error: 'Başlangıç tarihi bitiş tarihinden büyük olamaz'
      }, { status: 400 });
    }

    // Weather snapshots'ları getir
    const snapshots = await weatherSnapshotService.getWeatherSnapshotsInRange(
      startDate,
      endDate,
      fieldId
    );

    // Timeline events'leri oluştur
    const timelineEvents = snapshots.map(snapshot => ({
      id: snapshot.id,
      timestamp: snapshot.timestamp,
      type: snapshot.processId ? 'process' : 'irrigation',
      weather: {
        temperature: snapshot.temperature,
        humidity: snapshot.humidity,
        windSpeed: snapshot.windSpeed,
        precipitation: snapshot.precipitation,
        soilMoisture: snapshot.soilMoisture,
        description: snapshot.description,
        riskLevel: snapshot.riskLevel
      },
      location: snapshot.location,
      processInfo: snapshot.process ? {
        id: snapshot.process.id,
        type: snapshot.process.type,
        description: snapshot.process.description
      } : null,
      irrigationInfo: snapshot.irrigationLog ? {
        id: snapshot.irrigationLog.id,
        duration: snapshot.irrigationLog.duration,
        amount: snapshot.irrigationLog.amount,
        method: snapshot.irrigationLog.method
      } : null,
      risks: snapshot.risks || [],
      irrigationAdvice: snapshot.irrigationAdvice
    }));

    // Filtreleme (eğer belirtilmişse)
    let filteredEvents = timelineEvents;
    if (query.includeProcesses === false) {
      filteredEvents = filteredEvents.filter(event => event.type !== 'process');
    }
    if (query.includeIrrigation === false) {
      filteredEvents = filteredEvents.filter(event => event.type !== 'irrigation');
    }

    // Limitlemе
    if (query.limit && query.limit > 0) {
      filteredEvents = filteredEvents.slice(0, query.limit);
    }

    // İstatistikleri hesapla
    const stats = {
      totalEvents: filteredEvents.length,
      processEvents: filteredEvents.filter(e => e.type === 'process').length,
      irrigationEvents: filteredEvents.filter(e => e.type === 'irrigation').length,
      avgTemperature: filteredEvents.length > 0
        ? filteredEvents.reduce((sum, e) => sum + e.weather.temperature, 0) / filteredEvents.length
        : 0,
      avgHumidity: filteredEvents.length > 0
        ? filteredEvents.reduce((sum, e) => sum + e.weather.humidity, 0) / filteredEvents.length
        : 0,
      totalPrecipitation: filteredEvents.reduce((sum, e) => sum + e.weather.precipitation, 0),
      totalIrrigationAmount: filteredEvents
        .filter(e => e.irrigationInfo?.amount)
        .reduce((sum, e) => sum + (e.irrigationInfo?.amount || 0), 0),
      riskDistribution: {
        low: filteredEvents.filter(e => e.weather.riskLevel <= 1).length,
        medium: filteredEvents.filter(e => e.weather.riskLevel === 2).length,
        high: filteredEvents.filter(e => e.weather.riskLevel === 3).length,
        critical: filteredEvents.filter(e => e.weather.riskLevel >= 4).length
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        fieldId,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          durationDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        },
        timeline: filteredEvents.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
        statistics: stats,
        filters: {
          includeProcesses: query.includeProcesses !== false,
          includeIrrigation: query.includeIrrigation !== false,
          limit: query.limit || null
        },
        lastUpdate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Weather timeline API error:', error);

    return NextResponse.json({
      success: false,
      error: 'Timeline verilerini alamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    }, { status: 500 });
  }
}

// Cache süresi ayarı (5 dakika)
export const revalidate = 300;