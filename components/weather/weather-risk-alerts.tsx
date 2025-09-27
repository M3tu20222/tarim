"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Wind,
  Thermometer,
  AlertTriangle,
  Snowflake,
  Sprout,
  Clock,
  ArrowRight,
  CheckCircle,
  XCircle,
  Activity
} from "lucide-react";

interface WindRiskData {
  isIrrigationSafe: boolean;
  windRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  windSpeedKmh: number;
  windDirectionText: string;
  recommendations: string[];
  riskFactors: {
    isWestWind: boolean;
    isHighSpeed: boolean;
    hasGusts: boolean;
  };
  irrigationMethod: 'sprinkler' | 'drip' | 'delayed';
}

interface FrostRiskData {
  frostRiskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  minTemperature: number;
  irrigationWarning: {
    shouldAvoidIrrigation: boolean;
    recommendations: string[];
  };
  cropDamageRisk: {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    estimatedDamage: number;
  };
}

interface BurnRiskData {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isWestWind: boolean;
  temperature: number;
  humidity: number;
  recommendations: string[];
}

interface WeatherRiskAlertsProps {
  fieldId?: string;
  compact?: boolean;
}

export function WeatherRiskAlerts({ fieldId, compact = false }: WeatherRiskAlertsProps) {
  const [windRisk, setWindRisk] = useState<WindRiskData | null>(null);
  const [frostRisk, setFrostRisk] = useState<FrostRiskData | null>(null);
  const [burnRisk, setBurnRisk] = useState<BurnRiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRiskData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/weather/irrigation-wind');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setWindRisk(result.data.irrigationAnalysis);
        setBurnRisk(result.data.burnRisk);
        // setFrostRisk(result.data.frostRisk); // TODO: Add frost endpoint
      } else {
        throw new Error(result.message || 'Risk data fetch failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Risk fetch failed');
      console.error('Weather risk alerts error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();

    // Auto refresh every 10 minutes
    const interval = setInterval(fetchRiskData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fieldId]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-600 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-black';
      case 'LOW': return 'bg-blue-500 text-white';
      default: return 'bg-green-500 text-white';
    }
  };

  const getRiskIcon = (type: string, level: string) => {
    if (level === 'CRITICAL' || level === 'HIGH') {
      return <AlertTriangle className="h-4 w-4" />;
    }

    switch (type) {
      case 'wind': return <Wind className="h-4 w-4" />;
      case 'frost': return <Snowflake className="h-4 w-4" />;
      case 'burn': return <Thermometer className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Hava Durumu Risk Analizi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Activity className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Risk analizi yükleniyor...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          Risk verileri yüklenirken hata: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (compact) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Rüzgar Risk Kartı */}
        {windRisk && (
          <div className={`p-3 rounded-lg border ${
            windRisk.windRiskLevel === 'CRITICAL' || windRisk.windRiskLevel === 'HIGH'
              ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
              : windRisk.windRiskLevel === 'MEDIUM'
              ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
              : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getRiskIcon('wind', windRisk.windRiskLevel)}
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  Rüzgar
                </span>
              </div>
              <Badge className={`text-xs ${getRiskColor(windRisk.windRiskLevel)}`}>
                {windRisk.windSpeedKmh} km/h
              </Badge>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {windRisk.windDirectionText} - {windRisk.riskFactors.isWestWind ? 'Batı Rüzgarı!' : 'Normal'}
            </p>
          </div>
        )}

        {/* Yanıklık Risk Kartı */}
        {burnRisk && (
          <div className={`p-3 rounded-lg border ${
            burnRisk.riskLevel === 'CRITICAL' || burnRisk.riskLevel === 'HIGH'
              ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
              : burnRisk.riskLevel === 'MEDIUM'
              ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
              : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getRiskIcon('burn', burnRisk.riskLevel)}
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  Yanıklık
                </span>
              </div>
              <Badge className={`text-xs ${getRiskColor(burnRisk.riskLevel)}`}>
                {burnRisk.temperature}°C
              </Badge>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Nem: {burnRisk.humidity}% {burnRisk.isWestWind ? '- Batı Rüzgarı' : ''}
            </p>
          </div>
        )}

        {/* Sulama Durumu */}
        {windRisk && (
          <div className={`p-3 rounded-lg border ${
            windRisk.isIrrigationSafe
              ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {windRisk.isIrrigationSafe ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  Sulama
                </span>
              </div>
              <Badge className={`text-xs ${
                windRisk.isIrrigationSafe ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {windRisk.irrigationMethod}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {windRisk.isIrrigationSafe ? 'Güvenli' : 'Riskli - Ertele'}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Akıllı Sulama Risk Analizi
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRiskData}
            className="h-6 w-6 p-0"
          >
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rüzgar Analizi */}
        {windRisk && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Rüzgar Koşulları
                </span>
              </div>
              <Badge className={getRiskColor(windRisk.windRiskLevel)}>
                {windRisk.windRiskLevel}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-gray-600 dark:text-gray-400">Hız:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                  {windRisk.windSpeedKmh} km/h
                </span>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-gray-600 dark:text-gray-400">Yön:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                  {windRisk.windDirectionText}
                </span>
              </div>
            </div>

            {windRisk.riskFactors.isWestWind && (
              <Alert className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription className="text-orange-800 dark:text-orange-200 text-xs">
                  🌪️ Batı rüzgarı tespit edildi! Ekinlerde yanıklık riski var.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Yanıklık Risk Analizi */}
        {burnRisk && burnRisk.riskLevel !== 'LOW' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Yanıklık Riski
                </span>
              </div>
              <Badge className={getRiskColor(burnRisk.riskLevel)}>
                {burnRisk.riskLevel}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-gray-600 dark:text-gray-400">Sıcaklık:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                  {burnRisk.temperature}°C
                </span>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-gray-600 dark:text-gray-400">Nem:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                  {burnRisk.humidity}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Sulama Önerisi */}
        {windRisk && (
          <div className={`p-3 rounded-lg border ${
            windRisk.isIrrigationSafe
              ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {windRisk.isIrrigationSafe ? (
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Sulama Durumu: {windRisk.isIrrigationSafe ? 'Güvenli' : 'Riskli'}
              </span>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">
              Önerilen yöntem: <span className="font-medium">{
                windRisk.irrigationMethod === 'sprinkler' ? 'Fıskiye' :
                windRisk.irrigationMethod === 'drip' ? 'Damla' : 'Erteleme'
              }</span>
            </p>

            {windRisk.recommendations.length > 0 && (
              <div className="mt-2 text-xs text-gray-700 dark:text-gray-300">
                <div className="font-medium mb-1">Öneriler:</div>
                <ul className="space-y-1">
                  {windRisk.recommendations.slice(0, 2).map((rec, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-gray-400">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Son Güncelleme */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}</span>
          </div>
          <span>Her 10 dakikada bir güncellenir</span>
        </div>
      </CardContent>
    </Card>
  );
}