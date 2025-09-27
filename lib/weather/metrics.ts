import { differenceInCalendarDays } from "date-fns";

import { findCropGuide, resolvePhenologyStageFromDays } from "./cropGuides";
import type { AgroComputationContext } from "./types";

export interface AgroComputationResult {
  gdd?: number;
  gddCumulative?: number;
  etcMm?: number;
  etcCumulative?: number;
  waterBalanceMm?: number;
  rainfallMm?: number;
  irrigationMm?: number;
  vpdMax?: number;
  heatStressHours?: number;
  frostHours?: number;
  phenologyStage?: string;
  kcFactor?: number;
  daysAfterPlanting?: number;
  recommendations: string[];
  metadata?: Record<string, unknown>;
}

const DEFAULT_UPPER_TEMP = 50;
const DEFAULT_BASE_TEMP = 0;
const DEFAULT_KC = 0.9;

interface CropSnapshot {
  cropId?: string;
  cropName?: string;
  plantedDate?: Date;
}

export const calculateAgroMetrics = (
  context: AgroComputationContext,
  crop?: CropSnapshot,
): AgroComputationResult => {
  const {
    dailyRecord,
    hourlyRecords,
    previousFeature,
  } = context;

  const rainfallMm = dailyRecord.precipitationSumMm ?? 0;
  const irrigationMm = 0; // TODO: integrate with irrigation logs when volumetric data is available.

  const guide = crop?.cropName ? findCropGuide(crop.cropName) : undefined;
  const daysAfterPlanting = crop?.plantedDate
    ? differenceInCalendarDays(dailyRecord.date, crop.plantedDate)
    : undefined;

  const stageKey = guide && typeof daysAfterPlanting === "number" && daysAfterPlanting >= 0
    ? resolvePhenologyStageFromDays(daysAfterPlanting, guide)
    : undefined;

  const kcFactor = guide && stageKey ? guide.kcValues[stageKey] : DEFAULT_KC;

  const baseTemperature = guide?.gddBase ?? DEFAULT_BASE_TEMP;
  const upperTemperature = guide?.gddUpper ?? DEFAULT_UPPER_TEMP;

  const tMax = dailyRecord.tMaxC;
  const tMin = dailyRecord.tMinC;
  const averageTemp =
    tMax !== undefined && tMin !== undefined
      ? (tMax + tMin) / 2
      : undefined;

  const boundedAverage = averageTemp !== undefined
    ? Math.min(Math.max(averageTemp, baseTemperature), upperTemperature)
    : undefined;

  const gdd = boundedAverage !== undefined
    ? Math.max(0, boundedAverage - baseTemperature)
    : undefined;

  const gddCumulative = gdd !== undefined
    ? (previousFeature?.gddCumulative ?? 0) + gdd
    : previousFeature?.gddCumulative;

  const etcMm = dailyRecord.et0FaoEvapotranspiration !== undefined
    ? kcFactor * dailyRecord.et0FaoEvapotranspiration
    : undefined;

  const etcCumulative = etcMm !== undefined
    ? (previousFeature?.etcCumulative ?? 0) + etcMm
    : previousFeature?.etcCumulative;

  const waterBalanceMm = (() => {
    if (etcMm === undefined) {
      return previousFeature?.waterBalanceMm;
    }
    const previous = previousFeature?.waterBalanceMm ?? 0;
    return previous + rainfallMm + irrigationMm - etcMm;
  })();

  const heatThreshold = guide?.stressThresholds.heatStress ?? 35;
  const frostThreshold = guide?.stressThresholds.frost ?? 0;

  const heatStressHours = hourlyRecords.reduce((count, record) => {
    if (record.temperature2m !== undefined && record.temperature2m >= heatThreshold) {
      return count + 1;
    }
    return count;
  }, 0);

  const frostHours = hourlyRecords.reduce((count, record) => {
    if (record.temperature2m !== undefined && record.temperature2m <= frostThreshold) {
      return count + 1;
    }
    return count;
  }, 0);

  const hourlyVpdMax = hourlyRecords.reduce<number | undefined>((max, record) => {
    if (record.vapourPressureDeficit === undefined) return max;
    if (max === undefined) return record.vapourPressureDeficit;
    return Math.max(max, record.vapourPressureDeficit);
  }, undefined);

  const vpdMax = dailyRecord.vapourPressureDeficitMax ?? hourlyVpdMax;

  const recommendations: string[] = [];
  const pushRecommendation = (message: string) => {
    if (!recommendations.includes(message)) {
      recommendations.push(message);
    }
  };

  if (etcMm !== undefined && etcMm > 2 && rainfallMm + irrigationMm < etcMm * 0.8) {
    const deficit = (etcMm - (rainfallMm + irrigationMm)).toFixed(1);
    pushRecommendation(
      `Bugun tahmini bitki su tuketimi ${etcMm.toFixed(1)} mm. Yaklasik ${deficit} mm acik icin sulama planlayin.`,
    );
  }

  if (heatStressHours > 2) {
    pushRecommendation(
      `Gun icinde ${heatStressHours} saatlik yuksek sicaklik (> ${heatThreshold} C) stresi bekleniyor. Gun ortasi sulama veya gunes yanigina karsi onlem alin.`,
    );
  }

  if (vpdMax !== undefined && guide && vpdMax > guide.stressThresholds.highVpd) {
    pushRecommendation(
      `VPD ${vpdMax.toFixed(2)} kPa seviyesine cikiyor. Yaprak stresi icin gun ortasinda azalan su kaybini izleyin.`,
    );
  }

  if (frostHours > 0) {
    pushRecommendation(
      `Don riski: gun icinde ${frostHours} saat sicaklik ${frostThreshold} C altina iniyor. Hassas alanlari koruyun.`,
    );
  }

  if (guide?.gddTargets && gddCumulative !== undefined) {
    const { emergence, flowering, maturity } = guide.gddTargets;
    const events: Array<{ label: string; target?: number }> = [
      { label: "cikis", target: emergence },
      { label: "ciceklenme", target: flowering },
      { label: "olgunluk", target: maturity },
    ];

    events.forEach(({ label, target }) => {
      if (!target) return;
      const delta = target - gddCumulative;
      if (delta > 0 && delta <= 80) {
        pushRecommendation(
          `GDD ${gddCumulative.toFixed(0)} mm-gun ile ${label} esigine yaklasiliyor (~${delta.toFixed(0)} mm-gun). Gerekli tarla operasyonlarini hazirlayin.`,
        );
      }
    });
  }

  if (stageKey === "late" && waterBalanceMm !== undefined && waterBalanceMm < -30) {
    pushRecommendation(
      "Gec sezon su dengesi ekside. Hasat oncesi su stresini azaltmak icin hafif sulama dusunulebilir.",
    );
  }

  return {
    gdd,
    gddCumulative,
    etcMm,
    etcCumulative,
    waterBalanceMm,
    rainfallMm,
    irrigationMm,
    vpdMax,
    heatStressHours,
    frostHours,
    phenologyStage: stageKey,
    kcFactor,
    daysAfterPlanting,
    recommendations,
    metadata: {
      guideKey: guide?.key,
      stageDurations: guide?.stageDurations,
      stressThresholds: guide?.stressThresholds,
    },
  } satisfies AgroComputationResult;
};
