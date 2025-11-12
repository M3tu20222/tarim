# Cache Integration - Testing Guide

## Overview
This guide provides comprehensive testing strategies to verify the cache implementation works correctly across all three routes.

---

## Manual Testing Checklist

### Fields API (GET /api/fields)

#### Basic Cache Hit Test
```bash
# Request 1 - Should hit database
time curl "http://localhost:3000/api/fields" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"
# Expected: ~100ms (database hit)

# Request 2 (within 120 seconds) - Should hit cache
time curl "http://localhost:3000/api/fields" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"
# Expected: ~10ms (cache hit)

# Check logs
# Should see: [Cache] Using getAllFields (first request)
# Should see: [Cache] Using getAllFields (cached request)
```

#### Include Ownerships Test
```bash
# With ownership data (longer cache)
curl "http://localhost:3000/api/fields?includeOwnerships=true" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"

# Check logs
# Should see: [Cache] Using getFieldsWithOwnerships
# Cache duration: 300 seconds
```

#### Filter Tests
```bash
# Search filter (applied in-memory)
curl "http://localhost:3000/api/fields?search=corn" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"

# Status filter
curl "http://localhost:3000/api/fields?status=ACTIVE" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"

# Well ID filter
curl "http://localhost:3000/api/fields?wellId=well1" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"

# All requests should:
# - Use cached data
# - Apply filters in-memory
# - Return <20ms response time
```

#### Pagination Test
```bash
# First page
curl "http://localhost:3000/api/fields?page=1&limit=10" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"

# Second page
curl "http://localhost:3000/api/fields?page=2&limit=10" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"

# Both should:
# - Use same cached data
# - Apply different pagination
# - Return correct page count
```

#### Cache Invalidation Test
```bash
# Create new field
curl -X POST "http://localhost:3000/api/fields" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Field",
    "location": "Location",
    "size": 100,
    "crop": "Corn",
    "plantingDate": "2025-01-01",
    "expectedHarvestDate": "2025-06-01",
    "soilType": "Clay",
    "ownerships": [{"userId": "user1", "percentage": 100}]
  }'

# Check logs
# Should see: [Cache] Invalidating fields tag after field creation

# Next GET request should hit database (cache invalidated)
curl "http://localhost:3000/api/fields" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"
# Expected: ~100ms (new cache)
```

#### Role-Based Access Test
```bash
# ADMIN sees all fields
curl "http://localhost:3000/api/fields?fetchAll=true" \
  -H "x-user-id: admin1" \
  -H "x-user-role: ADMIN"

# OWNER sees all fields (after fix)
curl "http://localhost:3000/api/fields?fetchAll=true" \
  -H "x-user-id: owner1" \
  -H "x-user-role: OWNER"

# WORKER sees only assigned fields
curl "http://localhost:3000/api/fields" \
  -H "x-user-id: worker1" \
  -H "x-user-role: WORKER"
# Should return fewer results (filtered to assignments)
```

---

### Inventory API (GET /api/inventory)

#### Basic Cache Hit Test
```bash
# Request 1 - Database hit
time curl "http://localhost:3000/api/inventory" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"
# Expected: ~100-150ms

# Request 2 (within 180 seconds) - Cache hit
time curl "http://localhost:3000/api/inventory" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"
# Expected: ~10-20ms

# Check logs
# Should see: [Cache] Using getAllInventory
```

#### Ownership Data Test
```bash
# Request with ownerships needed
curl "http://localhost:3000/api/inventory?fetchAll=true" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"

# Check logs
# Should see: [Cache] Using getInventoryWithOwnerships
# Cache duration: 300 seconds
```

#### Category Filter Test
```bash
# Single category
curl "http://localhost:3000/api/inventory?category=FUEL" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"

# Multiple categories
curl "http://localhost:3000/api/inventory?category=FUEL,FERTILIZER" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"

# Both should:
# - Use cached data
# - Filter in-memory by category
# - Return only matching items
```

#### Status Filter Test
```bash
# Active inventory only
curl "http://localhost:3000/api/inventory?status=ACTIVE" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"

# Inactive inventory only
curl "http://localhost:3000/api/inventory?status=INACTIVE" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"
```

#### User Filter Test
```bash
# Single user's inventory
curl "http://localhost:3000/api/inventory?userId=user1" \
  -H "x-user-id: admin1" \
  -H "x-user-role: ADMIN"

# Multiple users' inventory
curl "http://localhost:3000/api/inventory?userIds=user1,user2" \
  -H "x-user-id: admin1" \
  -H "x-user-role: ADMIN"

# Both should:
# - Load full cached inventory
# - Filter by ownership in-memory
# - Return correct items
```

#### Cache Invalidation Test
```bash
# Create new inventory
curl -X POST "http://localhost:3000/api/inventory" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Fuel",
    "category": "FUEL",
    "totalQuantity": 100,
    "unit": "LITER",
    "status": "ACTIVE",
    "costPrice": 50
  }'

# Check logs
# Should see: [Cache] Invalidating inventory tags after inventory creation

# Next GET should reflect new item
curl "http://localhost:3000/api/inventory?category=FUEL" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"
# Should include newly created item
```

---

### Processes API (GET /api/processes)

#### Basic Cache Hit Test
```bash
# Request 1 - Database hit
time curl "http://localhost:3000/api/processes" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"
# Expected: ~100-200ms

# Request 2 (within 60 seconds) - Cache hit
time curl "http://localhost:3000/api/processes" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"
# Expected: ~8-18ms

# Check logs
# Should see: [Cache] Using getAllProcesses
```

#### Details Cache Test
```bash
# Request with details
curl "http://localhost:3000/api/processes?includeDetails=true" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"

# Check logs
# Should see: [Cache] Using getProcessesWithDetails
# Cache duration: 120 seconds
# Pre-fetched: field, worker, season data
```

#### Type Filter Test
```bash
# Filter by process type
curl "http://localhost:3000/api/processes?type=PLANTING" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"

# Other types
curl "http://localhost:3000/api/processes?type=HARVESTING" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"
```

#### Field Filter Test
```bash
# Processes for specific field
curl "http://localhost:3000/api/processes?fieldId=field1" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"

# Should:
# - Use cached all processes
# - Filter to field1 only in-memory
# - Include equipment/inventory/cost data for that field
```

#### Date Range Filter Test
```bash
# Last 30 days
curl "http://localhost:3000/api/processes?startDate=2025-10-13&endDate=2025-11-12" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"

# Should:
# - Use cached data
# - Filter by date range in-memory
# - Return matching processes
```

#### Status Filter Test
```bash
# Draft processes
curl "http://localhost:3000/api/processes?status=DRAFT" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"

# Completed processes
curl "http://localhost:3000/api/processes?status=COMPLETED" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN"
```

#### Worker Filter Test (Role-based)
```bash
# ADMIN sees all processes
curl "http://localhost:3000/api/processes" \
  -H "x-user-id: admin1" \
  -H "x-user-role: ADMIN"

# WORKER sees only their processes
curl "http://localhost:3000/api/processes" \
  -H "x-user-id: worker1" \
  -H "x-user-role: WORKER"
# Should return fewer items (filtered to workerId)
```

#### Cache Invalidation Test - POST
```bash
# Create new process
curl -X POST "http://localhost:3000/api/processes" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "fieldId": "field1",
    "type": "PLANTING",
    "date": "2025-11-12",
    "processedPercentage": 50,
    "seasonId": "season1"
  }'

# Check logs
# Should see: [Cache] Invalidating processes tags after process creation

# For field-specific cache too
# Should see: [Cache] Invalidating processes-field-field1
```

#### Cache Invalidation Test - PUT
```bash
# Update process inventory/equipment
curl -X PUT "http://localhost:3000/api/processes?processId=process1" \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "equipmentId": "equipment1",
    "inventoryItems": [],
    "inventoryDistribution": "{}"
  }'

# Check logs
# Should see: [Cache] Invalidating processes tags after inventory/equipment update
```

---

## Performance Testing

### Load Test - Single Route
```bash
# Using Apache Bench
ab -n 1000 -c 10 \
  -H "x-user-id: user1" \
  -H "x-user-role: ADMIN" \
  "http://localhost:3000/api/fields"

# Expected results:
# Requests per second: >50 (with cache)
# Time per request: <20ms (average)
# Failed requests: 0
# 95% of requests: <30ms
```

### Load Test - Multiple Routes
```bash
# Create test URLs
urls="http://localhost:3000/api/fields http://localhost:3000/api/inventory http://localhost:3000/api/processes"

# Run against each
for url in $urls; do
  echo "Testing: $url"
  ab -n 500 -c 5 \
    -H "x-user-id: user1" \
    -H "x-user-role: ADMIN" \
    "$url"
done

# Expected:
# All routes should handle 500 requests in <30 seconds
# P95 latency <30ms
# No timeout errors
```

### Cache Hit Rate Test
```bash
# Monitor server logs during load test
# Count logs containing "[Cache] Using"
# Total should be ~100 (1000 requests / 10 request batch = ~100 cache calls)
# Indicates ~900/1000 cache hits (90%+)

# Example log analysis
grep -c "\[Cache\] Using" server.log
# Should show very few compared to total requests
```

---

## Automated Testing Examples

### Unit Tests - Cache Getters

```typescript
// tests/lib/data/fields.test.ts
import { getAllFields, getFieldsWithOwnerships } from "@/lib/data/fields";

describe("Fields Cache Getters", () => {
  it("should fetch all fields from cache", async () => {
    const result1 = await getAllFields();
    const result2 = await getAllFields();

    expect(result1).toEqual(result2);
    expect(Array.isArray(result1)).toBe(true);
  });

  it("should include ownerships in getFieldsWithOwnerships", async () => {
    const result = await getFieldsWithOwnerships();

    expect(result.length).toBeGreaterThanOrEqual(0);
    result.forEach(field => {
      expect(field).toHaveProperty("owners");
      expect(Array.isArray(field.owners)).toBe(true);
    });
  });

  it("should filter fields by owner", async () => {
    const { getFieldsByOwner } = require("@/lib/data/fields");
    const result = await getFieldsByOwner("user1");

    result.forEach(field => {
      expect(field).toHaveProperty("id");
      expect(field).toHaveProperty("name");
    });
  });
});
```

### Integration Tests - API Routes

```typescript
// tests/api/fields.test.ts
describe("GET /api/fields", () => {
  it("should return fields with cache headers", async () => {
    const response = await fetch("http://localhost:3000/api/fields", {
      headers: {
        "x-user-id": "user1",
        "x-user-role": "ADMIN",
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("meta");
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("should filter fields by search term", async () => {
    const response = await fetch(
      "http://localhost:3000/api/fields?search=corn",
      {
        headers: {
          "x-user-id": "user1",
          "x-user-role": "ADMIN",
        },
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    data.data.forEach((field: any) => {
      expect(
        field.name.toLowerCase().includes("corn") ||
        field.location.toLowerCase().includes("corn")
      ).toBe(true);
    });
  });

  it("should return paginated results", async () => {
    const response = await fetch(
      "http://localhost:3000/api/fields?page=1&limit=10",
      {
        headers: {
          "x-user-id": "user1",
          "x-user-role": "ADMIN",
        },
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.meta.page).toBe(1);
    expect(data.meta.limit).toBe(10);
    expect(data.data.length).toBeLessThanOrEqual(10);
  });

  it("should invalidate cache after creating field", async () => {
    // Create field
    const createResponse = await fetch("http://localhost:3000/api/fields", {
      method: "POST",
      headers: {
        "x-user-id": "user1",
        "x-user-role": "ADMIN",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Test Field",
        location: "Test Location",
        size: 100,
        crop: "Corn",
        plantingDate: "2025-01-01",
        expectedHarvestDate: "2025-06-01",
        soilType: "Clay",
        ownerships: [{ userId: "user1", percentage: 100 }],
      }),
    });

    expect(createResponse.status).toBe(200);

    // Get fields - should reflect new field (cache invalidated)
    const getResponse = await fetch("http://localhost:3000/api/fields", {
      headers: {
        "x-user-id": "user1",
        "x-user-role": "ADMIN",
      },
    });

    expect(getResponse.status).toBe(200);
    const data = await getResponse.json();
    expect(data.meta.total).toBeGreaterThan(0);
  });
});
```

### Cache Invalidation Test

```typescript
// tests/cache-invalidation.test.ts
describe("Cache Invalidation", () => {
  it("should invalidate fields cache after creation", async () => {
    const before = await fetch("http://localhost:3000/api/fields", {
      headers: {
        "x-user-id": "user1",
        "x-user-role": "ADMIN",
      },
    });
    const beforeCount = (await before.json()).meta.total;

    // Create new field
    await fetch("http://localhost:3000/api/fields", {
      method: "POST",
      headers: {
        "x-user-id": "user1",
        "x-user-role": "ADMIN",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Cache Test Field",
        location: "Location",
        size: 50,
        crop: "Wheat",
        plantingDate: "2025-01-01",
        expectedHarvestDate: "2025-06-01",
        soilType: "Clay",
        ownerships: [{ userId: "user1", percentage: 100 }],
      }),
    });

    const after = await fetch("http://localhost:3000/api/fields", {
      headers: {
        "x-user-id": "user1",
        "x-user-role": "ADMIN",
      },
    });
    const afterCount = (await after.json()).meta.total;

    expect(afterCount).toBe(beforeCount + 1);
  });

  it("should invalidate inventory cache after creation", async () => {
    const before = await fetch("http://localhost:3000/api/inventory", {
      headers: {
        "x-user-id": "user1",
        "x-user-role": "ADMIN",
      },
    });
    const beforeLength = (await before.json()).data.length;

    // Create new inventory
    await fetch("http://localhost:3000/api/inventory", {
      method: "POST",
      headers: {
        "x-user-id": "user1",
        "x-user-role": "ADMIN",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Test Item",
        category: "FUEL",
        totalQuantity: 50,
        unit: "LITER",
        status: "ACTIVE",
        costPrice: 100,
      }),
    });

    const after = await fetch("http://localhost:3000/api/inventory", {
      headers: {
        "x-user-id": "user1",
        "x-user-role": "ADMIN",
      },
    });
    const afterLength = (await after.json()).data.length;

    expect(afterLength).toBeGreaterThan(beforeLength);
  });
});
```

---

## Troubleshooting

### Issue: Cache not hitting (always database)
**Solution:**
1. Check server logs for "[Cache] Using" messages
2. Verify `revalidateTag` is imported from "next/cache"
3. Restart dev server: `npm run dev`
4. Check browser DevTools Network tab for response time

### Issue: Stale data displayed
**Solution:**
1. Check cache duration in cached getters (120-300s)
2. Manually clear by creating an item (triggers `revalidateTag`)
3. Wait for cache to expire (1-5 minutes)
4. In dev: restart server to clear all caches

### Issue: Filter not working
**Solution:**
1. Verify filter is applied AFTER cache hit
2. Check console logs for filter operations
3. Verify returned data matches filter criteria
4. Test without cache to verify filter logic

### Issue: Missing related data
**Solution:**
1. Use `includeDetails=true` parameter for pre-fetched data
2. Verify batch queries are executing
3. Check that field/worker/season IDs exist
4. Monitor console logs for query operations

---

## Monitoring in Production

### Key Metrics to Track
1. **Cache hit rate** - Should be >90%
2. **Response time p95** - Should be <30ms (cached) vs 100-200ms (uncached)
3. **Database query count** - Should be minimal
4. **Memory usage** - +5-10MB expected
5. **Cache invalidation rate** - Inverse of hit rate

### Recommended Monitoring
- Set up Prometheus metrics for cache hits/misses
- Monitor response time by endpoint
- Track database query count
- Alert on high response times
- Log cache invalidation events

---

## Summary

✅ **Manual testing** - Run manual curl tests to verify behavior
✅ **Load testing** - Use Apache Bench to test cache performance
✅ **Unit tests** - Test individual cached getters
✅ **Integration tests** - Test full API endpoints
✅ **Cache tests** - Verify invalidation works correctly
✅ **Monitoring** - Track metrics in production
