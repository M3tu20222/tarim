# Yetkilendirme Kuralları Raporu

Bu rapor, API endpoint'lerine hangi kullanıcı rollerinin (`ADMIN`, `OWNER`, `WORKER`) erişim yetkisi olduğunu detaylandırmaktadır. Yetkilendirme, genellikle API rotalarında `x-user-role` HTTP başlığı kontrol edilerek yapılır.

---

## Genel Kurallar

-   **`ADMIN`**: Genellikle tüm API endpoint'lerine tam erişim yetkisine sahiptir. Sistemdeki tüm verileri görebilir, oluşturabilir, güncelleyebilir ve silebilir.
-   **`OWNER`**: Kendi verileri ve sahip olduğu varlıklar (tarlalar, envanterler vb.) üzerinde tam yetkiye sahiptir. Ayrıca, genellikle işçi (`WORKER`) ve diğer sahiplerle ilgili işlemleri yönetebilir. Diğer sahiplerin özel verilerini genellikle göremez.
-   **`WORKER`**: Yetkileri en kısıtlı roldür. Genellikle sadece kendisine atanmış görevleri (`Process`, `IrrigationLog`) görme ve güncelleme yetkisine sahiptir.

---

## Endpoint Bazında Yetkilendirme

| API Endpoint                          | `ADMIN` | `OWNER`                                       | `WORKER`                                      | Notlar                                                                   |
| --------------------------------------- | :-----: | :-------------------------------------------- | :-------------------------------------------- | ------------------------------------------------------------------------ |
| **Auth API (`/api/auth`)**              |         |                                               |                                               |                                                                          |
| `POST /login`, `POST /logout`           |   ✅    | ✅                                            | ✅                                            | Tüm rollerin kimlik doğrulaması gerekir.                                 |
| **Users API (`/api/users`)**            |         |                                               |                                               |                                                                          |
| `GET /users`                            |   ✅    | ✅                                            | ❌                                            | Sadece `ADMIN` ve `OWNER` tüm kullanıcıları listeleyebilir.              |
| `POST /users`                           |   ✅    | ✅                                            | ❌                                            | Sadece `ADMIN` ve `OWNER` yeni kullanıcı oluşturabilir.                  |
| `PUT /users/[id]`                       |   ✅    | ✅                                            | ❌                                            |                                                                          |
| **Fields API (`/api/fields`)**          |         |                                               |                                               |                                                                          |
| `GET /fields`                           |   ✅    | ✅                                            | ✅                                            | Tüm roller tarlaları listeleyebilir.                                     |
| `POST /fields`                          |   ✅    | ✅                                            | ❌                                            | Sadece `ADMIN` ve `OWNER` yeni tarla oluşturabilir.                      |
| `PUT /fields/[id]`                      |   ✅    | ✅ (Sadece kendi tarlası)                     | ❌                                            | `OWNER` sadece sahiplik ilişkisi olan tarlaları güncelleyebilir.          |
| **Purchases API (`/api/purchases`)**    |         |                                               |                                               |                                                                          |
| `GET /purchases`                        |   ✅    | ✅                                            | ❌                                            |                                                                          |
| `POST /purchases`                       |   ✅    | ✅                                            | ❌                                            |                                                                          |
| `PUT /purchases/[id]`                   |   ✅    | ✅ (Katılımcısı olduğu alım)                  | ❌                                            | `OWNER` sadece katılımcısı olduğu alımları güncelleyebilir.              |
| `POST /purchases/[id]/approve`          |   ✅    | ❌                                            | ❌                                            | Onaylama işlemi sadece `ADMIN` yetkisindedir.                            |
| **Processes API (`/api/processes`)**    |         |                                               |                                               |                                                                          |
| `GET /processes`                        |   ✅    | ✅                                            | ✅ (Sadece atanmış olanlar)                   | `WORKER` sadece kendisine atanmış işlemleri görür.                       |
| `POST /processes`                       |   ✅    | ✅                                            | ❌                                            |                                                                          |
| `PUT /processes/[id]`                   |   ✅    | ✅                                            | ✅ (Sadece atanmış olan)                      | `WORKER` sadece kendisine atanmış işlemi güncelleyebilir.                |
| `POST /processes/finalize`              |   ✅    | ✅                                            | ❌                                            | Sonuçlandırma `OWNER` ve `ADMIN` yetkisindedir.                          |
| **Inventory API (`/api/inventory`)**    |         |                                               |                                               |                                                                          |
| `GET /inventory`                        |   ✅    | ✅                                            | ✅                                            | Tüm roller envanteri görebilir.                                          |
| `POST /inventory`                       |   ✅    | ✅                                            | ❌                                            |                                                                          |
| **Debts & Payments API**                |         |                                               |                                               |                                                                          |
| `GET /debts`                            |   ✅    | ✅ (Sadece ilgili olduğu borçlar)             | ❌                                            | `OWNER` sadece alacaklı veya borçlu olduğu kayıtları görür.              |
| `POST /debts`                           |   ✅    | ✅                                            | ❌                                            |                                                                          |
| `POST /debts/[id]/pay`                  |   ✅    | ✅                                            | ✅                                            | Ödeme işlemini tüm roller yapabilir (kendi adlarına).                    |
| **Notifications API**                   |         |                                               |                                               |                                                                          |
| `GET /notifications`                    |   ✅    | ✅ (Sadece kendi bildirimleri)                | ✅ (Sadece kendi bildirimleri)                | Herkes sadece kendi bildirimlerini okuyabilir. `ADMIN` tümünü görebilir. |
