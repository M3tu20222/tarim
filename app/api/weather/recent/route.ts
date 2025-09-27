import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Son 48 saatlik weather snapshots alıyoruz
    const weatherData = await prisma.weatherSnapshot.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 48 * 60 * 60 * 1000), // Son 48 saat
        },
      },
      select: {
        id: true,
        timestamp: true,
        temperature2m: true,
        relativeHumidity2m: true,
        precipitationMm: true,
        windSpeed10m: true,
        et0FaoEvapotranspiration: true,
        vapourPressureDeficit: true,
        field: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 100, // Son 100 kayıt
    });

    return NextResponse.json(weatherData);
  } catch (error) {
    console.error("Weather data fetch error:", error);
    return NextResponse.json(
      { error: "Weather data could not be fetched" },
      { status: 500 }
    );
  }
}