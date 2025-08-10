# Alış Kaydı Süreci Raporu

Bu rapor, sistemde yeni bir alış kaydının nasıl oluşturulduğunu, ilgili varlıkların (ortaklar, sezon, alacaklı vb.) bu süreçteki rollerini ve arka planda gerçekleşen teknik adımları detaylandırmaktadır.

## Sürece Genel Bakış

Bir alış işlemi, temel olarak bir ürün veya hizmetin satın alınması, maliyetinin ortaklar arasında paylaştırılması ve bu paylaşımdan doğan borçların otomatik olarak oluşturulması adımlarını içerir. Süreç, bir kullanıcının ön yüzden girdiği verilerle başlar ve API katmanında bir veritabanı işlemi (transaction) ile güvenli bir şekilde tamamlanır.

## Veri Modelleri ve İlişkileri

Sürecin temelini `prisma/schema.prisma` dosyasında tanımlanan şu modeller oluşturur:

-   **`Purchase`**: Alış işleminin ana kaydıdır. Ürün adı, kategori, toplam maliyet, ödeme yöntemi ve tarih gibi temel bilgileri tutar. Her alış bir `Season` (sezon) ile ilişkilidir.
-   **`PurchaseContributor`**: Bir `Purchase` (alış) ile `User` (ortak) arasındaki bağlantıyı kurar. Her ortağın alıştan aldığı yüzde payını (`sharePercentage`) ve bu paya denk gelen parasal tutarı (`contribution`) saklar.
-   **`Debt`**: Borç kayıtlarını yönetir. Bir alış işlemi sonucunda, ödemeyi peşin yapan ortak (`creditor` - alacaklı) ile diğer ortaklar (`debtor` - borçlu) arasında otomatik olarak oluşturulur. Her borç kaydı, hangi alış işleminden kaynaklandığını belirtmek için `purchaseId` içerir.
-   **`Inventory` ve `InventoryOwnership`**: Satın alınan ürün (eğer şablon değilse) envantere eklenir. `Inventory` modeli ürünün kendisini, `InventoryOwnership` ise bu envanterdeki ortaklık paylarını tutar.
-   **`User`**: Sistemdeki tüm aktörleri (Admin, Owner, Worker) temsil eder. Alış sürecinde "ortak" ve "alacaklı" rollerini üstlenirler.
-   **`Season`**: Tüm alış işlemleri, finansal takibi kolaylaştırmak için bir sezona bağlanır.

## Teknik Akış ve İş Mantığı

Bir alış kaydı, `POST /api/purchases` API endpoint'i üzerinden aşağıdaki adımlarla oluşturulur:

1.  **Veri Girişi (Ön Yüz)**: Kullanıcı, ürün bilgileri, maliyet, tarih ve alışa dahil olacak ortakların listesini (pay yüzdeleriyle birlikte) bir form aracılığıyla sisteme girer. Bu aşamada, ortaklardan biri, toplam tutarı ödeyen kişi olarak **"Alacaklı" (`isCreditor: true`)** olarak işaretlenir.

2.  **API İşlemleri (`prisma.$transaction`)**: Veri bütünlüğünü korumak için tüm veritabanı operasyonları tek bir transaction içinde yürütülür:
    a.  **Doğrulama**: Gönderilen verilerin eksiksiz olduğu ve ortaklık paylarının toplamının %100 olduğu kontrol edilir.
    b.  **`Purchase` Kaydı**: Alış işleminin ana kaydı veritabanına oluşturulur.
    c.  **`PurchaseContributor` Kayıtları**: Her bir ortak için, pay yüzdesine göre düşen maliyet hesaplanır ve `PurchaseContributor` tablosuna kaydedilir. Bu kayıt, ortağı alış işlemine bağlar.
    d.  **Envanter ve Sahiplik Kayıtları**: Alınan ürün envantere (`Inventory`) eklenir ve ortakların payları oranında envanter sahiplikleri (`InventoryOwnership`) oluşturulur.
    e.  **`Debt` (Borç) Kayıtlarının Oluşturulması**: Bu, sürecin en kritik adımıdır.
        -   Sistem, ön yüzde **`isCreditor: true`** olarak işaretlenen ortağı **Alacaklı** olarak belirler.
        -   Alacaklı dışındaki diğer tüm ortaklar için birer `Debt` kaydı oluşturulur.
        -   Bu kayıtta:
            -   `debtorId` (Borçlu): Diğer ortak.
            -   `creditorId` (Alacaklı): Parayı peşin ödeyen ortak.
            -   `amount`: Borçlunun payına düşen miktar.
            -   `purchaseId`: Borcun hangi alıştan kaynaklandığını belirten referans.
    f.  **Bildirimler**: İşlem tamamlandığında, ilgili tüm ortaklara ve yöneticilere yeni alış işlemi hakkında bilgilendirme `Notification`'ı gönderilir.

## İlgili Varlıkların Rolleri

-   **Ortaklar (`Partners`)**: Alışın maliyetini paylaşan `User` (kullanıcı) kayıtlarıdır. Payları ve borçları sistem tarafından otomatik olarak hesaplanır ve yönetilir.
-   **Sezon (`Season`)**: Her alış işlemi bir sezona bağlanarak, dönemsel maliyet analizleri ve raporlamalar için temel bir gruplama sağlar.
-   **Alacaklı (`Creditor`)**: "Alacaklı" kavramı, ayrı bir kategoriden ziyade, alışın ödemesini üstlenen ortağın kendisidir. Bu kişi, `isCreditor: true` bayrağı ile belirlenir ve sistem, diğer ortakların borçlarını bu kişiye yönlendirir. Ürünün kategorisi (`ProductCategory`) ise alışın kendi bilgisidir (örn: GÜBRE, YAKIT).
-   **Kredi Kartı (`Credit Card`)**: Alışın satıcıya yapıldığı ilk ödeme yöntemi (`PaymentMethod`), `Purchase` kaydında belirtilir (örn: `CREDIT_CARD`, `CASH`). Ortakların daha sonra alacaklıya yapacakları borç ödemelerinin yöntemi ise `PaymentHistory` kayıtlarında ayrıca tutulur.
