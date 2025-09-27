import { prisma } from "@/lib/prisma";
import { weatherCache, type getCacheKey } from "./cache";
import { parseCoordinateString } from "./utils";

interface WellWeatherData {
  wellId: string;
  wellName: string;
  coordinates: { latitude: number; longitude: number };
  coordinateSource: {
    type: 'WELL';
    label: string;
    referenceId: string;
    referenceName: string;
  };
  lastUpdated: string | null;
  currentWeather: {
    temperature: number | null;
    humidity: number | null;
    vapourPressureDeficit: number | null;
    windSpeed: number | null;
  };
  dailySummary: any;
  hourlyData: any[];
  connectedFields: Array<{
    fieldId: string;
    fieldName: string;
    distance?: number; // km cinsinden mesafe
  }>;
}

interface FieldWellConnection {
  fieldId: string;
  fieldName: string;
  fieldCoordinates: { latitude: number; longitude: number } | null;
  wellId: string;
  wellName: string;
  wellCoordinates: { latitude: number; longitude: number } | null;
  distance: number | null; // km cinsinden
}

export class WellWeatherService {
  // Koordinatlar arası mesafe hesaplama (Haversine formula)
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  }

  // Kuyu için en yakın hava durumu verilerini bul
  static async getWeatherDataForWell(wellId: string): Promise<WellWeatherData | null> {
    try {
      // Cache'den kontrol et
      const cached = weatherCache.getWellWeatherData(wellId);
      if (cached) {
        return cached as WellWeatherData;
      }

      // Kuyu bilgilerini getir
      const well = await prisma.well.findUnique({
        where: { id: wellId },
        include: {
          fieldWells: {
            include: {
              field: {
                select: {
                  id: true,
                  name: true,
                  coordinates: true,
                  weatherSnapshots: {
                    orderBy: { timestamp: 'desc' },
                    take: 1
                  },
                  weatherDailySummaries: {
                    orderBy: { date: 'desc' },
                    take: 1
                  }
                }
              }
            }
          }
        }
      });

      if (!well) {
        return null;
      }

      const wellCoordinates = well.latitude && well.longitude
        ? { latitude: well.latitude, longitude: well.longitude }
        : null;

      if (!wellCoordinates) {
        return null;
      }

      // Kuyuya bağlı tarlaları analiz et
      const connectedFields: FieldWellConnection[] = [];
      let bestWeatherData = null;
      let shortestDistance = Infinity;

      for (const fieldWell of well.fieldWells) {
        const field = fieldWell.field;
        const fieldCoordinates = parseCoordinateString(field.coordinates);

        let distance = null;
        if (fieldCoordinates) {
          distance = this.calculateDistance(
            wellCoordinates.latitude,
            wellCoordinates.longitude,
            fieldCoordinates.latitude,
            fieldCoordinates.longitude
          );
        }

        connectedFields.push({
          fieldId: field.id,
          fieldName: field.name,
          fieldCoordinates,
          wellId: well.id,
          wellName: well.name,
          wellCoordinates,
          distance
        });

        // En yakın tarlanın hava durumu verisini kullan
        if (field.weatherSnapshots.length > 0 && distance !== null && distance < shortestDistance) {
          shortestDistance = distance;
          bestWeatherData = {
            dailySummary: field.weatherDailySummaries[0] || null,
            hourlyData: field.weatherSnapshots,
            lastUpdated: field.weatherSnapshots[0]?.timestamp.toISOString() || null
          };
        }
      }

      // Kuyunun kendi koordinatlarından hava durumu verisi al
      if (!bestWeatherData) {
        // Koordinat bazlı cache kontrolü
        const coordCache = weatherCache.getCoordinateWeatherData(
          wellCoordinates.latitude,
          wellCoordinates.longitude
        );

        if (coordCache) {
          bestWeatherData = {
            dailySummary: coordCache.dailySummary,
            hourlyData: coordCache.hourly,
            lastUpdated: coordCache.lastUpdated
          };
        } else {
          // External weather API call yapılabilir burada
          // Şimdilik null döndürüyoruz
          bestWeatherData = {
            dailySummary: null,
            hourlyData: [],
            lastUpdated: null
          };
        }
      }

      // Mevcut hava durumu bilgilerini hazırla
      const latestHourly = bestWeatherData.hourlyData[0];
      const currentWeather = {
        temperature: latestHourly?.temperature2m || null,
        humidity: latestHourly?.relativeHumidity2m || null,
        vapourPressureDeficit: latestHourly?.vapourPressureDeficit || null,
        windSpeed: latestHourly?.windSpeed10m || null,
      };

      const result: WellWeatherData = {
        wellId: well.id,
        wellName: well.name,
        coordinates: wellCoordinates,
        coordinateSource: {
          type: 'WELL',
          label: `kuyu: ${well.name}`,
          referenceId: well.id,
          referenceName: well.name
        },
        lastUpdated: bestWeatherData.lastUpdated,
        currentWeather,
        dailySummary: bestWeatherData.dailySummary,
        hourlyData: bestWeatherData.hourlyData.slice(0, 24), // Son 24 saat
        connectedFields: connectedFields.map(cf => ({
          fieldId: cf.fieldId,
          fieldName: cf.fieldName,
          distance: cf.distance
        }))
      };

      // Cache'e kaydet
      weatherCache.setWellWeatherData(wellId, result);

      return result;
    } catch (error) {
      console.error('Well weather data error:', error);
      return null;
    }
  }

  // Kullanıcının kuyularının hava durumu özetini getir
  static async getWeatherSummaryForUserWells(userId: string): Promise<{
    wells: WellWeatherData[];
    summary: {
      totalWells: number;
      wellsWithData: number;
      avgTemperature: number | null;
      avgHumidity: number | null;
      lastUpdated: string | null;
    };
  }> {
    try {
      // Kullanıcının kuyularını getir
      const userWells = await prisma.well.findMany({
        where: {
          fieldWells: {
            some: {
              field: {
                owners: {
                  some: {
                    userId: userId
                  }
                }
              }
            }
          }
        },
        select: { id: true }
      });

      // Her kuyu için hava durumu verilerini getir
      const wellsData = await Promise.all(
        userWells.map(well => this.getWeatherDataForWell(well.id))
      );

      const validWellsData = wellsData.filter((data): data is WellWeatherData => data !== null);

      // Özet istatistikleri hesapla
      let totalTemp = 0;
      let totalHumidity = 0;
      let tempCount = 0;
      let humidityCount = 0;
      let mostRecentUpdate: string | null = null;

      validWellsData.forEach(well => {
        if (well.currentWeather.temperature !== null) {
          totalTemp += well.currentWeather.temperature;
          tempCount++;
        }
        if (well.currentWeather.humidity !== null) {
          totalHumidity += well.currentWeather.humidity;
          humidityCount++;
        }
        if (well.lastUpdated && (!mostRecentUpdate || well.lastUpdated > mostRecentUpdate)) {
          mostRecentUpdate = well.lastUpdated;
        }
      });

      return {
        wells: validWellsData,
        summary: {
          totalWells: userWells.length,
          wellsWithData: validWellsData.length,
          avgTemperature: tempCount > 0 ? totalTemp / tempCount : null,
          avgHumidity: humidityCount > 0 ? totalHumidity / humidityCount : null,
          lastUpdated: mostRecentUpdate
        }
      };
    } catch (error) {
      console.error('User wells weather summary error:', error);
      return {
        wells: [],
        summary: {
          totalWells: 0,
          wellsWithData: 0,
          avgTemperature: null,
          avgHumidity: null,
          lastUpdated: null
        }
      };
    }
  }

  // Tarla için en yakın kuyu hava durumu verilerini bul
  static async getClosestWellWeatherForField(fieldId: string): Promise<{
    wellWeather: WellWeatherData | null;
    distance: number | null;
    useFieldCoordinates: boolean;
  }> {
    try {
      const field = await prisma.field.findUnique({
        where: { id: fieldId },
        include: {
          fieldWells: {
            include: {
              well: {
                select: {
                  id: true,
                  name: true,
                  latitude: true,
                  longitude: true
                }
              }
            }
          }
        }
      });

      if (!field) {
        return { wellWeather: null, distance: null, useFieldCoordinates: true };
      }

      const fieldCoordinates = parseCoordinateString(field.coordinates);

      if (!fieldCoordinates || field.fieldWells.length === 0) {
        return { wellWeather: null, distance: null, useFieldCoordinates: true };
      }

      // En yakın kuyuyu bul
      let closestWell = null;
      let shortestDistance = Infinity;

      for (const fieldWell of field.fieldWells) {
        const well = fieldWell.well;
        if (well.latitude && well.longitude) {
          const distance = this.calculateDistance(
            fieldCoordinates.latitude,
            fieldCoordinates.longitude,
            well.latitude,
            well.longitude
          );

          if (distance < shortestDistance) {
            shortestDistance = distance;
            closestWell = well;
          }
        }
      }

      if (!closestWell) {
        return { wellWeather: null, distance: null, useFieldCoordinates: true };
      }

      const wellWeatherData = await this.getWeatherDataForWell(closestWell.id);

      return {
        wellWeather: wellWeatherData,
        distance: shortestDistance,
        useFieldCoordinates: shortestDistance > 5 // 5km'den uzaksa tarla koordinatları kullan
      };
    } catch (error) {
      console.error('Closest well weather error:', error);
      return { wellWeather: null, distance: null, useFieldCoordinates: true };
    }
  }
}