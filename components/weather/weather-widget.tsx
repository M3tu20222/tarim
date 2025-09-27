"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Sun,
  Sprout,
  Snowflake,
  Activity
} from "lucide-react";
import { WeatherRiskAlerts } from "./weather-risk-alerts";

interface WeatherData {
  location: string;
  lastUpdate: string;
  updateInfo?: {
    message: string;
    hoursAgo: number | null;
    needsUpdate: boolean;
  };
  current: {
    temperature: string;
    humidity: string;
    windSpeed: string;
    windDirection?: string;
    precipitation: string;
  };
  soil: {
    avgMoisture: string;
    surfaceTemp: string;
  };
  alerts: number;
  irrigation: {
    needed: boolean;
    priority: string;
    amount: number;
  };
  diseaseRisk: number;
}

interface WeatherWidgetProps {
  compact?: boolean;
}

export function WeatherWidget({ compact = false }: WeatherWidgetProps) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/weather/dashboard');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setLastRefresh(new Date());
      } else {
        throw new Error(result.message || 'Weather data fetch failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Weather fetch failed');
      console.error('Weather widget error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData();

    // Auto refresh every 15 minutes
    const interval = setInterval(fetchWeatherData, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const getRiskBadgeColor = (risk: number) => {
    if (risk >= 4) return "bg-red-600 text-white";
    if (risk >= 3) return "bg-orange-500 text-white";
    if (risk >= 2) return "bg-yellow-500 text-black";
    if (risk >= 1) return "bg-blue-500 text-white";
    return "bg-green-500 text-white";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'URGENT': return "bg-red-600 text-white";
      case 'HIGH': return "bg-orange-500 text-white";
      case 'MEDIUM': return "bg-yellow-500 text-black";
      default: return "bg-green-500 text-white";
    }
  };

  if (loading && !data) {
    return (
      <Card className={compact ? "p-4" : ""}>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Hava durumu yükleniyor...</span>
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card className={compact ? "p-4" : ""}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button
            onClick={fetchWeatherData}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tekrar Dene
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{data.current.temperature}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{data.location}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-800 dark:text-gray-200">{data.current.humidity}</span>
              {data.alerts > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {data.alerts} uyarı
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sun className="h-5 w-5 text-yellow-500" />
            Hava Durumu & Tarla Durumu
          </CardTitle>
          <div className="flex items-center gap-2">
            {data.updateInfo && (
              <span className={`text-xs px-2 py-1 rounded ${
                data.updateInfo.needsUpdate
                  ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100'
                  : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'
              }`}>
                {data.updateInfo.message}
              </span>
            )}
            <Button
              onClick={fetchWeatherData}
              variant="ghost"
              size="sm"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          📍 {data.location} • Son güncelleme: {lastRefresh?.toLocaleTimeString('tr-TR')}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Weather */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
            <Thermometer className="h-5 w-5 text-orange-500" />
            <div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">{data.current.temperature}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Sıcaklık</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <Droplets className="h-5 w-5 text-blue-500" />
            <div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">{data.current.humidity}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Nem</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Wind className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">{data.current.windSpeed}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Rüzgar {data.current.windDirection && `- ${data.current.windDirection}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
            <CloudRain className="h-5 w-5 text-purple-500" />
            <div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">{data.current.precipitation}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Yağış</div>
            </div>
          </div>
        </div>

        {/* Soil Conditions */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Sprout className="h-4 w-4 text-green-500" />
            Toprak Durumu
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <span className="text-sm text-gray-700 dark:text-gray-300">Toprak Nemi</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{data.soil.avgMoisture}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
              <span className="text-sm text-gray-700 dark:text-gray-300">Toprak Sıcaklığı</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{data.soil.surfaceTemp}</span>
            </div>
          </div>
        </div>

        {/* Risk Alerts */}
        <WeatherRiskAlerts compact />

        {/* Alerts & Recommendations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Durum Özeti</h4>
            {data.alerts > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {data.alerts} uyarı
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Irrigation Status */}
            <div className="p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Sulama Durumu</span>
                <Badge className={getPriorityColor(data.irrigation.priority)}>
                  {data.irrigation.priority}
                </Badge>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {data.irrigation.needed ? (
                  <>💧 Sulama gerekiyor: {data.irrigation.amount}mm</>
                ) : (
                  <>✅ Sulama gerekmiyor</>
                )}
              </div>
            </div>

            {/* Disease Risk */}
            <div className="p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Hastalık Riski</span>
                <Badge className={getRiskBadgeColor(data.diseaseRisk)}>
                  Seviye {data.diseaseRisk}
                </Badge>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {data.diseaseRisk >= 3 ? (
                  <>⚠️ Yüksek risk - önlem alın</>
                ) : data.diseaseRisk >= 1 ? (
                  <>👁️ Takip edin</>
                ) : (
                  <>✅ Risk düşük</>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}