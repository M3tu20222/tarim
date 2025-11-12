# Header-Based Authentication Usage Guide

## Overview
All 13 API routes have been refactored to use header-based authentication instead of server-side sessions. The middleware automatically sets the required headers.

## Required Headers

### Standard Headers (Required for all requests)
```
x-user-id: <user-id-uuid>
x-user-role: <ADMIN|OWNER|WORKER>
```

### Optional Headers
```
x-user-name: <user-name>
x-user-email: <user-email>
```

## How Headers are Set

The middleware automatically extracts user information from the JWT token and sets these headers:

```typescript
// Middleware (middleware.ts or equivalent)
const token = request.cookies.get("authToken")?.value;
const decoded = jwt.verify(token, secret);

const requestHeaders = new Headers(request.headers);
requestHeaders.set("x-user-id", decoded.id);
requestHeaders.set("x-user-role", decoded.role);
requestHeaders.set("x-user-name", decoded.name);
requestHeaders.set("x-user-email", decoded.email);

const response = NextResponse.next({
  request: {
    headers: requestHeaders,
  },
});
```

## API Endpoint Examples

### 1. Inventory Management

#### Get All Inventory Items
```bash
curl -X GET http://localhost:3000/api/inventory \
  -H "x-user-id: user-123" \
  -H "x-user-role: OWNER" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "inv-456",
      "name": "Gübre",
      "category": "FERTILIZER",
      "totalQuantity": 100,
      "unit": "KG",
      "costPrice": 50.00,
      "ownerships": [
        {
          "userId": "user-123",
          "shareQuantity": 100
        }
      ]
    }
  ]
}
```

**Error (401 Unauthorized):**
```json
{
  "error": "Kullanıcı ID'si veya rolü eksik"
}
```

#### Create Inventory Item
```bash
curl -X POST http://localhost:3000/api/inventory \
  -H "x-user-id: user-123" \
  -H "x-user-role: OWNER" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Yeni Gübre",
    "category": "FERTILIZER",
    "totalQuantity": 200,
    "unit": "KG",
    "status": "AVAILABLE",
    "costPrice": 55.50,
    "purchaseDate": "2024-01-15",
    "expiryDate": "2025-01-15"
  }'
```

---

### 2. Purchase Management

#### Get All Purchases
```bash
curl -X GET http://localhost:3000/api/purchases \
  -H "x-user-id: user-123" \
  -H "x-user-role: ADMIN" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**
```json
[
  {
    "id": "purchase-789",
    "product": "Tohumlar",
    "quantity": 50,
    "unit": "KG",
    "totalCost": 1500.00,
    "contributors": [
      {
        "userId": "user-123",
        "sharePercentage": 100
      }
    ],
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

#### Create Purchase
```bash
curl -X POST http://localhost:3000/api/purchases \
  -H "x-user-id: user-123" \
  -H "x-user-role: OWNER" \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Yeni Tohumlar",
    "category": "SEEDS",
    "quantity": 75,
    "unit": "KG",
    "unitPrice": 25.00,
    "paymentMethod": "CASH",
    "purchaseDate": "2024-01-15",
    "partners": [
      {
        "userId": "user-123",
        "sharePercentage": 100,
        "hasPaid": true,
        "isCreditor": true
      }
    ]
  }'
```

---

### 3. Payments Management

#### Get All Payment History
```bash
curl -X GET http://localhost:3000/api/payments \
  -H "x-user-id: user-123" \
  -H "x-user-role: OWNER" \
  -H "Content-Type: application/json"
```

#### Record Payment
```bash
curl -X POST http://localhost:3000/api/payments \
  -H "x-user-id: user-123" \
  -H "x-user-role: OWNER" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500.00,
    "paymentDate": "2024-01-15",
    "paymentMethod": "BANK_TRANSFER",
    "contributorId": "user-456",
    "receiverId": "user-789",
    "notes": "Alış ödemesi"
  }'
```

---

### 4. Irrigation Management

#### Get All Irrigation Logs
```bash
curl -X GET "http://localhost:3000/api/irrigation?page=1&limit=50" \
  -H "x-user-id: user-123" \
  -H "x-user-role: WORKER" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "irrig-001",
      "wellId": "well-123",
      "seasonId": "season-2024",
      "duration": 120,
      "status": "COMPLETED",
      "startDateTime": "2024-01-15T08:00:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 50,
    "pages": 1
  }
}
```

#### Create New Irrigation Log
```bash
curl -X POST http://localhost:3000/api/irrigation \
  -H "x-user-id: user-123" \
  -H "x-user-role: WORKER" \
  -H "Content-Type: application/json" \
  -d '{
    "startDateTime": "2024-01-15T08:00:00Z",
    "duration": 120,
    "wellId": "well-123",
    "seasonId": "season-2024",
    "notes": "Sulama işlemi başlatıldı"
  }'
```

#### Update Irrigation Details
```bash
curl -X PUT http://localhost:3000/api/irrigation/irrig-001/details \
  -H "x-user-id: user-123" \
  -H "x-user-role: WORKER" \
  -H "Content-Type: application/json" \
  -d '{
    "fieldIrrigations": [
      {
        "fieldId": "field-456",
        "percentage": 100
      }
    ],
    "ownerDurations": [
      {
        "userId": "user-123",
        "duration": 120
      }
    ],
    "inventoryDeductions": [
      {
        "inventoryId": "inv-456",
        "quantityUsed": 50,
        "unitPrice": 50,
        "ownerId": "user-123"
      }
    ]
  }'
```

#### Finalize Irrigation
```bash
curl -X POST http://localhost:3000/api/irrigation/irrig-001/finalize \
  -H "x-user-id: user-123" \
  -H "x-user-role: WORKER" \
  -H "Content-Type: application/json" \
  -d '{
    "ownerDurations": [
      {
        "userId": "user-123",
        "duration": 120,
        "irrigatedArea": 5
      }
    ]
  }'
```

#### Delete Irrigation Log
```bash
curl -X DELETE http://localhost:3000/api/irrigation/irrig-001 \
  -H "x-user-id: user-123" \
  -H "x-user-role: ADMIN" \
  -H "Content-Type: application/json"
```

---

### 5. Debts Management

#### Get All Debts
```bash
curl -X GET http://localhost:3000/api/debts \
  -H "x-user-id: user-123" \
  -H "x-user-role: OWNER" \
  -H "Content-Type: application/json"
```

#### Create New Debt
```bash
curl -X POST http://localhost:3000/api/debts \
  -H "x-user-id: user-123" \
  -H "x-user-role: OWNER" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000.00,
    "dueDate": "2024-02-15",
    "description": "Alış borcu",
    "creditorId": "user-456",
    "debtorId": "user-789",
    "reason": "PURCHASE"
  }'
```

---

### 6. Equipment Management

#### Get All Equipment
```bash
curl -X GET http://localhost:3000/api/equipment \
  -H "x-user-id: user-123" \
  -H "x-user-role: OWNER" \
  -H "Content-Type: application/json"
```

#### Create Equipment
```bash
curl -X POST http://localhost:3000/api/equipment \
  -H "x-user-id: user-123" \
  -H "x-user-role: OWNER" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Traktör A1",
    "type": "TRACTOR",
    "fuelConsumptionPerDecare": 5.5,
    "status": "ACTIVE",
    "capabilities": ["PLOWING", "HARROWING"],
    "ownerships": [
      {
        "userId": "user-123",
        "ownershipPercentage": 100
      }
    ]
  }'
```

---

### 7. Seasons Management

#### Get Active Seasons
```bash
curl -X GET "http://localhost:3000/api/seasons?active=true" \
  -H "x-user-id: user-123" \
  -H "x-user-role: OWNER" \
  -H "Content-Type: application/json"
```

#### Create New Season
```bash
curl -X POST http://localhost:3000/api/seasons \
  -H "x-user-id: user-123" \
  -H "x-user-role: ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "2024 Yılı Bahçıvan Sezonı",
    "startDate": "2024-03-01",
    "endDate": "2024-11-30",
    "isActive": true,
    "description": "Bahar-yaz-sonbahar sezonları"
  }'
```

---

### 8. Wells Management

#### Get All Wells
```bash
curl -X GET http://localhost:3000/api/wells \
  -H "x-user-id: user-123" \
  -H "x-user-role: OWNER" \
  -H "Content-Type: application/json"
```

#### Create Well
```bash
curl -X POST http://localhost:3000/api/wells \
  -H "x-user-id: user-123" \
  -H "x-user-role: OWNER" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kuyusu No 1",
    "depth": 45.5,
    "capacity": 500000,
    "status": "ACTIVE",
    "latitude": 39.1234,
    "longitude": 35.5678,
    "fieldIds": ["field-123", "field-456"]
  }'
```

---

### 9. Users Management

#### List Users
```bash
curl -X GET "http://localhost:3000/api/users?role=WORKER" \
  -H "x-user-id: user-123" \
  -H "x-user-role: ADMIN" \
  -H "Content-Type: application/json"
```

#### Create User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "x-user-id: user-123" \
  -H "x-user-role: ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ahmet Çiftçi",
    "email": "ahmet@example.com",
    "password": "secure-password-hash",
    "role": "WORKER",
    "status": "ACTIVE"
  }'
```

---

### 10. Notifications

#### Get Notifications
```bash
curl -X GET "http://localhost:3000/api/notifications?status=UNREAD&limit=20" \
  -H "x-user-id: user-123" \
  -H "x-user-role: OWNER" \
  -H "Content-Type: application/json"
```

#### Create Notification
```bash
curl -X POST http://localhost:3000/api/notifications \
  -H "x-user-id: user-123" \
  -H "x-user-role: ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverId": "user-456",
    "senderId": "user-123",
    "title": "Yeni Bildirim",
    "message": "Sulama işlemi tamamlandı",
    "type": "SYSTEM"
  }'
```

---

## Error Responses

### Missing Headers (401 Unauthorized)
```json
{
  "error": "Kullanıcı ID'si veya rolü eksik"
}
```

### Invalid Request Data (400 Bad Request)
```json
{
  "error": "Gerekli alanlar eksik"
}
```

### Server Error (500 Internal Server Error)
```json
{
  "error": "İşlem gerçekleştirilirken bir hata oluştu"
}
```

---

## Client Implementation Example

### Fetch with Headers (JavaScript/Fetch API)
```typescript
const headers = {
  "x-user-id": userId,
  "x-user-role": userRole,
  "x-user-name": userName,
  "x-user-email": userEmail,
  "Content-Type": "application/json",
};

const response = await fetch("/api/inventory", {
  method: "GET",
  headers: headers,
});

const data = await response.json();
```

### Axios with Headers
```typescript
const headers = {
  "x-user-id": userId,
  "x-user-role": userRole,
  "x-user-name": userName,
  "x-user-email": userEmail,
};

const response = await axios.get("/api/inventory", { headers });
```

### NextJS Server Component
```typescript
export default async function InventoryPage() {
  const session = await getServerSession(); // Your auth logic

  const headers = {
    "x-user-id": session.id,
    "x-user-role": session.role,
    "x-user-name": session.name,
    "x-user-email": session.email,
  };

  const res = await fetch(`${process.env.API_URL}/api/inventory`, {
    headers: headers,
  });

  const data = await res.json();
  // ... render data
}
```

---

## Troubleshooting

### Issue: Getting "Kullanıcı ID'si veya rolü eksik" error

**Solution:** Verify that:
1. Middleware is properly setting headers
2. Headers are being passed in request
3. Header names match exactly (case-sensitive)

### Issue: Authentication not working after refactoring

**Solution:** Check that:
1. Middleware is deployed
2. No header stripping by API gateway/proxy
3. Cookie-based JWT is being read correctly

### Issue: Role-based access denied unexpectedly

**Solution:** Verify:
1. User has correct role in system
2. Middleware is reading role correctly
3. Endpoint authorization logic matches requirements

---

## Migration Checklist

- [ ] Deploy middleware with header-setting logic
- [ ] Verify headers are being set in all requests
- [ ] Update all client code to pass headers (if not automatic)
- [ ] Test all endpoints with valid headers
- [ ] Test all endpoints with missing headers
- [ ] Verify error responses are appropriate
- [ ] Monitor logs for auth-related issues
- [ ] Update API documentation
- [ ] Train team on new authentication mechanism
- [ ] Remove old session-based code references
