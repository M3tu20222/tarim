import { WeatherSource } from "@prisma/client";
import { isSameDay } from "date-fns";

import {
  FieldCoordinate,
  LocationWeatherBatch,
  OpenMeteoOptions,
} from "./types";
import {
  parseDateWithOffset,
  parseTimestampWithOffset,
  safeNumber,
} from "./utils";

const DEFAULT_BASE_URL = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_HOURLY_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "precipitation",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "shortwave_radiation",
  "et0_fao_evapotranspiration",
  "vapour_pressure_deficit",
  "soil_temperature_0cm",
  "soil_moisture_0_1cm",
];
const DEFAULT_DAILY_PARAMS = [
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "shortwave_radiation_sum",
  "et0_fao_evapotranspiration",
  "wind_speed_10m_max",
  "wind_direction_10m_dominant",
  "wind_gusts_10m_max",
];

const DEFAULT_TIMEZONE = "Europe/Istanbul";

interface RawOpenMeteoLocation {
  latitude?: number;
  longitude?: number;
  utc_offset_seconds?: number;
  timezone?: string;
  timezone_abbreviation?: string;
  elevation?: number;
  hourly?: Record<string, unknown> & {
    time?: string[];
    temperature_2m?: number[];
    relative_humidity_2m?: number[];
    precipitation?: number[];
    wind_speed_10m?: number[];
    wind_direction_10m?: number[];
    wind_gusts_10m?: number[];
    shortwave_radiation?: number[];
    et0_fao_evapotranspiration?: number[];
    vapour_pressure_deficit?: number[];
    soil_temperature_0cm?: number[];
    soil_moisture_0_1cm?: number[];
  };
  daily?: Record<string, unknown> & {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    shortwave_radiation_sum?: number[];
    et0_fao_evapotranspiration?: number[];
    precipitation_probability_max?: number[];
    daylight_duration?: number[];
    wind_speed_10m_max?: number[];
    wind_direction_10m_dominant?: number[];
    wind_gusts_10m_max?: number[];
  };
  model?: string;
}

const toNumberOrUndefined = (value: unknown): number | undefined => {
  const parsed = safeNumber(value);
  return parsed === undefined ? undefined : Number(parsed.toFixed(4));
};

const readEnvInt = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const buildOpenMeteoUrl = (
  coordinates: readonly FieldCoordinate[],
  options: Partial<OpenMeteoOptions> = {},
): string => {
  const baseUrl = options.baseUrl ?? process.env.OPEN_METEO_BASE_URL ?? DEFAULT_BASE_URL;
  const hourlyParameters = options.hourlyParameters ?? DEFAULT_HOURLY_PARAMS;
  const dailyParameters = options.dailyParameters ?? DEFAULT_DAILY_PARAMS;
  const timezone = options.timezone ?? process.env.WEATHER_DEFAULT_TIMEZONE ?? DEFAULT_TIMEZONE;
  const pastDays = options.pastDays ?? readEnvInt("WEATHER_PAST_DAYS", 2);
  const forecastDays = options.forecastDays ?? readEnvInt("WEATHER_FORECAST_DAYS", 7);

  const latitudes = coordinates.map((c) => c.latitude.toFixed(4)).join(",");
  const longitudes = coordinates.map((c) => c.longitude.toFixed(4)).join(",");

  const params = new URLSearchParams({
    latitude: latitudes,
    longitude: longitudes,
    timezone,
    past_days: String(pastDays),
    forecast_days: String(forecastDays),
    hourly: hourlyParameters.join(","),
    daily: dailyParameters.join(","),
  });

  return `${baseUrl}?${params.toString()}`;
};

export const fetchOpenMeteoBatch = async (
  coordinates: readonly FieldCoordinate[],
  options: Partial<OpenMeteoOptions> = {},
): Promise<LocationWeatherBatch[]> => {
  if (coordinates.length === 0) {
    return [];
  }

  const url = buildOpenMeteoUrl(coordinates, options);
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "tarim-yonetim-sistemi weather-sync (+https://tarim.local)",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Open-Meteo request failed with status ${response.status}: ${body.slice(0, 200)}`,
    );
  }

  const payload = (await response.json()) as RawOpenMeteoLocation | RawOpenMeteoLocation[];
  const locations = Array.isArray(payload) ? payload : [payload];

  if (locations.length !== coordinates.length) {
    throw new Error(
      `Open-Meteo returned ${locations.length} locations but ${coordinates.length} were requested`,
    );
  }

  return locations.map((location, index) => {
    const coordinate = coordinates[index];
    const offsetSeconds = typeof location.utc_offset_seconds === "number"
      ? location.utc_offset_seconds
      : 0;
    const timezone = location.timezone ?? options.timezone ?? DEFAULT_TIMEZONE;

    const hourlyRecords = buildHourlyRecords(location, offsetSeconds);
    const dailyRecords = buildDailyRecords(location, offsetSeconds, hourlyRecords);

    return {
      fieldId: coordinate.fieldId,
      fieldName: coordinate.fieldName,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      timezone,
      utcOffsetSeconds: offsetSeconds,
      source: WeatherSource.FORECAST,
      hourly: hourlyRecords,
      daily: dailyRecords,
      raw: location,
    } satisfies LocationWeatherBatch;
  });
};

const buildHourlyRecords = (
  location: RawOpenMeteoLocation,
  offsetSeconds: number,
) => {
  const times = Array.isArray(location.hourly?.time) ? location.hourly?.time ?? [] : [];
  return times.map((time, idx) => ({
    timestamp: parseTimestampWithOffset(time, offsetSeconds),
    temperature2m: toNumberOrUndefined(location.hourly?.temperature_2m?.[idx]),
    relativeHumidity2m: toNumberOrUndefined(location.hourly?.relative_humidity_2m?.[idx]),
    precipitationMm: toNumberOrUndefined(location.hourly?.precipitation?.[idx]),
    windSpeed10m: toNumberOrUndefined(location.hourly?.wind_speed_10m?.[idx]),
    windDirection10m: toNumberOrUndefined(location.hourly?.wind_direction_10m?.[idx]),
    windGusts10m: toNumberOrUndefined(location.hourly?.wind_gusts_10m?.[idx]),
    shortwaveRadiation: toNumberOrUndefined(location.hourly?.shortwave_radiation?.[idx]),
    et0FaoEvapotranspiration: toNumberOrUndefined(
      location.hourly?.et0_fao_evapotranspiration?.[idx],
    ),
    vapourPressureDeficit: toNumberOrUndefined(
      location.hourly?.vapour_pressure_deficit?.[idx],
    ),
    soilTemperature0cm: toNumberOrUndefined(location.hourly?.soil_temperature_0cm?.[idx]),
    soilMoisture0_1cm: toNumberOrUndefined(location.hourly?.soil_moisture_0_1cm?.[idx]),
  }));
};

const buildDailyRecords = (
  location: RawOpenMeteoLocation,
  offsetSeconds: number,
  hourlyRecords: ReturnType<typeof buildHourlyRecords>,
) => {
  const times = Array.isArray(location.daily?.time) ? location.daily?.time ?? [] : [];
  return times.map((time, idx) => {
    const date = parseDateWithOffset(time, offsetSeconds);
    const dayHourly = hourlyRecords.filter((record) => isSameDay(record.timestamp, date));
    const vapourPressureDeficitMax = dayHourly.reduce<number | undefined>((max, record) => {
      if (record.vapourPressureDeficit === undefined) return max;
      if (max === undefined) return record.vapourPressureDeficit;
      return Math.max(max, record.vapourPressureDeficit);
    }, undefined);

    return {
      date,
      tMaxC: toNumberOrUndefined(location.daily?.temperature_2m_max?.[idx]),
      tMinC: toNumberOrUndefined(location.daily?.temperature_2m_min?.[idx]),
      precipitationSumMm: toNumberOrUndefined(location.daily?.precipitation_sum?.[idx]),
      shortwaveRadiationSumMj: toNumberOrUndefined(
        location.daily?.shortwave_radiation_sum?.[idx],
      ),
      et0FaoEvapotranspiration: toNumberOrUndefined(
        location.daily?.et0_fao_evapotranspiration?.[idx],
      ),
      vapourPressureDeficitMax,
      rainfallProbability: toNumberOrUndefined(
        location.daily?.precipitation_probability_max?.[idx],
      ),
      daylightSeconds: safeNumber(
        location.daily?.daylight_duration?.[idx],
      ),
    };
  });
};
