import { isSameDay } from "date-fns";

import { prisma } from "@/lib/prisma";
import { calculateAgroMetrics } from "./metrics";
import { fetchOpenMeteoBatch } from "./openMeteoClient";
import {
  FieldCoordinate,
  LocationWeatherBatch,
  WeatherSyncOptions,
  WeatherSyncReport,
} from "./types";
import {
  chunkArray,
  parseCoordinateString,
  roundTo,
} from "./utils";

interface ActiveCropInfo {
  id: string;
  name: string;
  plantedDate?: Date | null;
}

const DEFAULT_CHUNK_SIZE = Number.parseInt(process.env.WEATHER_SYNC_CHUNK_SIZE ?? "8", 10) || 8;

const HARDCODED_FALLBACK_COORDINATES = {
  latitude: 38.573794,
  longitude: 31.850831,
} as const;

export const syncWeatherForAllFields = async (
  options: Partial<WeatherSyncOptions> = {},
): Promise<WeatherSyncReport> => {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;

  const fieldFilters: Record<string, unknown> = {};

  if (options.fieldIds?.length) {
    fieldFilters.id = { in: options.fieldIds };
  }

  const fields = await prisma.field.findMany({
    where: fieldFilters,
    select: {
      id: true,
      name: true,
      coordinates: true,
      fieldWells: {
        orderBy: { createdAt: "asc" },
        select: {
          well: {
            select: {
              id: true,
              name: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      },
      crops: {
        where: { status: "GROWING" },
        orderBy: { plantedDate: "desc" },
        take: 1,
        select: { id: true, name: true, plantedDate: true },
      },
    },
  });

  const report: WeatherSyncReport = {
    totalFields: fields.length,
    processedFields: 0,
    skippedFields: 0,
    hourlyUpserts: 0,
    dailyUpserts: 0,
    featureUpserts: 0,
    messages: [],
  };

  const envDefaultCoordinatesRaw = process.env.WEATHER_DEFAULT_COORDINATES;
  const parsedEnvDefaultCoordinates = parseCoordinateString(envDefaultCoordinatesRaw);
  const defaultCoordinates = parsedEnvDefaultCoordinates
    ? parsedEnvDefaultCoordinates
    : { ...HARDCODED_FALLBACK_COORDINATES };
  const coordinates: FieldCoordinate[] = [];
  const cropLookup = new Map<string, ActiveCropInfo | undefined>();
  const coordinateSources = new Map<string, string>();

  if (!parsedEnvDefaultCoordinates) {
    if (envDefaultCoordinatesRaw) {
      report.messages.push(
        `WARN varsayilan koordinat cozumlenemedi: ${envDefaultCoordinatesRaw}. Sabit (${HARDCODED_FALLBACK_COORDINATES.latitude}, ${HARDCODED_FALLBACK_COORDINATES.longitude}) kullaniliyor.`,
      );
    } else {
      report.messages.push(
        `INFO varsayilan koordinat tanimli degil. Sabit (${HARDCODED_FALLBACK_COORDINATES.latitude}, ${HARDCODED_FALLBACK_COORDINATES.longitude}) kullaniliyor.`,
      );
    }
  }

  fields.forEach((field) => {
    const fieldCoordinate = parseCoordinateString(field.coordinates);
    const wellCoordinateEntry = field.fieldWells.find(
      (fieldWell) =>
        fieldWell.well?.latitude !== null &&
        fieldWell.well?.latitude !== undefined &&
        fieldWell.well?.longitude !== null &&
        fieldWell.well?.longitude !== undefined,
    );

    let selected = fieldCoordinate;
    let sourceLabel = "tarla koordinati";

    if (
      !selected &&
      wellCoordinateEntry?.well?.latitude !== undefined &&
      wellCoordinateEntry?.well?.longitude !== undefined
    ) {
      selected = {
        latitude: wellCoordinateEntry.well.latitude!,
        longitude: wellCoordinateEntry.well.longitude!,
      };
      sourceLabel = wellCoordinateEntry.well.name
        ? `kuyu: ${wellCoordinateEntry.well.name}`
        : "kuyu koordinati";
    }

    if (!selected && defaultCoordinates) {
      selected = {
        latitude: defaultCoordinates.latitude,
        longitude: defaultCoordinates.longitude,
      };
      sourceLabel = "varsayilan koordinat";
    }

    if (!selected) {
      report.skippedFields += 1;
      report.messages.push(
        `SKIP ${field.name}: koordinat bulunamadi. Tarla/kuyu kayitlarini guncelleyin.`,
      );
      return;
    }

    coordinates.push({
      fieldId: field.id,
      fieldName: field.name,
      latitude: selected.latitude,
      longitude: selected.longitude,
    });
    coordinateSources.set(field.id, sourceLabel);

    const activeCrop = field.crops[0];
    if (activeCrop) {
      cropLookup.set(field.id, {
        id: activeCrop.id,
        name: activeCrop.name,
        plantedDate: activeCrop.plantedDate,
      });
    } else {
      cropLookup.set(field.id, undefined);
    }
  });

  const coordinateChunks = chunkArray(coordinates, chunkSize);

  for (const chunk of coordinateChunks) {
    if (chunk.length === 0) continue;

    const batches = await fetchOpenMeteoBatch(chunk, options);

    for (const batch of batches) {
      const cropInfo = cropLookup.get(batch.fieldId);
      try {
        const counts = await persistWeatherBatch(batch, cropInfo);
        const origin = coordinateSources.get(batch.fieldId);
        report.processedFields += 1;
        report.hourlyUpserts += counts.hourly;
        report.dailyUpserts += counts.daily;
        report.featureUpserts += counts.features;
        report.messages.push(
          `OK ${batch.fieldName}${origin ? ` [${origin}]` : ""}: ${counts.hourly} saatlik, ${counts.daily} gunluk, ${counts.features} agro kaydi guncellendi.`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        report.messages.push(`ERR ${batch.fieldName}: ${message}`);
      }
    }
  }

  return report;
};

const persistWeatherBatch = async (
  batch: LocationWeatherBatch,
  cropInfo?: ActiveCropInfo,
): Promise<{ hourly: number; daily: number; features: number }> => {
  let hourlyUpserts = 0;
  let dailyUpserts = 0;
  let featureUpserts = 0;

  // Persist hourly snapshots
  for (const record of batch.hourly) {
    await prisma.weatherSnapshot.upsert({
      where: {
        fieldId_timestamp_source: {
          fieldId: batch.fieldId,
          timestamp: record.timestamp,
          source: batch.source,
        },
      },
      update: {
        latitude: roundTo(batch.latitude, 4),
        longitude: roundTo(batch.longitude, 4),
        temperature2m: record.temperature2m,
        relativeHumidity2m: record.relativeHumidity2m,
        precipitationMm: record.precipitationMm,
        windSpeed10m: record.windSpeed10m,
        shortwaveRadiation: record.shortwaveRadiation,
        et0FaoEvapotranspiration: record.et0FaoEvapotranspiration,
        vapourPressureDeficit: record.vapourPressureDeficit,
        timezone: batch.timezone,
      },
      create: {
        fieldId: batch.fieldId,
        source: batch.source,
        timestamp: record.timestamp,
        latitude: roundTo(batch.latitude, 4),
        longitude: roundTo(batch.longitude, 4),
        temperature2m: record.temperature2m,
        relativeHumidity2m: record.relativeHumidity2m,
        precipitationMm: record.precipitationMm,
        windSpeed10m: record.windSpeed10m,
        shortwaveRadiation: record.shortwaveRadiation,
        et0FaoEvapotranspiration: record.et0FaoEvapotranspiration,
        vapourPressureDeficit: record.vapourPressureDeficit,
        timezone: batch.timezone,
      },
    });
    hourlyUpserts += 1;
  }

  const sortedDaily = [...batch.daily].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  if (sortedDaily.length === 0) {
    return { hourly: hourlyUpserts, daily: dailyUpserts, features: featureUpserts };
  }

  const firstDate = sortedDaily[0].date;
  const previousFeatureFromDb = await prisma.agroFeatureDaily.findFirst({
    where: {
      fieldId: batch.fieldId,
      date: { lt: firstDate },
    },
    orderBy: { date: "desc" },
    select: {
      date: true,
      gddCumulative: true,
      etcCumulative: true,
      waterBalanceMm: true,
    },
  });

  let lastFeature = previousFeatureFromDb ?? undefined;

  for (const dailyRecord of sortedDaily) {
    const summary = await prisma.weatherDailySummary.upsert({
      where: {
        fieldId_date_source: {
          fieldId: batch.fieldId,
          date: dailyRecord.date,
          source: batch.source,
        },
      },
      update: {
        latitude: roundTo(batch.latitude, 4),
        longitude: roundTo(batch.longitude, 4),
        tMaxC: dailyRecord.tMaxC,
        tMinC: dailyRecord.tMinC,
        precipitationSumMm: dailyRecord.precipitationSumMm,
        shortwaveRadiationSumMj: dailyRecord.shortwaveRadiationSumMj,
        et0FaoEvapotranspiration: dailyRecord.et0FaoEvapotranspiration,
        vapourPressureDeficitMax: dailyRecord.vapourPressureDeficitMax,
        rainfallProbability: dailyRecord.rainfallProbability,
        daylightSeconds: dailyRecord.daylightSeconds,
        timezone: batch.timezone,
      },
      create: {
        fieldId: batch.fieldId,
        source: batch.source,
        date: dailyRecord.date,
        latitude: roundTo(batch.latitude, 4),
        longitude: roundTo(batch.longitude, 4),
        tMaxC: dailyRecord.tMaxC,
        tMinC: dailyRecord.tMinC,
        precipitationSumMm: dailyRecord.precipitationSumMm,
        shortwaveRadiationSumMj: dailyRecord.shortwaveRadiationSumMj,
        et0FaoEvapotranspiration: dailyRecord.et0FaoEvapotranspiration,
        vapourPressureDeficitMax: dailyRecord.vapourPressureDeficitMax,
        rainfallProbability: dailyRecord.rainfallProbability,
        daylightSeconds: dailyRecord.daylightSeconds,
        timezone: batch.timezone,
      },
    });
    dailyUpserts += 1;

    const hourlyForDay = batch.hourly.filter((record) =>
      isSameDay(record.timestamp, dailyRecord.date),
    );

    const metrics = calculateAgroMetrics(
      {
        fieldId: batch.fieldId,
        fieldName: batch.fieldName,
        cropId: cropInfo?.id,
        cropName: cropInfo?.name,
        cropPlantedDate: cropInfo?.plantedDate ?? undefined,
        dailyRecord,
        hourlyRecords: hourlyForDay,
        previousFeature: lastFeature ? {
          date: lastFeature.date,
          gddCumulative: lastFeature.gddCumulative ?? undefined,
          etcCumulative: lastFeature.etcCumulative ?? undefined,
          waterBalanceMm: lastFeature.waterBalanceMm ?? undefined,
        } : undefined,
      },
      cropInfo && {
        cropId: cropInfo.id,
        cropName: cropInfo.name,
        plantedDate: cropInfo.plantedDate ?? undefined,
      },
    );

    await prisma.agroFeatureDaily.upsert({
      where: {
        fieldId_date: {
          fieldId: batch.fieldId,
          date: summary.date,
        },
      },
      update: {
        cropId: cropInfo?.id,
        weatherSummaryId: summary.id,
        gdd: metrics.gdd,
        gddCumulative: metrics.gddCumulative,
        etcMm: metrics.etcMm,
        etcCumulative: metrics.etcCumulative,
        waterBalanceMm: metrics.waterBalanceMm,
        rainfallMm: metrics.rainfallMm,
        irrigationMm: metrics.irrigationMm,
        vpdMax: metrics.vpdMax,
        heatStressHours: metrics.heatStressHours,
        frostHours: metrics.frostHours,
        recommendations: metrics.recommendations,
        phenologyStage: metrics.phenologyStage,
        metadata: metrics.metadata ? JSON.parse(JSON.stringify(metrics.metadata)) : null,
      },
      create: {
        fieldId: batch.fieldId,
        cropId: cropInfo?.id,
        weatherSummaryId: summary.id,
        date: summary.date,
        gdd: metrics.gdd,
        gddCumulative: metrics.gddCumulative,
        etcMm: metrics.etcMm,
        etcCumulative: metrics.etcCumulative,
        waterBalanceMm: metrics.waterBalanceMm,
        rainfallMm: metrics.rainfallMm,
        irrigationMm: metrics.irrigationMm,
        vpdMax: metrics.vpdMax,
        heatStressHours: metrics.heatStressHours,
        frostHours: metrics.frostHours,
        recommendations: metrics.recommendations,
        phenologyStage: metrics.phenologyStage,
        metadata: metrics.metadata ? JSON.parse(JSON.stringify(metrics.metadata)) : null,
      },
    });
    featureUpserts += 1;

    lastFeature = {
      date: summary.date,
      gddCumulative: metrics.gddCumulative ?? lastFeature?.gddCumulative ?? null,
      etcCumulative: metrics.etcCumulative ?? lastFeature?.etcCumulative ?? null,
      waterBalanceMm: metrics.waterBalanceMm ?? lastFeature?.waterBalanceMm ?? null,
    };
  }

  return { hourly: hourlyUpserts, daily: dailyUpserts, features: featureUpserts };
};



