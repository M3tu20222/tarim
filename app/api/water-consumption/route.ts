import { NextResponse } from "next/server";
import { WaterConsumptionService } from "@/lib/water-consumption/service";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get("cookie") ?? undefined;
    const session = await getSession(cookie ? { headers: { cookie } } : undefined);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const waterData = await WaterConsumptionService.getWaterConsumptionForUser(session.id);

    return NextResponse.json({
      fields: waterData,
      summary: {
        totalFields: waterData.length,
        avgDailyETc: waterData.reduce((sum, field) => sum + field.today.etc, 0) / waterData.length || 0,
        highPriorityFields: waterData.filter(field => field.today.status === 'high').length,
        nextIrrigationDate: waterData
          .map(field => field.weekly.nextIrrigationDate)
          .filter((date): date is Date => date !== null)
          .sort((a, b) => a.getTime() - b.getTime())[0] || null
      }
    });
  } catch (error) {
    console.error("Water consumption API error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Su tuketimi verileri getirilemedi", detail: message },
      { status: 500 }
    );
  }
}