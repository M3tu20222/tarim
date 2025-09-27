
# Ürün Gereksinim Dokümanı: Yeni Nesil Tarım Yönetim Sistemi (Farmin 2.0)

**Sürüm:** 1.0
**Tarih:** 12 Eylül 2025

## 1. Giriş

### 1.1. Proje Vizyonu

Modern çiftçilerin ve tarım işletmelerinin karmaşık operasyonel süreçlerini basitleştiren, mobil öncelikli, sezgisel ve kullanıcı dostu bir dijital tarım yönetim platformu oluşturmak.

### 1.2. Problem

Mevcut tarım yönetim sistemi, zamanla eklenen çok sayıda özellik nedeniyle karmaşıklaşmış, bu da kullanıcıların sistemi verimli bir şekilde kullanmasını zorlaştırmıştır. Özellikle farklı kullanıcı rolleri (İşçi, Sahip, Admin) için arayüzlerin yeterince optimize edilmemiş olması, kafa karışıklığına ve hatalı veri girişlerine yol açmaktadır.

**Çözüm:** Farmin 2.0, temel işlevleri koruyarak, kullanıcı deneyimini (UX) ve arayüzünü (UI) tamamen yeniden tasarlayarak bu karmaşıklığı ortadan kaldırmayı hedefler. Her rol için özel olarak tasarlanmış, sadece ihtiyaç duyulan bilgi ve araçları sunan bir yapı kurulacaktır.

### 1.3. Hedef Kitle

*   **Çiftlik Sahibi (Owner):** İşletmesinin genel durumunu (finans, operasyonlar, verimlilik) anlık olarak görmek, kaynakları (tarla, işçi, ekipman) yönetmek ve stratejik kararlar almak isteyen kişi. Teknolojiyi işini büyütmek için bir araç olarak görür ama karmaşık sistemlerle uğraşmak istemez.
*   **Tarım İşçisi (Worker):** Kendisine atanan görevleri (sulama, ilaçlama, hasat vb.) sahada, genellikle mobil cihaz üzerinden kolayca görmek ve tamamlandığında bildirmek isteyen kişi. Basit, net ve hızlı bir arayüze ihtiyaç duyar.
*   **Sistem Yöneticisi (Admin):** Sistemin genel ayarlarını yöneten, kullanıcıları (sahipler, işçiler) sisteme ekleyip rollerini düzenleyen teknik sorumlu.

---

## 2. Proje Kapsamı ve Öncelikli Özellikler

Farmin 2.0, "daha az ama daha iyi" prensibiyle yola çıkacaktır. İlk sürüm, mevcut sistemin en kritik ve en çok kullanılan özelliklerinin basitleştirilmiş versiyonlarına odaklanacaktır.

### 2.1. Kapsam İçi (In-Scope)

*   **Rol Odaklı Dashboard'lar:** Her kullanıcı rolü (Admin, Owner, Worker) için tamamen ayrı, kişiselleştirilmiş ana sayfalar.
*   **Kullanıcı ve Rol Yönetimi (Admin):** Kullanıcı ekleme, silme, düzenleme ve rol atama.
*   **Tarla Yönetimi (Owner):** Tarla ekleme/düzenleme, konum, boyut gibi temel bilgilerin yönetimi. Tarlaya ürün ve sezon atama.
*   **Görev (İş) Yönetimi (Owner/Worker):** Sahiplerin işçilere görev (örn: "Buğday tarlasını sula") ataması ve işçilerin bu görevleri mobil cihazlarından görüp durumunu ("Tamamlandı") olarak işaretlemesi.
*   **Basitleştirilmiş Sulama Kaydı (Worker/Owner):** İşçilerin hangi tarlayı, ne kadar süre suladığını kolayca kaydetmesi. Sahiplerin bu kayıtları görmesi.
*   **Temel Finans ve Fatura Dağıtımı (Owner):** Özellikle kuyu kullanımı gibi ortak masrafların, tarla sahiplerinin hisselerine göre otomatik olarak borç hanelerine yazılması.
*   **Anlık Bildirimler:** Görev atamaları, tamamlanan işler ve fatura bildirimleri gibi önemli olaylar için uygulama içi bildirimler.

### 2.2. Kapsam Dışı (Out-of-Scope - Sonraki Sürümler İçin)

*   Detaylı envanter takibi (stok seviyeleri, son kullanma tarihleri).
*   Ekipman yönetimi ve yakıt tüketimi takibi.
*   Gelişmiş raporlama ve veri analizi.
*   Harici sistemlerle (muhasebe yazılımları, hava durumu servisleri) entegrasyon.

---

## 3. Fonksiyonel Gereksinimler

### 3.1. Kullanıcı Yönetimi
*   **FG-1:** Kullanıcılar e-posta ve şifre ile sisteme giriş yapabilmelidir.
*   **FG-2 (Admin):** Admin, yeni kullanıcı oluşturabilmeli, rolünü (Admin, Owner, Worker) atayabilmeli ve mevcut kullanıcıları düzenleyip silebilmelidir.

### 3.2. Dashboard'lar
*   **FG-3 (Owner):** Sahip, giriş yaptığında tüm tarlalarının bir özetini, aktif işçi sayısını ve son finansal durumu (toplam borç/alacak) gösteren bir dashboard görmelidir.
*   **FG-4 (Worker):** İşçi, giriş yaptığında sadece kendisine atanmış olan "Aktif Görevler" listesini ve sorumlu olduğu tarlaları görmelidir.
*   **FG-5 (Admin):** Admin, sistemdeki toplam kullanıcı ve tarla sayısını gösteren basit bir özet dashboard görmelidir.

### 3.3. Tarla ve Görev Yönetimi
*   **FG-6 (Owner):** Sahip, sisteme yeni bir tarla ekleyebilmelidir (ad, konum, boyut).
*   **FG-7 (Owner):** Sahip, bir işçiye belirli bir tarla için bir görev atayabilmelidir (örn: "X tarlasını sula", "Y tarlasına gübre at").
*   **FG-8 (Worker):** İşçi, kendisine atanan görevi tamamladığında tek bir tuşla "Bitti" olarak işaretleyebilmelidir. Sistem, bu işlemi kimin, ne zaman yaptığını kaydetmelidir.

### 3.4. Sulama ve Faturalandırma
*   **FG-9 (Worker):** İşçi, bir sulama işlemi başlattığında ve bitirdiğinde bunu uygulama üzerinden kaydedebilmelidir. Hangi kuyu ve hangi tarlanın sulandığı bilgisi zorunlu olmalıdır.
*   **FG-10 (Owner):** Sahip, belirli bir periyottaki (örn: son 1 ay) toplam kuyu kullanım maliyetini sisteme girebilmelidir.
*   **FG-11 (Owner):** Sistem, girilen toplam maliyeti, sulama kayıtlarına ve tarla sahiplik oranlarına göre otomatik olarak ilgili sahiplerin borç hanesine işlemelidir.

---

## 4. Fonksiyonel Olmayan Gereksinimler

*   **FOG-1 (Kullanılabilirlik):** Bir işçinin kendisine atanmış bir görevi "tamamlandı" olarak işaretlemesi 3 tıklamayı geçmemelidir.
*   **FOG-2 (Performans):** Tüm sayfalar ve dashboard'lar 2 saniyenin altında yüklenmelidir.
*   **FOG-3 (Mobil Uyumluluk):** Sistem, mobil tarayıcılarda (Chrome, Safari) eksiksiz ve sorunsuz çalışmalıdır. Özellikle işçi arayüzü, küçük ekranlar için tasarlanmalıdır.
*   **FOG-4 (Güvenlik):** Tüm şifreler veritabanında şifrelenmiş (hashed) olarak saklanmalıdır. Bir kullanıcı, rolü dışındaki hiçbir veriye (API yoluyla dahi) erişememelidir.
*   **FOG-5 (Veri Bütünlüğü):** Bir tarla silindiğinde, o tarlaya bağlı tüm görev ve sulama kayıtları anonimleştirilmeli veya arşivlenmelidir; asla tamamen silinmemelidir.

---

## 5. UI/UX Tasarım Prensipleri

*   **Netlik ve Basitlik:** Her ekran, tek bir ana amaca hizmet etmelidir. Gereksiz menüler, butonlar ve bilgiler kaldırılmalıdır.
*   **Rol Odaklı Arayüz:** Bir işçinin arayüzü, bir sahibin arayüzünden tamamen farklı görünmeli ve hissettirmelidir. Renkler, ikonlar ve terminoloji role göre özelleştirilmelidir.
*   **Görsel Geri Bildirim:** Kullanıcı bir işlem yaptığında (örn: görev tamamlama), sistem animasyon veya net bir mesaj ile işlemin başarılı olduğunu anında bildirmelidir.

---

## 6. Teknik Hususlar

*   **Teknoloji Yığını:** Mevcut başarılı yapı korunacaktır:
    *   **Frontend:** Next.js (React)
    *   **Backend:** Next.js API Routes
    *   **Veritabanı:** Supabase
    *   **ORM:** Prisma
    *   **Stil:** Tailwind CSS
*   **Veritabanı Şeması:** `farmin.json` analizinde ortaya çıkan karmaşık ilişkiler basitleştirilecektir. Örneğin, `Process`, `Equipment` ve detaylı `Inventory` modelleri ilk sürümde daha basit yapılarla değiştirilecek veya kaldırılacaktır. Odak noktası `User`, `Field`, `Task` (yeni model), ve `IrrigationLog` olacaktır.
*   **API Mimarisi:** Tüm API uç noktaları, rol tabanlı yetkilendirme kontrollerini `middleware` üzerinden geçmelidir.

---

## 7. Başarı Metrikleri

*   **Kullanıcı Memnuniyeti:** Yeni arayüzü kullanan işçiler ve sahiplerle yapılacak anketlerde %80'in üzerinde "kolay" ve "anlaşılır" değerlendirmesi alınması.
*   **Görev Tamamlama Süresi:** Bir işçinin yeni bir görevi görüp tamamlandı olarak işaretlemesi için geçen ortalama sürenin, mevcut sisteme göre %50 azalması.
*   **Hatalı Veri Girişi:** Destek talepleri ve manuel düzeltme gerektiren veri hatalarının sayısının ilk 3 ayda %70 oranında azalması.
