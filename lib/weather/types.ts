import { WeatherSource } from "@prisma/client";

export type PhenologyStageKey = "initial" | "development" | "mid" | "late";

export interface FieldCoordinate {
  fieldId: string;
  fieldName: string;
  latitude: number;
  longitude: number;
}

export interface HourlyWeatherRecord {
  timestamp: Date;
  temperature2m?: number;
  relativeHumidity2m?: number;
  precipitationMm?: number;
  windSpeed10m?: number;
  windDirection10m?: number;
  windGusts10m?: number;
  shortwaveRadiation?: number;
  et0FaoEvapotranspiration?: number;
  vapourPressureDeficit?: number;
  soilTemperature0cm?: number;
  soilMoisture0_1cm?: number;
}

export interface DailyWeatherRecord {
  date: Date;
  tMaxC?: number;
  tMinC?: number;
  precipitationSumMm?: number;
  shortwaveRadiationSumMj?: number;
  et0FaoEvapotranspiration?: number;
  vapourPressureDeficitMax?: number;
  rainfallProbability?: number;
  daylightSeconds?: number;
}

export interface LocationWeatherBatch {
  fieldId: string;
  fieldName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  utcOffsetSeconds: number;
  source: WeatherSource;
  hourly: HourlyWeatherRecord[];
  daily: DailyWeatherRecord[];
  raw?: unknown;
}

export interface OpenMeteoOptions {
  baseUrl?: string;
  timezone?: string;
  pastDays?: number;
  forecastDays?: number;
  hourlyParameters?: string[];
  dailyParameters?: string[];
}

export interface WeatherSyncOptions extends OpenMeteoOptions {
  fieldIds?: string[];
  chunkSize?: number;
}

export interface WeatherSyncReport {
  totalFields: number;
  processedFields: number;
  skippedFields: number;
  hourlyUpserts: number;
  dailyUpserts: number;
  featureUpserts: number;
  messages: string[];
}

export interface AgroComputationContext {
  fieldId: string;
  fieldName: string;
  cropId?: string;
  cropName?: string;
  cropPlantedDate?: Date;
  dailyRecord: DailyWeatherRecord;
  hourlyRecords: HourlyWeatherRecord[];
  previousFeature?: {
    date: Date;
    gddCumulative?: number;
    etcCumulative?: number;
    waterBalanceMm?: number;
  };
}
