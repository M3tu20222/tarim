# Sulama API (`app/api/irrigation`) Yapısı Raporu

Bu rapor, `app/api/irrigation` dizini altındaki API endpoint'lerinin yapısını ve işlevselliğini detaylandırmaktadır.

## Genel Bakış

Sulama API'si, tarım yönetim sistemi içindeki sulama kayıtları (logları) ile ilgili işlemleri yönetir. Bu işlemler arasında yeni sulama kayıtları oluşturma, mevcut kayıtları listeleme, belirli bir kaydı getirme, güncelleme, silme ve sulama verileriyle ilgili istatistikleri alma bulunur.

Tüm endpoint'ler `getServerSideSession` kullanarak kimlik doğrulaması yapar ve yetkisiz erişimi engeller. İşlemler genellikle Prisma ORM kullanılarak veritabanı ile etkileşim kurar. Özellikle kayıt oluşturma ve silme işlemlerinde veri bütünlüğünü sağlamak için veritabanı transaction'ları kullanılır.

## Endpoint Detayları

### 1. `/api/irrigation`

Bu endpoint, sulama kayıtlarının genel yönetimi için kullanılır.

*   **`GET /api/irrigation`**:
    *   **İşlev**: Tüm sulama kayıtlarını listeler.
    *   **Özellikler**:
        *   Kimlik doğrulaması gerektirir.
        *   Filtreleme: `seasonId`, `status`, `wellId`, `fieldId`, `startDate`, `endDate`, `ownerId` (sahip ID'si) parametreleri ile filtreleme yapılabilir.
        *   Sayfalama: `limit` ve `page` parametreleri ile sayfalama desteklenir.
        *   Yanıt: Sulama kayıtlarının listesini (`data`) ve sayfalama bilgilerini (`meta`) içerir. Kayıtlar, ilişkili kuyu (`well`), sezon (`season`), kullanıcı (`user`), tarla kullanımları (`fieldUsages` - tarla ve sahip detayları ile), envanter kullanımları (`inventoryUsages` - envanter ve sahip detayları ile) ve sahip özetlerini (`ownerSummaries`) içerir.
        *   Sıralama: Kayıtlar başlangıç tarihine göre (`startDateTime`) azalan sırada döner.
*   **`POST /api/irrigation`**:
    *   **İşlev**: Yeni bir sulama kaydı oluşturur.
    *   **Özellikler**:
        *   Kimlik doğrulaması gerektirir.
        *   Girdi: `startDateTime`, `duration`, `notes`, `fieldIrrigations` (tarla ve yüzdeleri), `ownerDurations` (sahip bazlı süre ve sulanan alan), `inventoryUsages` (kullanılan envanter, miktar, birim fiyat ve sahip bazlı kullanımlar) verilerini alır.
        *   Hesaplamalar: Formdan gelen verileri kullanarak sahip bazlı envanter kullanım yüzdelerini hesaplar. Toplam sulanan alan sıfır olamaz.
        *   Veritabanı İşlemleri (Transaction):
            1.  Ana `IrrigationLog` kaydını oluşturur.
            2.  `IrrigationFieldUsage` kayıtlarını oluşturur (tarla bağlantıları).
            3.  `IrrigationOwnerSummary` kayıtlarını oluşturur (sahip bazlı süre ve alan özetleri).
            4.  Varsa `IrrigationInventoryUsage` ve `IrrigationInventoryOwnerUsage` kayıtlarını oluşturur.
            5.  İlgili `InventoryOwnership` (sahip envanter stoğu) ve `Inventory` (toplam envanter stoğu) kayıtlarını günceller.
            6.  `InventoryTransaction` kaydı oluşturur (stok hareketini izlemek için).
        *   Hata Yönetimi: Eksik alanlar veya yetersiz envanter stoğu gibi durumlarda hata döner.

### 2. `/api/irrigation/[id]`

Bu endpoint, belirli bir sulama kaydı üzerinde işlem yapmak için kullanılır. `[id]` parametresi, hedeflenen sulama kaydının benzersiz kimliğini temsil eder.

*   **`GET /api/irrigation/[id]`**:
    *   **İşlev**: Belirtilen ID'ye sahip sulama kaydının detaylarını getirir.
    *   **Özellikler**:
        *   Kimlik doğrulaması gerektirir.
        *   Yanıt: İstenen sulama kaydını, ilişkili tüm detaylarla (kuyu, sezon, kullanıcı, tarla kullanımları, envanter kullanımları vb.) birlikte döner. Kayıt bulunamazsa 404 hatası verir.
*   **`PUT /api/irrigation/[id]`**:
    *   **İşlev**: Belirtilen ID'ye sahip sulama kaydını günceller.
    *   **Özellikler**:
        *   Kimlik doğrulaması gerektirir.
        *   Girdi: Güncellenecek alanları (`startDateTime`, `duration`, `wellId`, `notes`, `status`, `seasonId`) içeren JSON verisi alır.
        *   İşlem: İlgili `IrrigationLog` kaydını günceller.
*   **`DELETE /api/irrigation/[id]`**:
    *   **İşlev**: Belirtilen ID'ye sahip sulama kaydını ve ilişkili tüm verileri siler.
    *   **Özellikler**:
        *   Kimlik doğrulaması gerektirir.
        *   Veritabanı İşlemleri (Transaction): Veri bütünlüğünü korumak için ilişkili tüm kayıtları (envanter sahip kullanımları, envanter kullanımları, tarla sahip kullanımları, tarla kullanımları, kuyu fatura kullanımları) sildikten sonra ana sulama kaydını siler.

### 3. `/api/irrigation/stats`

Bu endpoint, sulama verileriyle ilgili çeşitli istatistikleri sağlamak için kullanılır.

*   **`GET /api/irrigation/stats`**:
    *   **İşlev**: Sulama ile ilgili istatistiksel verileri getirir.
    *   **Özellikler**:
        *   Kimlik doğrulaması: İstek başlıklarından (`x-user-id`, `x-user-role`) kullanıcı bilgilerini alır.
        *   Filtreleme: `fieldId`, `startDate`, `endDate`, `seasonId` parametreleri ile filtreleme yapılabilir.
        *   Hesaplamalar:
            *   Toplam sulama miktarı (`totalAmount`).
            *   Toplam sulama süresi (`totalDuration`).
            *   Toplam sulama kaydı sayısı (`irrigationCount`).
            *   Sulama metodlarına göre dağılım (`methodDistribution`).
            *   Tarlalara göre dağılım (`fieldDistribution` - tarla adları ile birlikte).
            *   Aylık sulama verileri (`monthlyData` - MongoDB aggregation pipeline kullanılarak).
        *   Yanıt: Hesaplanan istatistikleri içeren bir JSON nesnesi döner.

## Veri Modelleri (Önemli Olanlar)

*   `IrrigationLog`: Ana sulama kaydı. Başlangıç zamanı, süre, notlar, durum, kuyu, sezon gibi bilgileri içerir.
*   `IrrigationFieldUsage`: Bir sulama kaydının hangi tarlayı ne oranda kullandığını belirtir.
*   `IrrigationOwnerSummary`: Bir sulama kaydında her bir sahibin toplam ayrılan süresini ve suladığı alanı özetler.
*   `IrrigationInventoryUsage`: Bir sulama kaydında kullanılan envanter kalemini, miktarını ve maliyetini belirtir.
*   `IrrigationInventoryOwnerUsage`: Bir envanter kullanımının hangi sahip tarafından ne kadarının ve hangi maliyetle yapıldığını belirtir.
*   `Inventory`: Envanter kalemlerinin genel bilgilerini ve toplam stok miktarını tutar.
*   `InventoryOwnership`: Belirli bir envanter kaleminin hangi sahip tarafından ne kadarının sahiplenildiğini gösterir.
*   `InventoryTransaction`: Envanter stok hareketlerini (alım, kullanım vb.) kaydeder.
*   `Field`: Tarla bilgilerini içerir.
*   `Well`: Kuyu bilgilerini içerir.
*   `Season`: Tarım sezonu bilgilerini içerir.
*   `User`: Kullanıcı (sistem kullanıcıları, tarla sahipleri vb.) bilgilerini içerir.
