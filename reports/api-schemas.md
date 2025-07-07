# API Şema Raporu

Bu rapor, "Tarım Yönetim Sistemi" projesindeki API endpoint'lerinin kabul ettiği (request) ve döndürdüğü (response) veri şemalarını detaylandırmaktadır.

---

## 1. Auth API (`/api/auth`)

Kullanıcı kimlik doğrulama ve oturum yönetimi işlemlerini gerçekleştirir.

### `POST /api/auth/login`

Kullanıcı girişi yaparak bir oturum token'ı oluşturur.

-   **Request Body:**
    ```json
    {
      "email": "string",
      "password": "string"
    }
    ```

-   **Response Body (Success):**
    ```json
    {
      "token": "string (JWT)"
    }
    ```

-   **Response Body (Error):**
    ```json
    {
      "error": "string"
    }
    ```

---

## 2. Users API (`/api/users`)

Kullanıcı oluşturma, listeleme, güncelleme ve silme işlemlerini yönetir.

### `GET /api/users`

Tüm kullanıcıları listeler.

-   **Response Body (Success):**
    ```json
    [
      {
        "id": "string",
        "name": "string",
        "email": "string",
        "role": "ADMIN" | "OWNER" | "WORKER",
        "status": "ACTIVE" | "INACTIVE",
        "createdAt": "string (Date)"
      }
    ]
    ```

### `POST /api/users`

Yeni bir kullanıcı oluşturur.

-   **Request Body:**
    ```json
    {
      "name": "string",
      "email": "string",
      "password": "string",
      "role": "ADMIN" | "OWNER" | "WORKER"
    }
    ```

-   **Response Body (Success):**
    ```json
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "string",
      "status": "string",
      "createdAt": "string (Date)"
    }
    ```

### `PUT /api/users/[id]`

Belirli bir kullanıcının bilgilerini günceller.

-   **Request Body:**
    ```json
    {
      "name": "string",
      "email": "string",
      "role": "ADMIN" | "OWNER" | "WORKER",
      "status": "ACTIVE" | "INACTIVE"
    }
    ```

-   **Response Body (Success):**
    ```json
    {
      "id": "string",
      // ... updated user fields
    }
    ```

---

## 3. Fields API (`/api/fields`)

Tarla yönetimi işlemlerini gerçekleştirir.

### `GET /api/fields`

Tüm tarlaları listeler.

-   **Response Body (Success):**
    ```json
    [
      {
        "id": "string",
        "name": "string",
        "location": "string",
        "size": "number",
        "status": "ACTIVE" | "FALLOW" | "HARVESTED",
        "ownerId": "string",
        "seasonId": "string | null"
      }
    ]
    ```

### `POST /api/fields`

Yeni bir tarla oluşturur.

-   **Request Body:**
    ```json
    {
      "name": "string",
      "location": "string",
      "size": "number",
      "ownerId": "string",
      "seasonId": "string | null"
    }
    ```

-   **Response Body (Success):**
    ```json
    {
      "id": "string",
      // ... created field fields
    }
    ```

---

## 4. Billing API (`/api/billing`)

Faturalandırma, ödeme dönemleri ve borçlandırma işlemlerini yönetir.

### `POST /api/billing/well-bills`

Belirli bir kuyu ve dönem için fatura oluşturur.

-   **Request Body:**
    ```json
    {
      "wellId": "string",
      "billingPeriodId": "string",
      "totalAmount": "number",
      "invoiceNumber": "string | null",
      "invoiceDate": "string (Date) | null"
    }
    ```

-   **Response Body (Success):**
    ```json
    {
      "id": "string",
      // ... created well bill fields
    }
    ```

### `POST /api/billing/owner-bills/[id]/pay`

Bir sahip faturasını öder.

-   **Request Body:**
    ```json
    {
      "amount": "number",
      "paymentDate": "string (Date)",
      "method": "string",
      "notes": "string | null"
    }
    ```

---

## 5. Irrigation API (`/api/irrigation`)

Sulama işlemlerini ve kayıtlarını yönetir.

### `POST /api/irrigation`

Yeni bir sulama işlemi başlatır (taslak oluşturur).

-   **Request Body:**
    ```json
    {
      "startDateTime": "string (Date)",
      "duration": "number",
      "notes": "string | null",
      "wellId": "string",
      "seasonId": "string"
    }
    ```

-   **Response Body (Success):**
    ```json
    {
      "id": "string"
    }
    ```

### `PUT /api/irrigation/[irrigationId]`

Bir sulama kaydını günceller.

-   **Request Body:**
    ```json
    {
      "startDateTime": "string (Date)",
      "duration": "number",
      "notes": "string | null",
      "fieldIrrigations": [ { "fieldId": "string", "percentage": "number" } ],
      "ownerDurations": [ { "userId": "string", "duration": "number" } ],
      "inventoryDeductions": [ { "inventoryId": "string", "quantity": "number" } ],
      "status": "string"
    }
    ```

---

## 6. Inventory API (`/api/inventory`)

Envanter ve stok yönetimini gerçekleştirir.

### `POST /api/inventory`

Yeni bir envanter öğesi oluşturur.

-   **Request Body:**
    ```json
    {
      "name": "string",
      "category": "string (Enum)",
      "totalQuantity": "number",
      "unit": "string (Enum)",
      "status": "string (Enum)",
      "purchaseDate": "string (Date) | null",
      "expiryDate": "string (Date) | null",
      "costPrice": "number",
      "notes": "string | null"
    }
    ```

-   **Response Body (Success):**
    ```json
    {
      "id": "string",
      // ... created inventory fields
    }
    ```

---

## 7. Purchases API (`/api/purchases`)

Satın alma işlemlerini yönetir.

### `POST /api/purchases`

Yeni bir satın alma işlemi oluşturur.

-   **Request Body:**
    ```json
    {
      "productName": "string",
      "category": "string (Enum)",
      "purchaseDate": "string (Date)",
      "quantity": "number",
      "unit": "string (Enum)",
      "unitPrice": "number",
      "paymentMethod": "string (Enum)",
      "notes": "string | null",
      "partners": [ { "userId": "string", "sharePercentage": "number", "hasPaid": "boolean" } ],
      "seasonId": "string | null"
    }
    ```

-   **Response Body (Success):**
    ```json
    {
      "id": "string",
      // ... created purchase fields
    }
    ```

---

## 8. Debts API (`/api/debts`)

Borç ve alacak kayıtlarını yönetir.

### `POST /api/debts`

Yeni bir borç kaydı oluşturur.

-   **Request Body:**
    ```json
    {
      "amount": "number",
      "dueDate": "string (Date)",
      "description": "string | null",
      "creditorId": "string",
      "debtorId": "string",
      "reason": "string (Enum)"
    }
    ```

-   **Response Body (Success):**
    ```json
    {
      "id": "string",
      // ... created debt fields
    }
    ```

---

## 9. Equipment API (`/api/equipment`)

Ekipman yönetimi.

### `POST /api/equipment`

Yeni bir ekipman oluşturur.

-   **Request Body:**
    ```json
    {
      "name": "string",
      "type": "string (Enum)",
      "fuelConsumptionPerDecare": "number",
      "status": "string (Enum)",
      "description": "string | null",
      "capabilities": ["string (Enum)"],
      "ownerships": [ { "userId": "string", "ownershipPercentage": "number" } ]
    }
    ```

---

## 10. Processes API (`/api/processes`)

Tarımsal iş süreçlerini yönetir.

### `POST /api/processes`

Yeni bir iş süreci başlatır (taslak oluşturur).

-   **Request Body:**
    ```json
    {
      "fieldId": "string",
      "type": "string (Enum)",
      "date": "string (Date)",
      "description": "string | null",
      "processedPercentage": "number",
      "seasonId": "string | null",
      "workerId": "string | null"
    }
    ```

-   **Response Body (Success):**
    ```json
    {
      "processId": "string"
    }
    ```

### `PUT /api/processes/[id]`

Bir iş sürecini, kullanılan envanter ve ekipmanlarla günceller.

-   **Request Body:**
    ```json
    {
      "equipmentId": "string | null",
      "inventoryItems": [ { "inventoryId": "string", "quantity": "number", "ownerId": "string" } ],
      "inventoryDistribution": "string (JSON)"
    }
    ```

---

## 11. Notifications API (`/api/notifications`)

Sistem içi bildirimleri yönetir.

### `POST /api/notifications`

Yeni bir bildirim oluşturur.

-   **Request Body:**
    ```json
    {
      "receiverId": "string",
      "senderId": "string",
      "type": "string (Enum)",
      "title": "string",
      "message": "string",
      "link": "string | null"
    }
    ```
