import { NextResponse } from "next/server";
import { WellWeatherService } from "@/lib/weather/well-weather-service";
import { getSession } from "@/lib/session";

export const revalidate = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ wellId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { wellId } = await params;

    const wellWeatherData = await WellWeatherService.getWeatherDataForWell(wellId);

    if (!wellWeatherData) {
      return NextResponse.json(
        { error: "Kuyu bulunamadi veya hava durumu verisi yok" },
        { status: 404 }
      );
    }

    return NextResponse.json(wellWeatherData);
  } catch (error) {
    console.error("Well weather API error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Kuyu hava durumu verisi getirilemedi", detail: message },
      { status: 500 }
    );
  }
}