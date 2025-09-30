import React, { useState } from 'react';
import { WeatherMetrics } from '../utils/weatherMetrics';
import { ProcessedWeatherData } from '../types';
import {
  TemperatureIcon,
  RainIcon,
  WindIcon,
  SoilIcon,
  HumidityIcon,
  SunIcon
} from './icons';
import WeatherDetailDialog from './WeatherDetailDialog';

interface WeatherCardsProps {
  weatherData: ProcessedWeatherData;
  metrics: WeatherMetrics;
  location?: { latitude: number; longitude: number; name: string };
}

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
  subtitle?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  icon,
  trend,
  trendValue,
  color = 'blue',
  subtitle,
  onClick
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 shadow-blue-500/20',
    green: 'from-green-500 to-green-600 shadow-green-500/20',
    yellow: 'from-yellow-500 to-yellow-600 shadow-yellow-500/20',
    red: 'from-red-500 to-red-600 shadow-red-500/20',
    purple: 'from-purple-500 to-purple-600 shadow-purple-500/20',
    indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/20',
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return (
          <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'stable':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`
        relative p-6 rounded-xl shadow-lg border border-gray-700/50
        bg-gradient-to-br ${colorClasses[color]}
        backdrop-blur-sm card-hover cursor-pointer
        ${onClick ? 'hover:scale-105' : ''}
        transition-all duration-300
      `}
      onClick={onClick}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent bg-repeat"></div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm weather-icon">
            {icon}
          </div>
          {trend && trendValue && (
            <div className="flex items-center space-x-1 text-sm">
              {getTrendIcon()}
              <span className="text-white/80">{trendValue}</span>
            </div>
          )}
        </div>

        <div className="mb-2">
          <h3 className="text-white/80 text-sm font-medium uppercase tracking-wide">
            {title}
          </h3>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-white">
            {typeof value === 'number' ? value.toFixed(1) : value}
          </span>
          {unit && (
            <span className="text-lg text-white/70 font-medium">{unit}</span>
          )}
        </div>

        {subtitle && (
          <p className="text-white/60 text-sm mt-2">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

const WeatherCards: React.FC<WeatherCardsProps> = ({ weatherData, metrics, location }) => {
  const { statistics } = metrics;
  const currentWeather = weatherData.hourlyData[0];
  const todayWeather = weatherData.dailyData[0];

  const [selectedMetric, setSelectedMetric] = useState<{
    metric: string;
    title: string;
    unit: string;
    icon: React.ReactNode;
    color: string;
  } | null>(null);

  const handleCardClick = (metric: string, title: string, unit: string, icon: React.ReactNode, color: string) => {
    setSelectedMetric({ metric, title, unit, icon, color });
  };

  const cards = [
    {
      title: 'Şu Anki Sıcaklık',
      metric: 'temperature',
      value: currentWeather?.temperature || 0,
      unit: '°C',
      icon: <TemperatureIcon className="w-6 h-6 text-white" />,
      color: 'red' as const,
      subtitle: `Hissedilen: ${currentWeather?.apparent_temperature.toFixed(1) || 0}°C`,
      trend: statistics.temperatureStats.average > 20 ? 'up' : 'down' as const,
      trendValue: `Ort: ${statistics.temperatureStats.average.toFixed(1)}°C`
    },
    {
      title: 'Nem Oranı',
      metric: 'humidity',
      value: currentWeather?.humidity || 0,
      unit: '%',
      icon: <HumidityIcon className="w-6 h-6 text-white" />,
      color: 'blue' as const,
      subtitle: metrics.comfort.comfortLevel[0] || 'Hesaplanıyor...',
      trend: currentWeather?.humidity > 60 ? 'up' : currentWeather?.humidity < 40 ? 'down' : 'stable' as const,
      trendValue: currentWeather?.humidity > 70 ? 'Yüksek' : currentWeather?.humidity < 30 ? 'Düşük' : 'Normal'
    },
    {
      title: 'Rüzgar Hızı',
      metric: 'wind_speed',
      value: currentWeather?.wind_speed || 0,
      unit: 'km/h',
      icon: <WindIcon className="w-6 h-6 text-white" />,
      color: 'indigo' as const,
      subtitle: `Maks: ${todayWeather?.wind_speed_max.toFixed(0) || 0} km/h`,
      trend: (currentWeather?.wind_speed || 0) > 20 ? 'up' : 'stable' as const,
      trendValue: (currentWeather?.wind_speed || 0) > 30 ? 'Kuvvetli' : 'Normal'
    },
    {
      title: 'Toprak Sıcaklığı',
      metric: 'soil_temperature',
      value: currentWeather?.soil_temperature || 0,
      unit: '°C',
      icon: <SoilIcon className="w-6 h-6 text-white" />,
      color: 'yellow' as const,
      subtitle: `Ortalama: ${statistics.soilStats.avgTemperature.toFixed(1)}°C`,
      trend: (currentWeather?.soil_temperature || 0) > 15 ? 'up' : 'down' as const,
      trendValue: (currentWeather?.soil_temperature || 0) > 20 ? 'Optimal' : 'Düşük'
    },
    {
      title: 'Toprak Nemi',
      metric: 'soil_moisture',
      value: ((currentWeather?.soil_moisture || 0) * 100),
      unit: '%',
      icon: <SoilIcon className="w-6 h-6 text-white" />,
      color: 'green' as const,
      subtitle: metrics.agricultural.soilMoistureStatus[0] || 'Hesaplanıyor...',
      trend: (currentWeather?.soil_moisture || 0) > 0.3 ? 'up' : (currentWeather?.soil_moisture || 0) < 0.2 ? 'down' : 'stable' as const,
      trendValue: `Çeşitlilik: ${(statistics.soilStats.moistureVariation * 100).toFixed(1)}%`
    },
    {
      title: 'Günlük Yağış',
      metric: 'precipitation',
      value: todayWeather?.precipitation_sum || 0,
      unit: 'mm',
      icon: <RainIcon className="w-6 h-6 text-white" />,
      color: 'purple' as const,
      subtitle: `Toplam 7 gün: ${statistics.precipitationStats.total.toFixed(1)}mm`,
      trend: (todayWeather?.precipitation_sum || 0) > 10 ? 'up' : (todayWeather?.precipitation_sum || 0) > 0 ? 'stable' : 'down' as const,
      trendValue: statistics.precipitationStats.droughtRisk ? 'Kuraklık Riski' : 'Normal'
    }
  ];

  return (
    <>
      <div className="responsive-grid">
        {cards.map((card, index) => (
          <StatCard
            key={index}
            title={card.title}
            value={card.value}
            unit={card.unit}
            icon={card.icon}
            color={card.color}
            subtitle={card.subtitle}
            trend={card.trend}
            trendValue={card.trendValue}
            onClick={() => handleCardClick(card.metric, card.title, card.unit, card.icon, card.color)}
          />
        ))}
      </div>

      {/* Weather Detail Dialog */}
      {selectedMetric && location && (
        <WeatherDetailDialog
          isOpen={!!selectedMetric}
          onClose={() => setSelectedMetric(null)}
          metric={selectedMetric.metric}
          title={selectedMetric.title}
          unit={selectedMetric.unit}
          icon={selectedMetric.icon}
          color={selectedMetric.color}
          location={location}
        />
      )}
    </>
  );
};

export default WeatherCards;