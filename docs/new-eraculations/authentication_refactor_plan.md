# Authentication Refactor Plan

**Eliminating Double Authentication & Improving Security**

---

## Overview

**Problem:** Every API request verifies JWT twice:
1. Middleware: JWT validation + token decode (~50ms)
2. API Route: JWT validation again + DB query (~100-150ms)

**Solution:** Verify once in middleware, pass user info via headers to API routes

**Impact:** 100-150ms saved per API call, cleaner code, better security model

---

## Current Architecture (Double Auth)

### Request Flow

```
Client Request
  ↓
Middleware
├─ Read cookie token
├─ Verify JWT (JWT verify algorithm: 50ms)
├─ Decode token
└─ Pass to next middleware/route
  ↓
API Route Handler
├─ Call getServerSideSession()
│  ├─ Read cookie token (again)
│  ├─ Verify JWT (AGAIN: 50ms) ❌
│  └─ Query database for user (100ms) ❌
├─ Use session.id, session.role
└─ Continue logic
  ↓
Response
```

**Waste:** ~150ms redundant work per API call

### Redundant Session Check

**File:** `lib/auth.ts` (lib/session.ts)

```typescript
export async function getServerSideSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  // REDUNDANT: This JWT verification already happened in middleware!
  const payload = await verifyToken(token);
  if (!payload || !payload.id) return null;

  // REDUNDANT: Database query for user info (middleware never did this!)
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, name: true, email: true, role: true },
  });

  return user;
}
```

---

## Target Architecture (Single Auth)

### New Request Flow

```
Client Request
  ↓
Middleware
├─ Read cookie token
├─ Verify JWT (50ms)
├─ Decode token
├─ Fetch user from DB (50-100ms) ← Moved here!
├─ Validate user status
└─ Set headers:
   ├─ x-user-id: user.id
   ├─ x-user-role: user.role
   ├─ x-user-name: user.name
   └─ x-user-email: user.email
  ↓
API Route Handler
├─ Read headers (instant!)
└─ Continue logic with user data
  ↓
Response
```

**Benefits:**
- Single JWT verification
- Single DB query per request
- Cleaner API route code
- Better testability

---

## Implementation Steps

### Step 1: Enhance Middleware

**File:** `middleware.ts`

**Current Middleware (Lines 1-100):**

Find the section handling API routes:

```typescript
if (isApiRoute) {
  if (!token) {
    return NextResponse.json(
      { error: "Kimlik doğrulama gerekli" },
      { status: 401 }
    );
  }

  try {
    const decoded = await verifyToken(token);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", decoded.id);
    requestHeaders.set("x-user-role", decoded.role);

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (error) {
    return NextResponse.json(
      { error: "Kimlik doğrulama gerekli" },
      { status: 401 }
    );
  }
}
```

**Enhanced Middleware:**

```typescript
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

if (isApiRoute) {
  if (!token) {
    return NextResponse.json(
      { error: "Kimlik doğrulama gerekli" },
      { status: 401 }
    );
  }

  try {
    // Step 1: Verify token
    const decoded = await verifyToken(token);

    if (!decoded || !decoded.id) {
      return NextResponse.json(
        { error: "Geçersiz token" },
        { status: 401 }
      );
    }

    // Step 2: Fetch user from database (NEW!)
    // This ensures user still exists and is active
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

    // Step 3: Validate user exists
    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 401 }
      );
    }

    // Step 4: Validate user is active (NEW!)
    // Prevents deactivated users from accessing API
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: "Kullanıcı hesabı deaktif veya silinmiş" },
        { status: 401 }
      );
    }

    // Step 5: Set all user info in headers (NEW!)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-role", user.role);
    requestHeaders.set("x-user-name", user.name);
    requestHeaders.set("x-user-email", user.email);

    console.log(`[Middleware] Auth success - User: ${user.id}, Role: ${user.role}`);

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (error) {
    console.error('[Middleware] Auth error:', error);
    return NextResponse.json(
      { error: "Kimlik doğrulama gerekli" },
      { status: 401 }
    );
  }
}
```

**Testing Middleware:**
- [ ] Can login successfully
- [ ] Headers appear in API request
- [ ] Inactive users rejected
- [ ] Invalid tokens rejected
- [ ] Check console logs for debug info

---

### Step 2: Refactor 14 API Routes

#### Routes to Update

1. `app/api/fields/route.ts`
2. `app/api/inventory/route.ts`
3. `app/api/purchases/route.ts`
4. `app/api/debts/route.ts`
5. `app/api/equipment/route.ts`
6. `app/api/seasons/route.ts`
7. `app/api/wells/route.ts`
8. `app/api/users/route.ts`
9. `app/api/notifications/route.ts`
10. `app/api/dashboard/stats/route.ts`
11. `app/api/weather/route.ts`
12. `app/api/irrigation/summary/route.ts`
13. `app/api/field-expenses/route.ts`
14. `app/api/inventory-transactions/route.ts`

#### Pattern: Before & After

**BEFORE** (using `getServerSideSession`):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSideSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Redundant session check
  const session = await getServerSideSession();

  if (!session || !session.id) {
    return NextResponse.json(
      { error: "Yetkisiz erişim" },
      { status: 401 }
    );
  }

  // Extract user info from session
  const userId = session.id;
  const userRole = session.role;

  // Role-based authorization
  if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
    return NextResponse.json(
      { error: "Yetkisiz erişim" },
      { status: 403 }
    );
  }

  // Rest of logic...
  try {
    const data = await prisma.field.findMany({
      where: { /* ... */ }
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Veri getirme hatası" },
      { status: 500 }
    );
  }
}
```

**AFTER** (using headers):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Type definition for cleaner code
type UserRole = 'ADMIN' | 'OWNER' | 'WORKER';

export async function GET(request: NextRequest) {
  // Get user info from headers (set by middleware)
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role') as UserRole | null;
  const userName = request.headers.get('x-user-name');

  // Validate headers exist (middleware didn't process this request)
  if (!userId || !userRole) {
    return NextResponse.json(
      { error: "Kullanıcı ID'si veya rolü eksik" },
      { status: 401 }
    );
  }

  // Role-based authorization (same as before)
  if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
    return NextResponse.json(
      { error: "Yetkisiz erişim" },
      { status: 403 }
    );
  }

  // Log auth info
  console.log(`[API] Fields - User: ${userId} (${userRole})`);

  // Rest of logic (unchanged)...
  try {
    const data = await prisma.field.findMany({
      where: { /* ... */ }
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching fields:', error);
    return NextResponse.json(
      { error: "Veri getirme hatası" },
      { status: 500 }
    );
  }
}
```

#### Change Summary

| Item | Before | After | Savings |
|------|--------|-------|---------|
| Import `getServerSideSession` | Yes | No | - |
| Import `lib/auth` | Yes | No | - |
| `await getServerSideSession()` | 1 call | Removed | 100-150ms |
| JWT verification | 2x | 1x | 50ms |
| DB query for user | Yes | No | 50-100ms |
| Header reads | No | Yes | 0ms |

#### Implementation Checklist

For each of 14 routes, do this:

1. **Find `getServerSideSession` import**
   ```typescript
   import { getServerSideSession } from '@/lib/auth'; // REMOVE
   ```

2. **Find session variable assignment**
   ```typescript
   const session = await getServerSideSession(); // REMOVE
   ```

3. **Find session null check**
   ```typescript
   if (!session || !session.id) { // REPLACE
   ```

4. **Replace with header reads**
   ```typescript
   const userId = request.headers.get('x-user-id');
   const userRole = request.headers.get('x-user-role');

   if (!userId || !userRole) {
   ```

5. **Update usage of `session.id` → `userId`**
6. **Update usage of `session.role` → `userRole`**
7. **Test the endpoint**

---

## Detailed Route Refactoring Examples

### Example 1: `app/api/fields/route.ts`

```typescript
// BEFORE (lines 31-34)
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

### Example 2: `app/api/inventory/route.ts`

```typescript
// BEFORE (lines ~25-30)
const session = await getServerSideSession();
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const userId = session.id;
const userRole = session.role;

// AFTER
const userId = request.headers.get("x-user-id");
const userRole = request.headers.get("x-user-role");

if (!userId || !userRole) {
  return NextResponse.json(
    { error: "User ID or role missing" },
    { status: 401 }
  );
}
```

### Example 3: `app/api/processes/route.ts` (Already done ✅)

This one already uses headers pattern - can leave as is!

```typescript
// Already correct pattern
const userId = request.headers.get("x-user-id");
const userRole = request.headers.get("x-user-role");

if (!userId || !userRole) {
  return NextResponse.json(
    { error: "Kullanıcı ID'si veya rolü eksik" },
    { status: 401 }
  );
}
```

---

## Testing Authentication Changes

### Manual Testing

**Test 1: Normal User Access**
```bash
# Login as normal user
curl -X GET http://localhost:3000/api/fields \
  -H "Cookie: token=<valid-token>"

# Should succeed with 200
```

**Test 2: Missing Auth**
```bash
# No token
curl -X GET http://localhost:3000/api/fields

# Should fail with 401
```

**Test 3: Invalid Token**
```bash
curl -X GET http://localhost:3000/api/fields \
  -H "Cookie: token=invalid-garbage-token"

# Should fail with 401
```

**Test 4: Inactive User**
```bash
# Token for deactivated user account
curl -X GET http://localhost:3000/api/fields \
  -H "Cookie: token=<inactive-user-token>"

# Should fail with 401 "Kullanıcı hesabı deaktif"
```

### Automated Testing

**Example Jest Test:**

```typescript
// __tests__/api/fields.test.ts

import { GET } from '@/app/api/fields/route';
import { NextRequest } from 'next/server';

describe('GET /api/fields', () => {
  it('should reject without auth headers', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/api/fields'));

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should succeed with valid auth headers', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/api/fields'));

    // Headers set by middleware
    request.headers.set('x-user-id', 'user-123');
    request.headers.set('x-user-role', 'OWNER');

    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('should reject non-admin without proper role', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/api/fields'));

    request.headers.set('x-user-id', 'user-456');
    request.headers.set('x-user-role', 'WORKER'); // Not ADMIN/OWNER

    const response = await GET(request);

    expect(response.status).toBe(403);
  });
});
```

---

## Security Considerations

### Q&A: Is This Secure?

**Q: Can users modify headers to fake authentication?**
A: **No.** Headers are set server-side by middleware BEFORE the request reaches the API route. Client cannot modify them (CORS restrictions + middleware runs first).

**Q: What about stored XSS or session hijacking?**
A: **Same as before.** We still use HTTP-only cookies for token storage. XSS attacker can't read token anyway.

**Q: Why move DB query to middleware?**
A: **Better:** Deactivated users are caught earlier, in middleware. Prevents them from reaching any API route.

### Security Best Practices

1. **Never trust client-provided headers**
   - Always verify in middleware ✅

2. **Always validate user status**
   - Check `status !== 'ACTIVE'` ✅

3. **Use HTTP-only cookies**
   - Token not readable by JavaScript ✅

4. **Log auth events**
   - Debug suspicious activity ✅

---

## Rollback Plan

**If something breaks:**

1. **Revert middleware:** Restore original middleware.ts from git
2. **Revert routes:** Restore `getServerSideSession()` calls
3. **Test:** Verify everything works again
4. **Commit:** `git commit -am "Rollback auth refactor"`

**Git commands:**
```bash
# See what changed
git diff middleware.ts

# Revert single file
git checkout HEAD -- middleware.ts

# Revert all changes
git checkout HEAD -- app/api/
```

---

## Migration Timeline

### Phase 1: Planning (30 min)
- [ ] Review this document
- [ ] Identify all 14 routes
- [ ] Plan testing strategy

### Phase 2: Middleware Enhancement (1 hour)
- [ ] Update middleware.ts
- [ ] Add logging
- [ ] Test auth flow

### Phase 3: Route Refactoring (2 hours)
- [ ] Update 14 routes one by one
- [ ] Test each after update
- [ ] Check for regressions

### Phase 4: Testing (30 min)
- [ ] End-to-end testing
- [ ] Test all roles
- [ ] Test error cases

### Phase 5: Deployment (30 min)
- [ ] Deploy to staging
- [ ] Monitor logs
- [ ] Deploy to production

**Total: ~4.5 hours**

---

## Expected Improvements

### Performance

| Metric | Before | After |
|--------|--------|-------|
| Auth overhead per call | 150ms | 0ms |
| API calls/day | 1000 | 1000 |
| Wasted time/day | 150s (2.5 min) | 0s |
| Time saved/day | - | **2.5 minutes** |

### Code Quality

| Aspect | Before | After |
|--------|--------|-------|
| Auth verification points | 15 (API routes) + 1 (middleware) | 1 (middleware) |
| Code duplication | High | None |
| Testability | Hard | Easy |

### Security

| Aspect | Before | After |
|--------|--------|-------|
| User deactivation enforcement | Per-route | Middleware |
| JWT verification locations | 15+ | 1 |
| Surface area for bugs | Large | Small |

---

## Documentation Updates Needed

After completing this refactor, update:

1. **API Documentation**
   - Mention middleware auth
   - Headers not user-supplied

2. **Architecture Docs**
   - Single auth point in middleware
   - Header-based auth passing

3. **Developer Onboarding**
   - New routes use headers
   - Stop using `getServerSideSession` in APIs

---

## Success Checklist

- [ ] Middleware enhanced with user DB fetch
- [ ] All 14 routes refactored to use headers
- [ ] All routes tested and working
- [ ] No regressions in functionality
- [ ] Auth logging working
- [ ] Performance metrics show improvement
- [ ] Documentation updated
- [ ] Team trained on new pattern
- [ ] Code review completed
- [ ] Deployed successfully

**Ready to refactor? Start with middleware.ts! 🚀**
