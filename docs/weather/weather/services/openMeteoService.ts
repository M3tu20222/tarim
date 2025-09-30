import { 
  OPEN_METEO_API_URL, 
  HISTORICAL_API_URL,
  DEFAULT_LATITUDE, 
  DEFAULT_LONGITUDE,
  HOURLY_PARAMS,
  DAILY_PARAMS,
  HISTORICAL_DAILY_PARAMS,
} from '../constants';
import { OpenMeteoResponse, ProcessedWeatherData, ProcessedHourlyData, ProcessedDailyData } from '../types';

const handleApiResponse = async (response: Response, serviceName: string): Promise<any> => {
    const responseText = await response.text();

    if (!response.ok) {
        throw new Error(`${serviceName} verileri alinmadi. Sunucu yaniti: ${response.status} ${response.statusText}. Detay: ${responseText}`);
    }

    try {
        return JSON.parse(responseText);
    } catch (e) {
        console.error(`${serviceName} verisi JSON formatinda degil:`, responseText, e);
        throw new Error(`${serviceName} sunucusundan gelen yanit islenemedi.`);
    }
}

export const fetchWeatherData = async (): Promise<ProcessedWeatherData> => {
  const url = new URL(OPEN_METEO_API_URL);
  url.searchParams.append('latitude', DEFAULT_LATITUDE.toString());
  url.searchParams.append('longitude', DEFAULT_LONGITUDE.toString());
  url.searchParams.append('hourly', HOURLY_PARAMS);
  url.searchParams.append('daily', DAILY_PARAMS);
  url.searchParams.append('timezone', 'Europe/Istanbul');

  const response = await fetch(url.toString());
  const data: OpenMeteoResponse = await handleApiResponse(response, "Hava durumu");
  return processWeatherData(data);
};

const processWeatherData = (data: OpenMeteoResponse): ProcessedWeatherData => {
  const { hourly, daily } = data;

  const hourlyData: ProcessedHourlyData[] = hourly.time.map((t: string, i: number) => ({
    time: new Date(t).toLocaleDateString('tr-TR', { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
    fullTime: new Date(t),
    temperature: hourly.temperature_2m[i],
    apparent_temperature: hourly.apparent_temperature[i],
    humidity: hourly.relative_humidity_2m[i],
    precipitation: hourly.precipitation[i],
    precipitation_probability: hourly.precipitation_probability[i],
    wind_speed: hourly.wind_speed_10m[i],
    soil_temperature: hourly.soil_temperature_0cm[i],
    soil_moisture: hourly.soil_moisture_0_to_1cm[i],
  }));

  const dailyData: ProcessedDailyData[] = daily.time.map((t: string, i: number) => ({
    time: new Date(t).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }),
    fullTime: new Date(t),
    temperature_max: daily.temperature_2m_max[i],
    temperature_min: daily.temperature_2m_min[i],
    precipitation_sum: daily.precipitation_sum[i],
    wind_speed_max: daily.wind_speed_10m_max[i],
    weather_code: daily.weather_code?.[i],
    sunrise: daily.sunrise?.[i] ? new Date(daily.sunrise[i]).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : undefined,
    sunset: daily.sunset?.[i] ? new Date(daily.sunset[i]).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : undefined,
    sunshine_duration_hours: typeof daily.sunshine_duration?.[i] === 'number' ? Number((daily.sunshine_duration[i] / 3600).toFixed(1)) : undefined,
    daylight_duration_hours: typeof daily.daylight_duration?.[i] === 'number' ? Number((daily.daylight_duration[i] / 3600).toFixed(1)) : undefined,
    precipitation_probability_max: daily.precipitation_probability_max?.[i],
    precipitation_hours: daily.precipitation_hours?.[i],
  }));

  const now = new Date();
  const future48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const filteredHourlyData = hourlyData.filter(d => d.fullTime > now && d.fullTime <= future48Hours);

  return { hourlyData: filteredHourlyData, dailyData };
};

export const fetchHistoricalData = async (startDate: string, endDate: string): Promise<ProcessedDailyData[]> => {
    const url = new URL(HISTORICAL_API_URL);
    url.searchParams.append('latitude', DEFAULT_LATITUDE.toString());
    url.searchParams.append('longitude', DEFAULT_LONGITUDE.toString());
    url.searchParams.append('start_date', startDate);
    url.searchParams.append('end_date', endDate);
    url.searchParams.append('daily', HISTORICAL_DAILY_PARAMS);
    url.searchParams.append('timezone', 'Europe/Istanbul');

    const response = await fetch(url.toString());
    const data: OpenMeteoResponse = await handleApiResponse(response, "Gecmis hava durumu");
    return processHistoricalData(data);
}

const processHistoricalData = (data: OpenMeteoResponse): ProcessedDailyData[] => {
    const { daily } = data;
    return daily.time.map((t: string, i: number) => ({
        time: new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        fullTime: new Date(t),
        temperature_max: daily.temperature_2m_max[i],
        temperature_min: daily.temperature_2m_min[i],
        precipitation_sum: daily.precipitation_sum[i],
        wind_speed_max: 0, // Not requested for historical
        soil_temperature_mean: daily.soil_temperature_0_to_7cm_mean?.[i],
        soil_temperature_deep_mean: daily.soil_temperature_7_to_28cm_mean?.[i],
        soil_moisture_mean: daily.soil_moisture_0_to_7cm_mean?.[i],
    }));
}

export const analyzeSowingDays = (historicalData: ProcessedDailyData[]): string[] => {
    const suitableDays: string[] = [];
    const GERMINATION_PERIOD = 15; // 15 days

    if (historicalData.length < GERMINATION_PERIOD) return [];

    for (let i = 0; i <= historicalData.length - GERMINATION_PERIOD; i++) {
        const sowingDay = historicalData[i];
        const germinationWindow = historicalData.slice(i, i + GERMINATION_PERIOD);

        // Condition 1: Soil must be moist on sowing day
        const isSoilMoist = sowingDay.soil_moisture_mean && sowingDay.soil_moisture_mean > 0.20;

        if (!isSoilMoist) continue;

        // Condition 2 & 3: Check germination window conditions
        const areConditionsMet = germinationWindow.every(day => {
            const isSoilTempOk = day.soil_temperature_mean && day.soil_temperature_mean >= 5;
            const isAirTempOk = day.temperature_max >= 15 && day.temperature_max <= 25 && day.temperature_min >= 5;
            return isSoilTempOk && isAirTempOk;
        });

        if (areConditionsMet) {
            suitableDays.push(sowingDay.time);
        }
    }
    return suitableDays;
}
