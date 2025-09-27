"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Cloud,
  Droplets,
  Thermometer,
  Wind,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";
import type { WaterConsumptionData } from "@/lib/water-consumption/service";

interface WeatherData {
  field: {
    id: string;
    name: string;
  };
  coordinateSource: {
    type: string;
    label: string;
  } | null;
  timezone?: string | null;
  lastUpdated: string | null;
  dailySummary: {
    temperature2mMax: number | null;
    temperature2mMin: number | null;
    precipitationSumMm: number | null;
    et0FaoEvapotranspiration: number | null;
  } | null;
  hourly: Array<{
    timestamp: string;
    temperature2m: number | null;
    relativeHumidity2m: number | null;
    vapourPressureDeficit: number | null;
  }>;
}

type WaterConsumptionEntry =
  | WaterConsumptionData
  | {
      fieldId?: string;
      fieldName?: string;
      missingReason?: string;
      today?: null;
      weekly?: null;
    };

interface WaterWeatherData {
  weather: WeatherData[];
  waterConsumption: WaterConsumptionEntry[];
}

const isCompleteWaterData = (
  entry: WaterConsumptionEntry | undefined,
): entry is WaterConsumptionData => {
  return Boolean(entry && "today" in entry && entry.today && "weekly" in entry && entry.weekly);
};

export function WaterWeatherWidget({ fieldId }: { fieldId?: string }) {
  const [data, setData] = useState<WaterWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [weatherRes, waterRes] = await Promise.all([
          fieldId
            ? fetch(`/api/weather/fields/${fieldId}`, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
              })
            : fetch('/api/weather/summary', {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
              }),
          fieldId
            ? fetch(`/api/water-consumption/${fieldId}`, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
              })
            : fetch('/api/water-consumption', {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
              })
        ]);

        if (!weatherRes.ok || !waterRes.ok) {
          throw new Error('Veri getirilemedi');
        }

        const weatherJson = await weatherRes.json();
        const waterJson = await waterRes.json();

        const weatherPayload: WeatherData[] = fieldId
          ? [weatherJson as WeatherData]
          : Array.isArray((weatherJson as { fields?: WeatherData[] }).fields)
              ? ((weatherJson as { fields?: WeatherData[] }).fields ?? [])
              : [];
        const waterPayload: WaterConsumptionEntry[] = fieldId
          ? [waterJson as WaterConsumptionEntry]
          : Array.isArray((waterJson as { fields?: WaterConsumptionEntry[] }).fields)
              ? ((waterJson as { fields?: WaterConsumptionEntry[] }).fields ?? [])
              : [];

        setData({
          weather: weatherPayload,
          waterConsumption: waterPayload,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bir hata olustu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // 5 dakikada bir guncelle

    return () => clearInterval(interval);
  }, [fieldId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Hava durumu ve su tuketimi verisi yukleniyor...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.weather.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Veri bulunamadi</p>
        </CardContent>
      </Card>
    );
  }

  const currentWeather = data.weather[0];
  const currentWaterEntry = data.waterConsumption[0];
  const hasCurrentWater = isCompleteWaterData(currentWaterEntry);
  const missingWaterReason = !hasCurrentWater && currentWaterEntry && typeof currentWaterEntry === 'object' && 'missingReason' in currentWaterEntry
    ? currentWaterEntry.missingReason ?? undefined
    : undefined;
  const currentWater = hasCurrentWater ? currentWaterEntry : null;
  const timezone = currentWeather.timezone ?? 'Europe/Istanbul';
  const latestHourly = currentWeather.hourly.length > 0
    ? currentWeather.hourly[currentWeather.hourly.length - 1]
    : null;
  const coordinateLabel = currentWeather.coordinateSource?.label ?? 'koordinat bilinmiyor';

  const getStatusColor = (status: 'low' | 'medium' | 'high') => {
    switch (status) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
    }
  };

  const getStatusIcon = (status: 'low' | 'medium' | 'high') => {
    switch (status) {
      case 'low': return <CheckCircle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Hava Durumu & Su Tuketimi
        </CardTitle>
        <div className="text-sm text-gray-500">
          {currentWeather.field.name} - Koordinat: {coordinateLabel}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current">Su An</TabsTrigger>
            <TabsTrigger value="daily">Gunluk</TabsTrigger>
            <TabsTrigger value="weekly">Haftalik</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Thermometer className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-500">Sicaklik</p>
                  <p className="font-semibold">{latestHourly?.temperature2m?.toFixed(1) ?? '--'} deg C</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Nem</p>
                  <p className="font-semibold">{latestHourly?.relativeHumidity2m?.toFixed(0) ?? '--'}%</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Wind className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">VPD</p>
                  <p className="font-semibold">{latestHourly?.vapourPressureDeficit?.toFixed(1) ?? '--'} kPa</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">ETo Bugun</p>
                  <p className="font-semibold">{currentWeather.dailySummary?.et0FaoEvapotranspiration?.toFixed(1) ?? '--'} mm</p>
                </div>
              </div>
            </div>

            {currentWeather.lastUpdated && (
              <p className="text-xs text-gray-400">
                Son guncelleme: {new Date(currentWeather.lastUpdated).toLocaleString('tr-TR', { timeZone: timezone })}
              </p>
            )}
          </TabsContent>

          <TabsContent value="daily" className="space-y-4">
            {hasCurrentWater && currentWater ? (
              <>
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Bitki Su Tuketimi - Bugun</h3>
                    <Badge className={getStatusColor(currentWater.today.status)}>
                      {getStatusIcon(currentWater.today.status)}
                      <span className="ml-1 capitalize">{currentWater.today.status}</span>
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">ETc Bugun</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {currentWater.today.etc.toFixed(1)} mm
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Yagis</p>
                      <p className="text-lg font-semibold text-green-600">
                        {currentWater.today.precipitation.toFixed(1)} mm
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Net Ihtiyac</p>
                      <p className="text-lg font-semibold text-orange-600">
                        {currentWater.today.netNeed.toFixed(1)} mm
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Kc Katsayisi</p>
                      <p className="text-lg font-semibold">
                        {currentWater.today.kc.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-sm">
                      Bugun Oneri: <strong>{currentWater.today.recommendation}</strong>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Aktif Bitki</p>
                    <p className="font-semibold">{currentWater.cropName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tarih</p>
                    <p className="font-semibold">
                      {new Date(currentWater.today.date).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Su tuketimi verisi bulunamadi</p>
                <p className="text-sm text-gray-400">
                  {missingWaterReason ?? "Aktif bitki ve hava durumu verisi gerekli"}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4">
            {hasCurrentWater && currentWater ? (
              <>
                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold">7 Gunluk Su Bilancosu</h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Toplam ETc</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {currentWater.weekly.totalEtc.toFixed(1)} mm
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Yagis Toplami</p>
                      <p className="text-lg font-semibold text-green-600">
                        {currentWater.weekly.totalRain.toFixed(1)} mm
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Net Ihtiyac</p>
                      <p className="text-lg font-semibold text-orange-600">
                        {currentWater.weekly.netNeed.toFixed(1)} mm
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Ortalama Gunluk</p>
                      <p className="text-lg font-semibold">
                        {currentWater.weekly.avgDailyEtc.toFixed(1)} mm
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Sulama Planlamasi
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Sonraki Sulama</p>
                      <p className="font-semibold">
                        {currentWater.weekly.nextIrrigationDate
                          ? new Date(currentWater.weekly.nextIrrigationDate).toLocaleDateString("tr-TR")
                          : "Belirlenmedi"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Sulama Araligi</p>
                      <p className="font-semibold">{currentWater.weekly.irrigationFrequency} gun</p>
                    </div>
                  </div>

                  <div className="bg-green-50 p-3 rounded">
                    <p className="font-semibold text-sm mb-2">Oneriler:</p>
                    <ul className="text-sm space-y-1">
                      {currentWater.weekly.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-green-600">-</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Haftalik su bilancosu hesaplanamadi</p>
                <p className="text-sm text-gray-400">
                  {missingWaterReason ?? "7 gunluk hava durumu verisi gerekli"}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}