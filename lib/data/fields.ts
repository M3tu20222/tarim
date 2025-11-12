import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERNAL: Always calls database
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _getAllFields() {
  console.log("[DB] Fetching all fields");

  return await prisma.field.findMany({
    select: {
      id: true,
      name: true,
      location: true,
      size: true,
      status: true,
      seasonId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORTED: Cached version
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// This function is wrapped with caching
// First call hits DB, subsequent calls hit cache
export const getAllFields = cache(
  _getAllFields,
  // ┌─ Cache key: unique identifier for this data
  // │  Used to distinguish from other cached data
  ["all-fields"],

  // ┌─ Revalidation options
  {
    // ├─ revalidate: seconds until cache expires
    // │  120 seconds = 2 minutes
    // │  Cache stays valid for 2 minutes
    revalidate: 120,

    // └─ tags: for manual cache invalidation
    //    When data is created/updated, invalidate this tag
    tags: ["fields"],
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Single field lookup (shorter cache, specific tag)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _getFieldById(id: string) {
  console.log(`[DB] Fetching field ${id}`);

  return await prisma.field.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      location: true,
      size: true,
      status: true,
      seasonId: true,
      season: {
        select: { id: true, name: true },
      },
    },
  });
}

export const getFieldById = cache(
  (id: string) => _getFieldById(id),
  ["field-by-id"],
  {
    revalidate: 60, // 1 minute (more volatile than list)
    tags: ["fields"],
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Fields with ownerships (heavier query, longer cache)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _getFieldsWithOwnerships() {
  console.log("[DB] Fetching fields with ownerships");

  // Base fields
  const fields = await prisma.field.findMany({
    select: {
      id: true,
      name: true,
      location: true,
      size: true,
      status: true,
    },
  });

  // Batch fetch ownerships (faster than JOIN)
  const fieldIds = fields.map((f) => f.id);
  const ownerships = await prisma.fieldOwnership.findMany({
    where: { fieldId: { in: fieldIds } },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Map in memory
  const ownershipsMap = new Map<string, any[]>();
  for (const ownership of ownerships) {
    if (!ownershipsMap.has(ownership.fieldId)) {
      ownershipsMap.set(ownership.fieldId, []);
    }
    ownershipsMap.get(ownership.fieldId)!.push(ownership);
  }

  // Attach to fields
  return fields.map((field) => ({
    ...field,
    owners: ownershipsMap.get(field.id) || [],
  }));
}

export const getFieldsWithOwnerships = cache(
  _getFieldsWithOwnerships,
  ["fields-with-ownerships"],
  {
    // Longer cache (5 min) since it's heavier query
    revalidate: 300,
    tags: ["fields", "field-ownerships"],
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Fields by owner (for filtering)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _getFieldsByOwner(ownerId: string) {
  console.log(`[DB] Fetching fields for owner ${ownerId}`);

  return await prisma.field.findMany({
    where: {
      owners: {
        some: {
          userId: ownerId,
        },
      },
    },
    select: {
      id: true,
      name: true,
      location: true,
      size: true,
      status: true,
      seasonId: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export const getFieldsByOwner = cache(
  (ownerId: string) => _getFieldsByOwner(ownerId),
  ["fields-by-owner"],
  {
    revalidate: 120,
    tags: ["fields"],
  }
);
