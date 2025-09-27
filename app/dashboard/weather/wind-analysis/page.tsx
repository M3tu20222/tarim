"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wind,
  AlertTriangle,
  Activity,
  RefreshCw,
  Droplets,
  CheckCircle,
  XCircle,
  Clock,
  Compass,
  Gauge,
  TrendingUp,
  ArrowRight,
  Eye
} from "lucide-react";
import { FieldSelector } from "@/components/weather/field-selector";

interface WindAnalysisData {
  isIrrigationSafe: boolean;
  windRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  windSpeedKmh: number;
  windDirection: number;
  windDirectionText: string;
  windGusts?: number;
  recommendations: string[];
  safestHours: { hour: number; windSpeed: number; direction: string }[];
  riskFactors: {
    isWestWind: boolean;
    isHighSpeed: boolean;
    hasGusts: boolean;
    gustSpeed?: number;
  };
  irrigationMethod: 'sprinkler' | 'drip' | 'delayed';
  waitUntilHour?: number;
  overallRecommendation: {
    action: 'IRRIGATE_NOW' | 'IRRIGATE_CAREFULLY' | 'WAIT' | 'STOP';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reasons: string[];
    bestMethod: 'sprinkler' | 'drip' | 'manual';
    estimatedDelay?: number;
  };
}

export default function WindAnalysisPage() {
  const [data, setData] = useState<WindAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("current");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const fetchWindData = async (fieldId?: string | null) => {
    try {
      setLoading(true);
      setError(null);

      const url = fieldId
        ? `/api/weather/irrigation-wind?fieldId=${fieldId}`
        : '/api/weather/irrigation-wind';

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setData({
          ...result.data.irrigationAnalysis,
          overallRecommendation: result.data.overallRecommendation
        });
      } else {
        throw new Error(result.message || 'Rüzgar analizi başarısız');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri yükleme hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldSelect = (fieldId: string | null) => {
    setSelectedFieldId(fieldId);
    fetchWindData(fieldId);
  };

  useEffect(() => {
    fetchWindData(selectedFieldId);

    // Auto refresh every 5 minutes
    const interval = setInterval(() => fetchWindData(selectedFieldId), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedFieldId]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-600 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-black';
      case 'LOW': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'STOP': return 'bg-red-600 text-white';
      case 'WAIT': return 'bg-orange-500 text-white';
      case 'IRRIGATE_CAREFULLY': return 'bg-yellow-500 text-black';
      case 'IRRIGATE_NOW': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getWindDirectionIcon = (degrees: number) => {
    // Simple arrow rotation based on wind direction
    return (
      <div
        className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full"
        style={{ transform: `rotate(${degrees}deg)` }}
      >
        <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </div>
    );
  };

  if (loading && !data) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <Activity className="h-8 w-8 animate-spin mr-3 text-blue-500" />
          <span className="text-lg">Rüzgar analizi yükleniyor...</span>
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
            Rüzgar analizi yüklenirken hata oluştu: {error}
          </AlertDescription>
        </Alert>
        <Button onClick={() => fetchWindData(selectedFieldId)} className="mt-4">
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
            <Wind className="h-8 w-8 text-blue-500" />
            🌬️ Akıllı Rüzgar Analizi
          </h1>
          <p className="text-muted-foreground mt-1">
            Sulama optimizasyonu için rüzgar koşulları analizi
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.windRiskLevel === 'HIGH' || data?.windRiskLevel === 'CRITICAL' ? (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Yüksek Risk
            </Badge>
          ) : null}
          <Button onClick={() => fetchWindData(selectedFieldId)} variant="outline" size="sm">
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
          compact={true}
        />
      </div>

      {/* Quick Status Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Wind Speed */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Gauge className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{data.windSpeedKmh} km/h</p>
                  <p className="text-sm text-muted-foreground">Rüzgar Hızı</p>
                  {data.windGusts && (
                    <p className="text-xs text-orange-600 dark:text-orange-400">
                      Esinti: {data.windGusts} km/h
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wind Direction */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Compass className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-lg font-bold">{data.windDirectionText}</p>
                  <p className="text-sm text-muted-foreground">{data.windDirection}°</p>
                  {data.riskFactors.isWestWind && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                      ⚠️ Batı Rüzgarı!
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Level */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-orange-500" />
                <div>
                  <Badge className={getRiskColor(data.windRiskLevel)}>
                    {data.windRiskLevel}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">Risk Seviyesi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Irrigation Status */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {data.isIrrigationSafe ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-500" />
                )}
                <div>
                  <p className="text-lg font-bold">
                    {data.isIrrigationSafe ? 'Güvenli' : 'Riskli'}
                  </p>
                  <p className="text-sm text-muted-foreground">Sulama Durumu</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Mevcut Durum
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Öneriler
          </TabsTrigger>
          <TabsTrigger value="planning" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Planlama
          </TabsTrigger>
        </TabsList>

        {/* Current Status Tab */}
        <TabsContent value="current" className="space-y-6">
          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Wind Conditions Detail */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wind className="h-5 w-5" />
                    Rüzgar Koşulları Detayı
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Hız</span>
                        {getWindDirectionIcon(data.windDirection)}
                      </div>
                      <p className="text-xl font-bold mt-1">{data.windSpeedKmh} km/h</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-sm text-muted-foreground">Yön</p>
                      <p className="text-lg font-bold mt-1">{data.windDirectionText}</p>
                      <p className="text-xs text-muted-foreground">{data.windDirection}°</p>
                    </div>
                  </div>

                  {/* Risk Factors */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Risk Faktörleri:</h4>
                    <div className="space-y-1">
                      <div className={`flex items-center gap-2 text-sm ${
                        data.riskFactors.isWestWind
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {data.riskFactors.isWestWind ? '⚠️' : '✅'}
                        <span>Batı Rüzgarı: {data.riskFactors.isWestWind ? 'Evet' : 'Hayır'}</span>
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${
                        data.riskFactors.isHighSpeed
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {data.riskFactors.isHighSpeed ? '⚠️' : '✅'}
                        <span>Yüksek Hız: {data.riskFactors.isHighSpeed ? 'Evet' : 'Hayır'}</span>
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${
                        data.riskFactors.hasGusts
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {data.riskFactors.hasGusts ? '⚠️' : '✅'}
                        <span>Esinti: {data.riskFactors.hasGusts ? `${data.riskFactors.gustSpeed} km/h` : 'Yok'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Overall Recommendation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Droplets className="h-5 w-5" />
                    Sulama Önerisi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 rounded-lg border-2" style={{
                    backgroundColor: data.overallRecommendation.action === 'IRRIGATE_NOW' ? 'rgb(34 197 94 / 0.1)' :
                                    data.overallRecommendation.action === 'IRRIGATE_CAREFULLY' ? 'rgb(234 179 8 / 0.1)' :
                                    data.overallRecommendation.action === 'WAIT' ? 'rgb(249 115 22 / 0.1)' :
                                    'rgb(239 68 68 / 0.1)',
                    borderColor: data.overallRecommendation.action === 'IRRIGATE_NOW' ? 'rgb(34 197 94)' :
                                data.overallRecommendation.action === 'IRRIGATE_CAREFULLY' ? 'rgb(234 179 8)' :
                                data.overallRecommendation.action === 'WAIT' ? 'rgb(249 115 22)' :
                                'rgb(239 68 68)'
                  }}>
                    <Badge className={getActionColor(data.overallRecommendation.action)} size="lg">
                      {data.overallRecommendation.action === 'IRRIGATE_NOW' ? '✅ ŞİMDİ SULA' :
                       data.overallRecommendation.action === 'IRRIGATE_CAREFULLY' ? '⚠️ DİKKATLİ SULA' :
                       data.overallRecommendation.action === 'WAIT' ? '⏳ BEKLE' :
                       '🛑 DURDUR'}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      Önerilen yöntem: <span className="font-medium">
                        {data.overallRecommendation.bestMethod === 'sprinkler' ? 'Fıskiye' :
                         data.overallRecommendation.bestMethod === 'drip' ? 'Damla' : 'Manuel'}
                      </span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Nedenler:</h4>
                    <ul className="space-y-1">
                      {data.overallRecommendation.reasons.map((reason, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {data.overallRecommendation.estimatedDelay && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                      <p className="text-sm">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Önerilen bekleme süresi: {data.overallRecommendation.estimatedDelay} saat
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          {data && (
            <Card>
              <CardHeader>
                <CardTitle>Detaylı Öneriler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="text-blue-500 mt-0.5">
                        {index + 1}.
                      </span>
                      <span className="text-sm">{recommendation}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Planning Tab */}
        <TabsContent value="planning" className="space-y-6">
          {data && data.safestHours.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  En Güvenli Sulama Saatleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.safestHours.map((hour, index) => (
                    <div key={index} className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Saat {hour.hour}:00</span>
                        <Badge variant="outline" className="bg-green-100 dark:bg-green-900">
                          #{index + 1}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p>Rüzgar: {hour.windSpeed} km/h</p>
                        <p>Yön: {hour.direction}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}