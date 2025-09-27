"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Droplets,
  Activity,
  RefreshCw,
  Calculator,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wind,
  Thermometer,
  Calendar,
  Target,
  TrendingUp,
  Zap
} from "lucide-react";

interface IrrigationRecommendation {
  action: 'IRRIGATE_NOW' | 'IRRIGATE_CAREFULLY' | 'WAIT' | 'STOP';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  method: 'sprinkler' | 'drip' | 'manual';
  amount: number; // mm
  duration: number; // minutes
  bestTiming: string[];
  avoidTiming: string[];
  reasons: string[];
  efficiency: number; // percentage
  waterSaving: string[];
  estimatedCost: number;
}

interface WeatherConditions {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  precipitation: number;
  soilMoisture: number;
  soilTemperature: number;
}

interface FieldParameters {
  fieldId: string;
  cropType: string;
  plantingDate: string;
  fieldSize: number;
  soilType: string;
  lastIrrigation?: string;
}

export default function IrrigationAdvisorPage() {
  const [recommendation, setRecommendation] = useState<IrrigationRecommendation | null>(null);
  const [weather, setWeather] = useState<WeatherConditions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("advisor");

  // Form states
  const [fieldParams, setFieldParams] = useState<FieldParameters>({
    fieldId: '',
    cropType: 'WHEAT',
    plantingDate: '',
    fieldSize: 10,
    soilType: 'CLAY',
    lastIrrigation: ''
  });

  const fetchRecommendation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock weather data
      const mockWeather: WeatherConditions = {
        temperature: 24,
        humidity: 65,
        windSpeed: 8,
        windDirection: 'Kuzeydoğu',
        precipitation: 0,
        soilMoisture: 35,
        soilTemperature: 22
      };

      // Mock recommendation based on conditions
      const mockRecommendation: IrrigationRecommendation = {
        action: mockWeather.windSpeed > 15 ? 'WAIT' :
                mockWeather.soilMoisture < 30 ? 'IRRIGATE_NOW' : 'IRRIGATE_CAREFULLY',
        priority: mockWeather.soilMoisture < 20 ? 'HIGH' :
                 mockWeather.soilMoisture < 40 ? 'MEDIUM' : 'LOW',
        method: mockWeather.windSpeed > 12 ? 'drip' : 'sprinkler',
        amount: Math.max(10, 50 - mockWeather.soilMoisture),
        duration: 45,
        bestTiming: ['06:00', '07:00', '18:00', '19:00'],
        avoidTiming: ['12:00', '13:00', '14:00'],
        reasons: [
          mockWeather.soilMoisture < 35 ? 'Toprak nemi düşük' : 'Toprak nemi yeterli',
          mockWeather.windSpeed > 10 ? 'Rüzgar hızı orta seviyede' : 'Sakin hava koşulları',
          'Sıcaklık sulama için uygun'
        ],
        efficiency: mockWeather.windSpeed > 15 ? 60 : 85,
        waterSaving: [
          'Damla sulama ile %30 tasarruf',
          'Gece sulamayla buharlaşmayı azaltın',
          'Toprak nemi sensörü kullanın'
        ],
        estimatedCost: fieldParams.fieldSize * 15
      };

      setWeather(mockWeather);
      setRecommendation(mockRecommendation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analiz hatası');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'IRRIGATE_NOW': return 'bg-green-600 text-white';
      case 'IRRIGATE_CAREFULLY': return 'bg-yellow-500 text-black';
      case 'WAIT': return 'bg-orange-500 text-white';
      case 'STOP': return 'bg-red-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'IRRIGATE_NOW': return '✅ ŞİMDİ SULA';
      case 'IRRIGATE_CAREFULLY': return '⚠️ DİKKATLİ SULA';
      case 'WAIT': return '⏳ BEKLE';
      case 'STOP': return '🛑 DURDUR';
      default: return action;
    }
  };

  const getCropTypeLabel = (cropType: string) => {
    const types: { [key: string]: string } = {
      'WHEAT': 'Buğday',
      'CORN': 'Mısır',
      'TOMATO': 'Domates',
      'PEPPER': 'Biber',
      'BEAN': 'Fasulye',
      'CHICKPEA': 'Nohut',
      'SUNFLOWER': 'Ayçiçeği',
      'COTTON': 'Pamuk'
    };
    return types[cropType] || cropType;
  };

  const getSoilTypeLabel = (soilType: string) => {
    const types: { [key: string]: string } = {
      'CLAY': 'Killi',
      'SANDY': 'Kumlu',
      'LOAM': 'Tınlı',
      'SILT': 'Siltli'
    };
    return types[soilType] || soilType;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Droplets className="h-8 w-8 text-blue-500" />
            💧 Akıllı Sulama Danışmanı
          </h1>
          <p className="text-muted-foreground mt-1">
            Hava durumu ve tarla koşullarına göre kişiselleştirilmiş sulama önerileri
          </p>
        </div>
        <Button
          onClick={fetchRecommendation}
          disabled={loading || !fieldParams.cropType}
          className="flex items-center gap-2"
        >
          {loading ? (
            <Activity className="h-4 w-4 animate-spin" />
          ) : (
            <Calculator className="h-4 w-4" />
          )}
          Analiz Et
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="advisor" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Sulama Analizi
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Sulama Takvimi
          </TabsTrigger>
          <TabsTrigger value="savings" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Tasarruf İpuçları
          </TabsTrigger>
        </TabsList>

        {/* Advisor Tab */}
        <TabsContent value="advisor" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Parameters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Tarla Parametreleri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="cropType">Ürün Türü</Label>
                  <Select
                    value={fieldParams.cropType}
                    onValueChange={(value) => setFieldParams(prev => ({...prev, cropType: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WHEAT">🌾 Buğday</SelectItem>
                      <SelectItem value="CORN">🌽 Mısır</SelectItem>
                      <SelectItem value="TOMATO">🍅 Domates</SelectItem>
                      <SelectItem value="PEPPER">🌶️ Biber</SelectItem>
                      <SelectItem value="BEAN">🫘 Fasulye</SelectItem>
                      <SelectItem value="CHICKPEA">🫛 Nohut</SelectItem>
                      <SelectItem value="SUNFLOWER">🌻 Ayçiçeği</SelectItem>
                      <SelectItem value="COTTON">🌿 Pamuk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="fieldSize">Tarla Büyüklüğü (dönüm)</Label>
                  <Input
                    id="fieldSize"
                    type="number"
                    value={fieldParams.fieldSize}
                    onChange={(e) => setFieldParams(prev => ({...prev, fieldSize: parseFloat(e.target.value) || 0}))}
                    min="0.1"
                    step="0.1"
                  />
                </div>

                <div>
                  <Label htmlFor="soilType">Toprak Türü</Label>
                  <Select
                    value={fieldParams.soilType}
                    onValueChange={(value) => setFieldParams(prev => ({...prev, soilType: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLAY">Killi Toprak</SelectItem>
                      <SelectItem value="SANDY">Kumlu Toprak</SelectItem>
                      <SelectItem value="LOAM">Tınlı Toprak</SelectItem>
                      <SelectItem value="SILT">Siltli Toprak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="plantingDate">Ekim Tarihi</Label>
                  <Input
                    id="plantingDate"
                    type="date"
                    value={fieldParams.plantingDate}
                    onChange={(e) => setFieldParams(prev => ({...prev, plantingDate: e.target.value}))}
                  />
                </div>

                <div>
                  <Label htmlFor="lastIrrigation">Son Sulama (Opsiyonel)</Label>
                  <Input
                    id="lastIrrigation"
                    type="datetime-local"
                    value={fieldParams.lastIrrigation}
                    onChange={(e) => setFieldParams(prev => ({...prev, lastIrrigation: e.target.value}))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Current Conditions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Mevcut Koşullar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weather ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Thermometer className="h-4 w-4 text-orange-500" />
                          <span className="text-sm text-muted-foreground">Sıcaklık</span>
                        </div>
                        <p className="text-lg font-bold">{weather.temperature}°C</p>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Droplets className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-muted-foreground">Nem</span>
                        </div>
                        <p className="text-lg font-bold">{weather.humidity}%</p>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Wind className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-muted-foreground">Rüzgar</span>
                        </div>
                        <p className="text-lg font-bold">{weather.windSpeed} km/h</p>
                        <p className="text-xs text-muted-foreground">{weather.windDirection}</p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-green-500 rounded-full" />
                          <span className="text-sm text-muted-foreground">Toprak Nemi</span>
                        </div>
                        <p className="text-lg font-bold">{weather.soilMoisture}%</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Analiz için butona tıklayın</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommendation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Akıllı Öneri
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <Activity className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-500" />
                    <p className="text-sm text-muted-foreground">Analiz yapılıyor...</p>
                  </div>
                ) : recommendation ? (
                  <div className="space-y-4">
                    {/* Main Action */}
                    <div className="text-center p-4 rounded-lg border-2" style={{
                      backgroundColor: recommendation.action === 'IRRIGATE_NOW' ? 'rgb(34 197 94 / 0.1)' :
                                      recommendation.action === 'IRRIGATE_CAREFULLY' ? 'rgb(234 179 8 / 0.1)' :
                                      recommendation.action === 'WAIT' ? 'rgb(249 115 22 / 0.1)' :
                                      'rgb(239 68 68 / 0.1)',
                      borderColor: recommendation.action === 'IRRIGATE_NOW' ? 'rgb(34 197 94)' :
                                  recommendation.action === 'IRRIGATE_CAREFULLY' ? 'rgb(234 179 8)' :
                                  recommendation.action === 'WAIT' ? 'rgb(249 115 22)' :
                                  'rgb(239 68 68)'
                    }}>
                      <Badge className={getActionColor(recommendation.action)} size="lg">
                        {getActionText(recommendation.action)}
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Yöntem:</span>
                          <p className="font-medium">
                            {recommendation.method === 'sprinkler' ? '🌊 Fıskiye' :
                             recommendation.method === 'drip' ? '💧 Damla' : '👋 Manuel'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Miktar:</span>
                          <p className="font-medium">{recommendation.amount} mm</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Süre:</span>
                          <p className="font-medium">{recommendation.duration} dakika</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Verimlilik:</span>
                          <p className="font-medium">%{recommendation.efficiency}</p>
                        </div>
                      </div>

                      {/* Best Timing */}
                      {recommendation.bestTiming.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                            ✅ En İyi Saatler
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {recommendation.bestTiming.map((time) => (
                              <Badge key={time} variant="outline" className="bg-green-100 dark:bg-green-900">
                                {time}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Avoid Timing */}
                      {recommendation.avoidTiming.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                            🚫 Kaçınılacak Saatler
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {recommendation.avoidTiming.map((time) => (
                              <Badge key={time} variant="outline" className="bg-red-100 dark:bg-red-900">
                                {time}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Estimated Cost */}
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <p className="text-sm text-muted-foreground">Tahmini Maliyet</p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          ₺{recommendation.estimatedCost}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : error ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Parametreleri doldurup analiz edin</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Recommendations */}
          {recommendation && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Reasons */}
              <Card>
                <CardHeader>
                  <CardTitle>Analiz Sonuçları</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recommendation.reasons.map((reason, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Water Saving Tips */}
              <Card>
                <CardHeader>
                  <CardTitle>Su Tasarrufu İpuçları</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recommendation.waterSaving.map((tip, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-green-500 mt-0.5">💡</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Scheduler Tab */}
        <TabsContent value="scheduler" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sulama Takvimi Planlayıcısı</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Otomatik sulama takvimi özelliği yakında gelecek...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Savings Tab */}
        <TabsContent value="savings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Su ve Enerji Tasarrufu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">
                    💧 Su Tasarrufu
                  </h3>
                  <ul className="text-sm space-y-1 text-green-700 dark:text-green-300">
                    <li>• Damla sulama ile %30-50 tasarruf</li>
                    <li>• Toprak nemi sensörü kullanın</li>
                    <li>• Gece saatlerinde sulayın</li>
                    <li>• Mulçlama yapın</li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    ⚡ Enerji Tasarrufu
                  </h3>
                  <ul className="text-sm space-y-1 text-blue-700 dark:text-blue-300">
                    <li>• Akıllı sulama kontrolörü</li>
                    <li>• Güneş enerjili pompa</li>
                    <li>• Düşük basınçlı sistemler</li>
                    <li>• Zamanlanmış çalışma</li>
                  </ul>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h3 className="font-medium text-purple-800 dark:text-purple-200 mb-2">
                    💰 Maliyet Tasarrufu
                  </h3>
                  <ul className="text-sm space-y-1 text-purple-700 dark:text-purple-300">
                    <li>• Otomatizasyon ile %20 tasarruf</li>
                    <li>• Doğru zamanlama</li>
                    <li>• Aşırı sulama önlemi</li>
                    <li>• Verim artışı %15-25</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}