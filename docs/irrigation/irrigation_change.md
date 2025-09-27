# Sulama Modülü İçin Çok Adımlı Form ve Parçalı API Yaklaşımı

Bu belge, `Irrigation` (Sulama) modülündeki sulama kaydı oluşturma sürecini, `process_envanter.md` belgesinde açıklanan çok adımlı form (wizard) ve parçalı API yaklaşımına dönüştürmek için hazırlanan detaylı planı içermektedir. Bu dönüşüm, mevcut monolitik yapının neden olduğu performans sorunlarını gidermeyi ve kullanıcı deneyimini iyileştirmeyi hedeflemektedir.

## Hedef

`Irrigation` modülündeki sulama kaydı oluşturma sürecini, `process_envanter.md` belgesinde açıklanan çok adımlı form (wizard) ve parçalı API yaklaşımına dönüştürmek. Bu, hem performans sorunlarını giderecek hem de kullanıcı deneyimini iyileştirecektir.

## Planlanan Adımlar

### 1. Backend (API Katmanı) Değişiklikleri

`app/api/irrigation/route.ts` dosyası, sulama kaydı oluşturma sürecini yönetmek için üç ana endpoint'e bölünecektir:

*   **`POST /api/irrigation` (Initiate Endpoint):**
    *   **Amaç:** Yeni bir sulama kaydının temel bilgilerini alır ve veritabanında bir taslak (`DRAFT`) durumuyla `IrrigationLog` kaydını oluşturur.
    *   **Giriş Verileri:** `startDateTime`, `duration`, `notes`, `wellId`, `seasonId`, `createdBy` gibi temel sulama bilgileri.
    *   **Dönen Değer:** Oluşturulan `IrrigationLog` kaydının benzersiz ID'si (`irrigationLog.id`). Bu ID, sonraki adımlarda kullanılacaktır.
    *   **Kaldırılan İşlemler:** Mevcut `POST` fonksiyonundaki tarla kullanımları, envanter düşüşleri, sahip özetleri ve bildirim oluşturma gibi karmaşık ve zaman alıcı tüm işlemler bu endpoint'ten kaldırılacaktır. Bu sayede ilk API çağrısı hızlıca tamamlanacak ve kullanıcıya anında geri bildirim sağlanacaktır.

*   **Yeni Endpoint: `PUT /api/irrigation/details/[irrigationId]` (Update/Intermediate Step Endpoint):**
    *   **Amaç:** Belirli bir `irrigationId`'ye sahip taslak sulama kaydının ara bilgilerini (tarla kullanımları, envanter düşüşleri vb.) günceller. Bu endpoint, formun her bir ara adımında çağrılacaktır.
    *   **Giriş Verileri:** Güncellenecek `irrigationId` (URL parametresi olarak) ve ilgili adımın verileri (örneğin, `fieldIrrigations` veya `inventoryDeductions`).
    *   **Gerçekleştirilecek İşlemler:**
        *   **Tarla Kullanımları:** `IrrigationFieldUsage` kayıtları oluşturulacak veya güncellenecek.
        *   **Envanter Düşüşleri:** `IrrigationInventoryUsage` kayıtları oluşturulacak, `Inventory` ve `InventoryOwnership` modellerindeki stoklar güncellenecek ve `InventoryTransaction` kayıtları oluşturulacak.
        *   **Sahip Özetleri:** `IrrigationOwnerSummary` kayıtları oluşturulacak veya güncellenecek.
    *   **Transaction Yönetimi:** Her bir güncelleme işlemi kendi içinde atomik transaction'lar veya ayrı ayrı `await` çağrıları ile yönetilebilir. Bu, büyük bir transaction'ın parçalara ayrılmasını sağlayarak veritabanı kilitlenmesi ve zaman aşımı riskini azaltacaktır.

*   **Yeni Endpoint: `POST /api/irrigation/finalize/[irrigationId]` (Finalize Endpoint):**
    *   **Amaç:** Belirli bir `irrigationId`'ye sahip sulama kaydının durumunu `COMPLETED` olarak günceller ve sulama sürecini sonlandırır. Ayrıca, zaman alıcı asenkron görevleri tetikler.
    *   **Giriş Verileri:** Sonlandırılacak `irrigationId` (URL parametresi olarak).
    *   **Gerçekleştirilecek İşlemler:**
        *   `IrrigationLog` kaydının `status` alanı `COMPLETED` olarak güncellenecek.
        *   Maliyet hesaplamaları, bildirim gönderme (sahiplere ve yöneticilere), rapor güncellemeleri gibi doğrudan kullanıcı deneyimini anında etkilemeyen işlemler tetiklenecek. Bu işlemler doğrudan bu endpoint içinde veya bir mesaj kuyruğu (örneğin, Vercel Background Functions veya Redis Queue) aracılığıyla arka plana taşınabilir. İlk aşamada doğrudan bu endpoint içinde tetiklenebilir.

### 2. Frontend (Component Katmanı) Değişiklikleri

`components/irrigation/irrigation-form.tsx` dosyası, kullanıcıya aşamalı ve anlaşılır bir akış sunmak için çok adımlı bir form (wizard) yapısına dönüştürülecektir:

*   **State Yönetimi:**
    *   `currentStep` adında bir `useState` değişkeni (`const [currentStep, setCurrentStep] = useState(0);`) ile formun hangi adımda olduğu takip edilecek.
    *   İlk adımda oluşturulan `irrigationId`'yi tutmak için bir `useState` değişkeni (`const [irrigationId, setIrrigationId] = useState<string | null>(null);`) eklenecek.

*   **Form Şeması ve Doğrulama:**
    *   Mevcut tek büyük `irrigationFormSchema` yerine, her bir form adımı için ayrı Zod şemaları tanımlanacak.
    *   `react-hook-form`'un `form.trigger()` metodu kullanılarak sadece mevcut adımın alanları doğrulanacak. Bu, kullanıcının sadece ilgili adımın verilerini doğru girmesini sağlayacak ve daha iyi bir kullanıcı deneyimi sunacaktır.

*   **Adım Bileşenleri/Render Mantığı:**
    *   Form, `currentStep` değerine göre farklı içerikleri koşullu olarak render edecek. Her adım için ayrı React bileşenleri oluşturulabilir veya tek bir bileşen içinde mantık ayrımı yapılabilir.
    *   **Adım 0: Temel Bilgiler:**
        *   Sulama tarihi, başlangıç saati, toplam sulama süresi ve notlar gibi temel alanları içerecek.
        *   "İleri" butonuna basıldığında, bu adımın verileri `POST /api/irrigation` (Initiate) endpoint'ine gönderilecek.
        *   API çağrısı başarılı olursa, dönen `irrigationId` state'e kaydedilecek ve `currentStep` bir sonraki adıma (`1`) artırılacak.
    *   **Adım 1: Tarla Seçimi:**
        *   Sulama yapılacak tarlaların ve sulanan alan yüzdelerinin girildiği `fieldIrrigations` alanlarını içerecek.
        *   "İleri" butonuna basıldığında, bu adımın verileri (`fieldIrrigations`) `PUT /api/irrigation/details/[irrigationId]` endpoint'ine gönderilecek.
        *   API çağrısı başarılı olursa, `currentStep` bir sonraki adıma (`2`) artırılacak.
    *   **Adım 2: Envanter Kullanımları:**
        *   Kullanılan envanterlerin (gübre, pestisit vb.) sahibi, türü ve miktarı gibi bilgilerin girildiği `inventoryUsages` alanlarını içerecek.
        *   "İleri" butonuna basıldığında, bu adımın verileri (`inventoryUsages`) `PUT /api/irrigation/details/[irrigationId]` endpoint'ine gönderilecek.
        *   API çağrısı başarılı olursa, `currentStep` bir sonraki adıma (`3`) artırılacak.
    *   **Adım 3: Özet ve Onay:**
        *   Önceki adımlarda girilen tüm bilgilerin bir özetini gösterecek. Kullanıcının son bir kontrol yapmasına olanak tanıyacak.
        *   "Kaydet/Bitir" butonuna basıldığında, `POST /api/irrigation/finalize/[irrigationId]` endpoint'i çağrılacak. Bu çağrı, sulama kaydını tamamlayacak ve arka plan işlemlerini tetikleyecektir.

*   **Navigasyon:**
    *   "İleri" ve "Geri" butonları, `currentStep` state'ini güncelleyerek form adımları arasında geçişi sağlayacak.
    *   Her adımda ilgili API çağrısı yapılacak ve başarılı olursa bir sonraki adıma geçilecek. Hata durumunda kullanıcıya geri bildirim sağlanacak.

*   **`irrigationId` Taşıma:**
    *   İlk adımda alınan `irrigationId`, sonraki API çağrılarında URL parametresi olarak kullanılacak ve frontend state'inde taşınacak.

*   **Geri Bildirim ve İlerleme Göstergesi:**
    *   Her adımın sonunda `toast` mesajları ile anlık başarı veya hata bildirimleri sunulacak.
    *   Kullanıcının işlemin neresinde olduğunu görmesi için bir ilerleme çubuğu veya adım göstergesi (örneğin, `shadcn/ui` bileşenleri kullanılarak) eklenecek.

### 3. Veritabanı Şeması (Prisma Schema) Kontrolü

*   `prisma/schema.prisma` dosyasında `IrrigationLog` modelinin `status` alanı `String` olarak tanımlanmıştır. Bu, `DRAFT`, `COMPLETED`, `CANCELLED` gibi durumları doğrudan destekleyebilir. Herhangi bir enum değişikliğine gerek yoktur.
*   `IrrigationLog` ile ilgili diğer modeller (`IrrigationFieldUsage`, `IrrigationInventoryUsage`, `IrrigationOwnerSummary`) ve ilişkileri mevcut ve planlanan yapıya uygun durumdadır.

### 4. Test ve Doğrulama

*   Her adımın API çağrılarının doğru çalıştığından ve veritabanı işlemlerinin beklendiği gibi gerçekleştiğinden emin olmak için kapsamlı testler yapılacaktır.
*   Kullanıcı arayüzünün akıcı, hatasız ve kullanıcı dostu çalıştığı doğrulanacaktır.

Bu güncellenmiş plan, `process_envanter.md` belgesindeki prensipleri `irrigation` modülüne uygulamak için kapsamlı bir yol haritası sunmaktadır.
