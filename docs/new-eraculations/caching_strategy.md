# Caching Strategy & Implementation

**Client-Side & Server-Side Caching for Maximum Performance**

---

## Caching Architecture Overview

### Two-Layer Caching

```
Request
  ↓
Layer 1: Browser Cache (React Query)
  ├─ Is data in memory? → Return (0ms) ✅
  └─ No → Continue
    ↓
  Layer 2: Server Cache (Prisma unstable_cache)
    ├─ Is data cached? → Return (50-100ms) ✅
    └─ No → Continue
      ↓
    Layer 3: Database
      └─ Query → Return (2000-3000ms)
```

### Performance Impact

```
Before caching:  Every request → DB → 2000-3000ms ⏳
After caching:
  - First request: DB → 2000ms ⏳
  - Subsequent (within 5min): Cache → 50ms ✅ (40x faster!)
```

---

## Layer 1: Client-Side Caching (React Query)

### Configuration

**File:** `app/providers.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // staleTime: How long data is considered "fresh"
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // During staleTime, React Query doesn't refetch
          // even if component remounts
          staleTime: 1000 * 60 * 5, // 5 minutes

          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // gcTime: How long to keep cached data
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // After gcTime, unused data is garbage collected
          // Useful if component is unmounted then remounted
          gcTime: 1000 * 60 * 30, // 30 minutes

          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // refetchOnWindowFocus: Refetch when tab is focused
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // Set to false to avoid redundant requests
          // when user switches browser tabs
          refetchOnWindowFocus: false,

          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // refetchOnMount: Refetch when component mounts
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // true = refetch if stale (good for fresh data)
          // false = use cached data even if stale
          refetchOnMount: true,

          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // retry: How many times to retry failed requests
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // 1 = retry once, prevents retry storms
          retry: 1,

          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // retryDelay: Exponential backoff for retries
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // First: 1s, Second: 2s, Third: 4s, etc.
          retryDelay: attemptIndex =>
            Math.min(1000 * 2 ** attemptIndex, 30000),
        },
        mutations: {
          // Similar for mutations (POST, PUT, DELETE)
          retry: 1,
          retryDelay: attemptIndex =>
            Math.min(1000 * 2 ** attemptIndex, 30000),
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Usage in Components

```typescript
// Example: Fields page
import { useQuery } from '@tanstack/react-query';

function FieldsPage() {
  const { data: fields, isLoading, error } = useQuery({
    queryKey: ['fields'],
    queryFn: async () => {
      const response = await fetch('/api/fields');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // Overrides default for this query
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {fields.map(field => (
        <div key={field.id}>{field.name}</div>
      ))}
    </div>
  );
}
```

### Timeline Example

```
Time 0:00
  User visits /fields page
  → useQuery fetches data
  → GET /api/fields (first time) → 3000ms
  → Data cached in React Query
  → Data marked as "fresh" until 5:00

Time 0:30
  User navigates to /dashboard
  → Fields component unmounts (keeps in cache)

Time 1:00
  User navigates back to /fields
  → Fields component remounts
  → Data still "fresh" (within 5 min)
  → useQuery returns cached data instantly ✅
  → No API call made!

Time 5:01
  Time exceeds 5 min (staleTime)
  → Data marked as "stale"

Time 5:02
  User navigates to /fields again
  → useQuery sees stale data
  → Refetches in background
  → Shows old data while fetching (good UX)

Time 5:05
  New data arrives
  → Cache updated
  → Component re-renders with fresh data
```

---

## Layer 2: Server-Side Caching (Next.js)

### Concept

**Server caching** = Save query results on server so multiple requests get the same response without hitting DB.

**Use case:**
- Multiple users viewing same fields page
- Same query executed multiple times

**Timeline:**
```
User 1: GET /api/fields → DB → 3000ms → Cached
User 2: GET /api/fields → Cache → 50ms ✅ (60x faster!)
User 3: GET /api/fields → Cache → 50ms ✅
User 4: POST /api/fields (create) → DB → Cache invalidated
User 5: GET /api/fields → DB → 3000ms → Cached again
```

### Implementation: `unstable_cache`

**File:** `lib/data/fields.ts` (create new file)

```typescript
import { unstable_cache as cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERNAL: Always calls database
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _getAllFields() {
  console.log('[DB] Fetching all fields');

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
    orderBy: { createdAt: 'desc' },
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
  ['all-fields'],

  // ┌─ Revalidation options
  {
    // ├─ revalidate: seconds until cache expires
    // │  120 seconds = 2 minutes
    // │  Cache stays valid for 2 minutes
    revalidate: 120,

    // └─ tags: for manual cache invalidation
    //    When data is created/updated, invalidate this tag
    tags: ['fields'],
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
  ['field-by-id'],
  {
    revalidate: 60, // 1 minute (more volatile than list)
    // Dynamic tag based on ID
    tags: (id: string) => ['fields', `field-${id}`],
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Fields with ownerships (heavier query, longer cache)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _getFieldsWithOwnerships() {
  console.log('[DB] Fetching fields with ownerships');

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
  const fieldIds = fields.map(f => f.id);
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
  return fields.map(field => ({
    ...field,
    owners: ownershipsMap.get(field.id) || [],
  }));
}

export const getFieldsWithOwnerships = cache(
  _getFieldsWithOwnerships,
  ['fields-with-ownerships'],
  {
    // Longer cache (5 min) since it's heavier query
    revalidate: 300,
    tags: ['fields', 'field-ownerships'],
  }
);
```

### Usage in API Routes

**File:** `app/api/fields/route.ts`

```typescript
import {
  getAllFields,
  getFieldsWithOwnerships,
} from '@/lib/data/fields';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  if (!userId || !userRole) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const searchParams = new URL(request.url).searchParams;
  const includeOwnerships = searchParams.get('includeOwnerships');

  try {
    // Use cached getter instead of prisma directly
    let fields;

    if (includeOwnerships === 'true') {
      // Cached heavier query
      fields = await getFieldsWithOwnerships();
    } else {
      // Cached lighter query
      fields = await getAllFields();
    }

    // Rest of logic...
    return NextResponse.json({ data: fields });
  } catch (error) {
    console.error('Error fetching fields:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Cache Invalidation

**File:** Same route, mutation handlers

```typescript
import { revalidateTag } from 'next/cache';

// POST: Create field
export async function POST(request: NextRequest) {
  // ... validation & creation logic

  const newField = await prisma.field.create({
    data: {
      name: body.name,
      location: body.location,
      // ...
    },
  });

  // Invalidate cache tags
  // Next.js finds all cached data with these tags and removes them
  revalidateTag('fields');            // Invalidates getAllFields cache
  revalidateTag('field-ownerships');  // Invalidates getFieldsWithOwnerships cache

  console.log('[Cache] Invalidated: fields, field-ownerships');

  return NextResponse.json(newField, { status: 201 });
}

// PUT: Update field
export async function PUT(request: NextRequest, { params }) {
  // ... validation & update logic

  const updated = await prisma.field.update({
    where: { id: params.id },
    data: updateData,
  });

  // Invalidate both general and specific caches
  revalidateTag('fields');               // Invalidates list cache
  revalidateTag(`field-${params.id}`);   // Invalidates single field cache
  revalidateTag('field-ownerships');     // Invalidates list with ownerships

  console.log(`[Cache] Invalidated: fields, field-${params.id}, field-ownerships`);

  return NextResponse.json(updated);
}

// DELETE: Delete field
export async function DELETE(request: NextRequest, { params }) {
  // ... authorization & deletion logic

  await prisma.field.delete({
    where: { id: params.id },
  });

  // Same invalidation as PUT
  revalidateTag('fields');
  revalidateTag(`field-${params.id}`);
  revalidateTag('field-ownerships');

  return NextResponse.json({ success: true });
}
```

---

## Cache Key Naming Convention

### Rules

1. **Descriptive, not technical**
   ```typescript
   ✅ ['all-fields']              // Good
   ❌ ['get-fields']              // Bad: implies function name
   ❌ ['f']                       // Bad: unclear

   ✅ ['field-by-id']             // Good
   ❌ ['get-field-id']            // Bad: verbose

   ✅ ['inventory-by-category']  // Good
   ❌ ['inv-cat']                 // Bad: unclear
   ```

2. **Consistent across project**
   ```typescript
   // All list caches use 'all-'
   ['all-fields']
   ['all-inventory']
   ['all-processes']

   // All by-id caches use 'by-id'
   ['field-by-id']
   ['inventory-by-id']
   ['process-by-id']
   ```

3. **Tags for groups**
   ```typescript
   // Top-level concepts
   tags: ['fields']              // Anything field-related
   tags: ['inventory']           // Anything inventory-related
   tags: ['field-ownerships']    // Specific relationship
   tags: (id) => ['fields', `field-${id}`] // Both general & specific
   ```

### Examples

```typescript
// ✅ GOOD Convention
export const getFieldsByOwner = cache(
  (ownerId: string) => _getFieldsByOwner(ownerId),
  ['fields-by-owner'],
  {
    revalidate: 120,
    tags: (ownerId: string) => ['fields', `fields-owner-${ownerId}`],
  }
);

// ✅ GOOD Convention
export const getInventoryByCategory = cache(
  (category: string) => _getInventoryByCategory(category),
  ['inventory-by-category'],
  {
    revalidate: 180,
    tags: (category: string) => [
      'inventory',
      `inventory-category-${category}`,
    ],
  }
);

// ❌ BAD Convention
export const getFlds = cache(
  _getFlds,
  ['f'],  // Unclear!
  { revalidate: 120, tags: ['f'] }
);
```

---

## Caching Strategy by Data Type

### High-Value Cache (Long TTL)

**Data:** Reference data, master records
**Examples:** Fields, Seasons, Equipment
**TTL:** 5-10 minutes
**Invalidation:** Only on create/update/delete

```typescript
export const getAllSeasons = cache(
  _getAllSeasons,
  ['all-seasons'],
  {
    revalidate: 600, // 10 minutes
    tags: ['seasons'],
  }
);
```

### Medium-Value Cache (Medium TTL)

**Data:** Lists, summaries
**Examples:** Inventory, Processes
**TTL:** 2-3 minutes
**Invalidation:** Frequent changes

```typescript
export const getActiveInventory = cache(
  _getActiveInventory,
  ['inventory-active'],
  {
    revalidate: 180, // 3 minutes
    tags: ['inventory'],
  }
);
```

### Low-Value Cache (Short TTL)

**Data:** Real-time, frequently changing
**Examples:** Irrigation logs, Transactions
**TTL:** 30-60 seconds
**Invalidation:** Very frequent

```typescript
export const getRecentIrrigation = cache(
  _getRecentIrrigation,
  ['irrigation-recent'],
  {
    revalidate: 60, // 1 minute
    tags: ['irrigation'],
  }
);
```

---

## Combined Caching Example

### Scenario: User Views Fields Page

```typescript
// Step 1: Browser (React Query)
useQuery({
  queryKey: ['fields'],
  queryFn: async () => {
    const response = await fetch('/api/fields');
    return response.json();
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

```typescript
// Step 2: Server (API Route)
export async function GET(request: NextRequest) {
  // Use cached data getter
  const fields = await getAllFields(); // From cache layer
}
```

```typescript
// Step 3: Database (Prisma)
async function _getAllFields() {
  return await prisma.field.findMany({...}); // Only if not cached
}
```

### Timeline

```
Time 0:00
  User 1 visits /fields page
  ├─ React Query: miss (empty)
  ├─ GET /api/fields
  │ ├─ Server cache: miss
  │ └─ Database query: 3000ms
  │    └─ Server cache stores result (5 min)
  └─ Component renders (3s later)

Time 0:05
  User 1 navigates to /dashboard
  ├─ React Query: Keeps field data in memory (fresh for 5 min)
  └─ GET /api/fields call skipped!

Time 0:15
  User 1 navigates back to /fields
  ├─ React Query: hit! Data still fresh
  ├─ Component renders immediately
  └─ No API call made!

Time 0:30
  User 2 visits /fields page
  ├─ React Query: miss (first time)
  ├─ GET /api/fields
  │ ├─ Server cache: HIT (50ms)
  │ └─ Component renders instantly!
  └─ User 2 benefits from User 1's query!

Time 5:00
  React Query staleTime expires for User 1
  ├─ Data marked as "stale"
  └─ Will refetch on next navigation

Time 5:01
  Server cache expires for all users
  └─ Next request will query database again

Time 5:02
  User 3 visits /fields page
  ├─ GET /api/fields
  │ ├─ Server cache: miss (expired)
  │ └─ Database query: 3000ms (new cache started)
  └─ User 3 waits 3 seconds (new data)

Time 5:30
  User creates new field (POST /api/fields)
  ├─ Field created in DB
  └─ revalidateTag('fields') called
      └─ All cached 'fields' data removed!

Time 5:31
  User 4 visits /fields page
  ├─ GET /api/fields
  │ ├─ Server cache: miss (invalidated)
  │ └─ Database query: 3000ms (sees new field!)
  └─ New cache started
```

---

## Performance Metrics

### Before Caching

```
100 users, each visits fields page once
100 requests × 3000ms = 300 seconds (5 minutes!) ⏳
Server load: 100 DB queries
```

### After Caching (React Query Only)

```
Same scenario, user returns to page within 5 min
- First user: 3000ms
- Remaining: 0ms (cached in browser)
20 seconds total ✅
Server load: Still 100 DB queries
```

### After Caching (Both Layers)

```
Same scenario with server caching
- User 1: 3000ms (cold cache)
- Users 2-100: 50ms each (server cache) ✅
5 + 4.95 = ~10 seconds total 🚀
Server load: 1 DB query (shared by all!)
```

---

## Implementation Checklist

### Phase 1: React Query Setup
- [ ] Update `app/providers.tsx` with config
- [ ] Verify DevTools shows cache state
- [ ] Test navigation caching

### Phase 2: Create Data Layer
- [ ] Create `lib/data/` directory
- [ ] Create `lib/data/fields.ts`
- [ ] Create `lib/data/inventory.ts`
- [ ] Create `lib/data/processes.ts`

### Phase 3: Implement Cached Queries
- [ ] Write cached getters
- [ ] Test cache hits (dev logs)
- [ ] Test cache misses

### Phase 4: Add Invalidation
- [ ] Add `revalidateTag` to mutations
- [ ] Test cache invalidation
- [ ] Verify no stale data served

### Phase 5: Monitoring
- [ ] Add cache hit/miss logging
- [ ] Monitor cache effectiveness
- [ ] Adjust TTLs based on metrics

---

## Troubleshooting

### Issue: Cache not hitting
**Check:**
1. Is cache function being called?
2. Are parameters identical between calls?
3. Did you restart dev server?

**Fix:**
```typescript
// Add logging
async function _getAllFields() {
  console.log('[DB] Fields queried at', new Date().toISOString());
  // ...
}
// If log appears on every request, cache isn't working
```

### Issue: Stale data served
**Check:**
1. Is `revalidateTag` being called?
2. Are tag names correct?
3. Is TTL too long?

**Fix:**
```typescript
// Add logging in mutations
revalidateTag('fields');
console.log('[Cache] Invalidated: fields');
```

### Issue: Memory usage high
**Check:**
1. Are cached queries too large?
2. Is gcTime too long?
3. Are stale caches accumulating?

**Fix:**
```typescript
// Reduce gcTime
gcTime: 1000 * 60 * 10, // 10 min instead of 30
```

---

## Deployment Notes

### Development
- DevTools show cache state
- Logs show cache hits/misses
- Fast development feedback

### Production
- Caching still works same way
- Monitor cache effectiveness
- Adjust TTLs based on usage patterns
- Consider external cache (Redis) later

### Monitoring

Add metrics tracking:
```typescript
const cacheMetrics = {
  hits: 0,
  misses: 0,
  invalidations: 0,
};

// Track in logs
const cachedGetAllFields = cache(
  async () => {
    cacheMetrics.misses++;
    console.log('[Metrics] Cache miss - All fields');
    return await _getAllFields();
  },
  ['all-fields'],
  { revalidate: 120, tags: ['fields'] }
);
```

---

## Next Steps

1. ✅ Implement React Query configuration
2. ✅ Create `lib/data/` directory & files
3. ✅ Implement cached queries
4. ✅ Add cache invalidation
5. ✅ Test thoroughly
6. ✅ Monitor metrics
7. ✅ Adjust based on results

**Start with React Query config today! 🚀**
