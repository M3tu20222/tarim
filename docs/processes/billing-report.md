# Billing API Yapısı Raporu

Bu rapor, `app/api/billing` klasörü altındaki API endpoint'lerinin yapısını ve işlevlerini detaylandırmaktadır.

## 1. Tarla Sahibi Giderleri (`/api/billing/owner-bills`)

Bu bölüm, tarla sahiplerine yansıtılan bireysel giderleri yönetir (`FieldOwnerExpense` modeli). Genellikle işlem maliyetlerinden (`ProcessCost`) kaynaklanır.

-   **`GET /api/billing/owner-bills`**:
    -   Tüm tarla sahibi giderlerini listeler.
    -   Kullanıcı rolüne göre filtreleme yapar (Admin tümünü, diğerleri kendininkini görür).
    -   `processCostId` parametresi ile filtreleme yapılabilir.
    -   İlişkili kullanıcı, işlem maliyeti (işlem, tarla, sezon detayları ile), tarla sahipliği ve hesaplanmış borç durumu (kalan tutar, ödenen tutar) bilgilerini içerir.
    -   Sonuçları oluşturulma tarihine göre tersten sıralar.

-   **`GET /api/billing/owner-bills/{id}`**:
    -   Belirli bir tarla sahibi giderini ID ile getirir.
    -   Yetki kontrolü yapar (Admin veya ilgili sahip görebilir).
    -   İlişkili kullanıcı, işlem maliyeti, tarla sahipliği ve hesaplanmış borç durumu bilgilerini içerir.

-   **`POST /api/billing/owner-bills/{id}/pay`**:
    -   Belirli bir tarla sahibi gideri için ödeme yapar.
    -   Yetki kontrolü yapar (Admin veya ilgili sahip ödeme yapabilir).
    -   İlgili `Debt` (Borç) kaydını bulur (`description` alanındaki `ProcessCost:{processCostId}` formatına göre).
    -   Yeni bir `PaymentHistory` (Ödeme Geçmişi) kaydı oluşturur.
    -   İlgili `Debt` kaydının durumunu (`status`) ve ödeme tarihini (`paymentDate`) günceller.
    -   İşlemleri bir transaction içinde gerçekleştirir.
    -   Kalan borçtan fazla ödeme yapılmasını engeller.

## 2. Ödemeler (`/api/billing/payments`)

Bu bölüm, sistemdeki tüm ödeme geçmişini yönetir (`PaymentHistory` modeli).

-   **`GET /api/billing/payments`**:
    -   Tüm ödeme geçmişini listeler.
    -   Kullanıcı rolüne göre filtreleme yapar (Admin tümünü, diğerleri kendisinin yaptığı veya aldığı ödemeleri görür).
    -   `payerId`, `receiverId`, `debtId`, `contributorId` parametreleri ile filtreleme yapılabilir.
    -   Yetkisiz filtrelemeyi engeller (Admin olmayan kullanıcılar başkalarının ödemelerini filtreleyemez).
    -   İlişkili ödeyen (payer), alan (receiver), borç (debt) ve alış katılımcısı (contributor) bilgilerini içerir.
    -   Sonuçları ödeme tarihine göre tersten sıralar.

## 3. Dönemler (Sezonlar) (`/api/billing/periods`)

Bu bölüm, faturalandırma dönemi yerine tarımsal sezonları yönetir (`Season` modeli).

-   **`GET /api/billing/periods`**:
    -   Tüm sezonları listeler.
    -   Yetki kontrolü yapar (Admin ve Owner görebilir).
    -   `isActive` parametresi ile aktif/pasif sezonları filtreleyebilir.
    -   Sonuçları başlangıç tarihine göre tersten sıralar.

-   **`POST /api/billing/periods`**:
    -   Yeni bir sezon oluşturur.
    -   Yetki kontrolü yapar (Admin ve Owner oluşturabilir).
    -   Gerekli alanlar: `name`, `startDate`, `endDate`. Opsiyonel: `isActive`, `description`.
    -   Başlangıç tarihinin bitiş tarihinden önce olmasını kontrol eder.
    -   Belirtilen tarih aralığında başka bir sezonla çakışma olup olmadığını kontrol eder.
    -   Oluşturan kullanıcı ID'sini (`creatorId`) kaydeder.

-   **`GET /api/billing/periods/{id}`**:
    -   Belirli bir sezonu ID ile getirir.
    -   Yetki kontrolü yapar (Admin ve Owner görebilir).
    -   İlişkili tarla giderlerini (`FieldExpense`) içerir.

-   **`PUT /api/billing/periods/{id}`**:
    -   Belirli bir sezonu günceller.
    -   Yetki kontrolü yapar (Admin ve Owner güncelleyebilir).
    -   Güncellenecek alanlar: `name`, `startDate`, `endDate`, `isActive`, `description`.
    -   Tarih ve çakışma kontrollerini yapar (kendisi hariç).

-   **`DELETE /api/billing/periods/{id}`**:
    -   Belirli bir sezonu siler.
    -   Yetki kontrolü yapar (Admin ve Owner silebilir).
    -   Silmeden önce ilişkili `FieldExpense` kaydı olup olmadığını kontrol eder. Varsa silme işlemini engeller.
    -   Diğer potansiyel ilişkili kayıtlar (işlemler, tarlalar vb.) için Prisma hata kodunu (`P2014`) yakalayarak bilgilendirme yapar.

## 4. Kuyu Faturaları (`/api/billing/well-bills`)

Bu bölüm, kuyular için oluşturulan genel faturaları yönetir (`WellBill` modeli).

-   **`GET /api/billing/well-bills`**:
    -   Tüm kuyu faturalarını listeler.
    -   Yetki kontrolü yapar (Admin ve Owner görebilir).
    -   `billingPeriodId`, `wellId`, `status` parametreleri ile filtreleme yapılabilir.
    -   İlişkili kuyu (`Well`) ve fatura dönemi (`BillingPeriod`) bilgilerini içerir.
    -   Sonuçları oluşturulma tarihine göre tersten sıralar.

-   **`POST /api/billing/well-bills`**:
    -   Yeni bir kuyu faturası oluşturur.
    -   Yetki kontrolü yapar (Admin ve Owner oluşturabilir).
    -   Gerekli alanlar: `wellId`, `billingPeriodId`, `totalAmount`. Opsiyonel: `invoiceNumber`, `invoiceDate`.
    -   Kuyu ve fatura döneminin varlığını kontrol eder.
    -   Aynı kuyu ve dönem için zaten bir fatura olup olmadığını kontrol eder.
    -   Başlangıç durumu (`status`) `PENDING`, toplam saat (`totalHours`) 0 olarak ayarlanır.

-   **`GET /api/billing/well-bills/{id}`**:
    -   Belirli bir kuyu faturasını ID ile getirir.
    -   Yetki kontrolü yapar (Admin ve Owner görebilir).
    -   İlişkili kuyu, fatura dönemi, tarla sahibi faturaları (`OwnerBill` - kullanıcı ve tarla kullanım detayları ile) ve ödemeler (`BillPayment`) bilgilerini içerir.

-   **`PUT /api/billing/well-bills/{id}`**:
    -   Belirli bir kuyu faturasını günceller.
    -   Yetki kontrolü yapar (Admin ve Owner güncelleyebilir).
    -   Güncellenecek alanlar: `totalAmount`, `invoiceNumber`, `invoiceDate`, `status`.

-   **`DELETE /api/billing/well-bills/{id}`**:
    -   Belirli bir kuyu faturasını siler.
    -   Yetki kontrolü yapar (Admin ve Owner silebilir).
    -   Eğer faturaya bağlı `OwnerBill` kayıtları varsa, ilişkili `FieldBillUsage`, `BillPayment` ve `OwnerBill` kayıtlarını bir transaction içinde siler, ardından kuyu faturasını siler. Yoksa sadece kuyu faturasını siler.

-   **`POST /api/billing/well-bills/{id}/calculate`**:
    -   Belirli bir kuyu faturasının maliyetini tarla sahiplerine dağıtır.
    -   Yetki kontrolü yapar (Admin ve Owner hesaplayabilir).
    -   Faturanın ait olduğu dönem ve kuyu için tüm `IrrigationLog` (Sulama Kaydı) kayıtlarını bulur.
    -   Eğer daha önce hesaplama yapılmışsa (ilgili `OwnerBill` kayıtları varsa) işlemi engeller.
    -   Sulama kaydı yoksa hata döndürür.
    -   Tarla bazında toplam kullanım süresini hesaplar.
    -   Tarla sahibi bazında (`FieldOwnership` yüzdelerine göre) toplam kullanım süresini hesaplar.
    -   Toplam kuyu kullanım süresini (`totalHours`) hesaplar.
    -   Her tarla sahibi için fatura payını (`amount`) kullanım süresi oranına göre hesaplar.
    -   Bir transaction içinde:
        -   `WellBill` kaydını `totalHours` ile günceller.
        -   Her tarla sahibi için bir `OwnerBill` kaydı oluşturur (hesaplanan tutar ve saat ile).
        -   Her `OwnerBill` için ilişkili `FieldBillUsage` kayıtlarını oluşturur (tarla bazında düşen saat ve tutar ile).

## 5. Kuyu Fatura Dönemleri (`/api/billing/well-periods`)

Bu bölüm, kuyular için özel fatura dönemlerini yönetir (`WellBillingPeriod` modeli). Bu, `/api/billing/periods` altındaki `Season` modelinden farklıdır.

-   **`GET /api/billing/well-periods`**:
    -   Tüm kuyu fatura dönemlerini listeler.
    -   Yetkilendirme kontrolü yapar (Oturum açık olmalı).
    -   Sayfalama (`limit`, `page`) ve filtreleme (`wellId`, `status`, `startDate`, `endDate`) destekler.
    -   İlişkili kuyu (`Well`) ve sulama kullanımlarını (`WellBillingIrrigationUsage` - sulama logları ile) içerir.
    -   Sonuçları başlangıç tarihine göre tersten sıralar.
    -   Yanıt, veri ile birlikte meta bilgilerini (toplam kayıt, sayfa, limit vb.) içerir.

-   **`POST /api/billing/well-periods`**:
    -   Yeni bir kuyu fatura dönemi oluşturur.
    -   Yetkilendirme kontrolü yapar (Oturum açık olmalı).
    -   Gerekli alanlar: `wellId`, `startDate`, `endDate`, `totalAmount`. Opsiyonel: `totalUsage`, `status`.
    -   Bir transaction içinde:
        -   `WellBillingPeriod` kaydını oluşturur.
        -   Belirtilen dönem içindeki ilgili `IrrigationLog` kayıtlarını bulur.
        -   Toplam sulama süresini hesaplar.
        -   Her `IrrigationLog` için süre yüzdesine ve toplam fatura tutarına göre maliyeti hesaplayarak bir `WellBillingIrrigationUsage` kaydı oluşturur.

-   **`GET /api/billing/well-periods/{id}`**:
    -   Belirli bir kuyu fatura dönemini ID ile getirir.
    -   Yetkilendirme kontrolü yapar (Oturum açık olmalı).
    -   İlişkili detaylı verileri içerir (kuyu, sulama kullanımları, sulama logları, tarla kullanımları, sahip kullanımları ve sahip bilgileri).
    -   Bu verileri kullanarak sahip bazlı maliyet dağılımını (`ownerCosts`) hesaplar ve yanıta ekler.

-   **`PUT /api/billing/well-periods/{id}`**:
    -   Belirli bir kuyu fatura dönemini günceller.
    -   Yetkilendirme kontrolü yapar (Oturum açık olmalı).
    -   Bir transaction içinde:
        -   `WellBillingPeriod` kaydını günceller.
        -   Mevcut `WellBillingIrrigationUsage` kayıtlarını siler.
        -   Güncellenen dönem için ilgili `IrrigationLog` kayıtlarını bulur.
        -   Yeni verilere göre `WellBillingIrrigationUsage` kayıtlarını yeniden oluşturur (POST işlemindeki gibi).

-   **`DELETE /api/billing/well-periods/{id}`**:
    -   Belirli bir kuyu fatura dönemini siler.
    -   Yetkilendirme kontrolü yapar (Oturum açık olmalı).
    -   Bir transaction içinde:
        -   İlişkili `WellBillingIrrigationUsage` kayıtlarını siler.
        -   `WellBillingPeriod` kaydını siler.
