import { NextResponse } from "next/server";

import { syncWeatherForAllFields } from "@/lib/weather/weatherService";
import type { WeatherSyncOptions } from "@/lib/weather/types";

export const revalidate = 0;

const parseIntegerParam = (value: string | null, fallback?: number): number | undefined => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function GET(request: Request) {
  try {
    const apiKey = request.headers.get("x-api-key");
    const expectedKey = process.env.CRON_API_KEY;
    if (expectedKey && expectedKey.length > 0 && apiKey !== expectedKey) {
      return NextResponse.json({ error: "Yetkisiz erisim" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fieldParam = searchParams.get("fieldId") ?? searchParams.get("fieldIds");
    const fieldIds = fieldParam
      ? fieldParam
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : undefined;

    const chunkSize = parseIntegerParam(searchParams.get("chunkSize"));
    const pastDays = parseIntegerParam(searchParams.get("pastDays"));
    const forecastDays = parseIntegerParam(searchParams.get("forecastDays"));

    const options: Partial<WeatherSyncOptions> = {
      fieldIds,
      chunkSize,
      pastDays,
      forecastDays,
    };

    const report = await syncWeatherForAllFields(options);

    return NextResponse.json({
      ok: true,
      processed: report.processedFields,
      skipped: report.skippedFields,
      hourly: report.hourlyUpserts,
      daily: report.dailyUpserts,
      features: report.featureUpserts,
      messages: report.messages,
    });
  } catch (error) {
    console.error("weather-sync cron error", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Hava durumu senkronizasyonu sirasinda hata olustu", detail: message },
      { status: 500 },
    );
  }
}
