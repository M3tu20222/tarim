"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CloudSunIcon } from "lucide-react";

import { WeatherWidget, type WeatherFieldResponse } from "@/components/dashboard/weather-widget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface FieldOption {
  id: string;
  name: string;
}

type ForecastEntry = NonNullable<WeatherFieldResponse["upcomingDaily"]>[number];
type HistoryEntry = NonNullable<WeatherFieldResponse["recentDaily"]>[number];

const fetchAllFields = async (): Promise<FieldOption[]> => {
  const response = await fetch("/api/fields?fetchAll=true");
  if (!response.ok) {
    throw new Error("Tarlalar yuklenemedi");
  }
  const payload = await response.json();
  return Array.isArray(payload.data)
    ? (payload.data as FieldOption[])
    : [];
};

const fetchWeatherByField = async (fieldId: string): Promise<WeatherFieldResponse> => {
  const response = await fetch(`/api/weather/fields/${fieldId}`);
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error ?? "Hava verileri yuklenemedi");
  }
  return (await response.json()) as WeatherFieldResponse;
};

const formatNumber = (value: number | null | undefined, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return value.toFixed(digits);
};

const formatDate = (isoDate: string) => {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  }).format(date);
};

export default function OwnerWeatherPage() {
  const [selectedFieldId, setSelectedFieldId] = useState<string>("");

  const fieldsQuery = useQuery({
    queryKey: ["owner-fields-all"],
    queryFn: fetchAllFields,
    staleTime: 1000 * 60 * 30,
  });

  const weatherQuery = useQuery({
    queryKey: ["weather", selectedFieldId],
    queryFn: () => fetchWeatherByField(selectedFieldId),
    enabled: Boolean(selectedFieldId),
    staleTime: 1000 * 60 * 15,
  });

  useEffect(() => {
    if (!selectedFieldId && fieldsQuery.data && fieldsQuery.data.length > 0) {
      setSelectedFieldId(fieldsQuery.data[0].id);
    }
  }, [fieldsQuery.data, selectedFieldId]);

  const forecastRows = useMemo(
    () => weatherQuery.data?.upcomingDaily ?? [],
    [weatherQuery.data?.upcomingDaily],
  );

  const historicalRows = useMemo(
    () => weatherQuery.data?.recentDaily ?? [],
    [weatherQuery.data?.recentDaily],
  );

  const activeField = useMemo(() => {
    return fieldsQuery.data?.find((field) => field.id === selectedFieldId) ?? null;
  }, [fieldsQuery.data, selectedFieldId]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <CloudSunIcon className="h-6 w-6 text-cyan-400" />
          <h1 className="text-2xl font-semibold text-cyan-100">Hava Durumu Merkezi</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Tarlalarinizin anlik ve gelecek hava kosullarini izleyin, sulama ve hasat kararlarini
          destekleyen agronomik metrikleri takip edin.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Tarla Secimi</CardTitle>
            <CardDescription>Hava verilerini incelemek istediginiz tarlayi secin.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {fieldsQuery.isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : fieldsQuery.isError ? (
              <div className="text-sm text-red-500">
                Tarlalar yuklenirken bir hata olustu. Lutfen daha sonra tekrar deneyin.
              </div>
            ) : (
              <Select value={selectedFieldId} onValueChange={setSelectedFieldId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tarla secin" />
                </SelectTrigger>
                <SelectContent>
                  {fieldsQuery.data?.map((field) => (
                    <SelectItem key={field.id} value={field.id}>
                      {field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {activeField && (
              <div className="text-xs leading-relaxed text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Secili tarla:</span> {activeField.name}
                </p>
                <p>Koordinat kaynagi: {weatherQuery.data?.coordinateSource?.label ?? "belirsiz"}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="col-span-1 xl:col-span-2">
          <WeatherWidget fieldId={selectedFieldId} className="h-full" />
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-3">
        <WeatherForecastCard
          isLoading={weatherQuery.isLoading && !weatherQuery.data}
          upcomingDaily={forecastRows}
        />
        <WeatherHistoryCard
          isLoading={weatherQuery.isLoading && !weatherQuery.data}
          recentDaily={historicalRows}
        />
        <WeatherRoadmapCard />
      </section>
    </div>
  );
}

interface WeatherForecastCardProps {
  isLoading: boolean;
  upcomingDaily: WeatherFieldResponse["upcomingDaily"];
}

const WeatherForecastCard = ({ isLoading, upcomingDaily }: WeatherForecastCardProps) => (
  <Card className="xl:col-span-2">
    <CardHeader>
      <CardTitle>7 Gunluk Tahmin</CardTitle>
      <CardDescription>Gelecek hafta icin temel sicaklik ve yagis tahminleri.</CardDescription>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : upcomingDaily && upcomingDaily.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Gun</th>
                <th className="px-3 py-2">Tmax ( deg C)</th>
                <th className="px-3 py-2">Tmin ( deg C)</th>
                <th className="px-3 py-2">Yagis (mm)</th>
                <th className="px-3 py-2">ET0 (mm)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {upcomingDaily.map((item) => (
                <tr key={`${item.date}-${item.source}`}>
                  <td className="px-3 py-2 font-medium text-foreground">{formatDate(item.date)}</td>
                  <td className="px-3 py-2">{formatNumber(item.tMaxC)}</td>
                  <td className="px-3 py-2">{formatNumber(item.tMinC)}</td>
                  <td className="px-3 py-2">{formatNumber(item.precipitationSumMm)}</td>
                  <td className="px-3 py-2">{formatNumber(item.et0FaoEvapotranspiration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Tahmin verisi bulunamadi. Cron senkronizasyonunun tamamlanmis oldugundan emin olun.
        </p>
      )}
    </CardContent>
  </Card>
);

interface WeatherHistoryCardProps {
  isLoading: boolean;
  recentDaily: WeatherFieldResponse["recentDaily"];
}

const WeatherHistoryCard = ({ isLoading, recentDaily }: WeatherHistoryCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Son Gunler</CardTitle>
      <CardDescription>Geride kalan gune ait ozet degerler.</CardDescription>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : recentDaily && recentDaily.length > 0 ? (
        <div className="space-y-3">
          {recentDaily.map((item) => {
            const average = item.avgTemperatureC ?? (item.tMaxC != null && item.tMinC != null
              ? (item.tMaxC + item.tMinC) / 2
              : item.tMaxC ?? item.tMinC ?? null);
            const daylightHours = item.daylightSeconds ? Math.round(item.daylightSeconds / 3600) : null;
            return (
              <div key={`${item.date}-${item.source}`} className="rounded-md border border-border/60 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{formatDate(item.date)}</span>
                  <span className="text-muted-foreground">
                    {item.source === "FORECAST" ? "Tahmin" : "Gerceklesme"}
                  </span>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <dt>Ortalama</dt>
                    <dd>{formatNumber(Number.isFinite(average) ? average : null)}</dd>
                  </div>
                  <div>
                    <dt>Yagis</dt>
                    <dd>{formatNumber(item.precipitationSumMm)} mm</dd>
                  </div>
                  <div>
                    <dt>ET0</dt>
                    <dd>{formatNumber(item.et0FaoEvapotranspiration)} mm</dd>
                  </div>
                  <div>
                    <dt>Gun isigi</dt>
                    <dd>{daylightHours !== null ? `${daylightHours} s` : "-"}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Gecmis veri bulunamadi. Senkronizasyon tamamlandiginda bu alanda gosterilecek.
        </p>
      )}
    </CardContent>
  </Card>
);

const WeatherRoadmapCard = () => (
  <Card className="space-y-3">
    <CardHeader>
      <CardTitle>Veri Yol Haritasi</CardTitle>
      <CardDescription>Kayit, analiz ve bildirim adimlarinin ozeti.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3 text-sm text-muted-foreground">
      <div>
        <h3 className="font-medium text-foreground">Veri Toplama &amp; Saklama</h3>
        <ul className="list-disc pl-4">
          <li>3 saatte bir forecast + past_days senkronu, D+6 sonrasinda Archive ile finalizasyon.</li>
          <li>Saatlik kayitlar 30-90 gun saklanir, gunduz ozetleri ve agro metrikleri uzun vadeli tutulur.</li>
          <li>Historical Forecast ile tahmin dogruluk analizi (tahmin vs gerceklesme) yapilacak.</li>
        </ul>
      </div>
      <div>
        <h3 className="font-medium text-foreground">Agronomik Metrikler</h3>
        <ul className="list-disc pl-4">
          <li>Urun bazli Tbase/Tupper ile GDD ve ETc hesaplari.</li>
          <li>Su dengesi (yagis + sulama - ETc) ve stres saatleri (sicaklik, don, VPD) takibi.</li>
          <li>Hastalik riski icin yaprak islakligi / yuksek RH proxy'leri.</li>
        </ul>
      </div>
      <div>
        <h3 className="font-medium text-foreground">Eylem &amp; Bildirimler</h3>
        <ul className="list-disc pl-4">
          <li>Yagis, don ve yuksek VPD icin uyari bildirimleri.</li>
          <li>Sulama ve hasat plani icin CSV/PDF disa aktarimlar.</li>
          <li>Tarla-kuyu koordinat eslemesini otomatik kontrol eden hatirlaticilar.</li>
        </ul>
      </div>
    </CardContent>
  </Card>
);


