'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Thermometer,
  Wind,
  CloudRain,
  AlertTriangle,
  Shield,
  RefreshCw,
  Loader2,
  TrendingUp,
  Sprout,
  Stethoscope,
  Calendar,
  Clock,
  Zap
} from 'lucide-react';

interface RiskItem {
  type: 'FROST' | 'WIND' | 'FLOOD' | 'DISEASE';
  level: 0 | 1 | 2 | 3 | 4;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  probability: number;
  actions: string[];
  timing: string;
  description: string;
}

interface RiskAnalysis {
  fieldId: string;
  fieldName: string;
  overallRiskScore: number;
  risks: RiskItem[];
  cropSpecificRisks: {
    cropType: string;
    vulnerabilities: string[];
    recommendations: string[];
  };
  diseaseRisks: Array<{
    disease: string;
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    probability: number;
    recommendations: string[];
  }>;
  treatmentSchedule: Array<{
    diseaseType: string;
    cropType: string;
    riskLevel: number;
    recommendedAction: 'MONITOR' | 'PREVENTIVE' | 'IMMEDIATE' | 'EMERGENCY';
    treatments: string[];
    timing: string;
    nextApplication?: string;
    notes: string;
  }>;
  location: {
    name: string;
    coordinates?: string;
  };
  lastUpdate: string;
}

interface WeatherRiskDashboardProps {
  fieldId: string;
  compact?: boolean;
}

export default function WeatherRiskDashboard({ fieldId, compact = false }: WeatherRiskDashboardProps) {
  const [data, setData] = useState<RiskAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRiskAnalysis = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    setError(null);

    try {
      const response = await fetch(`/api/weather/risks/${fieldId}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Risk analizi alınamadı');
      }
    } catch (err) {
      setError('Bağlantı hatası');
      console.error('Risk analysis fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRiskAnalysis();
  }, [fieldId]);

  const getRiskIcon = (type: string) => {
    const icons = {
      FROST: <Thermometer className="h-4 w-4" />,
      WIND: <Wind className="h-4 w-4" />,
      FLOOD: <CloudRain className="h-4 w-4" />,
      DISEASE: <AlertTriangle className="h-4 w-4" />
    };
    return icons[type as keyof typeof icons] || <AlertTriangle className="h-4 w-4" />;
  };

  const getRiskColor = (level: number) => {
    const colors = {
      0: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100',
      1: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100',
      2: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100',
      3: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100',
      4: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'
    };
    return colors[level as keyof typeof colors] || colors[0];
  };

  const getRiskLabel = (level: number) => {
    const labels = ['Güvenli', 'Düşük', 'Orta', 'Yüksek', 'Kritik'];
    return labels[level] || 'Bilinmiyor';
  };

  const getOverallRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-600 dark:text-red-400';
    if (score >= 60) return 'text-orange-600 dark:text-orange-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 20) return 'text-blue-600 dark:text-blue-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getActionIcon = (action: string) => {
    const icons = {
      EMERGENCY: <Zap className="h-4 w-4 text-red-500" />,
      IMMEDIATE: <AlertTriangle className="h-4 w-4 text-orange-500" />,
      PREVENTIVE: <Shield className="h-4 w-4 text-yellow-500" />,
      MONITOR: <Clock className="h-4 w-4 text-blue-500" />
    };
    return icons[action as keyof typeof icons] || <Clock className="h-4 w-4" />;
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
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <p className="text-destructive text-center">{error}</p>
          <Button onClick={() => fetchRiskAnalysis(true)} variant="outline">
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              <span className="font-medium">Risk Durumu</span>
            </div>
            <Badge variant={data.overallRiskScore > 60 ? 'destructive' : 'secondary'}>
              {Math.round(data.overallRiskScore)}%
            </Badge>
          </div>

          <div className="space-y-2">
            {data.risks.slice(0, 2).map((risk, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {getRiskIcon(risk.type)}
                  <span>{risk.type}</span>
                </div>
                <Badge variant="outline" className={getRiskColor(risk.level)}>
                  {getRiskLabel(risk.level)}
                </Badge>
              </div>
            ))}
            {data.risks.length > 2 && (
              <div className="text-xs text-muted-foreground text-center">
                +{data.risks.length - 2} daha...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-500" />
                Risk Analizi - {data.fieldName}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                📍 {data.location.name}
                {data.location.coordinates && (
                  <span className="ml-2">• {data.location.coordinates}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className={`text-2xl font-bold ${getOverallRiskColor(data.overallRiskScore)}`}>
                  {Math.round(data.overallRiskScore)}%
                </div>
                <div className="text-xs text-muted-foreground">Genel Risk</div>
              </div>
              <Button
                onClick={() => fetchRiskAnalysis(true)}
                size="sm"
                variant="outline"
                disabled={refreshing}
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <Progress value={data.overallRiskScore} className="w-full" />
        </CardHeader>
      </Card>

      {/* Risk Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.risks.map((risk, index) => (
          <Card key={index} className={`border-l-4 ${risk.level >= 3 ? 'border-l-red-500' : risk.level >= 2 ? 'border-l-orange-500' : 'border-l-blue-500'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getRiskIcon(risk.type)}
                  <span className="font-medium">{risk.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getRiskColor(risk.level)}>
                    {getRiskLabel(risk.level)}
                  </Badge>
                  <span className="text-sm font-medium">{risk.probability}%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{risk.description}</p>

              {risk.actions.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Önerilen Eylem:</strong> {risk.actions[0]}
                  </AlertDescription>
                </Alert>
              )}

              <div className="text-xs text-muted-foreground">
                ⏰ Zamanlama: {risk.timing}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Crop Specific Risks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-green-500" />
            {data.cropSpecificRisks.cropType} Özel Riskler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              Savunmasızlıklar
            </h4>
            <ul className="space-y-1">
              {data.cropSpecificRisks.vulnerabilities.map((vuln, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
                  {vuln}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              Öneriler
            </h4>
            <ul className="space-y-1">
              {data.cropSpecificRisks.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Disease Risks */}
      {data.diseaseRisks && data.diseaseRisks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-red-500" />
              Hastalık Riskleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.diseaseRisks.map((disease, index) => (
                <Card key={index} className={`border-l-4 ${
                  disease.riskLevel === 'CRITICAL' ? 'border-l-red-500' :
                  disease.riskLevel === 'HIGH' ? 'border-l-orange-500' :
                  disease.riskLevel === 'MEDIUM' ? 'border-l-yellow-500' :
                  'border-l-blue-500'
                }`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{disease.disease}</h4>
                      <div className="flex items-center gap-2">
                        <Badge className={getRiskColor(
                          disease.riskLevel === 'CRITICAL' ? 4 :
                          disease.riskLevel === 'HIGH' ? 3 :
                          disease.riskLevel === 'MEDIUM' ? 2 : 1
                        )}>
                          {disease.riskLevel}
                        </Badge>
                        <span className="text-sm font-medium">{disease.probability}%</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <strong>Risk Skoru:</strong> {Math.round(disease.riskScore)}/100
                    </div>
                    <Progress value={disease.riskScore} className="w-full" />
                    {disease.recommendations.length > 0 && (
                      <div className="text-sm">
                        <strong>Öneriler:</strong>
                        <ul className="mt-1 space-y-1">
                          {disease.recommendations.slice(0, 2).map((rec, idx) => (
                            <li key={idx} className="text-muted-foreground flex items-center gap-2">
                              <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Treatment Schedule */}
      {data.treatmentSchedule && data.treatmentSchedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              İlaçlama Takvimi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.treatmentSchedule.map((treatment, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{treatment.diseaseType}</h4>
                      <div className="flex items-center gap-2">
                        {getActionIcon(treatment.recommendedAction)}
                        <Badge variant={
                          treatment.recommendedAction === 'EMERGENCY' ? 'destructive' :
                          treatment.recommendedAction === 'IMMEDIATE' ? 'default' :
                          'secondary'
                        }>
                          {treatment.recommendedAction}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <strong>İlaçlar:</strong> {treatment.treatments.join(', ')}
                    </div>
                    <div className="text-sm">
                      <strong>Zamanlama:</strong> {treatment.timing}
                    </div>
                    {treatment.nextApplication && (
                      <div className="text-sm">
                        <strong>Sonraki Uygulama:</strong> {new Date(treatment.nextApplication).toLocaleDateString('tr-TR')}
                      </div>
                    )}
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {treatment.notes}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Update */}
      <div className="text-xs text-muted-foreground text-center">
        Son güncelleme: {new Date(data.lastUpdate).toLocaleString('tr-TR')}
      </div>
    </div>
  );
}