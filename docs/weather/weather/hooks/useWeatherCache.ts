import { useState, useEffect, useCallback, useRef } from 'react';
import { ProcessedWeatherData } from '../types';
import { fetchWeatherData, fetchHistoricalData } from '../services/openMeteoService';
import { WeatherMetrics, calculateWeatherMetrics } from '../utils/weatherMetrics';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface WeatherCacheData {
  forecast: ProcessedWeatherData;
  historical: Record<string, any[]>;
  metrics: WeatherMetrics;
}

export const useWeatherCache = () => {
  const [weatherData, setWeatherData] = useState<ProcessedWeatherData | null>(null);
  const [metrics, setMetrics] = useState<WeatherMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const cacheRef = useRef<Map<string, CacheEntry<any>>>(new Map());
  const requestsRef = useRef<Map<string, Promise<any>>>(new Map());

  // Cache configuration
  const CACHE_DURATIONS = {
    forecast: 10 * 60 * 1000, // 10 minutes
    historical: 60 * 60 * 1000, // 1 hour
    metrics: 5 * 60 * 1000, // 5 minutes
  };

  const MAX_CACHE_SIZE = 50;
  const RETRY_ATTEMPTS = 3;
  const RETRY_DELAY = 1000;

  // Helper functions
  const generateCacheKey = (type: string, params?: any) => {
    return `${type}_${params ? JSON.stringify(params) : 'default'}`;
  };

  const isExpired = (entry: CacheEntry<any>) => {
    return Date.now() > entry.expiry;
  };

  const cleanupCache = () => {
    const now = Date.now();
    const entries = Array.from(cacheRef.current.entries());

    // Remove expired entries
    for (const [key, entry] of entries) {
      if (isExpired(entry)) {
        cacheRef.current.delete(key);
      }
    }

    // If still too large, remove oldest entries
    if (cacheRef.current.size > MAX_CACHE_SIZE) {
      const sortedEntries = entries
        .filter(([key]) => cacheRef.current.has(key))
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);

      const toRemove = sortedEntries.slice(0, cacheRef.current.size - MAX_CACHE_SIZE);
      for (const [key] of toRemove) {
        cacheRef.current.delete(key);
      }
    }
  };

  const setCache = <T>(key: string, data: T, duration: number) => {
    cleanupCache();

    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + duration
    });
  };

  const getCache = <T>(key: string): T | null => {
    const entry = cacheRef.current.get(key);
    if (!entry || isExpired(entry)) {
      cacheRef.current.delete(key);
      return null;
    }
    return entry.data;
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const withRetry = async <T>(fn: () => Promise<T>, attempts = RETRY_ATTEMPTS): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (attempts > 1) {
        await sleep(RETRY_DELAY * (RETRY_ATTEMPTS - attempts + 1));
        return withRetry(fn, attempts - 1);
      }
      throw error;
    }
  };

  const loadForecastData = useCallback(async (force = false) => {
    const cacheKey = generateCacheKey('forecast');

    // Check if request is already in progress
    if (requestsRef.current.has(cacheKey)) {
      return requestsRef.current.get(cacheKey);
    }

    // Check cache first
    if (!force) {
      const cached = getCache<ProcessedWeatherData>(cacheKey);
      if (cached) {
        setWeatherData(cached);
        const cachedMetrics = calculateWeatherMetrics(cached);
        setMetrics(cachedMetrics);
        setLastUpdate(new Date());
        return cached;
      }
    }

    const request = withRetry(async () => {
      setLoading(true);
      setError(null);

      const data = await fetchWeatherData();
      const metrics = calculateWeatherMetrics(data);

      setCache(cacheKey, data, CACHE_DURATIONS.forecast);
      setCache(generateCacheKey('metrics'), metrics, CACHE_DURATIONS.metrics);

      setWeatherData(data);
      setMetrics(metrics);
      setLastUpdate(new Date());
      setLoading(false);

      return data;
    });

    requestsRef.current.set(cacheKey, request);

    try {
      const result = await request;
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setLoading(false);
      throw err;
    } finally {
      requestsRef.current.delete(cacheKey);
    }
  }, []);

  const loadHistoricalData = useCallback(async (startDate: string, endDate: string, force = false) => {
    const cacheKey = generateCacheKey('historical', { startDate, endDate });

    if (requestsRef.current.has(cacheKey)) {
      return requestsRef.current.get(cacheKey);
    }

    if (!force) {
      const cached = getCache<any[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const request = withRetry(async () => {
      const data = await fetchHistoricalData(startDate, endDate);
      setCache(cacheKey, data, CACHE_DURATIONS.historical);
      return data;
    });

    requestsRef.current.set(cacheKey, request);

    try {
      const result = await request;
      return result;
    } finally {
      requestsRef.current.delete(cacheKey);
    }
  }, []);

  const refreshData = useCallback(() => {
    return loadForecastData(true);
  }, [loadForecastData]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    requestsRef.current.clear();
    localStorage.removeItem('weather-cache-timestamp');
  }, []);

  const preloadData = useCallback(async () => {
    // Preload common historical data ranges
    const currentYear = new Date().getFullYear();
    const promises = [];

    for (let year = currentYear - 2; year <= currentYear; year++) {
      promises.push(
        loadHistoricalData(`${year}-03-01`, `${year}-05-31`).catch(() => null)
      );
    }

    await Promise.allSettled(promises);
  }, [loadHistoricalData]);

  // Auto-refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (weatherData && lastUpdate) {
        const timeSinceUpdate = Date.now() - lastUpdate.getTime();
        if (timeSinceUpdate > CACHE_DURATIONS.forecast) {
          loadForecastData(false); // Use cache if available
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [weatherData, lastUpdate, loadForecastData]);

  // Initial data load
  useEffect(() => {
    loadForecastData().catch(console.error);
  }, [loadForecastData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      requestsRef.current.clear();
    };
  }, []);

  // Performance monitoring
  const getCacheStats = useCallback(() => {
    const cache = cacheRef.current;
    const now = Date.now();

    let validEntries = 0;
    let expiredEntries = 0;
    let totalSize = 0;

    for (const [key, entry] of cache.entries()) {
      totalSize++;
      if (isExpired(entry)) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: totalSize,
      validEntries,
      expiredEntries,
      hitRatio: validEntries / Math.max(totalSize, 1),
      activeRequests: requestsRef.current.size,
      lastUpdate: lastUpdate?.toISOString()
    };
  }, [lastUpdate]);

  return {
    // Data
    weatherData,
    metrics,
    loading,
    error,
    lastUpdate,

    // Actions
    loadForecastData,
    loadHistoricalData,
    refreshData,
    clearCache,
    preloadData,

    // Utils
    getCacheStats,
    isOnline: navigator.onLine
  };
};

export default useWeatherCache;