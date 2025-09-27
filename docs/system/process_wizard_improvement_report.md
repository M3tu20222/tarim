
# Process (İşlem) Oluşturma Sihirbazı İyileştirme Raporu

Bu rapor, `process-form.tsx` bileşeninde ve ilgili API etkileşimlerinde tespit edilen karmaşıklıkları gidermek ve sistemi daha sağlam, kullanıcı dostu ve sürdürülebilir hale getirmek için somut öneriler sunmaktadır.

---

## 1. Mevcut Durumun Özeti (Temel Sorunlar)

Önceki analizde de belirtildiği gibi, mevcut sistemin temel sorunları şunlardır:

*   **Aşırı Karmaşık Bileşen:** `process-form.tsx`, tüm veri çekme, durum yönetimi ve iş mantığını tek bir dosyada toplayarak "God Component" (Her Şeyi Yapan Bileşen) haline gelmiştir.
*   **Kırılgan Sihirbaz Akışı:** Sihirbazın her adımda API'ye istek atması ("chatty" API), süreci yavaşlatır, ağ hatalarına karşı dayanıksız hale getirir ve veritabanında "artık" taslak kayıtlar bırakma riski taşır.
*   **Karmaşık ve Hataya Açık Envanter Mantığı:** Envanterin tarla sahipleri arasında manuel olarak paylaştırılması ve her sahip için ayrı envanter tipi seçilmesi, kullanıcı deneyimini (UX) son derece karmaşık hale getirmekte ve veri bütünlüğünü riske atmaktadır.
*   **Frontend'e Yüklenmiş İş Mantığı:** Kaynak yeterliliği (örn: yakıt kontrolü) gibi kritik kontrollerin frontend tarafında yapılması, güvenlik ve veri tutarlılığı açısından zayıf bir yaklaşımdır.

---

## 2. İyileştirme Önerileri

### Öneri 1: Sihirbaz Akışını ve API Etkileşimini Basitleştirme

**Yaklaşım:** "Stateless" Frontend Sihirbazı ve Tekil API Çağrısı

Mevcut çok adımlı ve "geveze" API yapısı yerine, tüm veriler frontend'de toplanmalı ve sihirbazın **son adımında tek bir API isteği** ile backend'e gönderilmelidir.

*   **Yeni API Endpoint'i:** `POST /api/processes/create-full` gibi yeni ve tek bir endpoint oluşturulmalıdır. Bu endpoint, bir işlemi tüm detaylarıyla (temel bilgiler, ekipman, envanter kullanımları) tek seferde oluşturmalıdır.

*   **Örnek API İsteği (Body):**
    ```json
    {
      "seasonId": "sezon_id_123",
      "fieldId": "tarla_id_456",
      "type": "PESTICIDE",
      "date": "2025-07-15T10:00:00.000Z",
      "workerId": "isci_id_789",
      "processedPercentage": 100,
      "description": "Rutin ilaçlama yapıldı.",
      "equipmentId": "ekipman_id_abc", // Opsiyonel
      "inventoryUsages": [
        {
          "inventoryId": "ilac_stok_id_xyz", // Kullanıcının seçtiği tek bir envanter stoğu
          "quantity": 20 // Kullanılan toplam miktar
        }
        // Gerekirse başka envanter türleri de eklenebilir
      ]
    }
    ```

*   **Faydaları:**
    *   **Sağlamlık:** Tüm işlem tek bir veritabanı transaction'ı içinde gerçekleşir. Ya hepsi başarılı olur ya da hiçbiri olmaz. Veritabanında artık taslak kayıtlar kalmaz.
    *   **Performans:** Çok sayıda API çağrısı yerine tek bir çağrı yapılır.
    *   **Basit Frontend:** Frontend'in adımlar arasında `processId` gibi bir state'i takip etmesine gerek kalmaz.

### Öneri 2: Envanter Tahsis Mantığını Radikal Şekilde Basitleştirme

**Yaklaşım:** Sorumluluğu Backend'e Devretme

Kullanıcının her bir tarla sahibi için ayrı ayrı envanter seçip miktar girmesi yerine, kullanıcı sadece **toplamda hangi envanterden ne kadar kullanıldığını** belirtmelidir. Paylaşım mantığı tamamen backend tarafından yönetilmelidir.

*   **Yeni Kullanıcı Arayüzü (UI):**
    *   Kullanıcı "İlaçlama" işlemini seçtiğinde, sadece "PESTICIDE" kategorisindeki envanterler listelenir.
    *   Kullanıcı "ZehirX (Stok: 100 lt)" seçeneğini tıklar.
    *   "Kullanılan Miktar" alanına "20" yazar.
    *   Bu kadar. Sahiplere göre dağıtım arayüzü tamamen kaldırılmalıdır.

*   **Yeni Backend Mantığı:**
    *   API, yukarıdaki örnekteki gibi `inventoryId` ve `quantity` alır.
    *   Backend, bu `fieldId`'ye ait `FieldOwnership` kayıtlarını çeker (örn: Sahip A: %60, Sahip B: %40).
    *   Kullanılan 20 litrenin maliyetini ve miktarını bu oranlara göre sahiplerin envanterlerinden düşer ve gider olarak yazar. (12 lt Sahip A'dan, 8 lt Sahip B'den).
    *   **Önemli:** Bu dağıtımın kaydını tutmak için `inventoryDistribution` JSON alanı yerine, düzgün bir veritabanı modeli kullanılmalıdır.

*   **Yeni Veritabanı Modeli Önerisi (`ProcessInventoryUsage`):**
    ```prisma
    model ProcessInventoryUsage {
      id        String  @id @default(auto()) @map("_id") @db.ObjectId
      process   Process @relation(fields: [processId], references: [id])
      processId String  @db.ObjectId
      owner     User    @relation(fields: [ownerId], references: [id])
      ownerId   String  @db.ObjectId
      inventory Inventory @relation(fields: [inventoryId], references: [id])
      inventoryId String @db.ObjectId
      quantityUsed Float  // Bu sahibin stoğundan ne kadar kullanıldığı
      cost         Float  // Bu kullanımın maliyeti
    }
    ```

*   **Faydaları:**
    *   **Devasa Ölçüde Basitleştirilmiş UX:** Kullanıcı için süreç 10 kat daha hızlı ve anlaşılır hale gelir.
    *   **Sorgulanabilir Veri:** "Hangi sahip, hangi işlemde, ne kadar envanter kullandı?" gibi raporlar basit veritabanı sorgularıyla oluşturulabilir.
    *   **Merkezi İş Mantığı:** Stok düşüm mantığı tek bir yerde (backend) yönetilir, bu da tutarlılığı artırır.

### Öneri 3: Frontend Bileşenini Yeniden Yapılandırma (Refactoring)

**Yaklaşım:** Sorumlulukları Ayırma (Separation of Concerns)

`process-form.tsx` bileşeni daha küçük, yönetilebilir ve yeniden kullanılabilir parçalara ayrılmalıdır.

*   **`useProcessForm` Custom Hook'u:** Veri çekme (`fetch`), form durum yönetimi ve API'ye gönderme gibi tüm karmaşık mantık bu hook içine taşınmalıdır. Bileşenler sadece bu hook'tan gelen verileri ve fonksiyonları kullanır.
*   **Ana Kapsayıcı Bileşen (`ProcessWizard.tsx`):** Bu bileşen, `useProcessForm` hook'unu kullanır ve sihirbazın genel durumunu (örn: hangi adımda olduğu) yönetir. Adımlar arasında veri aktarımını sağlar.
*   **Adım Bileşenleri:** Her sihirbaz adımı kendi bileşenine ayrılmalıdır:
    *   `Step1_BasicInfo.tsx`
    *   `Step2_Resources.tsx` (Ekipman ve basitleştirilmiş envanter seçimi)
    *   `Step3_Summary.tsx`
    Bu bileşenler, sadece kendilerine `props` ile iletilen veriyi gösterir ve kullanıcı etkileşimlerini ana bileşene (veya hook'a) bildirir.

*   **Faydaları:**
    *   **Okunabilirlik ve Bakım:** Her bileşenin tek bir sorumluluğu olur.
    *   **Test Edilebilirlik:** Hook'lar ve küçük bileşenler, büyük bir bileşene göre çok daha kolay test edilir.
    *   **Yeniden Kullanılabilirlik:** Formun parçaları (örn: ekipman seçici) başka yerlerde de kullanılabilir.

### Öneri 4: Tüm İş Mantığını ve Doğrulamaları Backend'e Taşıma

**Yaklaşım:** Güvenli ve Tek Yetkili Kaynak (Single Source of Truth)

Frontend'deki tüm iş mantığı ve veri doğrulama adımları kaldırılmalı ve tamamen backend'e devredilmelidir.

*   **Kaldırılacak Frontend Mantığı:**
    *   Ekipman seçildiğinde gereken yakıt miktarını hesaplama ve sahiplerin envanterlerini tek tek sorgulama.
*   **Backend Sorumlulukları:**
    *   `POST /api/processes/create-full` isteği geldiğinde, backend sırasıyla şunları kontrol etmelidir:
        1.  Kullanıcının bu işlemi yapma yetkisi var mı?
        2.  Belirtilen envanter (`inventoryId`) mevcut ve yeterli mi?
        3.  Eğer ekipman seçildiyse, bu ekipman için gereken yakıt, ilgili sahiplerin envanterinde toplamda mevcut mu?
    *   Herhangi bir kontrol başarısız olursa, API işlemi durdurmalı ve anlaşılır bir hata mesajı (`{ "error": "Seçilen gübre için envanterde yeterli stok bulunmuyor." }`) dönmelidir.

*   **Faydaları:**
    *   **Güvenlik:** Kullanıcı, frontend tarafında yapacağı değişikliklerle (örn: API isteğini manipüle ederek) iş mantığını atlatamaz.
    *   **Veri Bütünlüğü:** Sistemin tek doğruluk kaynağı veritabanı ve backend olur.
    *   **Daha Basit Frontend:** Frontend'in tek görevi, backend'den gelen başarı veya hata mesajını kullanıcıya göstermek olur.

---

## 3. Özet Tablo: Sorun ve Çözüm

| Sorun Alanı | Mevcut Kötü Yaklaşım | Önerilen İyi Yaklaşım |
| :--- | :--- | :--- |
| **API Etkileşimi** | Her adımda API çağıran "geveze" sihirbaz. | Tüm veriyi toplayıp sonda tek bir API isteği atma. |
| **Envanter Seçimi** | Kullanıcı her sahip için ayrı ayrı miktar ve tip girer. | Kullanıcı sadece toplam kullanılan envanteri ve miktarı seçer. |
| **Veri Saklama** | Envanter dağıtımı karmaşık bir JSON alanında saklanır. | Her envanter kullanımı için ayrı bir veritabanı kaydı (`ProcessInventoryUsage`). |
| **Bileşen Yapısı** | Tek, büyük, her şeyi yapan bileşen. | Sorumlulukları ayrılmış küçük bileşenler ve custom hook'lar. |
| **İş Mantığı** | Stok/yakıt kontrolü gibi kritik mantıklar frontend'de. | Tüm kontroller ve doğrulamalar güvenli bir şekilde backend'de yapılır. |

Bu önerilerin hayata geçirilmesi, `Process` oluşturma modülünü hem geliştiriciler için daha yönetilebilir hem de son kullanıcılar (OWNER rolü) için çok daha basit ve hatasız bir deneyim haline getirecektir.
