
# Alış, İşlem ve Sulama Süreçleri Entegrasyon Raporu

Bu rapor, `database-interactions.md` ve `prisma.schema` dosyaları temel alınarak, sistemdeki "Alış" (`Purchase`), "İşlem" (`Process`) ve "Sulama" (`Irrigation`) süreçlerinin mevcut entegrasyonunu, işlevlerini ve potansiyel geliştirme alanlarını analiz eder.

---

## 1. Mevcut Durum ve İşlevler

Mevcut sistem, tarımsal faaliyetlerin temel taşları olan üç ana süreci (Alış, İşlem, Sulama) modüler bir yapıda ele almaktadır. Bu süreçler, veritabanı düzeyinde birbirine sıkı sıkıya bağlıdır ve API üzerinden yönetilmektedir.

### a. Süreç Akışı ve Veritabanı Etkileşimi

1.  **Alış (`Purchase`):**
    *   **İşlevi:** Tarımsal girdilerin (gübre, ilaç, tohum, yakıt vb.) satın alınmasını yönetir.
    *   **Veritabanı Etkileşimi:**
        *   Bir `Purchase` kaydı oluşturulduğunda, bu alıma finansal olarak katılan her ortak için `PurchaseContributor` kayıtları yaratılır.
        *   Alınan ürün, `Inventory` (Envanter) modeline yeni bir stok olarak eklenir ve `InventoryOwnership` ile ortakların bu stoktaki payları belirtilir.
        *   Ödeme yapmayan ortaklar için otomatik olarak `Debt` (Borç) kaydı oluşturulur.
        *   Tüm bu akış, bir `InventoryTransaction` ile kayıt altına alınır.
    *   **Frontend Entegrasyonu:** Frontend'de, kullanıcıların ortaklaşa bir ürün almasını sağlayan, her ortağın payını ve ödeme durumunu belirtebildiği karmaşık bir form bulunur. Bu form, `/api/purchases` endpoint'ine tek bir istek göndererek tüm bu veritabanı işlemlerini tetikler.

2.  **İşlem (`Process`):**
    *   **İşlevi:** Sürme, ekim, ilaçlama, gübreleme gibi tarımsal faaliyetlerin takibini yapar.
    *   **Veritabanı Etkileşimi:**
        *   Bir `Process` kaydı oluşturulurken, hangi tarlada (`Field`), hangi işçinin (`User`) çalıştığı belirtilir.
        *   Bu işlem sırasında kullanılan envanterler (`InventoryUsage`) ve ekipmanlar (`EquipmentUsage`) kaydedilir. Bu kullanım, ilgili `Inventory` stoğundan düşülür.
        *   İşlem tamamlandığında (`finalize`), işçilik, ekipman, yakıt ve envanter maliyetleri toplanarak bir `ProcessCost` kaydı oluşturulur. Bu maliyet, `FieldExpense` ve `FieldOwnerExpense` aracılığıyla tarla ve tarla sahiplerinin giderlerine yansıtılır.
    *   **Frontend Entegrasyonu:** Frontend'de, kullanıcı bir tarla seçip yapılacak işlemi (örn: "İlaçlama") belirler. Ardından, daha önce "Alış" süreciyle envantere eklenmiş olan ilaçlardan birini seçer ve kullanılan miktarı girer. Bu bilgiler, `/api/processes` endpoint'ine gönderilerek stok düşümü ve maliyetlendirme işlemlerinin yapılmasını sağlar.

3.  **Sulama (`Irrigation`):**
    *   **İşlevi:** Sulama faaliyetlerinin kaydedilmesi, su ve kullanılan diğer kaynakların (örn: sulama ile verilen gübre) takibini yapar.
    *   **Veritabanı Etkileşimi:**
        *   `IrrigationLog` kaydı, hangi kuyudan (`Well`) ne kadar süreyle sulama yapıldığını tutar.
        *   `IrrigationFieldUsage` ile hangi tarlaların sulandığı ve bu sulamanın tarla sahiplerine (`IrrigationOwnerUsage`) nasıl dağıldığı kaydedilir.
        *   Eğer sulama sırasında envanterden bir ürün (örn: suda eriyen gübre) kullanıldıysa, bu `IrrigationInventoryUsage` ile belirtilir ve `Inventory` stoğundan düşülür.
    *   **Frontend Entegrasyonu:** "İşlem" sürecine benzer şekilde, kullanıcı sulanacak tarlaları ve kuyuyu seçer. Eğer sulama ile birlikte bir gübre verilecekse, envanterden ilgili gübreyi seçip miktarını girer. Bu, hem sulama kaydını oluşturur hem de envanterden düşümü tetikler.

---

## 2. Güçlü Yönler

*   **Normalleştirilmiş ve İlişkisel Veri Bütünlüğü:** Modeller (`Purchase`, `Process`, `Inventory`, `Debt` vb.) arasındaki ilişkiler, verinin tutarlı ve tekrar etmeden saklanmasını sağlar. Örneğin, bir alış işlemiyle yaratılan borç, direkt olarak o alış kaydına bağlıdır.
*   **Transaction Güvenliği:** Birbirine bağlı birden çok veritabanı işleminin (örn: `Purchase` sırasında `Inventory` ve `Debt` oluşturma) tek bir transaction içinde yapılması, veri tutarlılığını garanti altına alır. Bir adım başarısız olursa, tüm işlem geri alınır.
*   **Modüler ve Genişletilebilir API:** Her sürecin kendi API modülü altında yönetilmesi, kodun okunabilirliğini ve bakımını kolaylaştırır. Yeni bir tarımsal faaliyet (örn: "Toprak Analizi") eklemek, mevcut yapıyı bozmadan yeni bir `ProcessType` ve ilgili servislerle mümkün olabilir.

---

## 3. Geliştirilebilecek Yönler ve Öneriler

### a. Veri Tutarlılığı ve Kullanıcı Hatalarını Önleme

*   **Sorun:** Bir `Process` veya `Irrigation` işlemi için envanter seçilirken, frontend'in gönderdiği birim maliyet (`costPrice`) ile `Inventory` modelindeki asıl maliyet arasında tutarsızlık olabilir. Bu, maliyet hesaplamalarında hatalara yol açabilir.
*   **Öneri:** Frontend'den maliyet bilgisi almak yerine, **sadece `inventoryId` ve `quantity` alınmalıdır.** Backend, bu `inventoryId`'yi kullanarak veritabanındaki `Inventory` kaydından güncel ve güvenilir `costPrice`'ı kendisi çekmeli ve hesaplamaları bu değer üzerinden yapmalıdır. Bu, veri bütünlüğünü garanti eder ve frontend'deki olası hataları veya manipülasyonları engeller.

### b. Stok Yönetiminin İyileştirilmesi

*   **Sorun:** Bir `Process` işlemi "Taslak" (`DRAFT`) olarak kaydedildiğinde, kullanılacak envanter miktarı belirtilse bile stoktan düşüm yapılmaz. İşlem "Kesinleştiğinde" (`FINALIZED`) düşüm yapılır. Eğer iki farklı kullanıcı aynı anda aynı envanteri kullanarak bir işlem taslağı oluşturursa, stokta yeterli ürün olmamasına rağmen her iki işlem de oluşturulabilir.
*   **Öneri:** Bir işlem `DRAFT` statüsündeyken, kullanılacak envanter miktarı **"rezerve edilmiş"** olarak işaretlenmelidir. `Inventory` modeline `reservedQuantity` gibi bir alan eklenebilir. Böylece, başka bir işlem başlatıldığında, mevcut stok (`totalQuantity`) yerine `(totalQuantity - reservedQuantity)` değeri dikkate alınır. İşlem kesinleştiğinde rezerve miktar gerçek stoktan düşülür, iptal edildiğinde ise rezervasyon kaldırılır.

### c. Frontend ve Backend Arası Bağlantıyı Güçlendirme

*   **Sorun:** "Alış" ile alınan bir ürünün (örn: "X Marka Gübre") hangi "İşlem" veya "Sulama" faaliyetinde kullanıldığını direkt olarak takip etmek zor olabilir. Raporlama için bu bağlantı kritiktir.
*   **Öneri:** `InventoryUsage` ve `IrrigationInventoryUsage` modellerine, bu kullanımın hangi `Purchase` işleminden gelen stoktan yapıldığını belirten bir `purchaseId` alanı (opsiyonel) eklenebilir. Bu, "X Faturasındaki gübrelerin %60'ı A tarlasında, %40'ı B tarlasında kullanılmıştır" gibi çok değerli raporların üretilmesini sağlar. Bu, özellikle FIFO (İlk Giren İlk Çıkar) veya LIFO (Son Giren İlk Çıkar) gibi stok maliyetlendirme yöntemleri uygulanmak istenirse temel oluşturacaktır.

### d. Raporlama Kabiliyetlerinin Artırılması

*   **Sorun:** Mevcut yapı, operasyonel verileri etkin bir şekilde kaydeder, ancak stratejik analizler için özetlenmiş verilere ihtiyaç duyar. Örneğin, "Bu sezonun toplam ilaçlama maliyeti nedir?" sorusuna cevap vermek için birden çok tablonun birleştirilmesi gerekir.
*   **Öneri:** `Season` (Sezon) modeline `totalFertilizerCost`, `totalPesticideCost`, `totalIrrigationCost` gibi özet maliyet alanları eklenebilir. Bu alanlar, ilgili bir `Process` veya `Irrigation` kesinleştiğinde bir veritabanı trigger'ı veya bir cron job aracılığıyla periyodik olarak güncellenebilir. Bu, frontend'e anlık ve performanslı bir şekilde özet veri sunulmasını sağlar.

---

## 4. Örnek Senaryo: İlaçlama Sürecinin İdeal Akışı

1.  **Alış:**
    *   Kullanıcı, "ABC Tarım" firmasından 100 litre "ZehirX" marka ilacı, litre başı 500 TL'den satın alır. Bu alışı 2 ortak (%50-%50) yapar.
    *   `POST /api/purchases` çağrılır.
    *   **Backend:**
        *   `Purchase` kaydı oluşturulur.
        *   `Inventory`'e 100 litre "ZehirX" eklenir, `costPrice`'ı 500 TL olarak belirlenir.
        *   İki ortak için `InventoryOwnership` kaydı oluşturulur (her biri 50 litre).
        *   Ödeme yapmayan ortak için `Debt` kaydı yaratılır.

2.  **İşlem (İlaçlama):**
    *   Kullanıcı, "Günebakan Tarlası" için "İlaçlama" `Process`'i başlatır.
    *   Envanter listesinden "ZehirX" ilacını seçer ve 20 litre kullanacağını belirtir.
    *   `POST /api/processes` çağrılır.
    *   **Backend:**
        *   Sadece `inventoryId` ("ZehirX" ID'si) ve `quantity` (20) alınır.
        *   Veritabanından "ZehirX"in `costPrice`'ı (500 TL) okunur.
        *   `InventoryUsage` kaydı oluşturulur: `quantity: 20`, `totalCost: 10000`.
        *   "ZehirX" `Inventory` kaydının `totalQuantity` alanı 80'e düşürülür.
        *   İşlem kesinleştiğinde, 10.000 TL'lik bu maliyet `ProcessCost` ve ardından `FieldOwnerExpense` aracılığıyla tarla sahiplerine yansıtılır.

Bu akış, verinin tek bir kaynaktan (veritabanı) yönetilmesini sağlayarak tutarlılığı en üst düzeye çıkarır ve sistemin güvenilirliğini artırır.
