"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Snowflake,
  AlertTriangle,
  Activity,
  RefreshCw,
  Thermometer,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Moon,
  Sun,
  Droplets,
  Wind,
  Eye,
  TrendingDown
} from "lucide-react";
import { FieldSelector } from "@/components/weather/field-selector";

interface FrostProtectionData {
  frostRiskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  minTemperature: number;
  currentTemperature: number;
  soilTemperature: number;
  frostStartHour?: number;
  frostEndHour?: number;
  riskFactors: {
    isCriticalTemperature: boolean;
    isNighttime: boolean;
    hasHighHumidity: boolean;
    hasLowWind: boolean;
    soilTemperature: number;
  };
  irrigationWarning: {
    shouldAvoidIrrigation: boolean;
    safestHours: number[];
    dangerousHours: number[];
    recommendations: string[];
  };
  protectionMeasures: string[];
  cropDamageRisk: {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    vulnerableCrops: string[];
    estimatedDamage: number;
  };
  nextUpdate: string;
}

export default function FrostProtectionPage() {
  const [data, setData] = useState<FrostProtectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("current");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const fetchFrostData = async (fieldId?: string | null) => {
    try {
      setLoading(true);
      setError(null);

      // Gerçek API çağrısı
      const url = fieldId
        ? `/api/weather/frost-protection?fieldId=${fieldId}`
        : '/api/weather/frost-protection';
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // API'den gelen verileri component formatına çevir
        const apiData = result.data;

        const transformedData: FrostProtectionData = {
          frostRiskLevel: apiData.frostAnalysis.frostRiskLevel,
          minTemperature: apiData.frostAnalysis.minTemperature,
          currentTemperature: apiData.currentConditions.temperature,
          soilTemperature: apiData.currentConditions.soilTemperature,
          frostStartHour: apiData.frostAnalysis.frostStartHour,
          frostEndHour: apiData.frostAnalysis.frostEndHour,
          riskFactors: apiData.frostAnalysis.riskFactors,
          irrigationWarning: apiData.frostAnalysis.irrigationWarning,
          protectionMeasures: apiData.frostAnalysis.protectionMeasures,
          cropDamageRisk: apiData.frostAnalysis.cropDamageRisk,
          nextUpdate: apiData.nextUpdate
        };

        setData(transformedData);
      } else {
        throw new Error(result.message || 'Don analizi başarısız');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri yükleme hatası');

      // Fallback data in case of API failure
      const currentHour = new Date().getHours();
      const isNighttime = currentHour >= 20 || currentHour <= 8;

      const fallbackData: FrostProtectionData = {
        frostRiskLevel: 'LOW',
        minTemperature: isNighttime ? 5 : 12,
        currentTemperature: 18,
        soilTemperature: 15,
        frostStartHour: undefined,
        frostEndHour: undefined,
        riskFactors: {
          isCriticalTemperature: false,
          isNighttime,
          hasHighHumidity: false,
          hasLowWind: false,
          soilTemperature: 15
        },
        irrigationWarning: {
          shouldAvoidIrrigation: false,
          safestHours: [10, 11, 12, 13, 14, 15],
          dangerousHours: [],
          recommendations: ["Veri yüklenemedi - varsayılan öneriler"]
        },
        protectionMeasures: ["API'ye bağlanılamadı"],
        cropDamageRisk: {
          level: 'LOW',
          vulnerableCrops: [],
          estimatedDamage: 0
        },
        nextUpdate: new Date(Date.now() + 1800000).toISOString()
      };

      setData(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldSelect = (fieldId: string | null) => {
    setSelectedFieldId(fieldId);
    fetchFrostData(fieldId);
  };

  useEffect(() => {
    fetchFrostData(selectedFieldId);

    // Auto refresh every 30 minutes
    const interval = setInterval(() => fetchFrostData(selectedFieldId), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedFieldId]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-600 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-black';
      case 'LOW': return 'bg-blue-500 text-white';
      case 'NONE': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'HIGH':
        return <AlertTriangle className="h-5 w-5" />;
      case 'MEDIUM':
        return <Eye className="h-5 w-5" />;
      case 'LOW':
        return <Shield className="h-5 w-5" />;
      default:
        return <CheckCircle className="h-5 w-5" />;
    }
  };

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  if (loading && !data) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <Activity className="h-8 w-8 animate-spin mr-3 text-blue-500" />
          <span className="text-lg">Don riski analizi yükleniyor...</span>
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
            Don riski analizi yüklenirken hata oluştu: {error}
          </AlertDescription>
        </Alert>
        <Button onClick={() => fetchFrostData(selectedFieldId)} className="mt-4">
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
            <Snowflake className="h-8 w-8 text-blue-500" />
            ❄️ Don Koruması ve Risk Analizi
          </h1>
          <p className="text-muted-foreground mt-1">
            Gece soğuğu ve don riskine karşı akıllı koruma sistemi
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.frostRiskLevel === 'HIGH' || data?.frostRiskLevel === 'CRITICAL' ? (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Snowflake className="h-3 w-3" />
              Don Riski!
            </Badge>
          ) : null}
          <Button onClick={() => fetchFrostData(selectedFieldId)} variant="outline" size="sm">
            {loading ? (
              <Activity className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Critical Alert */}
      {data?.frostRiskLevel === 'CRITICAL' && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            🚨 KRİTİK DON RİSKİ! Minimum sıcaklık {data.minTemperature}°C olarak tahmin ediliyor.
            Acil koruma önlemleri alın ve tüm sulama işlemlerini durdurun!
          </AlertDescription>
        </Alert>
      )}

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
          {/* Current Temperature */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Thermometer className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{data.currentTemperature}°C</p>
                  <p className="text-sm text-muted-foreground">Mevcut Sıcaklık</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Minimum Temperature */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {data.minTemperature}°C
                  </p>
                  <p className="text-sm text-muted-foreground">En Düşük (Gece)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Soil Temperature */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
                  <span className="text-amber-600 dark:text-amber-400 text-sm font-bold">T</span>
                </div>
                <div>
                  <p className="text-2xl font-bold">{data.soilTemperature}°C</p>
                  <p className="text-sm text-muted-foreground">Toprak Sıcaklığı</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Level */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {getRiskIcon(data.frostRiskLevel)}
                <div>
                  <Badge className={getRiskColor(data.frostRiskLevel)}>
                    {data.frostRiskLevel === 'NONE' ? 'RİSK YOK' :
                     data.frostRiskLevel === 'LOW' ? 'DÜŞÜK' :
                     data.frostRiskLevel === 'MEDIUM' ? 'ORTA' :
                     data.frostRiskLevel === 'HIGH' ? 'YÜKSEK' : 'KRİTİK'}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">Don Riski</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="current" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Mevcut Durum
          </TabsTrigger>
          <TabsTrigger value="irrigation" className="flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            Sulama Uyarısı
          </TabsTrigger>
          <TabsTrigger value="protection" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Koruma Önlemleri
          </TabsTrigger>
          <TabsTrigger value="damage" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Hasar Riski
          </TabsTrigger>
        </TabsList>

        {/* Current Status Tab */}
        <TabsContent value="current" className="space-y-6">
          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Factors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Snowflake className="h-5 w-5" />
                    Risk Faktörleri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className={`flex items-center gap-3 p-3 rounded-lg ${
                      data.riskFactors.isCriticalTemperature
                        ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
                        : 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
                    }`}>
                      {data.riskFactors.isCriticalTemperature ? (
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      )}
                      <div>
                        <p className="font-medium">Kritik Sıcaklık</p>
                        <p className="text-sm text-muted-foreground">
                          {data.riskFactors.isCriticalTemperature ? 'Donma riski var' : 'Güvenli seviyede'}
                        </p>
                      </div>
                    </div>

                    <div className={`flex items-center gap-3 p-3 rounded-lg ${
                      data.riskFactors.isNighttime
                        ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
                        : 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800'
                    }`}>
                      {data.riskFactors.isNighttime ? (
                        <Moon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Sun className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      )}
                      <div>
                        <p className="font-medium">Zaman Dilimi</p>
                        <p className="text-sm text-muted-foreground">
                          {data.riskFactors.isNighttime ? 'Gece saatleri' : 'Gündüz saatleri'}
                        </p>
                      </div>
                    </div>

                    <div className={`flex items-center gap-3 p-3 rounded-lg ${
                      data.riskFactors.hasHighHumidity
                        ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    }`}>
                      <Droplets className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="font-medium">Yüksek Nem</p>
                        <p className="text-sm text-muted-foreground">
                          {data.riskFactors.hasHighHumidity ? 'Mevcut (%80+)' : 'Normal seviyede'}
                        </p>
                      </div>
                    </div>

                    <div className={`flex items-center gap-3 p-3 rounded-lg ${
                      data.riskFactors.hasLowWind
                        ? 'bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800'
                        : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    }`}>
                      <Wind className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      <div>
                        <p className="font-medium">Düşük Rüzgar</p>
                        <p className="text-sm text-muted-foreground">
                          {data.riskFactors.hasLowWind ? 'Sakin hava (risk artırıcı)' : 'Rüzgarlı'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Frost Period */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Don Periyodu
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.frostStartHour !== undefined && data.frostEndHour !== undefined ? (
                    <div className="text-center p-6 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <Snowflake className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                      <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                        Don Riski Periyodu
                      </p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 my-2">
                        {formatHour(data.frostStartHour)} - {formatHour(data.frostEndHour)}
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Bu saatlerde özel dikkat gerekiyor
                      </p>
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                      <p className="text-lg font-bold text-green-800 dark:text-green-200">
                        Don Riski Tespit Edilmedi
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Sıcaklık güvenli seviyede kalacak
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-muted-foreground">En Düşük</p>
                      <p className="text-xl font-bold">{data.minTemperature}°C</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-muted-foreground">Toprak</p>
                      <p className="text-xl font-bold">{data.soilTemperature}°C</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Irrigation Warning Tab */}
        <TabsContent value="irrigation" className="space-y-6">
          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Irrigation Safety */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Droplets className="h-5 w-5" />
                    Sulama Güvenliği
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`text-center p-6 rounded-lg border-2 ${
                    data.irrigationWarning.shouldAvoidIrrigation
                      ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                      : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                  }`}>
                    {data.irrigationWarning.shouldAvoidIrrigation ? (
                      <XCircle className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto mb-3" />
                    ) : (
                      <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                    )}
                    <p className="text-lg font-bold">
                      {data.irrigationWarning.shouldAvoidIrrigation
                        ? '🚫 Sulama Önerilmez'
                        : '✅ Sulama Güvenli'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {data.irrigationWarning.shouldAvoidIrrigation
                        ? 'Don riski nedeniyle sulama tehlikeli'
                        : 'Mevcut koşullarda sulama güvenli'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Öneriler:</h4>
                    {data.irrigationWarning.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Safe/Dangerous Hours */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Saat Bazlı Analiz
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Safe Hours */}
                  {data.irrigationWarning.safestHours.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">
                        ✅ Güvenli Saatler
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {data.irrigationWarning.safestHours.map((hour) => (
                          <Badge key={hour} variant="outline" className="bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700">
                            {formatHour(hour)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dangerous Hours */}
                  {data.irrigationWarning.dangerousHours.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">
                        🚫 Tehlikeli Saatler
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {data.irrigationWarning.dangerousHours.map((hour) => (
                          <Badge key={hour} variant="outline" className="bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700">
                            {formatHour(hour)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Protection Measures Tab */}
        <TabsContent value="protection" className="space-y-6">
          {data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Koruma Önlemleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.protectionMeasures.map((measure, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm">{measure}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Damage Risk Tab */}
        <TabsContent value="damage" className="space-y-6">
          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Damage Assessment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Hasar Değerlendirmesi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-sm text-muted-foreground mb-2">Tahmini Hasar Oranı</p>
                    <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                      %{data.cropDamageRisk.estimatedDamage}
                    </p>
                    <Badge className={getRiskColor(data.cropDamageRisk.level)} size="lg">
                      {data.cropDamageRisk.level === 'CRITICAL' ? 'KRİTİK' :
                       data.cropDamageRisk.level === 'HIGH' ? 'YÜKSEK' :
                       data.cropDamageRisk.level === 'MEDIUM' ? 'ORTA' : 'DÜŞÜK'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Vulnerable Crops */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Risk Altındaki Ürünler
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.cropDamageRisk.vulnerableCrops.length > 0 ? (
                    <div className="space-y-2">
                      {data.cropDamageRisk.vulnerableCrops.map((crop) => (
                        <div key={crop} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium">
                            {crop === 'TOMATO' ? 'Domates' :
                             crop === 'PEPPER' ? 'Biber' :
                             crop === 'CORN' ? 'Mısır' :
                             crop === 'BEAN' ? 'Fasulye' : crop}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-4 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p>Risk altındaki ürün tespit edilmedi</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Next Update Info */}
      {data && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-2" />
              <span>Sonraki güncelleme: {new Date(data.nextUpdate).toLocaleTimeString('tr-TR')}</span>
              <span className="mx-2">•</span>
              <span>Her 30 dakikada bir otomatik güncellenir</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}