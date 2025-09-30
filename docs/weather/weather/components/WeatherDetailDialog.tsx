import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { format, parseISO, startOfDay, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';

interface WeatherDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  metric: string;
  title: string;
  unit: string;
  icon: React.ReactNode;
  color: string;
  location: { latitude: number; longitude: number; name: string };
}

interface MetricDefinition {
  key: string;
  title: string;
  unit: string;
  color: string;
  openMeteoKey: string;
  icon: React.ReactNode;
  isSelected: boolean;
}

interface ChartDataPoint {
  time: string;
  date: Date;
  hour: number;
  day: string;
  formattedTime: string;
  isToday: boolean;
  index: number;
  [key: string]: any; // Dynamic metric values
}

const METRIC_MAPPINGS = {
  'temperature': 'temperature_2m',
  'humidity': 'relative_humidity_2m',
  'wind_speed': 'wind_speed_10m',
  'soil_temperature': 'soil_temperature_0cm',
  'soil_moisture': 'soil_moisture_0_to_1cm',
  'precipitation': 'precipitation',
  'pressure': 'surface_pressure',
  'cloud_cover': 'cloud_cover',
  'visibility': 'visibility',
  'uv_index': 'uv_index',
  'wind_direction': 'wind_direction_10m',
  'dew_point': 'dew_point_2m',
  'apparent_temperature': 'apparent_temperature',
  'evapotranspiration': 'et0_fao_evapotranspiration'
};

const WeatherDetailDialog: React.FC<WeatherDetailDialogProps> = ({
  isOpen,
  onClose,
  metric,
  title,
  unit,
  icon,
  color,
  location
}) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'3day' | '7day' | '16day'>('7day');
  const [showComparisonPanel, setShowComparisonPanel] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Initialize available metrics with useMemo to prevent re-creation
  const initialMetrics = useMemo(() => [
    {
      key: 'temperature',
      title: 'Sıcaklık',
      unit: '°C',
      color: '#ef4444',
      openMeteoKey: 'temperature_2m',
      icon: '🌡️',
      isSelected: metric === 'temperature'
    },
    {
      key: 'humidity',
      title: 'Nem Oranı',
      unit: '%',
      color: '#3b82f6',
      openMeteoKey: 'relative_humidity_2m',
      icon: '💧',
      isSelected: metric === 'humidity'
    },
    {
      key: 'wind_speed',
      title: 'Rüzgar Hızı',
      unit: 'km/h',
      color: '#6366f1',
      openMeteoKey: 'wind_speed_10m',
      icon: '💨',
      isSelected: metric === 'wind_speed'
    },
    {
      key: 'soil_temperature',
      title: 'Toprak Sıcaklığı',
      unit: '°C',
      color: '#eab308',
      openMeteoKey: 'soil_temperature_0cm',
      icon: '🌱',
      isSelected: metric === 'soil_temperature'
    },
    {
      key: 'soil_moisture',
      title: 'Toprak Nemi',
      unit: '%',
      color: '#22c55e',
      openMeteoKey: 'soil_moisture_0_to_1cm',
      icon: '🌿',
      isSelected: metric === 'soil_moisture'
    },
    {
      key: 'precipitation',
      title: 'Yağış',
      unit: 'mm',
      color: '#a855f7',
      openMeteoKey: 'precipitation',
      icon: '🌧️',
      isSelected: metric === 'precipitation'
    },
    {
      key: 'pressure',
      title: 'Basınç',
      unit: 'hPa',
      color: '#f97316',
      openMeteoKey: 'surface_pressure',
      icon: '🌪️',
      isSelected: false
    },
    {
      key: 'cloud_cover',
      title: 'Bulutluluk',
      unit: '%',
      color: '#64748b',
      openMeteoKey: 'cloud_cover',
      icon: '☁️',
      isSelected: false
    }
  ], [metric]);

  const [availableMetrics, setAvailableMetrics] = useState<MetricDefinition[]>(initialMetrics);

  // Reset metrics when dialog opens or metric changes
  useEffect(() => {
    setAvailableMetrics(initialMetrics);
  }, [initialMetrics]);

  const colorMap = {
    'red': '#ef4444',
    'blue': '#3b82f6',
    'green': '#22c55e',
    'yellow': '#eab308',
    'purple': '#a855f7',
    'indigo': '#6366f1',
    'orange': '#f97316',
    'pink': '#ec4899'
  };

  const chartColor = colorMap[color as keyof typeof colorMap] || '#3b82f6';

  // Toggle metric selection
  const toggleMetric = (metricKey: string) => {
    setAvailableMetrics(prev =>
      prev.map(m =>
        m.key === metricKey
          ? { ...m, isSelected: !m.isSelected }
          : m
      )
    );
  };

  // Get selected metrics with useMemo to prevent infinite re-renders
  const selectedMetrics = useMemo(() =>
    availableMetrics.filter(m => m.isSelected),
    [availableMetrics]
  );

  const fetchDetailedData = useCallback(async () => {
    if (selectedMetrics.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const forecastDays = selectedPeriod === '3day' ? 3 : selectedPeriod === '7day' ? 7 : 16;

      // Build hourly parameter string for all selected metrics
      const hourlyParams = selectedMetrics.map(m => m.openMeteoKey).join(',');

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?` +
        `latitude=${location.latitude}&longitude=${location.longitude}&` +
        `hourly=${hourlyParams}&` +
        `forecast_days=${forecastDays}&` +
        `timezone=auto&` +
        `temperature_unit=celsius&` +
        `wind_speed_unit=kmh&` +
        `precipitation_unit=mm`
      );

      if (!response.ok) {
        throw new Error('Veri alınamadı');
      }

      const data = await response.json();

      if (!data.hourly || !data.hourly.time) {
        throw new Error('Geçersiz veri formatı');
      }

      const now = new Date();
      const today = startOfDay(now);

      const processedData: ChartDataPoint[] = data.hourly.time.map((timeStr: string, index: number) => {
        const date = parseISO(timeStr);

        const dataPoint: ChartDataPoint = {
          time: timeStr,
          date,
          hour: date.getHours(),
          day: format(date, 'EEE', { locale: tr }),
          formattedTime: format(date, 'dd/MM HH:mm'),
          isToday: startOfDay(date).getTime() === today.getTime(),
          index
        };

        // Add all selected metric values
        selectedMetrics.forEach(metricDef => {
          let value = data.hourly[metricDef.openMeteoKey]?.[index] || 0;

          // Process special cases
          if (metricDef.key === 'soil_moisture') {
            value = value * 100; // Convert to percentage
          }

          dataPoint[metricDef.key] = value;
        });

        return dataPoint;
      });

      console.log('Multi-metric chart data processed:', processedData.slice(0, 2));
      console.log('Selected metrics:', selectedMetrics.map(m => m.key));
      console.log('Chart data sample values:', processedData.slice(0, 3).map(d => {
        const values = {};
        selectedMetrics.forEach(m => {
          values[m.key] = d[m.key];
        });
        return values;
      }));
      setChartData(processedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      console.error('Multi-metric weather data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMetrics, selectedPeriod, location.latitude, location.longitude]);

  useEffect(() => {
    if (isOpen && location && selectedMetrics.length > 0) {
      fetchDetailedData();
    }
  }, [isOpen, fetchDetailedData]);

  // Scroll lock when dialog is open
  useEffect(() => {
    if (isOpen) {
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px'; // Prevent layout shift
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle touch events to prevent passive listener errors
  useEffect(() => {
    if (!isOpen) return;

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const overlayElement = document.querySelector('[data-dialog-overlay]');
    if (overlayElement) {
      overlayElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    }

    return () => {
      if (overlayElement) {
        overlayElement.removeEventListener('touchmove', handleTouchMove);
      }
    };
  }, [isOpen]);

  // ESC key to close dialog
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  const formatTooltipValue = (value: number, metricKey: string, unit: string) => {
    if (metricKey === 'soil_moisture' || metricKey === 'humidity' || metricKey === 'cloud_cover') {
      return `${value.toFixed(1)}%`;
    }
    if (metricKey === 'temperature' || metricKey === 'soil_temperature' || metricKey === 'dew_point' || metricKey === 'apparent_temperature') {
      return `${value.toFixed(1)}°C`;
    }
    if (metricKey === 'wind_speed') {
      return `${value.toFixed(1)} km/h`;
    }
    if (metricKey === 'precipitation' || metricKey === 'evapotranspiration') {
      return `${value.toFixed(1)} mm`;
    }
    if (metricKey === 'pressure') {
      return `${value.toFixed(0)} hPa`;
    }
    if (metricKey === 'visibility') {
      return `${(value / 1000).toFixed(1)} km`;
    }
    if (metricKey === 'wind_direction') {
      return `${value.toFixed(0)}°`;
    }
    return `${value.toFixed(1)} ${unit}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">
            {format(data.date, 'dd MMMM yyyy - HH:mm', { locale: tr })}
          </p>
          <p className="text-white">
            <span className="font-medium" style={{ color: chartColor }}>
              {title}: {formatTooltipValue(payload[0].value)}
            </span>
          </p>
          {data.isToday && (
            <p className="text-xs text-blue-400 mt-1">• Bugün</p>
          )}
        </div>
      );
    }
    return null;
  };

  const getStatistics = () => {
    if (chartData.length === 0 || selectedMetrics.length === 0) return null;

    // Primary metric'in stats'ini alalım (ilk seçili metrik)
    const primaryMetric = selectedMetrics[0];
    if (!primaryMetric) return null;

    const values = chartData.map(d => d[primaryMetric.key]).filter(v => v !== undefined && !isNaN(v));
    if (values.length === 0) return null;

    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const current = values[0] || 0;

    return { max, min, avg, current, primaryMetric };
  };

  const stats = getStatistics();

  if (!isOpen) return null;

  return (
    <div
      data-dialog-overlay
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={(e) => {
        // Close dialog when clicking overlay
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-700"
        onClick={(e) => e.stopPropagation()} // Prevent overlay click when clicking dialog content
      >
        {/* Header */}
        <div className="p-3 sm:p-6 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${chartColor}20` }}>
                {icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <p className="text-gray-400 text-sm">{location.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Period Selection */}
          <div className="flex mt-4 space-x-2">
            {[
              { key: '3day' as const, label: '3 Gün' },
              { key: '7day' as const, label: '7 Gün' },
              { key: '16day' as const, label: '16 Gün' }
            ].map(period => (
              <button
                key={period.key}
                onClick={() => setSelectedPeriod(period.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* Multi-Metric Selection */}
          {showComparisonPanel && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-300">🎯 Karşılaştırmak İstediğiniz Metrikleri Seçin:</h3>
                <button
                  onClick={() => setShowComparisonPanel(false)}
                  className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Paneli Kapat"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {availableMetrics.map((metricDef) => (
                <button
                  key={metricDef.key}
                  onClick={() => toggleMetric(metricDef.key)}
                  className={`p-3 rounded-lg text-xs font-medium transition-all transform hover:scale-105 ${
                    metricDef.isSelected
                      ? 'text-white border-2 shadow-lg'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600 border-2 border-transparent'
                  }`}
                  style={{
                    backgroundColor: metricDef.isSelected ? `${metricDef.color}20` : undefined,
                    borderColor: metricDef.isSelected ? metricDef.color : undefined,
                    boxShadow: metricDef.isSelected ? `0 0 15px ${metricDef.color}40` : undefined
                  }}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-lg">{metricDef.icon}</span>
                    <span className="font-semibold">{metricDef.title}</span>
                    <span className="text-2xs opacity-75">{metricDef.unit}</span>
                  </div>
                </button>
              ))}
            </div>

              {selectedMetrics.length > 0 && (
                <div className="mt-3 text-xs text-gray-400">
                  ✅ {selectedMetrics.length} metrik seçildi: {selectedMetrics.map(m => m.title).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Show Comparison Panel Button when hidden */}
          {!showComparisonPanel && (
            <div className="mt-4">
              <button
                onClick={() => setShowComparisonPanel(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white text-sm"
              >
                <span>🎯</span>
                <span>Metrik Karşılaştırma Panelini Göster</span>
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-400">Veriler yükleniyor...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="text-red-400 mb-2">⚠ Hata</div>
              <p className="text-gray-400">{error}</p>
              <button
                onClick={fetchDetailedData}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tekrar Dene
              </button>
            </div>
          )}

          {!loading && !error && chartData.length > 0 && (
            <>
              {/* Primary Metric Statistics Cards */}
              {stats && stats.primaryMetric && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">
                    📈 {stats.primaryMetric.title} İstatistikleri
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Şu Anki', value: stats.current, color: stats.primaryMetric.color },
                      { label: 'Maksimum', value: stats.max, color: '#ef4444' },
                      { label: 'Minimum', value: stats.min, color: '#22c55e' },
                      { label: 'Ortalama', value: stats.avg, color: '#6b7280' }
                    ].map((stat, index) => (
                      <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-xs text-gray-400 uppercase tracking-wide">{stat.label}</div>
                        <div className="text-lg font-bold text-white mt-1">
                          {formatTooltipValue(stat.value, stats.primaryMetric.key, stats.primaryMetric.unit)}
                        </div>
                        <div
                          className="w-full h-1 rounded-full mt-2"
                          style={{ backgroundColor: `${stat.color}40` }}
                        >
                          <div
                            className="h-1 rounded-full transition-all duration-300"
                            style={{
                              backgroundColor: stat.color,
                              width: `${Math.abs(stat.value - stats.min) / (stats.max - stats.min) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Multi-Metric Chart */}
              <div className="bg-gray-800 rounded-lg p-2 sm:p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white">📊 {selectedPeriod === '3day' ? '3 Günlük' : selectedPeriod === '7day' ? '7 Günlük' : '16 Günlük'} Multi-Metrik Karşılaştırma</h4>
                  {selectedMetrics.length > 1 && (
                    <div className="text-xs text-green-400">🎯 {selectedMetrics.length} metrik aktif</div>
                  )}
                </div>

                {/* Metric Legend */}
                {selectedMetrics.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {selectedMetrics.map((metricDef) => (
                      <div
                        key={metricDef.key}
                        className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs border"
                        style={{
                          backgroundColor: `${metricDef.color}20`,
                          borderColor: metricDef.color,
                          color: metricDef.color
                        }}
                      >
                        <span>{metricDef.icon}</span>
                        <span className="font-medium">{metricDef.title}</span>
                        <span className="opacity-75">({metricDef.unit})</span>
                      </div>
                    ))}
                  </div>
                )}

                {chartData.length > 0 && selectedMetrics.length > 0 ? (
                  <>
                    <div style={{ width: '100%', height: '500px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          margin={{
                            top: 20,
                            right: isMobile ? 15 : 60,
                            left: isMobile ? 5 : 60,
                            bottom: 60
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis
                            dataKey="index"
                            stroke="#9ca3af"
                            fontSize={11}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            interval={Math.max(1, Math.floor(chartData.length / 8))}
                            tickFormatter={(tickIndex) => {
                              const dataPoint = chartData[tickIndex];
                              return dataPoint ? dataPoint.formattedTime : '';
                            }}
                          />

                          {/* Primary Y-axis (left) */}
                          <YAxis
                            yAxisId="left"
                            stroke="#9ca3af"
                            fontSize={isMobile ? 10 : 12}
                            tickFormatter={(value) => value.toFixed(0)}
                            width={isMobile ? 30 : 60}
                          />

                          {/* Secondary Y-axis (right) - for different unit types */}
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#9ca3af"
                            fontSize={isMobile ? 10 : 12}
                            tickFormatter={(value) => value.toFixed(0)}
                            width={isMobile ? 30 : 60}
                          />

                          <Tooltip
                            position={{ y: 20 }}
                            contentStyle={{
                              backgroundColor: '#1f2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#ffffff',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                            }}
                            formatter={(value: any, name: string) => {
                              const metricDef = selectedMetrics.find(m => m.key === name);
                              if (metricDef) {
                                return [formatTooltipValue(value, metricDef.key, metricDef.unit), metricDef.title];
                              }
                              return [value, name];
                            }}
                            labelFormatter={(label) => {
                              const dataPoint = chartData[label];
                              if (dataPoint) {
                                return format(dataPoint.date, 'dd MMMM yyyy - HH:mm', { locale: tr });
                              }
                              return `Saat: ${label}`;
                            }}
                            cursor={{
                              stroke: '#64748b',
                              strokeWidth: 1,
                              strokeDasharray: '3 3'
                            }}
                          />

                          {/* Render a Line for each selected metric */}
                          {selectedMetrics.map((metricDef, index) => {
                            // Use left axis for temperature/percentage metrics, right for others
                            const useRightAxis = ['pressure', 'precipitation', 'wind_speed'].includes(metricDef.key);

                            return (
                              <Line
                                key={metricDef.key}
                                yAxisId={useRightAxis ? "right" : "left"}
                                type="monotone"
                                dataKey={metricDef.key}
                                stroke={metricDef.color}
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{
                                  r: 6,
                                  stroke: metricDef.color,
                                  strokeWidth: 2,
                                  fill: metricDef.color,
                                  style: { cursor: 'pointer' }
                                }}
                                connectNulls={false}
                                strokeDasharray={index > 0 ? "5 5" : undefined} // First line solid, others dashed
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Multi-Metric Stats */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedMetrics.map((metricDef) => {
                        const values = chartData.map(d => d[metricDef.key]).filter(v => v !== undefined);
                        if (values.length === 0) return null;

                        const max = Math.max(...values);
                        const min = Math.min(...values);
                        const avg = values.reduce((a, b) => a + b, 0) / values.length;

                        return (
                          <div
                            key={metricDef.key}
                            className="bg-gray-700 rounded-lg p-3 border"
                            style={{ borderColor: `${metricDef.color}60` }}
                          >
                            <div className="flex items-center space-x-2 mb-2">
                              <span>{metricDef.icon}</span>
                              <span className="font-medium text-white text-sm">{metricDef.title}</span>
                            </div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Maks:</span>
                                <span style={{ color: metricDef.color }}>
                                  {formatTooltipValue(max, metricDef.key, metricDef.unit)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Min:</span>
                                <span style={{ color: metricDef.color }}>
                                  {formatTooltipValue(min, metricDef.key, metricDef.unit)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Ort:</span>
                                <span style={{ color: metricDef.color }}>
                                  {formatTooltipValue(avg, metricDef.key, metricDef.unit)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : selectedMetrics.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-4xl mb-4">🎯</div>
                    <p className="text-lg mb-2">Metrik Seçin</p>
                    <p className="text-sm">Karşılaştırmak istediğiniz metrikleri yukarıdan seçin</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p>Veriler yükleniyor...</p>
                  </div>
                )}
              </div>

              {/* Daily Summary for Primary Metric */}
              {selectedMetrics.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    📅 {selectedMetrics[0].title} - Günlük Özet
                  </h3>
                  <div className="grid gap-3">
                    {Array.from(new Set(chartData.map(d => format(d.date, 'yyyy-MM-dd')))).map(dateStr => {
                      const dayData = chartData.filter(d => format(d.date, 'yyyy-MM-dd') === dateStr);
                      const primaryMetric = selectedMetrics[0];

                      // Primary metric için günlük değerleri al
                      const dayValues = dayData.map(d => d[primaryMetric.key]).filter(v => v !== undefined && !isNaN(v));

                      if (dayValues.length === 0) return null;

                      const dayMax = Math.max(...dayValues);
                      const dayMin = Math.min(...dayValues);
                      const dayAvg = dayValues.reduce((sum, v) => sum + v, 0) / dayValues.length;
                      const date = parseISO(dateStr);
                      const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                      return (
                        <div key={dateStr} className={`bg-gray-800 rounded-lg p-4 border ${
                          isToday ? 'border-blue-500' : 'border-gray-700'
                        }`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-white font-medium">
                                {format(date, 'dd MMMM yyyy', { locale: tr })}
                                {isToday && <span className="ml-2 text-xs bg-blue-600 px-2 py-1 rounded">Bugün</span>}
                              </div>
                              <div className="text-sm text-gray-400">
                                {format(date, 'EEEE', { locale: tr })}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-white">
                                <span className="text-red-400">
                                  {formatTooltipValue(dayMax, primaryMetric.key, primaryMetric.unit)}
                                </span>
                                <span className="text-gray-400 mx-2">/</span>
                                <span className="text-blue-400">
                                  {formatTooltipValue(dayMin, primaryMetric.key, primaryMetric.unit)}
                                </span>
                              </div>
                              <div className="text-xs text-gray-400">
                                Ort: {formatTooltipValue(dayAvg, primaryMetric.key, primaryMetric.unit)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherDetailDialog;