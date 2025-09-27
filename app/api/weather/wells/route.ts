import { NextResponse } from "next/server";
import { WellWeatherService } from "@/lib/weather/well-weather-service";
import { getSession } from "@/lib/session";

export const revalidate = 60;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wellsWeatherData = await WellWeatherService.getWeatherSummaryForUserWells(session.id);

    return NextResponse.json(wellsWeatherData);
  } catch (error) {
    console.error("Wells weather summary API error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Kuyular hava durumu özeti getirilemedi", detail: message },
      { status: 500 }
    );
  }
}