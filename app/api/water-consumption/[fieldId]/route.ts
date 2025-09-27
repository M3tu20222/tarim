import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WaterConsumptionService } from "@/lib/water-consumption/service";
import { getSession } from "@/lib/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  try {
    const cookie = request.headers.get("cookie") ?? undefined;
    const session = await getSession(cookie ? { headers: { cookie } } : undefined);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fieldId } = await params;

    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      select: { id: true, name: true },
    });

    if (!field) {
      return NextResponse.json({ error: "Tarla bulunamadi" }, { status: 404 });
    }

    const waterData = await WaterConsumptionService.getWaterConsumptionForField(fieldId);

    if (!waterData) {
      return NextResponse.json({
        fieldId: field.id,
        fieldName: field.name,
        missingReason: "Su tuketimi hesaplanamadi. Aktif bitki veya guncel hava verisi bulunmuyor.",
      });
    }

    return NextResponse.json(waterData);
  } catch (error) {
    console.error("Water consumption API error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Su tuketimi verileri getirilemedi", detail: message },
      { status: 500 }
    );
  }
}