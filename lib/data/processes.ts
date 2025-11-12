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
      name: true,
      type: true,
      status: true,
      date: true,
      fieldId: true,
      seasonId: true,
      workerId: true,
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
      name: true,
      type: true,
      status: true,
      date: true,
      fieldId: true,
      workerId: true,
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
    tags: (seasonId: string) => ["processes", `processes-season-${seasonId}`],
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
      name: true,
      type: true,
      status: true,
      date: true,
      fieldId: true,
      seasonId: true,
      workerId: true,
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
      name: true,
      type: true,
      status: true,
      date: true,
      fieldId: true,
      seasonId: true,
      workerId: true,
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
      name: true,
      type: true,
      status: true,
      date: true,
      workerId: true,
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
    tags: (fieldId: string) => ["processes", `processes-field-${fieldId}`],
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
      name: true,
      type: true,
      status: true,
      date: true,
      fieldId: true,
      seasonId: true,
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
    tags: (workerId: string) => ["processes", `processes-worker-${workerId}`],
  }
);
