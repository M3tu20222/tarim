"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Activity,
  RefreshCw,
  Shield,
  Wind,
  Snowflake,
  Thermometer,
  Droplets,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Bell,
  TrendingUp,
  Calendar
} from "lucide-react";
import { WeatherRiskAlerts } from "@/components/weather/weather-risk-alerts";

interface RiskAlert {
  id: string;
  type: 'WIND' | 'FROST' | 'BURN' | 'DISEASE' | 'DROUGHT' | 'FLOOD';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  recommendations: string[];
  affectedFields?: string[];
  startTime: string;
  endTime?: string;
  isActive: boolean;
  isDismissed: boolean;
}

interface AlertSummary {
  total: number;
  active: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byType: {
    wind: number;
    frost: number;
    burn: number;
    disease: number;
    drought: number;
    flood: number;
  };
}

export default function RiskAlertsPage() {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("active");
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulated API call - replace with real endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock alert data
      const mockAlerts: RiskAlert[] = [
        {
          id: '1',
          type: 'WIND',
          severity: 'HIGH',
          title: 'Yüksek Rüzgar Riski - Batı Yönlü',
          description: 'Batı yönünden 25 km/h hızla esen rüzgar, fıskiye sulama için tehlikeli. Ekinlerde yanıklık riski.',
          recommendations: [
            'Fıskiye sulamayı durdurun',
            'Damla sulama sistemine geçin',
            'Rüzgar kesilene kadar bekleyin'
          ],
          affectedFields: ['Tarla A', 'Tarla B'],
          startTime: new Date(Date.now() - 3600000).toISOString(),
          endTime: new Date(Date.now() + 7200000).toISOString(),
          isActive: true,
          isDismissed: false
        },
        {
          id: '2',
          type: 'FROST',
          severity: 'MEDIUM',
          title: 'Gece Soğuğu Uyarısı',
          description: 'Gece sıcaklığının 2°C\'ye düşmesi bekleniyor. Hassas bitkiler için risk.',
          recommendations: [
            'Gece sulamasından kaçının',
            'Koruyucu örtü hazırlayın',
            'Sabah güneş çıktıktan sonra sulayın'
          ],
          affectedFields: ['Sera 1', 'Sebze Bahçesi'],
          startTime: new Date(Date.now() + 3600000).toISOString(),
          endTime: new Date(Date.now() + 36000000).toISOString(),
          isActive: true,
          isDismissed: false
        },
        {
          id: '3',
          type: 'DISEASE',
          severity: 'MEDIUM',
          title: 'Yüksek Hastalık Riski',
          description: 'Nem oranının %85\'i aşması ve sıcaklık koşulları hastalık gelişimi için uygun.',
          recommendations: [
            'Fungisit uygulaması planlayın',
            'Havalandırmayı artırın',
            'Bitkileri yakından izleyin'
          ],
          startTime: new Date(Date.now() - 1800000).toISOString(),
          isActive: true,
          isDismissed: false
        },
        {
          id: '4',
          type: 'BURN',
          severity: 'LOW',
          title: 'Hafif Yanıklık Riski',
          description: 'Sıcaklık 28°C\'yi geçti, nem düşük. Hassas yapraklar için dikkat.',
          recommendations: [
            'Öğlen saatlerinde gölge sağlayın',
            'Su stresine dikkat edin'
          ],
          startTime: new Date(Date.now() - 900000).toISOString(),
          endTime: new Date(Date.now() + 1800000).toISOString(),
          isActive: true,
          isDismissed: false
        }
      ];

      // Calculate summary
      const activAlerts = mockAlerts.filter(alert => alert.isActive && !alert.isDismissed);
      const newSummary: AlertSummary = {
        total: mockAlerts.length,
        active: activAlerts.length,
        critical: activAlerts.filter(a => a.severity === 'CRITICAL').length,
        high: activAlerts.filter(a => a.severity === 'HIGH').length,
        medium: activAlerts.filter(a => a.severity === 'MEDIUM').length,
        low: activAlerts.filter(a => a.severity === 'LOW').length,
        byType: {
          wind: activAlerts.filter(a => a.type === 'WIND').length,
          frost: activAlerts.filter(a => a.type === 'FROST').length,
          burn: activAlerts.filter(a => a.type === 'BURN').length,
          disease: activAlerts.filter(a => a.type === 'DISEASE').length,
          drought: activAlerts.filter(a => a.type === 'DROUGHT').length,
          flood: activAlerts.filter(a => a.type === 'FLOOD').length,
        }
      };

      setAlerts(mockAlerts);
      setSummary(newSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veri yükleme hatası');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Auto refresh every 2 minutes
    const interval = setInterval(fetchAlerts, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-600 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-black';
      case 'LOW': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'WIND': return <Wind className="h-4 w-4" />;
      case 'FROST': return <Snowflake className="h-4 w-4" />;
      case 'BURN': return <Thermometer className="h-4 w-4" />;
      case 'DISEASE': return <Activity className="h-4 w-4" />;
      case 'DROUGHT': return <TrendingUp className="h-4 w-4" />;
      case 'FLOOD': return <Droplets className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'WIND': return 'Rüzgar';
      case 'FROST': return 'Don';
      case 'BURN': return 'Yanıklık';
      case 'DISEASE': return 'Hastalık';
      case 'DROUGHT': return 'Kuraklık';
      case 'FLOOD': return 'Su Baskını';
      default: return type;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === 'active' && (!alert.isActive || alert.isDismissed)) return false;
    if (activeTab === 'all' && alert.isDismissed) return false;
    if (filter !== 'ALL' && alert.severity !== filter) return false;
    return true;
  });

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, isDismissed: true } : alert
    ));
  };

  if (loading && !summary) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <Activity className="h-8 w-8 animate-spin mr-3 text-blue-500" />
          <span className="text-lg">Risk uyarıları yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Risk uyarıları yüklenirken hata oluştu: {error}
          </AlertDescription>
        </Alert>
        <Button onClick={fetchAlerts} className="mt-4">
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
            <Shield className="h-8 w-8 text-red-500" />
            ⚠️ Risk Uyarıları ve Bildirimler
          </h1>
          <p className="text-muted-foreground mt-1">
            Tarım operasyonları için aktif risk uyarıları ve güvenlik bildirimleri
          </p>
        </div>
        <div className="flex items-center gap-2">
          {summary && summary.active > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Bell className="h-3 w-3" />
              {summary.active} aktif uyarı
            </Badge>
          )}
          <Button onClick={fetchAlerts} variant="outline" size="sm">
            {loading ? (
              <Activity className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.active}</p>
              <p className="text-sm text-muted-foreground">Aktif Uyarı</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.critical}</p>
              <p className="text-sm text-muted-foreground">Kritik</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.high}</p>
              <p className="text-sm text-muted-foreground">Yüksek</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.medium}</p>
              <p className="text-sm text-muted-foreground">Orta</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.low}</p>
              <p className="text-sm text-muted-foreground">Düşük</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Real-time Widget */}
      <div className="mb-6">
        <WeatherRiskAlerts />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Seviye:</span>
          <div className="flex gap-1">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((level) => (
              <Button
                key={level}
                variant={filter === level ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(level as any)}
              >
                {level === 'ALL' ? 'Tümü' :
                 level === 'CRITICAL' ? 'Kritik' :
                 level === 'HIGH' ? 'Yüksek' :
                 level === 'MEDIUM' ? 'Orta' : 'Düşük'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Aktif Uyarılar ({summary?.active || 0})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Tüm Uyarılar ({summary?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            İstatistikler
          </TabsTrigger>
        </TabsList>

        {/* Active Alerts Tab */}
        <TabsContent value="active" className="space-y-6">
          {filteredAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aktif Uyarı Bulunmuyor</h3>
                <p className="text-muted-foreground text-center">
                  Şu anda tarım operasyonlarınız için aktif risk uyarısı bulunmuyor.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <Card key={alert.id} className={`border-l-4 ${
                  alert.severity === 'CRITICAL' ? 'border-l-red-500' :
                  alert.severity === 'HIGH' ? 'border-l-orange-500' :
                  alert.severity === 'MEDIUM' ? 'border-l-yellow-500' :
                  'border-l-blue-500'
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(alert.type)}
                        <div>
                          <CardTitle className="text-lg">{alert.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity === 'CRITICAL' ? 'KRİTİK' :
                               alert.severity === 'HIGH' ? 'YÜKSEK' :
                               alert.severity === 'MEDIUM' ? 'ORTA' : 'DÜŞÜK'}
                            </Badge>
                            <Badge variant="outline">
                              {getTypeLabel(alert.type)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {alert.isActive && !alert.isDismissed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissAlert(alert.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{alert.description}</p>

                    {/* Time Info */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Başlangıç: {new Date(alert.startTime).toLocaleString('tr-TR')}</span>
                      </div>
                      {alert.endTime && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Bitiş: {new Date(alert.endTime).toLocaleString('tr-TR')}</span>
                        </div>
                      )}
                    </div>

                    {/* Affected Fields */}
                    {alert.affectedFields && alert.affectedFields.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Etkilenen Alanlar:</p>
                        <div className="flex flex-wrap gap-1">
                          {alert.affectedFields.map((field) => (
                            <Badge key={field} variant="outline">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    <div>
                      <p className="text-sm font-medium mb-2">Öneriler:</p>
                      <ul className="space-y-1">
                        {alert.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* All Alerts Tab */}
        <TabsContent value="all" className="space-y-6">
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <Card key={alert.id} className={`${
                alert.isDismissed ? 'opacity-60' : ''
              } border-l-4 ${
                alert.severity === 'CRITICAL' ? 'border-l-red-500' :
                alert.severity === 'HIGH' ? 'border-l-orange-500' :
                alert.severity === 'MEDIUM' ? 'border-l-yellow-500' :
                'border-l-blue-500'
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(alert.type)}
                      <div>
                        <CardTitle className="text-lg">{alert.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity === 'CRITICAL' ? 'KRİTİK' :
                             alert.severity === 'HIGH' ? 'YÜKSEK' :
                             alert.severity === 'MEDIUM' ? 'ORTA' : 'DÜŞÜK'}
                          </Badge>
                          <Badge variant="outline">
                            {getTypeLabel(alert.type)}
                          </Badge>
                          {alert.isDismissed && (
                            <Badge variant="secondary">Kapatıldı</Badge>
                          )}
                          {!alert.isActive && (
                            <Badge variant="secondary">Süresi Doldu</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{alert.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <span>{new Date(alert.startTime).toLocaleString('tr-TR')}</span>
                    {alert.endTime && (
                      <span>- {new Date(alert.endTime).toLocaleString('tr-TR')}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-6">
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Türü Dağılımı</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(summary.byType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(type.toUpperCase())}
                        <span className="capitalize">{getTypeLabel(type.toUpperCase())}</span>
                      </div>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Severity Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Seviyesi Dağılımı</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Kritik</span>
                    <Badge className="bg-red-600 text-white">{summary.critical}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Yüksek</span>
                    <Badge className="bg-orange-500 text-white">{summary.high}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Orta</span>
                    <Badge className="bg-yellow-500 text-black">{summary.medium}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Düşük</span>
                    <Badge className="bg-blue-500 text-white">{summary.low}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}