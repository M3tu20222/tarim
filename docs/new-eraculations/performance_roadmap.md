# Performance Optimization Roadmap

**Proje:** Tarım Yönetim Sistemi Performance Optimization
**Versiyon:** 1.0
**Tarih:** 2025-01-09
**Toplam Süre:** 11-14 saat
**Beklenen Kazanım:** 2-3x overall speedup

---

## 📊 Current State Benchmark

### Critical Performance Issues

| Endpoint | Current | Target | Priority |
|----------|---------|--------|----------|
| GET /api/fields | 4303ms | <1000ms | 🔴 HIGH |
| GET /api/inventory | 3990ms | <1000ms | 🔴 HIGH |
| GET /api/processes | 3007ms | <800ms | 🟡 MEDIUM |
| PUT /api/processes | 7349ms | <2000ms | 🟡 MEDIUM |
| POST /api/processes/finalize | 4516ms | <1500ms | 🟡 MEDIUM |

### Root Causes

1. **Double Authentication** (~150ms waste per API call)
   - JWT verified twice (middleware + API route)
   - Additional DB query in `getServerSideSession()`

2. **No Client-Side Caching** (every navigation = fresh API call)
   - React Query not configured
   - All pages fetch fresh data

3. **No Server-Side Caching** (same queries run repeatedly)
   - Prisma `unstable_cache` not implemented
   - No query result caching

4. **Unoptimized Database Queries** (70-80% of response time)
   - Sequential operations (count + findMany)
   - N+1 query patterns
   - Heavy JOINs

---

## 🎯 Implementation Phases

### Phase 1: Quick Wins ⚡
**Duration:** 4-5 hours | **Impact:** ~70% improvement | **Risk:** Low

#### Task 1.1: React Query Configuration (30 min)
**File:** `app/providers.tsx`
**Impact:** 80-90% fewer redundant API calls

```typescript
// BEFORE
const [queryClient] = useState(() => new QueryClient());

// AFTER
const [queryClient] = useState(() => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 minutes
      gcTime: 1000 * 60 * 30,          // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      retry: 1,
    },
  },
}));
```

**Expected:** Fields page 4303ms → 0ms (on repeat visits within 5min)

**Testing:**
- [ ] Navigate to fields page, note load time
- [ ] Navigate away, return within 5min
- [ ] Verify instant load (cached)

---

#### Task 1.2: Optimize GET /api/fields Query (2-3 hours)
**File:** `app/api/fields/route.ts`
**Impact:** 4303ms → ~800-1200ms (70% faster)

**Changes:**

**A. Parallel Queries** (lines 90-95)
```typescript
// BEFORE
const totalCount = await prisma.field.count({ where });
const fields = await prisma.field.findMany({...});

// AFTER
const [totalCount, fields] = await Promise.all([
  prisma.field.count({ where }),
  prisma.field.findMany({...}),
]);
```
**Savings:** ~500ms

**B. Conditional Ownership Loading** (lines 104-146)
```typescript
// BEFORE: Always includes ownerships
// AFTER: Separate query only if needed

if (includeOwnerships) {
  const fieldIds = fields.map(f => f.id);
  const ownerships = await prisma.fieldOwnership.findMany({
    where: { fieldId: { in: fieldIds } },
    include: { user: { select: { id: true, name: true } } },
  });

  const ownershipsMap = new Map();
  ownerships.forEach(o => {
    if (!ownershipsMap.has(o.fieldId)) {
      ownershipsMap.set(o.fieldId, []);
    }
    ownershipsMap.get(o.fieldId).push(o);
  });

  fieldsWithOwnerships = fields.map(f => ({
    ...f,
    owners: ownershipsMap.get(f.id) || [],
  }));
}
```

**Expected Result:**
- Without ownerships: ~500-700ms ✅
- With ownerships: ~800-1200ms ✅

**Testing:**
- [ ] GET /api/fields → <700ms
- [ ] GET /api/fields?includeOwnerships=true → <1200ms
- [ ] Verify all fields returned
- [ ] Verify ownerships attached

---

#### Task 1.3: Add Database Indexes (1 hour)
**File:** `prisma/schema.prisma`
**Impact:** 15-20% query speedup

```prisma
model Field {
  @@index([status])
  @@index([seasonId])
  @@index([createdAt])
}

model Process {
  @@index([status])
  @@index([seasonId])
  @@index([fieldId])
  @@index([workerId])
  @@index([date])
}

model Inventory {
  @@index([category])
  @@index([status])
}
```

**Migration:**
```bash
npx prisma generate
npx prisma db push
```

**Testing:**
- [ ] Migration successful
- [ ] All list endpoints responsive
- [ ] No regressions

---

### Phase 2: Authentication Refactor 🔐
**Duration:** 3 hours | **Impact:** 100-150ms per call | **Risk:** Medium

#### Task 2.1: Enhance Middleware (1 hour)
**File:** `middleware.ts`

```typescript
// AFTER middleware enhancement
const decoded = await verifyToken(token);

// NEW: Fetch user here (single DB call per request)
const user = await prisma.user.findUnique({
  where: { id: decoded.id },
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    status: true,
  },
});

if (!user || user.status !== 'ACTIVE') {
  return NextResponse.json(
    { error: "Kimlik doğrulama gerekli" },
    { status: 401 }
  );
}

const requestHeaders = new Headers(request.headers);
requestHeaders.set("x-user-id", user.id);
requestHeaders.set("x-user-role", user.role);
requestHeaders.set("x-user-name", user.name);
requestHeaders.set("x-user-email", user.email);

return NextResponse.next({ request: { headers: requestHeaders } });
```

**Testing:**
- [ ] Login, verify headers set
- [ ] Check inactive users rejected
- [ ] Test invalid tokens

---

#### Task 2.2: Refactor 14 API Routes (2 hours)

**Routes to Update:**
`fields`, `inventory`, `purchases`, `debts`, `equipment`, `seasons`, `wells`, `users`, `notifications`, `dashboard/stats`, `weather`, `irrigation/summary`, `field-expenses`, `inventory-transactions`

**Pattern:**
```typescript
// BEFORE
const session = await getServerSideSession();
if (!session || !session.id) {
  return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
}
const userId = session.id;
const userRole = session.role;

// AFTER
const userId = request.headers.get("x-user-id");
const userRole = request.headers.get("x-user-role");

if (!userId || !userRole) {
  return NextResponse.json(
    { error: "Kullanıcı ID'si veya rolü eksik" },
    { status: 401 }
  );
}
```

**Testing per route:**
- [ ] Endpoint works after refactor
- [ ] Auth still enforced
- [ ] Role-based filtering works

**Savings:** ~35 seconds per day (14 routes × 150ms × 10 calls/day)

---

### Phase 3: Caching Layer 💾
**Duration:** 4-6 hours | **Impact:** 50-80% on repeated queries | **Risk:** Medium

#### Task 3.1: Create Data Access Layer (1 hour)
**Create:** `lib/data/` directory with cached query functions

**Files to Create:**
- `lib/data/fields.ts`
- `lib/data/inventory.ts`
- `lib/data/processes.ts`
- `lib/data/users.ts`

---

#### Task 3.2: Implement Cached Field Queries (1-2 hours)
**File:** `lib/data/fields.ts`

```typescript
import { unstable_cache as cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

async function _getAllFields() {
  return await prisma.field.findMany({
    select: {
      id: true,
      name: true,
      location: true,
      size: true,
      status: true,
      seasonId: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export const getAllFields = cache(
  _getAllFields,
  ['all-fields'],
  {
    revalidate: 120, // 2 minutes
    tags: ['fields'],
  }
);

async function _getFieldsWithOwnerships() {
  // ... fetch fields + ownerships
}

export const getFieldsWithOwnerships = cache(
  _getFieldsWithOwnerships,
  ['fields-with-ownerships'],
  {
    revalidate: 300,
    tags: ['fields', 'field-ownerships'],
  }
);
```

**Usage:**
```typescript
// In API route
import { getAllFields } from '@/lib/data/fields';

const fields = await getAllFields();
```

**Expected:**
- First call: ~1000ms
- Cached calls: ~50-100ms

---

#### Task 3.3: Add Cache Invalidation (1 hour)

**In mutation endpoints (CREATE/UPDATE/DELETE):**
```typescript
import { revalidateTag } from 'next/cache';

// Example: POST /api/fields
const newField = await prisma.field.create({ data });
revalidateTag('fields');
return NextResponse.json(newField);

// Example: PUT /api/fields/[id]
const updated = await prisma.field.update({...});
revalidateTag('fields');
revalidateTag(`field-${params.id}`);
return NextResponse.json(updated);
```

**Testing:**
- [ ] Create field, cache invalidated
- [ ] Update field, cache refreshed
- [ ] Delete field, cache updated

---

#### Task 3.4: Implement Inventory & Process Caching (2-3 hours)

**Files:** `lib/data/inventory.ts`, `lib/data/processes.ts`

**Similar pattern to fields:**
- Cache frequently accessed queries
- Shorter TTL for frequently changing data
- Set appropriate tags for invalidation

---

## 📈 Expected Results

| Metric | Before | After |
|--------|--------|-------|
| GET /api/fields (first) | 4303ms | ~1000ms |
| GET /api/fields (cached) | 4303ms | ~50ms |
| GET /api/inventory | 3990ms | ~1000ms |
| GET /api/processes | 3007ms | ~800ms |
| API calls/day | 1000 | ~200 |
| Overall speedup | - | **2-3x** |

---

## ⏱️ Time Estimates

| Phase | Tasks | Time | Impact |
|-------|-------|------|--------|
| 1 | React Query + /api/fields + Indexes | 4-5h | 70% ⬆️ |
| 2 | Middleware + Auth refactor | 3h | 15% ⬆️ |
| 3 | Caching layer | 4-6h | 60% ⬆️ |
| **TOTAL** | | **11-14h** | **2-3x 🚀** |

---

## 🧪 Testing Checklist

### Phase 1
- [ ] React Query caching works (DevTools)
- [ ] GET /api/fields < 1200ms
- [ ] Database indexes created
- [ ] No regressions

### Phase 2
- [ ] All 14 routes use headers
- [ ] No double auth
- [ ] Auth still enforced
- [ ] Role filtering works

### Phase 3
- [ ] Cache hits logged
- [ ] Cached data <100ms
- [ ] Invalidation works
- [ ] No stale data

---

## 🚨 Rollback Plan

**Phase 1:**
- Revert `providers.tsx`
- Restore original query in `route.ts`
- Keep indexes (harmless)

**Phase 2:**
- Revert middleware changes
- Restore `getServerSideSession()` calls

**Phase 3:**
- Remove `lib/data/` imports
- Restore direct Prisma calls

---

## 📝 Next Steps

1. ✅ Review this roadmap
2. ✅ Begin Phase 1 implementation
3. ✅ Test after each task
4. ✅ Monitor metrics
5. ✅ Proceed to Phase 2 & 3

**Let's start with Phase 1, Task 1.1! 🚀**
