import { CropPeriodStatus } from "@prisma/client";
import { Crop, Field, Season, Process, IrrigationLog, FieldExpense } from "@prisma/client";

/**
 * CropPeriod ile ilişkili olan tüm modelleri içeren interface
 */
export interface CropPeriodWithRelations {
  id: string;
  cropId: string | null;
  fieldId: string;
  seasonId: string;
  startDate: Date;
  endDate: Date | null;
  status: CropPeriodStatus;
  crop?: Crop | null;
  field?: Field;
  season?: Season;
  processes?: Process[];
  irrigationLogs?: IrrigationLog[];
  fieldExpenses?: FieldExpense[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CropPeriod hayat döngüsü aşamaları
 */
export enum CropPhaseLifecycle {
  PREPARATION = "PREPARATION",   // Toprak hazırlığı, sürme, gübre
  SEEDING = "SEEDING",           // Ekim aşaması
  IRRIGATION = "IRRIGATION",     // Sulama dönemi (dominant activity)
  FERTILIZING = "FERTILIZING",   // Gübreleme aşaması (dominant activity)
  HARVESTING = "HARVESTING",     // Hasat aşaması
  CLOSED = "CLOSED"              // Dönem kapandı
}

/**
 * CropPeriod durumu geçişi kuralları
 */
export const CropPeriodTransitions: Record<CropPeriodStatus, CropPeriodStatus[]> = {
  [CropPhaseLifecycle.PREPARATION]: [CropPhaseLifecycle.SEEDING, CropPhaseLifecycle.CLOSED],
  [CropPhaseLifecycle.SEEDING]: [CropPhaseLifecycle.IRRIGATION, CropPhaseLifecycle.HARVESTING, CropPhaseLifecycle.CLOSED],
  [CropPhaseLifecycle.IRRIGATION]: [CropPhaseLifecycle.FERTILIZING, CropPhaseLifecycle.HARVESTING, CropPhaseLifecycle.CLOSED],
  [CropPhaseLifecycle.FERTILIZING]: [CropPhaseLifecycle.HARVESTING, CropPhaseLifecycle.CLOSED],
  [CropPhaseLifecycle.HARVESTING]: [CropPhaseLifecycle.CLOSED],
  [CropPhaseLifecycle.CLOSED]: []
};

/**
 * CropPeriod statüsü bir sonraki statüye geçebilir mi kontrolü
 */
export function canTransitionTo(
  currentStatus: CropPeriodStatus,
  targetStatus: CropPeriodStatus
): boolean {
  const allowedTransitions = CropPeriodTransitions[currentStatus];
  return allowedTransitions.includes(targetStatus);
}

/**
 * CropPeriod oluşturma parametreleri
 */
export interface CreateCropPeriodInput {
  fieldId: string;
  seasonId: string;
  cropId?: string | null;
  startDate: Date;
  endDate?: Date | null;
  status?: CropPeriodStatus;
}

/**
 * CropPeriod güncelleme parametreleri
 */
export interface UpdateCropPeriodInput {
  cropId?: string | null;
  endDate?: Date | null;
  status?: CropPeriodStatus;
}

/**
 * Active CropPeriod bulma sonucu
 */
export interface ActiveCropPeriodResult {
  found: boolean;
  period?: CropPeriodWithRelations | null;
  message: string;
}

/**
 * Lifecycle geçişi tetikleme sonucu
 */
export interface LifecycleTransitionResult {
  success: boolean;
  oldStatus?: CropPeriodStatus;
  newStatus?: CropPeriodStatus;
  message: string;
  error?: string;
}

/**
 * Finalize hasat sonucu
 */
export interface FinalizeCropPeriodResult {
  success: boolean;
  closedPeriod?: CropPeriodWithRelations;
  newPeriod?: CropPeriodWithRelations;
  message: string;
  error?: string;
}

