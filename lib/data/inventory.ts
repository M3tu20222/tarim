import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { InventoryCategory } from "@prisma/client";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERNAL: Always calls database
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _getAllInventory() {
  console.log("[DB] Fetching all inventory");

  return await prisma.inventory.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      status: true,
      totalQuantity: true,
      unit: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORTED: Cached version
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getAllInventory = cache(
  _getAllInventory,
  ["all-inventory"],
  {
    revalidate: 180, // 3 minutes - inventory changes more frequently
    tags: ["inventory"],
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Inventory by category
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _getInventoryByCategory(category: InventoryCategory) {
  console.log(`[DB] Fetching inventory by category: ${category}`);

  return await prisma.inventory.findMany({
    where: { category },
    select: {
      id: true,
      name: true,
      category: true,
      status: true,
      totalQuantity: true,
      unit: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export const getInventoryByCategory = cache(
  (category: InventoryCategory) => _getInventoryByCategory(category),
  ["inventory-by-category"],
  {
    revalidate: 180,
    tags: ["inventory"],
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Active inventory only
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _getActiveInventory() {
  console.log("[DB] Fetching active inventory");

  return await prisma.inventory.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      category: true,
      totalQuantity: true,
      unit: true,
      status: true,
    },
    orderBy: { name: "asc" },
  });
}

export const getActiveInventory = cache(
  _getActiveInventory,
  ["inventory-active"],
  {
    revalidate: 180,
    tags: ["inventory"],
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Inventory with ownerships (heavier query)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _getInventoryWithOwnerships() {
  console.log("[DB] Fetching inventory with ownerships");

  // Get all inventory
  const inventory = await prisma.inventory.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      status: true,
      totalQuantity: true,
      unit: true,
    },
  });

  // Batch fetch ownerships
  const inventoryIds = inventory.map((i) => i.id);
  const ownerships = await prisma.inventoryOwnership.findMany({
    where: { inventoryId: { in: inventoryIds } },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Map in memory
  const ownershipsMap = new Map<string, any[]>();
  for (const ownership of ownerships) {
    if (!ownershipsMap.has(ownership.inventoryId)) {
      ownershipsMap.set(ownership.inventoryId, []);
    }
    ownershipsMap.get(ownership.inventoryId)!.push(ownership);
  }

  // Attach to inventory
  return inventory.map((item) => ({
    ...item,
    ownerships: ownershipsMap.get(item.id) || [],
  }));
}

export const getInventoryWithOwnerships = cache(
  _getInventoryWithOwnerships,
  ["inventory-with-ownerships"],
  {
    revalidate: 300, // 5 minutes - heavier query
    tags: ["inventory", "inventory-ownerships"],
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Inventory by owner
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _getInventoryByOwner(ownerId: string) {
  console.log(`[DB] Fetching inventory for owner ${ownerId}`);

  return await prisma.inventory.findMany({
    where: {
      ownerships: {
        some: {
          userId: ownerId,
        },
      },
    },
    select: {
      id: true,
      name: true,
      category: true,
      status: true,
      totalQuantity: true,
      unit: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export const getInventoryByOwner = cache(
  (ownerId: string) => _getInventoryByOwner(ownerId),
  ["inventory-by-owner"],
  {
    revalidate: 180,
    tags: ["inventory"],
  }
);
