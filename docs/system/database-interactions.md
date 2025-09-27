# Veritabanı Etkileşim Raporu

Bu rapor, API modüllerinin Prisma veritabanı modelleriyle nasıl etkileşime girdiğini ve aralarındaki ilişkileri nasıl kullandığını özetlemektedir.

---

## Ana Prensip: Servis Odaklı Etkileşim

Her API rotası (`route.ts`), genellikle tek bir ana Prisma modeline odaklanır ve bu model üzerinde CRUD (Create, Read, Update, Delete) işlemleri gerçekleştirir. İlişkili veriler (`include` kullanılarak) genellikle okuma (`GET`) işlemlerinde çekilir veya yazma (`POST`, `PUT`) işlemlerinde transaction blokları içinde tutarlılığı koruyacak şekilde güncellenir.

---

## API Modülü - Veritabanı Modeli Eşleştirmesi

### 1. `/api/users` -> `User` Modeli

-   **Etkileşim:** Temel CRUD işlemleri.
-   **İlişkiler:** `GET` isteklerinde kullanıcının sahip olduğu (`ownedFields`), atandığı (`assignedFields`) veya katkıda bulunduğu (`purchaseContributions`) diğer modeller yüklenebilir. `POST` ile yeni bir `User` kaydı oluşturulur.

### 2. `/api/fields` -> `Field` Modeli

-   **Etkileşim:** Temel CRUD işlemleri.
-   **İlişkiler:** Bir tarla (`Field`) oluşturulurken veya güncellenirken, `FieldOwnership` ve `FieldWorkerAssignment` modelleri üzerinden `User` modeliyle ilişki kurulur. `seasonId` ile `Season` modeline bağlanır.

### 3. `/api/purchases` -> `Purchase`, `PurchaseContributor`, `Inventory`, `Debt` Modelleri

-   **Etkileşim:** Karmaşık ve transaction-yoğun işlemler.
-   **İlişkiler:**
    -   `POST /api/purchases`: Tek bir transaction içinde birden fazla modelde kayıt oluşturur:
        1.  Ana `Purchase` kaydı oluşturulur.
        2.  Satın alıma katılan her ortak için bir `PurchaseContributor` kaydı oluşturulur.
        3.  Eğer satın alım bir şablon değilse, yeni bir `Inventory` (stok) kaydı ve bu stoğun sahipliklerini belirten `InventoryOwnership` kayıtları oluşturulur.
        4.  Ödeme yapmayan ortaklar için `Debt` (borç) kayıtları oluşturulur.
        5.  Tüm bu işlemlerin kaydı olarak bir `InventoryTransaction` oluşturulur.

### 4. `/api/irrigation` -> `IrrigationLog`, `IrrigationFieldUsage`, `InventoryUsage` Modelleri

-   **Etkileşim:** Karmaşık ve transaction-yoğun işlemler.
-   **İlişkiler:**
    -   `POST /api/irrigation`: Yeni bir `IrrigationLog` (sulama kaydı) taslağı oluşturur.
    -   `PUT /api/irrigation/[id]`: Bir sulama işlemini güncellerken, hangi tarlaların (`IrrigationFieldUsage`) ne kadar sulandığını ve hangi envanterlerin (`InventoryUsage`) ne kadar kullanıldığını kaydeder. Bu işlem sırasında ilgili `Inventory` stoklarından düşüm yapılır.

### 5. `/api/processes` -> `Process`, `EquipmentUsage`, `InventoryUsage`, `ProcessCost` Modelleri

-   **Etkileşim:** Karmaşık ve transaction-yoğun işlemler.
-   **İlişkiler:**
    -   `POST /api/processes`: Tarımsal bir işlem (sürme, ekim vb.) için bir `Process` taslağı oluşturur.
    -   `PUT /api/processes/[id]`: İşlem güncellenirken, kullanılan ekipmanlar (`EquipmentUsage`) ve envanterler (`InventoryUsage`) kaydedilir. `Inventory` stokları güncellenir.
    -   `POST /api/processes/finalize`: İşlem tamamlandığında, tüm maliyetler (`laborCost`, `equipmentCost`, `inventoryCost`) hesaplanarak bir `ProcessCost` kaydı oluşturulur. Bu maliyet, `FieldExpense` ve `FieldOwnerExpense` modelleri aracılığıyla ilgili tarla ve sahiplerine yansıtılır.

### 6. `/api/debts` & `/api/payments` -> `Debt`, `PaymentHistory` Modelleri

-   **Etkileşim:** Finansal işlemler.
-   **İlişkiler:**
    -   `POST /api/debts`: Manuel olarak yeni bir `Debt` kaydı oluşturur.
    -   `POST /api/debts/[id]/pay`: Bir borç için ödeme yapıldığında, yeni bir `PaymentHistory` kaydı oluşturulur ve ilgili `Debt` kaydının durumu (`status`) ve kalan miktarı güncellenir.

### 7. `/api/notifications` -> `Notification` Modeli

-   **Etkileşim:** Bilgilendirme ve kayıt tutma.
-   **İlişkiler:** Sistemdeki önemli olaylar (yeni borç, tamamlanan işlem, onay gereken satın alım vb.) gerçekleştiğinde, ilgili `User`'a bir `Notification` kaydı oluşturulur. Bu bildirimler, `processId`, `purchaseId`, `debtId` gibi alanlarla olayın kaynağı olan kayda bağlanır.

---

## Özet Tablo

| API Modülü          | Ana Prisma Modeli(leri)                                     | Temel İşlevi                                                                 |
| ------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `/api/users`        | `User`                                                      | Kullanıcı yönetimi (CRUD)                                                    |
| `/api/fields`       | `Field`, `FieldOwnership`                                   | Tarla yönetimi ve sahiplik ataması                                           |
| `/api/purchases`    | `Purchase`, `Inventory`, `Debt`, `PurchaseContributor`      | Kapsamlı satın alma süreci, stok ve borç oluşturma                           |
| `/api/irrigation`   | `IrrigationLog`, `InventoryUsage`                           | Sulama işlemleri, stok düşümü ve maliyetlendirme                             |
| `/api/processes`    | `Process`, `InventoryUsage`, `EquipmentUsage`, `ProcessCost` | Tarımsal faaliyetler, kaynak kullanımı ve maliyetlerin hesaplanması          |
| `/api/inventory`    | `Inventory`, `InventoryOwnership`                           | Stok yönetimi ve sahiplik takibi                                             |
| `/api/debts`        | `Debt`, `PaymentHistory`                                    | Borç takibi ve ödeme işlemleri                                               |
| `/api/notifications`| `Notification`                                              | Kullanıcıları sistem olayları hakkında bilgilendirme                         |
