"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CloudRain,
  Wind,
  Thermometer,
  Droplets,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Calendar,
} from "lucide-react";
import { FieldSelector } from "@/components/weather/field-selector";
import SimpleLineChart from "@/components/weather/simple-line-chart";
import SimpleBarChart from "@/components/weather/simple-bar-chart";
import SimpleMultiLineChart from "@/components/weather/simple-multi-line-chart";

interface HourlyData {
  time: string;
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
}

interface ForecastData {
  field: {
    id: string;
    name: string;
    location: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  hourly: HourlyData[];
  summary: {
    totalDays: number;
    avgTempMax: number;
    avgTempMin: number;
    totalPrecipitation: number;
    maxWindSpeed: number;
  };
}

export default function ForecastPage() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [daysView, setDaysView] = useState<3 | 7 | 16>(7);

  const fetchForecastData = async (fieldId?: string | null) => {
    try {
      setLoading(true);
      setError(null);

      const url = fieldId
        ? `/api/weather/forecast/16day?fieldId=${fieldId}`
        : '/api/weather/forecast/16day';

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Tahmin verileri alınamadı');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'API yanıt hatası');
      }

      console.log('🔍 API Response:', {
        success: result.success,
        hasData: !!result.data,
        hasHourly: !!result.data?.hourly,
        hourlyLength: result.data?.hourly?.length || 0,
        hasSummary: !!result.data?.summary,
        firstHourly: result.data?.hourly?.[0]
      });

      setData(result.data);

      console.log('✅ Data SET edildi:', {
        dataSet: !!result.data,
        hourlySet: !!result.data?.hourly,
        hourlyCount: result.data?.hourly?.length
      });
      setIsCached(result.cached || false);
      setCacheAge(result.cacheAge || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri yükleme hatası');
      console.error('Forecast fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldSelect = (fieldId: string | null) => {
    setSelectedFieldId(fieldId);
    fetchForecastData(fieldId);
  };

  useEffect(() => {
    fetchForecastData(selectedFieldId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Saatlik veriyi filtrele
  const filteredHourlyData = React.useMemo(() => {
    console.log('🔄 Filtering hourly data:', {
      hasData: !!data,
      hasHourly: !!data?.hourly,
      hourlyLength: data?.hourly?.length,
      hourlyType: typeof data?.hourly,
      isArray: Array.isArray(data?.hourly),
      firstItem: data?.hourly?.[0]
    });

    if (!data?.hourly) {
      console.warn('⚠️ No hourly data');
      return [];
    }

    const hoursToShow = daysView * 24;
    const filtered = data.hourly.slice(0, hoursToShow);
    console.log(`✅ Filtered to ${filtered.length} hours`);
    return filtered;
  }, [data?.hourly, daysView]);

  // Grafik verisi (her 3 saatte bir)
  const chartData = React.useMemo(() => {
    if (!filteredHourlyData || filteredHourlyData.length === 0) {
      console.log('⚠️ No hourly data');
      return [];
    }

    const processed = filteredHourlyData
      .filter((_, index) => index % 3 === 0)
      .map(hour => {
        const time = new Date(hour.time);
        return {
          time: time.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) + ' ' +
                time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          temperature: Math.round((hour.temperature || 0) * 10) / 10,
          humidity: Math.round(hour.humidity || 0),
          precipitation: Math.round((hour.precipitation || 0) * 100) / 100,
          windSpeed: Math.round((hour.windSpeed || 0) * 10) / 10
        };
      });

    console.log('📊 Chart data processed:', {
      hourlyCount: filteredHourlyData.length,
      chartPoints: processed.length,
      firstPoint: processed[0],
      lastPoint: processed[processed.length - 1],
      dataKeys: processed.length > 0 ? Object.keys(processed[0]) : [],
      sampleValues: processed.slice(0, 3)
    });

    return processed;
  }, [filteredHourlyData]);

  if (loading && !data) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mr-2 sm:mr-3 text-blue-500" />
          <span className="text-sm sm:text-lg">Hava durumu yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Hata: {error}</AlertDescription>
        </Alert>
        <Button onClick={() => fetchForecastData(selectedFieldId)} className="mt-4 w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Tekrar Dene
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            16 Günlük Tahmin
            {isCached && (
              <Badge variant="secondary" className="text-xs">
                Cache ({cacheAge} dk)
              </Badge>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Detaylı hava durumu grafikleri ve tahminler
          </p>
        </div>
        <Button
          onClick={() => fetchForecastData(selectedFieldId)}
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Yenile</span>
        </Button>
      </div>

      {/* Field Selector */}
      <div className="mb-4 sm:mb-6">
        <FieldSelector
          selectedFieldId={selectedFieldId}
          onFieldSelect={handleFieldSelect}
          showWeatherSummary={false}
        />
      </div>

      {data && (
        <>
          {/* Gün Seçici */}
          <Card className="mb-4 sm:mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className="text-sm font-medium">Zaman Aralığı:</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={daysView === 3 ? "default" : "outline"}
                    onClick={() => setDaysView(3)}
                  >
                    3 Gün
                  </Button>
                  <Button
                    size="sm"
                    variant={daysView === 7 ? "default" : "outline"}
                    onClick={() => setDaysView(7)}
                  >
                    7 Gün
                  </Button>
                  <Button
                    size="sm"
                    variant={daysView === 16 ? "default" : "outline"}
                    onClick={() => setDaysView(16)}
                  >
                    16 Gün
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DEBUG: Veri kontrolü */}
          {chartData.length > 0 && (
            <Card className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
              <CardContent className="p-3">
                <p className="text-xs font-mono">
                  ✅ Veri hazır: {chartData.length} nokta |
                  İlk: {JSON.stringify(chartData[0])} |
                  Keys: {Object.keys(chartData[0] || {}).join(', ')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Sıcaklık Grafiği - Chart.js */}
          <div className="mb-6">
            <SimpleLineChart
              title={`${daysView} Günlük Sıcaklık (Chart.js)`}
              data={chartData}
              xKey="time"
              yKey="temperature"
              color="#ef4444"
              height={350}
            />
          </div>

          {/* Yağış Grafiği - Bar Chart */}
          <div className="mb-6">
            <SimpleBarChart
              title={`${daysView} Günlük Yağış Tahmini`}
              data={chartData}
              xKey="time"
              yKey="precipitation"
              color="#a855f7"
              height={350}
            />
          </div>

          {/* Rüzgar + Nem - Multi Line */}
          <div className="mb-6">
            <SimpleMultiLineChart
              title={`${daysView} Günlük Rüzgar & Nem`}
              data={chartData}
              xKey="time"
              lines={[
                { yKey: "windSpeed", label: "Rüzgar (km/h)", color: "#6b7280" },
                { yKey: "humidity", label: "Nem (%)", color: "#3b82f6" }
              ]}
              height={350}
            />
          </div>

          {/* Location Info */}
          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertDescription>
              <strong>{data.field.name}</strong> - {data.field.location}
              <br />
              <span className="text-xs text-muted-foreground">
                Open-Meteo API • Her 3 saatte bir veri • Önbellek: 6 saat
              </span>
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
