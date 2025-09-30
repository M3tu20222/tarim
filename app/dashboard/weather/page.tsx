"use client";

import { useState, useEffect } from "react";
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
  Clock,
  Eye,
  Gauge
} from "lucide-react";
import { FieldSelector } from "@/components/weather/field-selector";
import Link from "next/link";

interface FieldWeatherData {
  fieldId: string;
  fieldName: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  weather: {
    current: {
      temperature: number;
      humidity: number;
      windSpeed: number;
      windDirection: number;
      precipitation: number;
      pressure: number;
    };
  };
  lastUpdate: string;
}

export default function WeatherDashboardPage() {
  const [data, setData] = useState<FieldWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const fetchWeatherData = async (fieldId?: string | null) => {
    try {
      setLoading(true);
      setError(null);

      const url = fieldId
        ? `/api/weather/fields?fieldId=${fieldId}`
        : '/api/weather/fields';

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Hava durumu verileri alınamadı');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'API yanıt hatası');
      }

      // Eğer tek tarla seçildiyse, o tarlanın verisini al
      const weatherData = result.data.fields?.[0] || result.data;
      setData(weatherData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri yükleme hatası');
      console.error('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldSelect = (fieldId: string | null) => {
    setSelectedFieldId(fieldId);
    fetchWeatherData(fieldId);
  };

  useEffect(() => {
    fetchWeatherData(selectedFieldId);
  }, []);

  const getWindDirection = (degrees: number) => {
    const directions = ['Kuzey', 'Kuzeydoğu', 'Doğu', 'Güneydoğu', 'Güney', 'Güneybatı', 'Batı', 'Kuzeybatı'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  const getWindDirectionColor = (degrees: number) => {
    // Batı rüzgarı kontrolü (260-280 derece arası)
    if (degrees >= 260 && degrees <= 280) {
      return 'text-red-600 dark:text-red-400';
    }
    return 'text-gray-600 dark:text-gray-400';
  };

  if (loading && !data) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin mr-3 text-blue-500" />
          <span className="text-lg">Hava durumu yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Hata: {error}
          </AlertDescription>
        </Alert>
        <Button onClick={() => fetchWeatherData(selectedFieldId)} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Tekrar Dene
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <CloudRain className="h-8 w-8 text-blue-500" />
            Hava Durumu
          </h1>
          <p className="text-muted-foreground mt-1">
            Tarla bazlı gerçek zamanlı hava durumu bilgisi (Open-Meteo API)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => fetchWeatherData(selectedFieldId)} variant="outline" size="sm">
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Field Selector */}
      <div className="mb-6">
        <FieldSelector
          selectedFieldId={selectedFieldId}
          onFieldSelect={handleFieldSelect}
          showWeatherSummary={false}
        />
      </div>

      {/* Weather Data Cards */}
      {data && (
        <>
          {/* Location Info */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{data.fieldName}</span>
                  <span className="text-muted-foreground">
                    ({data.coordinates.latitude.toFixed(4)}, {data.coordinates.longitude.toFixed(4)})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Son güncelleme: {new Date(data.lastUpdate).toLocaleString('tr-TR')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weather Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Temperature */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Thermometer className="h-5 w-5 text-orange-500" />
                  Sıcaklık
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.weather.current.temperature.toFixed(1)}°C</div>
                <p className="text-xs text-muted-foreground mt-1">Anlık sıcaklık</p>
              </CardContent>
            </Card>

            {/* Humidity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-blue-500" />
                  Nem Oranı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.weather.current.humidity.toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground mt-1">Bağıl nem</p>
              </CardContent>
            </Card>

            {/* Wind */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wind className="h-5 w-5 text-gray-500" />
                  Rüzgar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.weather.current.windSpeed.toFixed(1)} km/h</div>
                <p className={`text-xs mt-1 ${getWindDirectionColor(data.weather.current.windDirection)}`}>
                  {getWindDirection(data.weather.current.windDirection)} ({data.weather.current.windDirection}°)
                </p>
              </CardContent>
            </Card>

            {/* Precipitation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CloudRain className="h-5 w-5 text-purple-500" />
                  Yağış
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.weather.current.precipitation.toFixed(1)} mm</div>
                <p className="text-xs text-muted-foreground mt-1">Son 1 saat</p>
              </CardContent>
            </Card>

            {/* Pressure */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-indigo-500" />
                  Basınç
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.weather.current.pressure.toFixed(0)} hPa</div>
                <p className="text-xs text-muted-foreground mt-1">Atmosfer basıncı</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detaylı Analiz Sayfaları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/dashboard/weather/wind-analysis">
                  <Button variant="outline" className="w-full justify-start">
                    <Wind className="h-4 w-4 mr-2" />
                    Rüzgar Analizi
                  </Button>
                </Link>
                <Link href="/dashboard/weather/frost-protection">
                  <Button variant="outline" className="w-full justify-start">
                    <Thermometer className="h-4 w-4 mr-2" />
                    Don Koruması
                  </Button>
                </Link>
                <Link href="/dashboard/weather/irrigation-advisor">
                  <Button variant="outline" className="w-full justify-start">
                    <Droplets className="h-4 w-4 mr-2" />
                    Sulama Danışmanı
                  </Button>
                </Link>
                <Link href="/dashboard/weather/risk-alerts">
                  <Button variant="outline" className="w-full justify-start">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Risk Uyarıları
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Info Note */}
      <Alert className="mt-6">
        <AlertDescription>
          <strong>Not:</strong> Hava durumu verileri Open-Meteo API'den gerçek zamanlı olarak çekilmektedir.
          Veriler 15 dakika boyunca önbelleğe alınır.
        </AlertDescription>
      </Alert>
    </div>
  );
}