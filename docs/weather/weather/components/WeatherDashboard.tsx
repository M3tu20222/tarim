import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchWeatherData, fetchHistoricalData, analyzeSowingDays } from '../services/openMeteoService';
import { getWeatherInterpretation } from '../services/geminiService';
import { ProcessedWeatherData, ProcessedDailyData, SowingAnalysisPoint } from '../types';
import WeatherChart from './WeatherChart';
import WeatherCards from './WeatherCards';
import GeminiInterpretation from './GeminiInterpretation';
import LocationSelector from './LocationSelector';
import ExportShare from './ExportShare';
import { TemperatureIcon, RainIcon, WindIcon, SoilIcon, HumidityIcon } from './icons';
import { calculateWeatherMetrics, WeatherMetrics } from '../utils/weatherMetrics';
import useWeatherCache from '../hooks/useWeatherCache';
import { useTheme } from '../hooks/useTheme';

const FATAL_AIR_TEMP_THRESHOLD = 0; // �C, young corn tissues damaged by frost
const FATAL_SOIL_TEMP_THRESHOLD = 5; // �C, cold soils stall germination and kill sprouts

const WeatherDashboard: React.FC = () => {
  const { weatherData, metrics, loading, error, loadHistoricalData, refreshData, getCacheStats } = useWeatherCache();
  const { theme, toggleTheme, isDark } = useTheme();
  const [historicalData, setHistoricalData] = useState<ProcessedDailyData[] | null>(null);
  const [sowingDays, setSowingDays] = useState<SowingAnalysisPoint[]>([]);
  const [fatalDays, setFatalDays] = useState<SowingAnalysisPoint[]>([]);
  const [interpretation, setInterpretation] = useState<string>('');
  const [isGeminiLoading, setIsGeminiLoading] = useState<boolean>(false);
  const [isHistoricalLoading, setIsHistoricalLoading] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [currentLocation, setCurrentLocation] = useState({
    name: 'Konya Yunak',
    latitude: 38.8158,
    longitude: 31.7342
  });

  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(
    () => Array.from({ length: currentYear - 1999 }, (_, i) => currentYear - i),
    [currentYear],
  );

  const cacheStats = getCacheStats();

  const loadHistoricalDataLocal = useCallback(async () => {
    try {
      setIsHistoricalLoading(true);
      const startDate = `${selectedYear}-03-01`;
      const endDate = `${selectedYear}-05-31`;
      const historical = await loadHistoricalData(startDate, endDate);

      setHistoricalData(historical);

      const suitableDays = analyzeSowingDays(historical);
      const analysisPoints: SowingAnalysisPoint[] = suitableDays.map(day => ({
        x: day,
        label: 'Ekim icin uygun',
        color: '#36D399',
      }));
      setSowingDays(analysisPoints);

      const lethalDays = historical
        .filter(day => {
          const coldAir = day.temperature_min <= FATAL_AIR_TEMP_THRESHOLD;
          const coldTopSoil = typeof day.soil_temperature_mean === 'number' && day.soil_temperature_mean < FATAL_SOIL_TEMP_THRESHOLD;
          return coldAir || coldTopSoil;
        })
        .map(day => ({
          x: day.time,
          label: 'Don riski',
          color: '#F87171',
        }));
      setFatalDays(lethalDays);

    } catch (err) {
      console.error('Historical data error:', err);
    } finally {
      setIsHistoricalLoading(false);
    }
  }, [selectedYear, loadHistoricalData]);


  useEffect(() => {
    loadHistoricalDataLocal();
  }, [loadHistoricalDataLocal]);
  
  const handleGeminiAnalysis = useCallback(async () => {
      if (!weatherData) return;
      setIsGeminiLoading(true);
      setInterpretation('');
      try {
          const aiInterpretation = await getWeatherInterpretation(weatherData);
          setInterpretation(aiInterpretation);
      } catch (err) {
          setError('Gemini analizi sirasinda bir hata olustu.');
      } finally {
          setIsGeminiLoading(false);
      }
  }, [weatherData]);

  const dailyChartConfigs = useMemo(() => {
    if (!weatherData) return [];
    return [
      {
        key: 'daily-temp-range',
        title: 'Gunluk Sicaklik Araligi',
        icon: <TemperatureIcon className="text-warning" />, 
        data: weatherData.dailyData,
        type: 'line' as const,
        xAxisDataKey: 'time',
        lines: [
          { dataKey: 'temperature_max', stroke: '#FBBD23', name: 'Maksimum', unit: '�C' },
          { dataKey: 'temperature_min', stroke: '#3ABFF8', name: 'Minimum', unit: '�C' },
        ],
        yAxisUnit: '�C',
        syncId: 'dailyCharts',
      },
      {
        key: 'daily-precip',
        title: 'Gunluk Yagis Toplami',
        icon: <RainIcon className="text-info" />, 
        data: weatherData.dailyData,
        type: 'bar' as const,
        xAxisDataKey: 'time',
        bars: [
          { dataKey: 'precipitation_sum', fill: '#3ABFF8', name: 'Yagis', unit: 'mm' },
        ],
        yAxisUnit: 'mm',
        syncId: 'dailyCharts',
      },
      {
        key: 'daily-wind',
        title: 'Gunluk Maksimum Ruzgar',
        icon: <WindIcon className="text-secondary" />, 
        data: weatherData.dailyData,
        type: 'line' as const,
        xAxisDataKey: 'time',
        lines: [
          { dataKey: 'wind_speed_max', stroke: '#D926AA', name: 'Maksimum Ruzgar', unit: 'km/h' },
        ],
        yAxisUnit: 'km/h',
        syncId: 'dailyCharts',
      },
    ];
  }, [weatherData]);

  const hourlyChartConfigs = useMemo(() => {
    if (!weatherData) return [];
    return [
      {
        key: 'hourly-thermal-soil',
        title: 'Saatlik Sicaklik ve Toprak Profili',
        icon: <SoilIcon className="text-warning" />, 
        data: weatherData.hourlyData,
        type: 'line' as const,
        xAxisDataKey: 'time',
        lines: [
          { dataKey: 'temperature', stroke: '#F87272', name: 'Sicaklik', unit: '�C', yAxisId: 'left' },
          { dataKey: 'apparent_temperature', stroke: '#36D399', name: 'Hissedilen', unit: '�C', yAxisId: 'left' },
          { dataKey: 'soil_temperature', stroke: '#FBBD23', name: 'Toprak Sicakligi', unit: '�C', yAxisId: 'left' },
          { dataKey: 'soil_moisture', stroke: '#3ABFF8', name: 'Toprak Nem', unit: 'm3/m3', yAxisId: 'right' },
        ],
        yAxisUnit: '�C',
        yAxis2Unit: 'm3/m3',
        syncId: 'hourlyCharts',
      },
      {
        key: 'hourly-atmospheric',
        title: 'Saatlik Yagis, Nem ve Ruzgar',
        icon: <RainIcon className="text-info" />, 
        data: weatherData.hourlyData,
        type: 'composed' as const,
        xAxisDataKey: 'time',
        bars: [
          { dataKey: 'precipitation', fill: '#0EA5E9', name: 'Yagis', unit: 'mm', yAxisId: 'left' },
        ],
        lines: [
          { dataKey: 'humidity', stroke: '#6366F1', name: 'Nem', unit: '%', yAxisId: 'right' },
          { dataKey: 'precipitation_probability', stroke: '#FBBF24', name: 'Yagis Ihtimali', unit: '%', yAxisId: 'right' },
          { dataKey: 'wind_speed', stroke: '#D926AA', name: 'Ruzgar', unit: 'km/h', yAxisId: 'left' },
        ],
        yAxisUnit: 'mm / km/h',
        yAxis2Unit: '%',
        syncId: 'hourlyCharts',
      },
    ];
  }, [weatherData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-info mx-auto mb-4"></div>
          <p className="text-lg text-white">Veriler yükleniyor...</p>
          <p className="text-sm text-gray-400 mt-2">Cache durumu: {cacheStats.validEntries}/{cacheStats.totalEntries}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <div className="glass p-8 rounded-xl border border-red-500/50">
          <h3 className="text-xl font-bold text-red-400 mb-4">Veri Yükleme Hatası</h3>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => refreshData()}
            className="btn bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg"
          >
            Yeniden Dene
          </button>
        </div>
      </div>
    );
  }

  if (!weatherData || !metrics) {
    return null;
  }
  
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <LocationSelector
            currentLocation={currentLocation}
            onLocationChange={setCurrentLocation}
          />
          <button
            onClick={toggleTheme}
            className="glass px-4 py-2 rounded-lg hover:bg-base-100 transition-colors flex items-center space-x-2"
          >
            {isDark ? (
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
            <span className="text-sm">{theme === 'auto' ? 'Otomatik' : isDark ? 'Açık' : 'Koyu'}</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">
            Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}
          </div>
          <ExportShare
            weatherData={weatherData}
            metrics={metrics}
            currentLocation={currentLocation}
          />
        </div>
      </div>

      {/* Weather Cards */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
          <div className="w-1 h-8 bg-gradient-to-b from-primary-400 to-primary-600 rounded-full mr-4"></div>
          Anlık Hava Durumu
        </h2>
        <WeatherCards weatherData={weatherData} metrics={metrics} location={currentLocation} />
      </section>
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <div className="w-1 h-8 bg-gradient-to-b from-warning-400 to-warning-600 rounded-full mr-4"></div>
          Günlük Tahminler (7 Gün)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {dailyChartConfigs.map(config => (
            <WeatherChart
              key={config.key}
              title={config.title}
              data={config.data}
              type={config.type}
              xAxisDataKey={config.xAxisDataKey}
              lines={config.lines}
              bars={config.bars}
              icon={config.icon}
              yAxisUnit={config.yAxisUnit}
              yAxis2Unit={config.yAxis2Unit}
              syncId={config.syncId}
            />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <div className="w-1 h-8 bg-gradient-to-b from-info-400 to-info-600 rounded-full mr-4"></div>
          Saatlik Tahminler (48 Saat)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hourlyChartConfigs.map(config => (
            <WeatherChart
              key={config.key}
              title={config.title}
              data={config.data}
              type={config.type}
              xAxisDataKey={config.xAxisDataKey}
              lines={config.lines}
              bars={config.bars}
              icon={config.icon}
              yAxisUnit={config.yAxisUnit}
              yAxis2Unit={config.yAxis2Unit}
              syncId={config.syncId}
            />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <div className="w-1 h-8 bg-gradient-to-b from-success-400 to-success-600 rounded-full mr-4"></div>
          Mısır Ekimi Analizi
        </h2>
      <div className="glass p-6 rounded-xl">
        <div className='flex justify-between items-center mb-4 flex-wrap gap-4'>
          <div className="flex items-center gap-2">
            <SoilIcon className="text-success w-6 h-6"/>
            <h3 className="text-lg font-semibold text-white">Gecmis Verilerle Misir Ekimi Analizi (Mart-Mayis)</h3>
          </div>
          <div className='flex items-center gap-2'>
            <label htmlFor="year-select" className="text-sm text-gray-400">Yil:</label>
            <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-base-100 border border-gray-600 text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-2"
            >
                {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
          <span className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#36D399' }}></span>
            Ekim icin uygun
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#F87171' }}></span>
            Don riski - fide zarar gorur
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-10 border-t border-dashed" style={{ borderColor: 'rgba(248, 114, 114, 0.7)' }}></span>
            Kritik sinir: 5�C toprak
          </span>
        </div>

        {isHistoricalLoading ? (
          <div className="flex justify-center items-center h-80">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-success"></div>
          </div>
        ) : historicalData && (
          <WeatherChart
            title=""
            data={historicalData}
            type="composed"
            lines={[
              { dataKey: 'temperature_max', stroke: '#FBBD23', name: 'Maks Sicaklik', unit: '�C' },
              { dataKey: 'temperature_min', stroke: '#3ABFF8', name: 'Min Sicaklik', unit: '�C' },
              { dataKey: 'soil_temperature_mean', stroke: '#36D399', name: 'Toprak Sic (Yuzey)', unit: '�C' },
              { dataKey: 'soil_temperature_deep_mean', stroke: '#1FB2A5', name: 'Toprak Sic (Derin)', unit: '�C' },
            ]}
            xAxisDataKey="time"
            yAxisUnit="�C"
            referencePoints={[...fatalDays, ...sowingDays]}
            horizontalReferenceLines={[{ y: 5, label: 'Kritik Sinir: 5�C', color: 'rgba(248, 114, 114, 0.7)' }]}
          />
        )}
      </div>
      </section>

      <GeminiInterpretation text={interpretation} loading={isGeminiLoading} onAnalyze={handleGeminiAnalysis} />

      {/* Performance Stats */}
      {process.env.NODE_ENV === 'development' && (
        <section className="mt-8">
          <details className="glass p-4 rounded-lg">
            <summary className="text-sm text-gray-400 cursor-pointer">Cache İstatistikleri (Geliştirici)</summary>
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <div>Toplam Cache: {cacheStats.totalEntries}</div>
              <div>Geçerli: {cacheStats.validEntries}</div>
              <div>Süresi Dolmuş: {cacheStats.expiredEntries}</div>
              <div>Hit Oranı: {(cacheStats.hitRatio * 100).toFixed(1)}%</div>
              <div>Aktif İstekler: {cacheStats.activeRequests}</div>
              <div>Son Güncelleme: {cacheStats.lastUpdate}</div>
            </div>
          </details>
        </section>
      )}
    </div>
  );
};

export default WeatherDashboard;




