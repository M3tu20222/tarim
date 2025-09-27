"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CloudRain,
  Wind,
  Thermometer,
  Droplets,
  AlertTriangle,
  Activity,
  Snowflake,
  Sun,
  Eye,
  RefreshCw,
  MapPin,
  Clock,
  TrendingUp,
  Shield
} from "lucide-react";
import { WeatherWidget } from "@/components/weather/weather-widget";
import { WeatherRiskAlerts } from "@/components/weather/weather-risk-alerts";
import { FieldSelector } from "@/components/weather/field-selector";

interface WeatherDashboardData {
  currentConditions: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    pressure: number;
    visibility: number;
  };
  forecast: {
    today: {
      high: number;
      low: number;
      condition: string;
      precipitation: number;
    };
    tomorrow: {
      high: number;
      low: number;
      condition: string;
      precipitation: number;
    };
  };
  alerts: {
    total: number;
    critical: number;
    warnings: number;
  };
  lastUpdate: string;
}

export default function WeatherDashboardPage() {
  const [data, setData] = useState<WeatherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const fetchDashboardData = async (fieldId?: string | null) => {
    try {
      setLoading(true);
      setError(null);

      // Gerçek API çağrıları - paralel olarak çalıştır
      const fieldsUrl = fieldId
        ? `/api/weather/fields?summary=true&fieldId=${fieldId}`
        : '/api/weather/fields?summary=true';
      const riskUrl = fieldId
        ? `/api/weather/irrigation-wind?fieldId=${fieldId}`
        : '/api/weather/irrigation-wind';

      const [fieldsResponse, riskResponse] = await Promise.all([
        fetch(fieldsUrl),
        fetch(riskUrl)
      ]);

      if (!fieldsResponse.ok || !riskResponse.ok) {
        throw new Error('Hava durumu verileri alınamadı');
      }

      const fieldsData = await fieldsResponse.json();
      const riskData = await riskResponse.json();

      if (!fieldsData.success || !riskData.success) {
        throw new Error('API yanıt hatası');
      }

      // Gerçek verilerden dashboard formatına çevir
      const summary = fieldsData.data.summary;
      const currentWeather = riskData.data.currentConditions;

      const dashboardData: WeatherDashboardData = {
        currentConditions: {
          temperature: Math.round(currentWeather.temperature || 22),
          humidity: Math.round(currentWeather.humidity || 65),
          windSpeed: Math.round(currentWeather.windSpeed || 12),
          windDirection: typeof currentWeather.windDirection === 'string'
            ? currentWeather.windDirection
            : "Güneybatı",
          pressure: 1013, // Bu veri henüz API'de yok
          visibility: 10   // Bu veri henüz API'de yok
        },
        forecast: {
          today: {
            high: Math.round((currentWeather.temperature || 22) + 6),
            low: Math.round((currentWeather.temperature || 22) - 4),
            condition: currentWeather.windSpeed > 15 ? "Rüzgarlı" :
                      currentWeather.humidity > 80 ? "Nemli" : "Açık",
            precipitation: Math.round(currentWeather.precipitation || 0)
          },
          tomorrow: {
            high: Math.round((currentWeather.temperature || 22) + 3),
            low: Math.round((currentWeather.temperature || 22) - 2),
            condition: "Tahmin ediliyor...",
            precipitation: 5
          }
        },
        alerts: {
          total: summary.criticalRisks + summary.highRisks,
          critical: summary.criticalRisks,
          warnings: summary.highRisks
        },
        lastUpdate: new Date().toISOString()
      };

      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri yükleme hatası');

      // Fallback - cache'den veya default değerlerle
      const fallbackData: WeatherDashboardData = {
        currentConditions: {
          temperature: 22,
          humidity: 65,
          windSpeed: 12,
          windDirection: "Güneybatı",
          pressure: 1013,
          visibility: 10
        },
        forecast: {
          today: { high: 28, low: 18, condition: "Veri yüklenemedi", precipitation: 0 },
          tomorrow: { high: 25, low: 16, condition: "Veri yüklenemedi", precipitation: 0 }
        },
        alerts: { total: 0, critical: 0, warnings: 0 },
        lastUpdate: new Date().toISOString()
      };

      setData(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldSelect = (fieldId: string | null) => {
    setSelectedFieldId(fieldId);
    fetchDashboardData(fieldId);
  };

  useEffect(() => {
    fetchDashboardData(selectedFieldId);

    // Auto refresh every 5 minutes
    const interval = setInterval(() => fetchDashboardData(selectedFieldId), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedFieldId]);

  const getWindDirectionColor = (direction: string | number) => {
    const directionText = typeof direction === 'string' ? direction : direction.toString();
    if (directionText.includes('Batı') || directionText.includes('Güneybatı')) {
      return 'text-red-600 dark:text-red-400';
    }
    return 'text-gray-600 dark:text-gray-400';
  };

  if (loading && !data) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <Activity className="h-8 w-8 animate-spin mr-3 text-blue-500" />
          <span className="text-lg">Hava durumu dashboard yükleniyor...</span>
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
            Dashboard yüklenirken hata oluştu: {error}
          </AlertDescription>
        </Alert>
        <Button onClick={() => fetchDashboardData(selectedFieldId)} className="mt-4">
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
            🌦️ Akıllı Hava Durumu Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Tarım odaklı hava durumu analizi ve risk yönetimi
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.alerts.total > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {data.alerts.total} uyarı
            </Badge>
          )}
          <Button onClick={() => fetchDashboardData(selectedFieldId)} variant="outline" size="sm">
            {loading ? (
              <Activity className="h-4 w-4 animate-spin" />
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

      {/* Quick Stats */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Thermometer className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{data.currentConditions.temperature}°C</p>
                  <p className="text-sm text-muted-foreground">Sıcaklık</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Wind className="h-8 w-8 text-gray-500" />
                <div>
                  <p className="text-2xl font-bold">{data.currentConditions.windSpeed} km/h</p>
                  <p className={`text-sm ${getWindDirectionColor(data.currentConditions.windDirection)}`}>
                    {data.currentConditions.windDirection}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Droplets className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{data.currentConditions.humidity}%</p>
                  <p className="text-sm text-muted-foreground">Nem Oranı</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Eye className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{data.currentConditions.visibility} km</p>
                  <p className="text-sm text-muted-foreground">Görüş Mesafesi</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Genel Bakış
          </TabsTrigger>
          <TabsTrigger value="risks" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Risk Analizi
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tahminler
          </TabsTrigger>
          <TabsTrigger value="irrigation" className="flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            Sulama
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Weather Widget */}
            <WeatherWidget />

            {/* Forecast Summary */}
            {data && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sun className="h-5 w-5" />
                    Hava Durumu Tahmini
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Today */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div>
                      <p className="font-medium">Bugün</p>
                      <p className="text-sm text-muted-foreground">{data.forecast.today.condition}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{data.forecast.today.high}° / {data.forecast.today.low}°</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        Yağış: %{data.forecast.today.precipitation}
                      </p>
                    </div>
                  </div>

                  {/* Tomorrow */}
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div>
                      <p className="font-medium">Yarın</p>
                      <p className="text-sm text-muted-foreground">{data.forecast.tomorrow.condition}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{data.forecast.tomorrow.high}° / {data.forecast.tomorrow.low}°</p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Yağış: %{data.forecast.tomorrow.precipitation}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Location and Update Info */}
          {data && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>Yeşiloba, Türkiye (38.575906, 31.849755)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Son güncelleme: {new Date(data.lastUpdate).toLocaleTimeString('tr-TR')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Risk Analysis Tab */}
        <TabsContent value="risks" className="space-y-6">
          <WeatherRiskAlerts />

          {data?.alerts.total > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Aktif Uyarılar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {data.alerts.critical}
                    </p>
                    <p className="text-sm text-red-800 dark:text-red-200">Kritik</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {data.alerts.warnings}
                    </p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">Uyarı</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {data.alerts.total}
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">Toplam</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>7 Günlük Tahmin</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Detaylı hava durumu tahminleri yakında...</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Irrigation Tab */}
        <TabsContent value="irrigation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sulama Danışmanı</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Akıllı sulama önerileri yakında...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}