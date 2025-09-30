export const OPEN_METEO_API_URL = "https://api.open-meteo.com/v1/forecast";
export const HISTORICAL_API_URL = "https://archive-api.open-meteo.com/v1/archive";

// Konya, Turkey Coordinates
export const DEFAULT_LATITUDE = 38.575906;
export const DEFAULT_LONGITUDE = 31.849755;

export const HOURLY_PARAMS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "precipitation_probability",
  "precipitation",
  "wind_speed_10m",
  "soil_temperature_0cm",
  "soil_moisture_0_to_1cm"
].join(",");

export const DAILY_PARAMS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "wind_speed_10m_max",
  "sunrise",
  "sunset",
  "sunshine_duration",
  "daylight_duration",
  "precipitation_probability_max",
  "precipitation_hours"
].join(",");

export const HISTORICAL_DAILY_PARAMS = [
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_sum",
    "soil_temperature_0_to_7cm_mean",
    "soil_temperature_7_to_28cm_mean",
    "soil_moisture_0_to_7cm_mean",
].join(",");
