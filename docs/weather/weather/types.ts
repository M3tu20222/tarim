export interface OpenMeteoHourlyResponse {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  relative_humidity_2m: number[];
  precipitation_probability: number[];
  precipitation: number[];
  wind_speed_10m: number[];
  soil_temperature_0cm: number[];
  soil_moisture_0_to_1cm: number[];
}

export interface OpenMeteoDailyResponse {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  wind_speed_10m_max: number[];
  sunrise?: string[];
  sunset?: string[];
  sunshine_duration?: number[];
  daylight_duration?: number[];
  precipitation_probability_max?: number[];
  precipitation_hours?: number[];
  soil_temperature_0_to_7cm_mean?: number[]; // Historical
  soil_temperature_7_to_28cm_mean?: number[]; // Historical
  soil_moisture_0_to_7cm_mean?: number[]; // Historical
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly_units: Record<string, string>;
  hourly: OpenMeteoHourlyResponse;
  daily_units: Record<string, string>;
  daily: OpenMeteoDailyResponse;
}

export interface ProcessedHourlyData {
  time: string;
  fullTime: Date;
  temperature: number;
  apparent_temperature: number;
  humidity: number;
  precipitation: number;
  precipitation_probability: number;
  wind_speed: number;
  soil_temperature: number;
  soil_moisture: number;
}

export interface ProcessedDailyData {
  time: string;
  fullTime: Date;
  temperature_max: number;
  temperature_min: number;
  precipitation_sum: number;
  wind_speed_max: number;
  weather_code?: number;
  sunrise?: string;
  sunset?: string;
  sunshine_duration_hours?: number;
  daylight_duration_hours?: number;
  precipitation_probability_max?: number;
  precipitation_hours?: number;
  soil_temperature_mean?: number;
  soil_temperature_deep_mean?: number;
  soil_moisture_mean?: number;
}

export interface ProcessedWeatherData {
  hourlyData: ProcessedHourlyData[];
  dailyData: ProcessedDailyData[];
}

export interface SowingAnalysisPoint {
    x: string;
    label: string;
    color: string;
}
