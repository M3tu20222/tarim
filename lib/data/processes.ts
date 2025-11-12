import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERNAL: Always calls database
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _getAllProcesses() {
  console.log("[DB] Fetching all processes");

  return await prisma.process.findMany({
    select: {
      id: true,
      type: true,
      status: true,
      date: true,
      fieldId: true,
      seasonId: true,
      workerId: true,
      processedArea: true,
      processedPercentage: true,
      field: {
        select: { id: true, name: true },
      },
      worker: {
        select: { id: true, name: true },
      },
      createdAt: true,
    },
    orderBy: { date: "desc" },
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORTED: Cached version
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getAllProcesses = cache(
  _getAllProcesses,
  ["all-processes"],
  {
    revalidate: 60, // 1 minute - processes change frequently
    tags: ["processes"],
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Processes by season
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _getProcessesBySeason(seasonId: string) {
  console.log(`[DB] Fetching processes for season ${seasonId}`);

  return await prisma.process.findMany({
    where: { seasonId },
    select: {
      id: true,
      type: true,
      status: true,
      date: true,
      fieldId: true,
      workerId: true,
      processedArea: true,
      processedPercentage: true,
      field: {
        select: { id: true, name: true },
      },
      worker: {
        select: { id: true, name: true },
      },
      createdAt: true,
    },
    orderBy: { date: "desc" },
  });
}

export const getProcessesBySeason = cache(
  (seasonId: string) => _getProcessesBySeason(seasonId),
  ["processes-by-season"],
  {
    revalidate: 60,
    tags: ["processes"],
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Active processes only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _getActiveProcesses() {
  console.log("[DB] Fetching active processes");

  return await prisma.process.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      type: true,
      status: true,
      date: true,
      fieldId: true,
      seasonId: true,
      workerId: true,
      processedArea: true,
      processedPercentage: true,
      field: {
        select: { id: true, name: true },
      },
      worker: {
        select: { id: true, name: true },
      },
    },
    orderBy: { date: "desc" },
  });
}

export const getActiveProcesses = cache(
  _getActiveProcesses,
  ["processes-active"],
  {
    revalidate: 60,
    tags: ["processes"],
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Processes with details (heavier query)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _getProcessesWithDetails() {
  console.log("[DB] Fetching processes with details");

  return await prisma.process.findMany({
    select: {
      id: true,
      type: true,
      status: true,
      date: true,
      fieldId: true,
      seasonId: true,
      workerId: true,
      processedArea: true,
      processedPercentage: true,
      field: {
        select: { id: true, name: true, location: true },
      },
      season: {
        select: { id: true, name: true },
      },
      worker: {
        select: { id: true, name: true, email: true },
      },
      createdAt: true,
    },
    orderBy: { date: "desc" },
  });
}

export const getProcessesWithDetails = cache(
  _getProcessesWithDetails,
  ["processes-with-details"],
  {
    revalidate: 120, // 2 minutes - heavier query
    tags: ["processes"],
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Processes by field
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _getProcessesByField(fieldId: string) {
  console.log(`[DB] Fetching processes for field ${fieldId}`);

  return await prisma.process.findMany({
    where: { fieldId },
    select: {
      id: true,
      type: true,
      status: true,
      date: true,
      workerId: true,
      processedArea: true,
      processedPercentage: true,
      field: {
        select: { id: true, name: true },
      },
      worker: {
        select: { id: true, name: true },
      },
      createdAt: true,
    },
    orderBy: { date: "desc" },
  });
}

export const getProcessesByField = cache(
  (fieldId: string) => _getProcessesByField(fieldId),
  ["processes-by-field"],
  {
    revalidate: 60,
    tags: ["processes"],
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Processes by worker
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _getProcessesByWorker(workerId: string) {
  console.log(`[DB] Fetching processes for worker ${workerId}`);

  return await prisma.process.findMany({
    where: { workerId },
    select: {
      id: true,
      type: true,
      status: true,
      date: true,
      fieldId: true,
      seasonId: true,
      processedArea: true,
      processedPercentage: true,
      field: {
        select: { id: true, name: true },
      },
      worker: {
        select: { id: true, name: true },
      },
      createdAt: true,
    },
    orderBy: { date: "desc" },
  });
}

export const getProcessesByWorker = cache(
  (workerId: string) => _getProcessesByWorker(workerId),
  ["processes-by-worker"],
  {
    revalidate: 60,
    tags: ["processes"],
  }
);
