import React, { useState, useEffect, useMemo, useCallback } from 'react';
import WeatherChart from './WeatherChart';
import { fetchWeatherData, fetchHistoricalData } from '../services/openMeteoService';
import { ProcessedWeatherData, ProcessedDailyData } from '../types';
import { SoilIcon, RainIcon, TemperatureIcon, HumidityIcon, SunIcon, WindIcon } from './icons';

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Acik hava',
  1: 'Parcali bulutlu',
  2: 'Cok bulutlu',
  3: 'Kapali',
  45: 'Sis',
  48: 'Kiragi sis',
  51: 'Hafif ciseleme',
  53: 'Orta ciseleme',
  55: 'Yogun ciseleme',
  56: 'Hafif donlu ciseleme',
  57: 'Yogun donlu ciseleme',
  61: 'Hafif yagmur',
  63: 'Orta yagmur',
  65: 'Kuvvetli yagmur',
  66: 'Hafif donlu yagmur',
  67: 'Kuvvetli donlu yagmur',
  71: 'Hafif kar',
  73: 'Orta kar',
  75: 'Kuvvetli kar',
  77: 'Kar taneleri',
  80: 'Hafif saganak',
  81: 'Orta saganak',
  82: 'Kuvvetli saganak',
  85: 'Hafif kar saganagi',
  86: 'Kuvvetli kar saganagi',
  95: 'Gok gurultulu firtina',
  96: 'Dolu ile hafif firtina',
  99: 'Dolu ile siddetli firtina',
};

const AdvancedInsights: React.FC = () => {
  const [weatherData, setWeatherData] = useState<ProcessedWeatherData | null>(null);
  const [historicalData, setHistoricalData] = useState<ProcessedDailyData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [historicalLoading, setHistoricalLoading] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(
    () => Array.from({ length: currentYear - 1999 }, (_, i) => currentYear - i),
    [currentYear],
  );

  useEffect(() => {
    const loadForecast = async () => {
      try {
        setLoading(true);
        setError(null);
        const forecast = await fetchWeatherData();
        setWeatherData(forecast);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Bilinmeyen bir hata olustu.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadForecast();
  }, []);

  const loadHistorical = useCallback(async () => {
    try {
      setHistoricalLoading(true);
      const startDate = `${selectedYear}-03-01`;
      const endDate = `${selectedYear}-05-31`;
      const historical = await fetchHistoricalData(startDate, endDate);
      setHistoricalData(historical);
    } catch (err) {
      if (err instanceof Error) {
        setError(`Tarihsel veriler yuklenirken hata olustu: ${err.message}`);
      } else {
        setError('Bilinmeyen bir hata olustu.');
      }
    } finally {
      setHistoricalLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadHistorical();
  }, [loadHistorical]);

  const forecastStats = useMemo(() => {
    if (!weatherData || weatherData.dailyData.length === 0) return [];

    const maxTemp = Math.max(...weatherData.dailyData.map(day => day.temperature_max));
    const minTemp = Math.min(...weatherData.dailyData.map(day => day.temperature_min));
    const totalPrecip = weatherData.dailyData.reduce((sum, day) => sum + (day.precipitation_sum || 0), 0);
    const avgSunshine = weatherData.dailyData.reduce((sum, day) => sum + (day.sunshine_duration_hours || 0), 0) / weatherData.dailyData.length;

    const hourlyHumidity = weatherData.hourlyData.map(h => h.humidity);
    const avgHumidity = hourlyHumidity.length ? (hourlyHumidity.reduce((sum, value) => sum + value, 0) / hourlyHumidity.length) : 0;

    return [
      { label: 'En Yuksek Sicaklik', value: `${maxTemp.toFixed(1)} °C`, icon: <TemperatureIcon className="text-warning" /> },
      { label: 'En Dusuk Sicaklik', value: `${minTemp.toFixed(1)} °C`, icon: <TemperatureIcon className="text-info" /> },
      { label: 'Toplam Yagis', value: `${totalPrecip.toFixed(1)} mm`, icon: <RainIcon className="text-info" /> },
      { label: 'Ortalama Guneslenme', value: `${avgSunshine.toFixed(1)} saat`, icon: <SunIcon className="text-warning" /> },
      { label: 'Ortalama Nem', value: `${avgHumidity.toFixed(0)} %`, icon: <HumidityIcon className="text-primary" /> },
    ];
  }, [weatherData]);

  const sunshineChartData = useMemo(() => {
    if (!weatherData) return [];
    return weatherData.dailyData.map(day => ({
      time: day.time,
      sunshineHours: day.sunshine_duration_hours ?? 0,
      daylightHours: day.daylight_duration_hours ?? 0,
    }));
  }, [weatherData]);

  const precipitationInsightData = useMemo(() => {
    if (!weatherData) return [];
    return weatherData.dailyData.map(day => ({
      time: day.time,
      precipitationHours: day.precipitation_hours ?? 0,
      precipitationProbability: day.precipitation_probability_max ?? 0,
      precipitationSum: day.precipitation_sum ?? 0,
    }));
  }, [weatherData]);

  const weatherCodeRows = useMemo(() => {
    if (!weatherData) return [];
    return weatherData.dailyData.map(day => ({
      time: day.time,
      code: day.weather_code,
      description: typeof day.weather_code === 'number' ? (WMO_DESCRIPTIONS[day.weather_code] || 'Bilinmeyen kod') : '-',
      sunrise: day.sunrise || '-',
      sunset: day.sunset || '-',
      sunshine: typeof day.sunshine_duration_hours === 'number' ? `${day.sunshine_duration_hours} saat` : '-',
    }));
  }, [weatherData]);

  const hourlyTableRows = useMemo(() => {
    if (!weatherData) return [];
    return weatherData.hourlyData.map(hour => ({
      time: hour.time,
      temperature: `${hour.temperature.toFixed(1)} °C`,
      apparentTemperature: `${hour.apparent_temperature.toFixed(1)} °C`,
      humidity: `${hour.humidity.toFixed(0)} %`,
      wind: `${hour.wind_speed.toFixed(0)} km/h`,
      precipitation: `${hour.precipitation.toFixed(1)} mm`,
      probability: `${hour.precipitation_probability.toFixed(0)} %`,
      soilTemperature: `${hour.soil_temperature.toFixed(1)} °C`,
      soilMoisture: `${hour.soil_moisture.toFixed(2)} m3/m3`,
    }));
  }, [weatherData]);

  const historicalSoilChartData = useMemo(() => {
    if (!historicalData) return [];
    return historicalData.map(day => ({
      time: day.time,
      surfaceSoilTemp: day.soil_temperature_mean ?? null,
      deepSoilTemp: day.soil_temperature_deep_mean ?? null,
      soilMoisture: day.soil_moisture_mean ?? null,
    }));
  }, [historicalData]);

  if (loading && !weatherData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-info"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-error bg-red-900/50 p-4 rounded-lg">{error}</div>;
  }

  if (!weatherData) {
    return null;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {forecastStats.map((stat, index) => (
          <div key={index} className="bg-base-200 p-4 rounded-xl shadow-lg flex items-center gap-4">
            <div className="text-2xl">
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wide">{stat.label}</p>
              <p className="text-xl font-semibold text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <SunIcon className="text-warning" /> Guneslenme ve Gun Uzunlugu
        </h2>
        <WeatherChart
          title=""
          data={sunshineChartData}
          type="composed"
          xAxisDataKey="time"
          bars={[{ dataKey: 'sunshineHours', fill: '#FACC15', name: 'Guneslenme', unit: 'saat', yAxisId: 'left' }]}
          lines={[{ dataKey: 'daylightHours', stroke: '#0EA5E9', name: 'Gun uzunlugu', unit: 'saat', yAxisId: 'left' }]}
          yAxisUnit="saat"
          icon={<SunIcon className="text-warning" />}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <RainIcon className="text-info" /> Yagis Ihtimali Analizi
        </h2>
        <WeatherChart
          title=""
          data={precipitationInsightData}
          type="composed"
          xAxisDataKey="time"
          bars={[{ dataKey: 'precipitationHours', fill: '#38BDF8', name: 'Yagisli saat', unit: 'saat', yAxisId: 'left' }]}
          lines={[
            { dataKey: 'precipitationProbability', stroke: '#FBBF24', name: 'Yagis ihtimali', unit: '%', yAxisId: 'right' },
            { dataKey: 'precipitationSum', stroke: '#0EA5E9', name: 'Yagis miktari', unit: 'mm', yAxisId: 'left' },
          ]}
          yAxisUnit="saat / mm"
          yAxis2Unit="%"
          icon={<RainIcon className="text-info" />}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <HumidityIcon className="text-primary" /> Saatlik Ayrintilar (48 saat)
        </h2>
        <div className="overflow-auto bg-base-200 rounded-xl shadow-lg">
          <table className="min-w-full text-sm text-gray-200">
            <thead className="bg-base-300 text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Saat</th>
                <th className="px-4 py-3 text-left">Sicaklik</th>
                <th className="px-4 py-3 text-left">Hissedilen</th>
                <th className="px-4 py-3 text-left">Nem</th>
                <th className="px-4 py-3 text-left">Ruzgar</th>
                <th className="px-4 py-3 text-left">Yagis</th>
                <th className="px-4 py-3 text-left">Yagis %</th>
                <th className="px-4 py-3 text-left">Toprak Sic.</th>
                <th className="px-4 py-3 text-left">Toprak Nem</th>
              </tr>
            </thead>
            <tbody>
              {hourlyTableRows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-base-200/60' : 'bg-base-200/40'}>
                  <td className="px-4 py-2 whitespace-nowrap">{row.time}</td>
                  <td className="px-4 py-2">{row.temperature}</td>
                  <td className="px-4 py-2">{row.apparentTemperature}</td>
                  <td className="px-4 py-2">{row.humidity}</td>
                  <td className="px-4 py-2">{row.wind}</td>
                  <td className="px-4 py-2">{row.precipitation}</td>
                  <td className="px-4 py-2">{row.probability}</td>
                  <td className="px-4 py-2">{row.soilTemperature}</td>
                  <td className="px-4 py-2">{row.soilMoisture}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <TemperatureIcon className="text-warning" /> Hava Durumu Kodlari
        </h2>
        <div className="overflow-auto bg-base-200 rounded-xl shadow-lg">
          <table className="min-w-full text-sm text-gray-200">
            <thead className="bg-base-300 text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Tarih</th>
                <th className="px-4 py-3 text-left">Kod</th>
                <th className="px-4 py-3 text-left">Aciklama</th>
                <th className="px-4 py-3 text-left">Gunes dogus</th>
                <th className="px-4 py-3 text-left">Gunes batis</th>
                <th className="px-4 py-3 text-left">Guneslenme</th>
              </tr>
            </thead>
            <tbody>
              {weatherCodeRows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-base-200/60' : 'bg-base-200/40'}>
                  <td className="px-4 py-2 whitespace-nowrap">{row.time}</td>
                  <td className="px-4 py-2">{row.code ?? '-'}</td>
                  <td className="px-4 py-2">{row.description}</td>
                  <td className="px-4 py-2">{row.sunrise}</td>
                  <td className="px-4 py-2">{row.sunset}</td>
                  <td className="px-4 py-2">{row.sunshine}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className='flex justify-between items-center flex-wrap gap-4'>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <SoilIcon className="text-success" /> Tarihsel Toprak Profil Analizi (Mart-Mayis)
          </h2>
          <div className='flex items-center gap-2 text-sm text-gray-400'>
            <label htmlFor="insights-year-select">Yil:</label>
            <select
              id="insights-year-select"
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

        {historicalLoading ? (
          <div className="flex justify-center items-center h-80">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-success"></div>
          </div>
        ) : (
          <WeatherChart
            title=""
            data={historicalSoilChartData}
            type="composed"
            xAxisDataKey="time"
            lines={[
              { dataKey: 'surfaceSoilTemp', stroke: '#36D399', name: 'Toprak Sic (Yuzey)', unit: '°C', yAxisId: 'left' },
              { dataKey: 'deepSoilTemp', stroke: '#0EA5E9', name: 'Toprak Sic (Derin)', unit: '°C', yAxisId: 'left' },
              { dataKey: 'soilMoisture', stroke: '#D946EF', name: 'Toprak Nem', unit: 'm3/m3', yAxisId: 'right' },
            ]}
            yAxisUnit="°C"
            yAxis2Unit="m3/m3"
            icon={<SoilIcon className="text-success" />}
          />
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <WindIcon className="text-secondary" /> Gunluk Ozeti
        </h2>
        <div className="overflow-auto bg-base-200 rounded-xl shadow-lg">
          <table className="min-w-full text-sm text-gray-200">
            <thead className="bg-base-300 text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Tarih</th>
                <th className="px-4 py-3 text-left">Maks °C</th>
                <th className="px-4 py-3 text-left">Min °C</th>
                <th className="px-4 py-3 text-left">Ruzgar km/h</th>
                <th className="px-4 py-3 text-left">Yagis mm</th>
                <th className="px-4 py-3 text-left">Yagis Saat</th>
                <th className="px-4 py-3 text-left">Yagis %</th>
                <th className="px-4 py-3 text-left">Guneslenme</th>
              </tr>
            </thead>
            <tbody>
              {weatherData.dailyData.map((day, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-base-200/60' : 'bg-base-200/40'}>
                  <td className="px-4 py-2 whitespace-nowrap">{day.time}</td>
                  <td className="px-4 py-2">{day.temperature_max.toFixed(1)}</td>
                  <td className="px-4 py-2">{day.temperature_min.toFixed(1)}</td>
                  <td className="px-4 py-2">{day.wind_speed_max.toFixed(0)}</td>
                  <td className="px-4 py-2">{(day.precipitation_sum ?? 0).toFixed(1)}</td>
                  <td className="px-4 py-2">{(day.precipitation_hours ?? 0).toFixed(1)}</td>
                  <td className="px-4 py-2">{(day.precipitation_probability_max ?? 0).toFixed(0)}</td>
                  <td className="px-4 py-2">{(day.sunshine_duration_hours ?? 0).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdvancedInsights;
