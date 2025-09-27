// In-memory cache for weather data
// Production'da Redis kullanılabilir

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface WeatherCacheData {
  fieldId: string;
  coordinates: { latitude: number; longitude: number };
  coordinateSource: {
    type: 'FIELD' | 'WELL' | 'DEFAULT';
    label: string;
    referenceId?: string;
    referenceName?: string;
  };
  lastUpdated: string;
  dailySummary: any;
  hourly: any[];
  upcomingDaily: any[];
  recentDaily: any[];
  agroFeature: any;
}

class WeatherCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 dakika
  private readonly WEATHER_TTL = 10 * 60 * 1000; // 10 dakika (weather data için)
  private readonly WATER_TTL = 3 * 60 * 1000; // 3 dakika (water consumption için)

  // Generic cache get/set methods
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.DEFAULT_TTL);

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Weather-specific cache methods
  setWeatherData(fieldId: string, data: WeatherCacheData): void {
    const key = `weather:field:${fieldId}`;
    this.set(key, data, this.WEATHER_TTL);
  }

  getWeatherData(fieldId: string): WeatherCacheData | null {
    const key = `weather:field:${fieldId}`;
    return this.get<WeatherCacheData>(key);
  }

  // Well-based weather cache
  setWellWeatherData(wellId: string, data: WeatherCacheData): void {
    const key = `weather:well:${wellId}`;
    this.set(key, data, this.WEATHER_TTL);
  }

  getWellWeatherData(wellId: string): WeatherCacheData | null {
    const key = `weather:well:${wellId}`;
    return this.get<WeatherCacheData>(key);
  }

  // Coordinate-based caching (for shared coordinates)
  setCoordinateWeatherData(
    latitude: number,
    longitude: number,
    data: Omit<WeatherCacheData, 'fieldId' | 'coordinateSource'>
  ): void {
    const key = `weather:coord:${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    this.set(key, data, this.WEATHER_TTL);
  }

  getCoordinateWeatherData(
    latitude: number,
    longitude: number
  ): Omit<WeatherCacheData, 'fieldId' | 'coordinateSource'> | null {
    const key = `weather:coord:${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    return this.get<Omit<WeatherCacheData, 'fieldId' | 'coordinateSource'>>(key);
  }

  // Water consumption cache
  setWaterConsumptionData(fieldId: string, data: any): void {
    const key = `water:field:${fieldId}`;
    this.set(key, data, this.WATER_TTL);
  }

  getWaterConsumptionData(fieldId: string): any {
    const key = `water:field:${fieldId}`;
    return this.get(key);
  }

  // User-level cache for multiple fields
  setUserWaterData(userId: string, data: any): void {
    const key = `water:user:${userId}`;
    this.set(key, data, this.WATER_TTL);
  }

  getUserWaterData(userId: string): any {
    const key = `water:user:${userId}`;
    return this.get(key);
  }

  // Cache statistics and management
  getCacheStats(): {
    size: number;
    expired: number;
    weatherEntries: number;
    waterEntries: number;
  } {
    const now = Date.now();
    let expired = 0;
    let weatherEntries = 0;
    let waterEntries = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expired++;
      }
      if (key.startsWith('weather:')) {
        weatherEntries++;
      }
      if (key.startsWith('water:')) {
        waterEntries++;
      }
    }

    return {
      size: this.cache.size,
      expired,
      weatherEntries,
      waterEntries
    };
  }

  // Clean expired entries
  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Clear cache by pattern
  clearByPattern(pattern: string): number {
    let cleared = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    return cleared;
  }
}

// Singleton instance
export const weatherCache = new WeatherCacheService();

// Utility functions
export const getCacheKey = {
  weather: (fieldId: string) => `weather:field:${fieldId}`,
  wellWeather: (wellId: string) => `weather:well:${wellId}`,
  coordinateWeather: (lat: number, lng: number) =>
    `weather:coord:${lat.toFixed(4)},${lng.toFixed(4)}`,
  waterConsumption: (fieldId: string) => `water:field:${fieldId}`,
  userWater: (userId: string) => `water:user:${userId}`
};

// Auto cleanup expired entries every 10 minutes
if (typeof window === 'undefined') { // Server-side only
  setInterval(() => {
    const cleaned = weatherCache.cleanExpired();
    if (cleaned > 0) {
      console.log(`Weather cache: cleaned ${cleaned} expired entries`);
    }
  }, 10 * 60 * 1000);
}