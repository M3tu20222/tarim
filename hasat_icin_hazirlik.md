# Hasat Analizi ve Raporlama Hazırlık Planı

## 1. Amaç

Bu dokümanın amacı, hasadı tamamlanmış (özellikle buğday ve nohut) tarlalar için detaylı bir maliyet ve kar/zarar analizi raporu oluşturma sürecini planlamaktır. Temel hedef, her bir ürünün ilgili sezondaki dekar başına maliyetini ve net karını şeffaf bir şekilde ortaya koymaktır.

## 2. Analiz İçin Gerekli Veri Kalemleri

Raporun doğruluğu, sistemdeki verilerin eksiksiz ve doğru olmasına bağlıdır. Aşağıdaki veri kalemlerinin toplanması ve analiz edilmesi gerekmektedir.

### A. Tarla ve Sezon Bilgileri (Temel Veriler)
- **Tarla:** Analizi yapılacak tarlanın adı, büyüklüğü (dekar).
- **Sezon:** İlgili tarım sezonu (örn: "2025 İlkbahar Buğday Sezonu").
- **Ürün:** Tarlaya ekilen ürün (Buğday, Nohut vb.).
- **Toplam Hasat Miktarı:** Tarladan elde edilen toplam ürün miktarı (ton veya kg).

### B. Maliyet Kalemleri (Giderler)

Bu kalemler, `Process` (İşlem), `Purchase` (Alış) ve `IrrigationLog` (Sulama) kayıtlarından toplanacaktır.

1.  **Tohum Maliyeti:**
    -   İlgili `Purchase` kaydından tohumun alış fiyatı.
    -   `Process` (Ekim) kaydından tarlada kullanılan tohum miktarı.

2.  **Toprak Hazırlığı ve Ekim Giderleri:**
    -   `Process` (Sürme, Ekim vb.) kayıtlarından:
        -   **İşçilik Maliyetleri:** İşlemi yapan `worker` için harcanan süre ve maliyet.
        -   **Ekipman Maliyetleri:** Kullanılan traktör, mibzer vb. ekipmanların amortisman veya kira giderleri (`EquipmentUsage`).
        -   **Yakıt Maliyetleri:** Ekipmanların tükettiği yakıt miktarı ve `Purchase` kayıtlarından gelen birim yakıt fiyatı.

3.  **Gübreleme Giderleri:**
    -   `Process` (Gübreleme) veya `IrrigationLog` (sulama ile gübreleme) kayıtlarından:
        -   Kullanılan gübrelerin türü ve miktarı (`InventoryUsage`).
        -   Gübrelerin `Purchase` kayıtlarından gelen birim alış fiyatları.
        -   İşçilik, ekipman ve yakıt giderleri.

4.  **İlaçlama Giderleri:**
    -   `Process` (İlaçlama) kayıtlarından:
        -   Kullanılan ilaçların türü ve miktarı (`InventoryUsage`).
        -   İlaçların `Purchase` kayıtlarından gelen birim alış fiyatları.
        -   İşçilik, ekipman ve yakıt giderleri.

5.  **Sulama Giderleri:**
    -   `IrrigationLog` kayıtlarından:
        -   Toplam sulama süresi.
        -   Kuyu faturalarından (`WellBillingPeriod`) bu tarlaya yansıyan elektrik maliyeti.
        -   Sulama sürecindeki işçilik maliyetleri.

6.  **Hasat ve Nakliye Giderleri:**
    -   `Process` (Hasat, Taşıma) kayıtlarından:
        -   Biçerdöver maliyeti (kira veya kendi ekipmanı ise amortisman/yakıt).
        -   Ürünün tarladan depoya veya satış noktasına taşınması için nakliye ücretleri.
        -   Hasat ve taşıma sürecindeki işçilik maliyetleri.

### C. Gelir Kalemleri
- **Satış Geliri:** Hasat edilen ürünün satışından elde edilen toplam gelir. Bu, farklı müşterilere veya pazarlara yapılan birden fazla satışı içerebilir. (Bu veri için sisteme "Satış" modülü eklenmesi gerekebilir veya manuel olarak girilebilir).
- **Destek ve Teşvikler:** Devlet veya kurumlardan alınan ürün bazlı desteklemeler.

## 3. Hesaplama Metodolojisi

1.  **Toplam Giderin Hesaplanması:**
    -   Yukarıdaki tüm maliyet kalemleri (B başlığı altındakiler) ilgili tarla ve sezon için toplanır.
    -   `Toplam Gider = Tohum + Toprak Hazırlığı + Gübre + İlaç + Sulama + Hasat/Nakliye`

2.  **Dekar Başına Maliyetin Hesaplanması:**
    -   `Dekar Başına Maliyet = Toplam Gider / Tarlanın Toplam Dekar Alanı`

3.  **Toplam Gelirin Hesaplanması:**
    -   `Toplam Gelir = Toplam Satış Geliri + Toplam Destek Geliri`

4.  **Net Kar/Zararın Hesaplanması:**
    -   `Net Kar/Zarar = Toplam Gelir - Toplam Gider`

5.  **Dekar Başına Net Kar/Zararın Hesaplanması:**
    -   `Dekar Başına Net Kar/Zarar = Net Kar/Zarar / Tarlanın Toplam Dekar Alanı`

## 4. Raporlama Süreci ve Sonraki Adımlar

1.  **Veri Toplama:** İlgili sezon ve tarlalara ait tüm `Process`, `Purchase` ve `IrrigationLog` kayıtlarının eksiksiz olarak sisteme girildiğinden emin olunmalıdır.
2.  **API Geliştirmesi:** Belirtilen bir `fieldId` ve `seasonId` için yukarıdaki tüm maliyet ve gelir kalemlerini otomatik olarak toplayıp hesaplayan yeni bir API endpoint'i (`/api/reports/harvest-analysis`) geliştirilmelidir.
3.  **Arayüz Geliştirmesi:** Kullanıcının tarla ve sezon seçerek bu analizi çalıştırabileceği ve sonuçları anlaşılır bir formatta (tablolar, özet kartları vb.) görebileceği bir raporlama sayfası tasarlanmalıdır.
4.  **Satış Verisi Girişi:** Ürün satışlarının kaydedileceği bir mekanizma (yeni bir modül veya basit bir form) sisteme eklenmelidir.

Bu plan, istenen detaylı hasat analizini gerçekleştirmek için gereken adımları ve veri altyapısını özetlemektedir.
