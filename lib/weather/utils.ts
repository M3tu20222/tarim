export interface ParsedCoordinates {
  latitude: number;
  longitude: number;
}

export const DEFAULT_PRECISION = 5;

export function parseCoordinateString(value?: string | null): ParsedCoordinates | null {
  if (!value) return null;
  const normalized = value.replace(/[\s;|]+/g, ",");
  const parts = normalized.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const latitude = Number.parseFloat(parts[0]);
  const longitude = Number.parseFloat(parts[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return { latitude, longitude };
}

export function formatUtcOffset(offsetSeconds: number): string {
  const sign = offsetSeconds >= 0 ? "+" : "-";
  const abs = Math.abs(offsetSeconds);
  const hours = Math.floor(abs / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((abs % 3600) / 60)
    .toString()
    .padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

export function parseTimestampWithOffset(
  timestamp: string,
  offsetSeconds: number,
): Date {
  const offset = formatUtcOffset(offsetSeconds);
  // Append seconds segment if missing so the ISO string parses correctly.
  const isoCandidate = timestamp.includes(":") && timestamp.length === 16
    ? `${timestamp}:00${offset}`
    : `${timestamp}${offset}`;
  return new Date(isoCandidate);
}

export function parseDateWithOffset(date: string, offsetSeconds: number): Date {
  const offset = formatUtcOffset(offsetSeconds);
  return new Date(`${date}T00:00:00${offset}`);
}

export function chunkArray<T>(items: readonly T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) {
    return [Array.from(items)];
  }
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    result.push(items.slice(i, i + chunkSize));
  }
  return result;
}

export function roundTo(value: number, precision = DEFAULT_PRECISION): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function safeNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
