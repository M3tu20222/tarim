import { NextResponse } from "next/server";
import { startOfDay, subHours } from "date-fns";

import { WeatherSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseCoordinateString } from "@/lib/weather/utils";

const STAGE_LABELS: Record<string, string> = {
  initial: "Baslangic",
  development: "Gelisme",
  mid: "Tepe Gelisme",
  late: "Hasat Oncesi",
};

const HARDCODED_FALLBACK_COORDINATES = {
  latitude: 38.573794,
  longitude: 31.850831,
} as const;

export const revalidate = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fieldId: string }> },
) {
  const { fieldId } = await params;

  try {
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      select: {
        id: true,
        name: true,
        location: true,
        coordinates: true,
        size: true,
        status: true,
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
          orderBy: { plantedDate: "desc" },
          take: 1,
          select: {
            id: true,
            name: true,
            plantedDate: true,
            harvestDate: true,
            status: true,
          },
        },
      },
    });

    if (!field) {
      return NextResponse.json({ error: "Tarla bulunamadi" }, { status: 404 });
    }

    const envDefaultCoordinatesRaw = process.env.WEATHER_DEFAULT_COORDINATES;
    const parsedEnvDefaultCoordinates = parseCoordinateString(envDefaultCoordinatesRaw);
    const defaultCoordinates = parsedEnvDefaultCoordinates
      ? parsedEnvDefaultCoordinates
      : { ...HARDCODED_FALLBACK_COORDINATES };
    const defaultCoordinateSourceLabel = parsedEnvDefaultCoordinates
      ? "varsayilan koordinat"
      : "varsayilan sabit koordinat";
    const defaultCoordinateReferenceName = parsedEnvDefaultCoordinates
      ? envDefaultCoordinatesRaw ?? undefined
      : `${HARDCODED_FALLBACK_COORDINATES.latitude},${HARDCODED_FALLBACK_COORDINATES.longitude}`;
    const fieldCoordinate = parseCoordinateString(field.coordinates);
    const wellCoordinateEntry = field.fieldWells.find(
      (fieldWell) =>
        fieldWell.well?.latitude !== null &&
        fieldWell.well?.latitude !== undefined &&
        fieldWell.well?.longitude !== null &&
        fieldWell.well?.longitude !== undefined,
    );

    let resolvedCoordinates = fieldCoordinate;
    let coordinateSource: {
      type: "FIELD" | "WELL" | "DEFAULT";
      label: string;
      referenceId?: string;
      referenceName?: string;
    } | null = null;

    if (resolvedCoordinates) {
      coordinateSource = {
        type: "FIELD",
        label: "tarla koordinati",
      };
    } else if (wellCoordinateEntry?.well?.latitude !== undefined && wellCoordinateEntry?.well?.longitude !== undefined) {
      resolvedCoordinates = {
        latitude: wellCoordinateEntry.well.latitude!,
        longitude: wellCoordinateEntry.well.longitude!,
      };
      coordinateSource = {
        type: "WELL",
        label: wellCoordinateEntry.well.name
          ? `kuyu: ${wellCoordinateEntry.well.name}`
          : "kuyu koordinati",
        referenceId: wellCoordinateEntry.well.id,
        referenceName: wellCoordinateEntry.well.name ?? undefined,
      };
    } else if (defaultCoordinates) {
      resolvedCoordinates = {
        latitude: defaultCoordinates.latitude,
        longitude: defaultCoordinates.longitude,
      };
      coordinateSource = {
        type: "DEFAULT",
        label: defaultCoordinateSourceLabel,
        referenceName: defaultCoordinateReferenceName,
      };
    }

    const latestDaily = await prisma.weatherDailySummary.findFirst({
      where: { fieldId },
      orderBy: { date: "desc" },
    });

    const latestFeature = latestDaily
      ? await prisma.agroFeatureDaily.findFirst({
          where: { fieldId, date: latestDaily.date },
          orderBy: { updatedAt: "desc" },
        })
      : await prisma.agroFeatureDaily.findFirst({
          where: { fieldId },
          orderBy: { date: "desc" },
        });

    const last24h = subHours(new Date(), 24);
    const hourlySnapshots = await prisma.weatherSnapshot.findMany({
      where: {
        fieldId,
        timestamp: {
          gte: last24h,
        },
      },
      orderBy: { timestamp: "desc" },
      take: 48,
    });

    const hourly = hourlySnapshots
      .slice()
      .reverse()
      .map((snapshot) => ({
        timestamp: snapshot.timestamp,
        temperature2m: snapshot.temperature2m,
        relativeHumidity2m: snapshot.relativeHumidity2m,
        precipitationMm: snapshot.precipitationMm,
        windSpeed10m: snapshot.windSpeed10m,
        et0FaoEvapotranspiration: snapshot.et0FaoEvapotranspiration,
        vapourPressureDeficit: snapshot.vapourPressureDeficit,
      }));


    const today = startOfDay(new Date());
    const upcomingDaily = await prisma.weatherDailySummary.findMany({
      where: {
        fieldId,
        date: { gte: today },
        source: WeatherSource.FORECAST,
      },
      orderBy: { date: 'asc' },
      take: 7,
    });

    const recentDaily = await prisma.weatherDailySummary.findMany({
      where: {
        fieldId,
        date: { lt: today },
      },
      orderBy: { date: 'desc' },
      take: 7,
    });

    const phenologyStageLabel = latestFeature?.phenologyStage
      ? STAGE_LABELS[latestFeature.phenologyStage] ?? latestFeature.phenologyStage
      : undefined;

    const inferredTimezone = latestDaily?.timezone
      ?? upcomingDaily[0]?.timezone
      ?? recentDaily[0]?.timezone
      ?? process.env.WEATHER_DEFAULT_TIMEZONE
      ?? null;

    const latestHourlyTimestamp = hourly.length > 0
      ? hourly[hourly.length - 1].timestamp
      : hourlySnapshots[0]?.timestamp ?? null;

    return NextResponse.json({
      field: {
        id: field.id,
        name: field.name,
        location: field.location,
        coordinates: field.coordinates,
        size: field.size,
        status: field.status,
        activeCrop: field.crops[0] ?? null,
      },
      coordinateSource,
      resolvedCoordinates,
      lastUpdated: latestHourlyTimestamp,
      timezone: inferredTimezone,
      dailySummary: latestDaily,
      agroFeature: latestFeature
        ? {
            ...latestFeature,
            phenologyStageLabel,
          }
        : null,
      hourly,
      upcomingDaily,
      recentDaily: recentDaily.reverse(),
      recommendations: latestFeature?.recommendations ?? [],
    });
  } catch (error) {
    console.error("weather field endpoint error", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Hava verileri yuklenemedi", detail: message }, { status: 500 });
  }
}
