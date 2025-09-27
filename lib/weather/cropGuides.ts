import { PhenologyStageKey } from "./types";

export interface CropGuide {
  key: string;
  displayName: string;
  aliases: string[];
  gddBase: number;
  gddUpper: number;
  stageDurations: Record<PhenologyStageKey, number>;
  kcValues: Record<PhenologyStageKey, number>;
  gddTargets?: {
    emergence?: number;
    flowering?: number;
    maturity?: number;
  };
  stressThresholds: {
    highVpd: number;
    heatStress: number;
    frost: number;
  };
  rainfallComfortMm: number;
  notes?: string[];
}

const createGuide = (guide: CropGuide) => guide;

export const cropGuides: CropGuide[] = [
  createGuide({
    key: "corn",
    displayName: "Misir",
    aliases: ["misir", "corn", "silaj misir", "sweet corn"],
    gddBase: 10,
    gddUpper: 30,
    stageDurations: {
      initial: 20,
      development: 30,
      mid: 40,
      late: 30,
    },
    kcValues: {
      initial: 0.4,
      development: 0.75,
      mid: 1.15,
      late: 0.6,
    },
    gddTargets: {
      emergence: 80,
      flowering: 750,
      maturity: 1200,
    },
    stressThresholds: {
      highVpd: 1.6,
      heatStress: 32,
      frost: 0,
    },
    rainfallComfortMm: 6,
    notes: [
      "Silking doneminde su stresi verimi hizli dusurur.",
      "Tassel ve sut olum donemlerinde VPD > 1.6 kPa sulama icin kritik.",
    ],
  }),
  createGuide({
    key: "wheat",
    displayName: "Bugday",
    aliases: ["bugday", "wheat"],
    gddBase: 0,
    gddUpper: 26,
    stageDurations: {
      initial: 25,
      development: 40,
      mid: 50,
      late: 35,
    },
    kcValues: {
      initial: 0.35,
      development: 0.75,
      mid: 1.05,
      late: 0.3,
    },
    gddTargets: {
      emergence: 150,
      flowering: 780,
      maturity: 1600,
    },
    stressThresholds: {
      highVpd: 1.4,
      heatStress: 30,
      frost: -4,
    },
    rainfallComfortMm: 5,
    notes: [
      "Basaklanma sonrasi isi stresi protein oranini dusurebilir.",
      "Kardeslenme doneminde toprak nemi korunmalidir.",
    ],
  }),
  createGuide({
    key: "sunflower",
    displayName: "Aycicegi",
    aliases: ["aycicegi", "sunflower"],
    gddBase: 8,
    gddUpper: 30,
    stageDurations: {
      initial: 20,
      development: 25,
      mid: 35,
      late: 25,
    },
    kcValues: {
      initial: 0.35,
      development: 0.75,
      mid: 1.1,
      late: 0.5,
    },
    gddTargets: {
      emergence: 90,
      flowering: 600,
      maturity: 1100,
    },
    stressThresholds: {
      highVpd: 1.8,
      heatStress: 34,
      frost: 0,
    },
    rainfallComfortMm: 4,
    notes: [
      "Ciceklenme suresince su acigi yag oranini ciddi dusurur.",
      "Yuksek VPD (>1.8 kPa) ciceklenmeyi baskilar.",
    ],
  }),
  createGuide({
    key: "cotton",
    displayName: "Pamuk",
    aliases: ["pamuk", "cotton"],
    gddBase: 15,
    gddUpper: 32,
    stageDurations: {
      initial: 25,
      development: 35,
      mid: 45,
      late: 30,
    },
    kcValues: {
      initial: 0.35,
      development: 0.7,
      mid: 1.2,
      late: 0.6,
    },
    gddTargets: {
      emergence: 160,
      flowering: 850,
      maturity: 1600,
    },
    stressThresholds: {
      highVpd: 1.9,
      heatStress: 35,
      frost: 5,
    },
    rainfallComfortMm: 7,
    notes: [
      "Ciceklenme oncesi su acigi koz olusumunu azaltir.",
      "Gece sicakliklari 20 C altina dustugunde gelisim yavaslar.",
    ],
  }),
  createGuide({
    key: "tomato",
    displayName: "Domates",
    aliases: ["domates", "tomato"],
    gddBase: 10,
    gddUpper: 32,
    stageDurations: {
      initial: 20,
      development: 25,
      mid: 45,
      late: 30,
    },
    kcValues: {
      initial: 0.6,
      development: 0.9,
      mid: 1.15,
      late: 0.8,
    },
    gddTargets: {
      emergence: 120,
      flowering: 650,
      maturity: 1100,
    },
    stressThresholds: {
      highVpd: 1.3,
      heatStress: 32,
      frost: 2,
    },
    rainfallComfortMm: 8,
    notes: [
      "Blossom end rot riskini azaltmak icin dengeli sulama sarttir.",
      "Ciceklenme doneminde VPD 1.3 kPa uzeri cicek tutumunu azaltir.",
    ],
  }),
];

export const findCropGuide = (cropName?: string): CropGuide | undefined => {
  if (!cropName) return undefined;
  const normalized = cropName.trim().toLowerCase();
  return cropGuides.find((guide) =>
    [guide.key, guide.displayName.toLowerCase(), ...guide.aliases].some(
      (alias) => alias.trim().toLowerCase() === normalized,
    ),
  );
};

export const resolvePhenologyStageFromDays = (
  daysAfterPlanting: number,
  guide: CropGuide,
): PhenologyStageKey => {
  const { stageDurations } = guide;
  if (daysAfterPlanting <= stageDurations.initial) {
    return "initial";
  }
  if (daysAfterPlanting <= stageDurations.initial + stageDurations.development) {
    return "development";
  }
  if (
    daysAfterPlanting <=
    stageDurations.initial +
      stageDurations.development +
      stageDurations.mid
  ) {
    return "mid";
  }
  return "late";
};
