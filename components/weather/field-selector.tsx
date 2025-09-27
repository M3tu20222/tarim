"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MapPin,
  Activity,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from "lucide-react";

interface Field {
  id: string;
  name: string;
  location: string;
  size: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  weather?: {
    temperature: number;
    humidity: number;
    windSpeed: number;
  };
  risks?: {
    wind: { level: string; isSafeToIrrigate: boolean };
    frost: { level: string; minTemperature: number };
    irrigation: { isSafe: boolean };
  };
}

interface FieldSelectorProps {
  selectedFieldId?: string;
  onFieldSelect: (fieldId: string | null) => void;
  showWeatherSummary?: boolean;
  compact?: boolean;
}

export function FieldSelector({
  selectedFieldId,
  onFieldSelect,
  showWeatherSummary = true,
  compact = false
}: FieldSelectorProps) {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const fetchFields = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/weather/fields');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // API'den gelen field verilerini transform et
        const transformedFields: Field[] = result.data.fields.map((field: any) => ({
          id: field.fieldId,
          name: field.fieldName,
          location: field.location,
          size: field.weather?.current?.size || 0, // API'den gelen size bilgisi
          coordinates: field.coordinates,
          weather: field.weather?.current ? {
            temperature: Math.round(field.weather.current.temperature),
            humidity: Math.round(field.weather.current.humidity),
            windSpeed: Math.round(field.weather.current.windSpeed)
          } : undefined,
          risks: field.risks ? {
            wind: {
              level: field.risks.wind.level,
              isSafeToIrrigate: field.risks.wind.isSafeToIrrigate
            },
            frost: {
              level: field.risks.frost.level,
              minTemperature: field.risks.frost.minTemperature
            },
            irrigation: {
              isSafe: field.risks.irrigation.isSafe
            }
          } : undefined
        }));

        setFields(transformedFields);
      } else {
        throw new Error(result.message || 'Tarla verileri alınamadı');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tarla verileri yüklenirken hata oluştu');

      // Fallback - boş veri
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const selectedField = fields.find(f => f.id === selectedFieldId);

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

  const getOverallRiskLevel = (field: Field): { level: string; color: string } => {
    if (!field.risks) return { level: 'UNKNOWN', color: 'bg-gray-500 text-white' };

    const risks = [field.risks.wind.level, field.risks.frost.level];

    if (risks.includes('CRITICAL')) return { level: 'CRITICAL', color: 'bg-red-600 text-white' };
    if (risks.includes('HIGH')) return { level: 'HIGH', color: 'bg-orange-500 text-white' };
    if (risks.includes('MEDIUM')) return { level: 'MEDIUM', color: 'bg-yellow-500 text-black' };
    if (risks.includes('LOW')) return { level: 'LOW', color: 'bg-blue-500 text-white' };
    return { level: 'NONE', color: 'bg-green-500 text-white' };
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Select value={selectedFieldId || "all"} onValueChange={(value) => onFieldSelect(value === "all" ? null : value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tarla seçin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Tarlalar</SelectItem>
            {fields.map((field) => (
              <SelectItem key={field.id} value={field.id}>
                <div className="flex items-center gap-2">
                  <span>{field.name}</span>
                  {field.risks && (
                    <Badge className={`${getOverallRiskLevel(field).color} text-xs`}>
                      {getOverallRiskLevel(field).level}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {loading && (
          <Activity className="h-4 w-4 animate-spin text-blue-500" />
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={fetchFields}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Tarla Seçimi
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchFields}
            disabled={loading}
          >
            {loading ? (
              <Activity className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="text-center py-4 text-red-600 text-sm">
            {error}
          </div>
        ) : loading ? (
          <div className="text-center py-4">
            <Activity className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-sm text-muted-foreground">Tarlalar yükleniyor...</p>
          </div>
        ) : fields.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Koordinatlı tarla bulunamadı
          </div>
        ) : (
          <>
            {/* Tarla Seçici */}
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {selectedField ? (
                    <div className="flex items-center gap-2">
                      <span>{selectedField.name}</span>
                      {selectedField.risks && (
                        <Badge className={getOverallRiskLevel(selectedField).color}>
                          {getOverallRiskLevel(selectedField).level}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    "Tarla seçin veya tümünü görüntüle"
                  )}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <div className="space-y-1 p-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      onFieldSelect(null);
                      setOpen(false);
                    }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Tüm Tarlalar
                  </Button>
                  {fields.map((field) => (
                    <Button
                      key={field.id}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        onFieldSelect(field.id);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <div className="text-left">
                            <p className="font-medium">{field.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {field.location} • {field.size} dönüm
                            </p>
                          </div>
                        </div>
                        {field.risks && (
                          <div className="flex items-center gap-1">
                            {!field.risks.irrigation.isSafe && (
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                            )}
                            <Badge className={`${getOverallRiskLevel(field).color} text-xs`}>
                              {getOverallRiskLevel(field).level}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Seçilen Tarla Özeti */}
            {selectedField && showWeatherSummary && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-muted-foreground">Konum:</span>
                    <p className="font-medium">{selectedField.location}</p>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-muted-foreground">Büyüklük:</span>
                    <p className="font-medium">{selectedField.size} dönüm</p>
                  </div>
                </div>

                {selectedField.coordinates && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded text-sm">
                    <span className="text-muted-foreground">Koordinatlar:</span>
                    <p className="font-mono text-xs">
                      {selectedField.coordinates.latitude.toFixed(6)}, {selectedField.coordinates.longitude.toFixed(6)}
                    </p>
                  </div>
                )}

                {selectedField.weather && (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="p-2 bg-orange-50 dark:bg-orange-950 rounded text-center">
                      <p className="font-bold">{selectedField.weather.temperature}°C</p>
                      <p className="text-xs text-muted-foreground">Sıcaklık</p>
                    </div>
                    <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded text-center">
                      <p className="font-bold">{selectedField.weather.humidity}%</p>
                      <p className="text-xs text-muted-foreground">Nem</p>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-center">
                      <p className="font-bold">{selectedField.weather.windSpeed} km/h</p>
                      <p className="text-xs text-muted-foreground">Rüzgar</p>
                    </div>
                  </div>
                )}

                {selectedField.risks && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Risk Durumu:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="text-xs">Rüzgar:</span>
                        <Badge className={getRiskColor(selectedField.risks.wind.level)}>
                          {selectedField.risks.wind.level}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="text-xs">Don:</span>
                        <Badge className={getRiskColor(selectedField.risks.frost.level)}>
                          {selectedField.risks.frost.level}
                        </Badge>
                      </div>
                    </div>
                    <div className={`p-2 rounded text-xs ${
                      selectedField.risks.irrigation.isSafe
                        ? 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200'
                        : 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200'
                    }`}>
                      Sulama: {selectedField.risks.irrigation.isSafe ? '✅ Güvenli' : '🚫 Riskli'}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tüm Tarlalar Özeti */}
            {!selectedField && fields.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Tüm Tarlalar ({fields.length}):</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-green-50 dark:bg-green-950 rounded text-center">
                    <p className="font-bold">
                      {fields.filter(f => f.risks?.irrigation.isSafe).length}
                    </p>
                    <p className="text-green-700 dark:text-green-300">Sulama Güvenli</p>
                  </div>
                  <div className="p-2 bg-red-50 dark:bg-red-950 rounded text-center">
                    <p className="font-bold">
                      {fields.filter(f => !f.risks?.irrigation.isSafe).length}
                    </p>
                    <p className="text-red-700 dark:text-red-300">Risk Var</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}