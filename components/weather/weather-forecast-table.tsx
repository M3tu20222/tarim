'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Droplets, Wind, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ForecastDay {
  date: Date;
  dateStr: string;
  minTemp: string;
  maxTemp: string;
  precipitation: string;
  humidity: string;
  windSpeed: string;
  description: string;
  irrigationNeed: boolean;
  riskLevel: number;
  riskColor: string;
}

interface ForecastData {
  forecast: ForecastDay[];
  updateInfo: {
    message: string;
    hoursAgo: number | null;
    needsUpdate: boolean;
  };
  location: {
    name: string;
    latitude: number;
    longitude: number;
  };
}

export default function WeatherForecastTable() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    setError(null);

    try {
      const response = await fetch('/api/weather/forecast');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Veriler alınamadı');
      }
    } catch (err) {
      setError('Bağlantı hatası');
      console.error('Forecast fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  const getRiskBadge = (level: number) => {
    const labels = ['Güvenli', 'Düşük', 'Orta', 'Yüksek', 'Kritik'];
    const colors = ['default', 'secondary', 'outline', 'destructive', 'destructive'];

    return (
      <Badge variant={colors[level] as any} className="text-xs">
        {labels[level]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-destructive text-center">{error}</p>
          <Button onClick={() => fetchForecast(true)} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tekrar Dene
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <CardTitle className="text-lg font-semibold">
            7 Günlük Hava Durumu Tahmini
          </CardTitle>
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-1 rounded ${
              data.updateInfo.needsUpdate
                ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100'
                : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'
            }`}>
              {data.updateInfo.message}
            </span>
            <Button
              onClick={() => fetchForecast(true)}
              size="sm"
              variant="outline"
              disabled={refreshing}
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          📍 {data.location.name}
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {/* Mobile-first: Kartlar halinde (< sm) */}
        <div className="sm:hidden space-y-3 px-4 pb-4">
          {data.forecast.map((day, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-3">
              {/* Tarih ve hava durumu */}
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{day.dateStr}</div>
                <div className="flex items-center space-x-1">
                  {getRiskBadge(day.riskLevel)}
                  {day.irrigationNeed && (
                    <Badge variant="secondary" className="text-xs">
                      Sulama
                    </Badge>
                  )}
                </div>
              </div>

              {/* Sıcaklık */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Thermometer className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Sıcaklık</span>
                </div>
                <span className="font-medium text-sm">
                  {day.minTemp} / {day.maxTemp}
                </span>
              </div>

              {/* Yağış */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Yağış</span>
                </div>
                <span className="text-sm">{day.precipitation}</span>
              </div>

              {/* Rüzgar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wind className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Rüzgar</span>
                </div>
                <span className="text-sm">{day.windSpeed}</span>
              </div>

              {/* Durum */}
              <div className="text-center">
                <span className="text-sm font-medium text-muted-foreground">
                  {day.description}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Tablet ve Desktop: Tablo (>= sm) */}
        <div className="hidden sm:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-sm">Gün</th>
                  <th className="text-center p-3 font-medium text-sm">
                    <Thermometer className="h-4 w-4 inline mr-1" />
                    Sıcaklık
                  </th>
                  <th className="text-center p-3 font-medium text-sm">
                    <Droplets className="h-4 w-4 inline mr-1" />
                    Yağış
                  </th>
                  <th className="text-center p-3 font-medium text-sm">
                    <Wind className="h-4 w-4 inline mr-1" />
                    Rüzgar
                  </th>
                  <th className="text-center p-3 font-medium text-sm">Durum</th>
                  <th className="text-center p-3 font-medium text-sm">Risk</th>
                  <th className="text-center p-3 font-medium text-sm">Sulama</th>
                </tr>
              </thead>
              <tbody>
                {data.forecast.map((day, index) => (
                  <tr key={index} className={`border-b hover:bg-muted/50 ${index === 0 ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                    <td className="p-3">
                      <div className="font-medium text-sm">{day.dateStr}</div>
                      {index === 0 && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          Bugün
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <span className="text-red-600 font-medium text-sm">{day.maxTemp}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-blue-600 font-medium text-sm">{day.minTemp}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-sm">{day.precipitation}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-sm">{day.windSpeed}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-sm font-medium">{day.description}</span>
                    </td>
                    <td className="p-3 text-center">
                      {getRiskBadge(day.riskLevel)}
                    </td>
                    <td className="p-3 text-center">
                      {day.irrigationNeed ? (
                        <Badge variant="secondary" className="text-xs">
                          Gerekli
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Hayır</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}