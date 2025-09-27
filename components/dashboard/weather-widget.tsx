"use client"

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface WeatherWidgetProps {
  fieldId?: string;
  location?: string;
  temperature?: number;
  condition?: string;
  showRecommendations?: boolean;
  className?: string;
}

export interface WeatherFieldResponse {
  field: {
    id: string;
    name: string;
    location: string;
    coordinates?: string | null;
    size?: number | null;
    status: string;
    activeCrop?: {
      id: string;
      name: string;
      plantedDate: string | null;
      harvestDate: string | null;
      status: string;
    } | null;
  };
  coordinateSource?: {
    type: "FIELD" | "WELL" | "DEFAULT";
    label: string;
    referenceName?: string;
  } | null;
  resolvedCoordinates?: {
    latitude: number;
    longitude: number;
  } | null;
  lastUpdated: string | null;
  dailySummary: {
    date: string;
    tMaxC?: number | null;
    tMinC?: number | null;
    precipitationSumMm?: number | null;
    et0FaoEvapotranspiration?: number | null;
  } | null;
  agroFeature: {
    gdd?: number | null;
    gddCumulative?: number | null;
    etcMm?: number | null;
    etcCumulative?: number | null;
    waterBalanceMm?: number | null;
    rainfallMm?: number | null;
    irrigationMm?: number | null;
    vpdMax?: number | null;
    heatStressHours?: number | null;
    frostHours?: number | null;
    phenologyStage?: string | null;
    phenologyStageLabel?: string | null;
    recommendations: string[];
  } | null;
  hourly: Array<{
    timestamp: string;
    temperature2m?: number | null;
    relativeHumidity2m?: number | null;
    precipitationMm?: number | null;
    windSpeed10m?: number | null;
    et0FaoEvapotranspiration?: number | null;
    vapourPressureDeficit?: number | null;
  }>;
  upcomingDaily?: Array<{
    date: string;
    source: string;
    tMaxC?: number | null;
    tMinC?: number | null;
    avgTemperatureC?: number | null;
    precipitationSumMm?: number | null;
    et0FaoEvapotranspiration?: number | null;
  }>;
  recentDaily?: Array<{
    date: string;
    source: string;
    tMaxC?: number | null;
    tMinC?: number | null;
    avgTemperatureC?: number | null;
    precipitationSumMm?: number | null;
    et0FaoEvapotranspiration?: number | null;
    daylightSeconds?: number | null;
  }>;
  recommendations: string[];
}

const stageHints: Record<string, string> = {
  initial: "Erken gelisme",
  development: "Gelisme",
  mid: "Tepe gelisme",
  late: "Hasat oncesi",
};

const formatNumber = (value?: number | null, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
};

const deriveCondition = (
  summary: WeatherFieldResponse["dailySummary"],
  latestHourly?: WeatherFieldResponse["hourly"][number],
) => {
  const rain = summary?.precipitationSumMm ?? 0;
  if (rain >= 1) return "Yagis bekleniyor";
  if (
    latestHourly?.vapourPressureDeficit !== undefined &&
    latestHourly.vapourPressureDeficit > 1.6
  ) {
    return "Yuksek vpd";
  }
  if (
    latestHourly?.temperature2m !== undefined &&
    latestHourly?.relativeHumidity2m !== undefined
  ) {
    const temp = latestHourly.temperature2m;
    const humidity = latestHourly.relativeHumidity2m;
    if (temp >= 30 && humidity < 40) {
      return "Sicak ve kuru";
    }
  }
  return "Stabil";
};

export function WeatherWidget({
  fieldId,
  location,
  temperature,
  condition,
  showRecommendations = true,
  className,
}: WeatherWidgetProps) {
  const query = useQuery<WeatherFieldResponse>({
    queryKey: ["weather", fieldId],
    queryFn: async () => {
      const response = await fetch(`/api/weather/fields/${fieldId}`);
      if (!response.ok) {
        throw new Error(`Sunucu hatasi: ${response.status}`);
      }
      return (await response.json()) as WeatherFieldResponse;
    },
    enabled: Boolean(fieldId),
    staleTime: 1000 * 60 * 15,
  });

  const latestHourly = useMemo(() => {
    if (!query.data?.hourly || query.data.hourly.length === 0) return undefined;
    return query.data.hourly[query.data.hourly.length - 1];
  }, [query.data?.hourly]);

  const coordinateSource = query.data?.coordinateSource ?? null;
  const resolvedCoordinates = query.data?.resolvedCoordinates ?? null;

  const displayLocation = query.data?.field.name ?? location ?? "Konum belirsiz";
  const displayTemp = latestHourly?.temperature2m ?? temperature;
  const displayCondition = fieldId
    ? deriveCondition(query.data?.dailySummary, latestHourly)
    : condition ?? "";

  const metrics = {
    humidity: latestHourly?.relativeHumidity2m,
    vpd: latestHourly?.vapourPressureDeficit,
    etc: query.data?.agroFeature?.etcMm,
    rainfall: query.data?.dailySummary?.precipitationSumMm,
  };

  const recommendations = query.data?.recommendations ?? [];
  const condensedRecs = recommendations.slice(0, 2);
  const hasRecommendations = showRecommendations && condensedRecs.length > 0;

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>Hava Durumu</CardTitle>
        <CardDescription>{displayLocation}</CardDescription>
        {coordinateSource?.label && (
          <div className="text-xs text-muted-foreground">
            Koordinat kaynagi: {coordinateSource.label}
          </div>
        )}
        {coordinateSource?.referenceName && (
          <div className="text-xs text-muted-foreground">
            {coordinateSource.referenceName}
          </div>
        )}
        {resolvedCoordinates && (
          <div className="text-xs text-muted-foreground">
            ({resolvedCoordinates.latitude.toFixed(4)}, {resolvedCoordinates.longitude.toFixed(4)})
          </div>
        )}
      </CardHeader>
      <CardContent>
        {fieldId && query.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : fieldId && query.isError ? (
          <div className="text-sm text-red-600">
            Hava verileri yuklenemedi: {query.error instanceof Error ? query.error.message : "Bilinmeyen hata"}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-4xl font-semibold">
                {displayTemp !== undefined ? `${formatNumber(displayTemp, 1)} C` : "Veri yok"}
              </div>
              <div className="text-sm text-muted-foreground">{displayCondition}</div>
              {query.data?.agroFeature?.phenologyStage && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Fenolojik evre: {query.data.agroFeature.phenologyStageLabel ?? stageHints[query.data.agroFeature.phenologyStage] ?? query.data.agroFeature.phenologyStage}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric label="Nem" value={metrics.humidity} unit="%" />
              <Metric label="VPD" value={metrics.vpd} unit="kPa" />
              <Metric label="Gunun ETc" value={metrics.etc} unit="mm" />
              <Metric label="Gunun yagisi" value={metrics.rainfall} unit="mm" />
            </div>
            {hasRecommendations && (
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Oneriler
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {condensedRecs.map((item, index) => (
                    <li key={index} className="leading-snug">
                      - {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {query.data?.lastUpdated && (
              <div className="text-xs text-muted-foreground">
                Son guncelleme: {new Date(query.data.lastUpdated).toLocaleString("tr-TR")}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricProps {
  label: string;
  value?: number | null;
  unit?: string;
}

const Metric = ({ label, value, unit }: MetricProps) => (
  <div className="rounded-md border border-border p-2">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-base font-medium">
      {formatNumber(value)} {unit ?? ""}
    </div>
  </div>
);

