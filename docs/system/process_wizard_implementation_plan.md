
# Process (İşlem) Sihirbazı Uygulama Planı

Bu belge, `process_wizard_improvement_report.md` raporunda belirtilen önerilerin hayata geçirilmesi için izlenmesi gereken teknik adımları adım adım açıklamaktadır. Plan, **Backend-Öncelikli** bir yaklaşımla, sağlam temeller üzerine inşa edilerek ilerleyecektir.

---

## Faz 1: Backend ve Veritabanı Yeniden Yapılandırması (Temel Atma)

Bu fazın amacı, frontend'i geliştirmeye başlamadan önce API ve veritabanı yapısını önerilen yeni, sağlam ve merkezi modele getirmektir.

### Adım 1.1: Veritabanı Şemasını Güncelleme (`prisma/schema.prisma`)

1.  **Yeni İlişki Modelini Ekleme:** Envanter kullanımını sahiplere göre atomik olarak kaydetmek için yeni bir model oluşturulacak.

    ```prisma
    // Bu model, hangi işlemin, hangi sahibin, hangi stoğunu, ne kadar kullandığını kaydeder.
    model ProcessInventoryUsage {
      id           String    @id @default(auto()) @map("_id") @db.ObjectId
      process      Process   @relation(fields: [processId], references: [id])
      processId    String    @db.ObjectId
      owner        User      @relation(fields: [ownerId], references: [id])
      ownerId      String    @db.ObjectId
      inventory    Inventory @relation(fields: [inventoryId], references: [id])
      inventoryId  String    @db.ObjectId
      quantityUsed Float     // Bu sahibin stoğundan düşülen miktar
      cost         Float     // Bu kullanımın maliyeti
      createdAt    DateTime  @default(now())
    }
    ```

2.  **Eski Alanı Kaldırma:** `Process` modelindeki `inventoryDistribution: Json?` alanı kaldırılacak. Bu, artık kullanılmayacak olan karmaşık JSON yapısını ortadan kaldırır.

3.  **Yeni İlişkiyi Ekleme:** `Process` modeline yeni `ProcessInventoryUsage` modeliyle olan ilişki eklenecek.

    ```prisma
    // Process modeli içinde...
    model Process {
      // ... diğer alanlar
      inventoryUsages ProcessInventoryUsage[] // Yeni ilişki
    }
    ```

4.  **Veritabanını Senkronize Etme:** Değişiklikleri veritabanına uygulamak için `npx prisma db push` veya `npx prisma migrate dev` komutu çalıştırılacak.

### Adım 1.2: Yeni Birleşik API Endpoint'ini Oluşturma

1.  **Yeni Dosya Oluşturma:** `app/api/processes/create-full/route.ts` adında yeni bir API rotası oluşturulacak.
2.  **Tek ve Kapsamlı `POST` Fonksiyonu:** Bu dosya, tüm işlemi tek seferde yaratacak olan `POST` fonksiyonunu içerecek. Bu fonksiyon, **Prisma'nın `$transaction` özelliğini kullanarak** tüm veritabanı işlemlerinin atomik (ya hep ya hiç) olmasını garanti edecektir.

    ```typescript
    // app/api/processes/create-full/route.ts
    import { Prisma } from '@prisma/client';
    import prisma from '@/lib/prisma';

    export async function POST(req: Request) {
      const body = await req.json();
      // body: { seasonId, fieldId, type, date, workerId, equipmentId, inventoryUsages: [{ inventoryId, quantity }] ... }

      try {
        const result = await prisma.$transaction(async (tx) => {
          // 1. Gerekli Kontroller (Authorization, vb.)

          // 2. Kaynak Kontrolleri
          //    a. Envanter Stok Kontrolü: İstekteki her inventoryUsage için stok yeterli mi?
          //    b. Yakıt Stok Kontrolü: Eğer ekipman varsa, gereken yakıt sahiplerin toplam stoğunda var mı?
          //    (Bu kontrollerin hepsi `tx` transaction nesnesi üzerinden yapılmalıdır)

          // 3. Ana `Process` Kaydını Oluştur
          const newProcess = await tx.process.create({
            data: { /* ...temel process bilgileri... */ },
          });

          // 4. Envanter Kullanımlarını ve Maliyetleri İşle
          for (const usage of body.inventoryUsages) {
            // Tarla sahiplerini ve yüzdelerini al
            const owners = await tx.fieldOwnership.findMany({ where: { fieldId: body.fieldId } });
            const inventory = await tx.inventory.findUnique({ where: { id: usage.inventoryId } });

            for (const owner of owners) {
              const quantityForOwner = usage.quantity * (owner.percentage / 100);
              const costForOwner = inventory.costPrice * quantityForOwner;

              // Yeni ProcessInventoryUsage kaydını oluştur
              await tx.processInventoryUsage.create({
                data: {
                  processId: newProcess.id,
                  ownerId: owner.userId,
                  inventoryId: usage.inventoryId,
                  quantityUsed: quantityForOwner,
                  cost: costForOwner,
                },
              });

              // İlgili sahibin ana envanter stoğunu güncelle
              // DİKKAT: Bu kısım için envanterin sahiplere göre ayrı ayrı tutulması gerekir.
              // Eğer envanter tek bir havuzdaysa, o havuzdan düşülür.
              // Mevcut yapıya göre `InventoryOwnership` üzerinden güncelleme yapılabilir.
            }
          }

          // 5. Ekipman ve Yakıt Maliyetlerini İşle (varsa)

          // 6. İşlem Maliyetini (`ProcessCost`) Hesapla ve Oluştur

          return newProcess;
        });

        return new Response(JSON.stringify(result), { status: 201 });
      } catch (error) {
        // Hata yönetimi: Stok yetersizliği, yetki hatası vb.
        return new Response(JSON.stringify({ error: error.message }), { status: 400 });
      }
    }
    ```

### Adım 1.3: Eski API Rotalarını Temizleme

*   `POST /api/processes` (sadece taslak oluşturan)
*   `PUT /api/processes?processId=...` (envanter ekleyen)
*   `POST /api/processes/finalize` (sonlandıran)

Bu endpoint'ler ya tamamen silinmeli ya da `_DEPRECATED` olarak yeniden adlandırılarak kullanımdan kaldırılmalıdır.

---

## Faz 2: Frontend Yeniden Yapılandırması (Refactoring)

Backend'de sağlam bir API temeli oluşturulduktan sonra, kullanıcı arayüzü bu yeni yapıya uygun olarak yeniden yazılabilir.

### Adım 2.1: `useProcessForm` Custom Hook'unu Oluşturma

1.  **Yeni Dosya:** `hooks/use-process-form.ts` adında bir dosya oluşturulacak.
2.  **Mantığı Taşıma:** Bu hook, `process-form.tsx` içindeki tüm mantığı barındıracak:
    *   `react-hook-form` kullanarak form state'ini yönetme.
    *   Sihirbazın mevcut adımını (`currentStep`) tutan state.
    *   Gerekli verileri (tarlalar, sezonlar, işçiler, envanterler) çeken `useEffect`.
    *   Form gönderme (`onSubmit`) fonksiyonu. Bu fonksiyon, Faz 1'de oluşturulan `POST /api/processes/create-full` endpoint'ine tek bir istek atacak.

### Adım 2.2: Ana Sihirbaz Bileşenini (`ProcessWizard.tsx`) Oluşturma

1.  **Yeni Dosya:** `components/processes/ProcessWizard.tsx`.
2.  **Sorumluluk:** Bu bileşen, sihirbazın iskeletini oluşturacak.
    *   `useProcessForm` hook'unu çağıracak.
    *   Hook'tan gelen `currentStep` değerine göre ilgili adım bileşenini (`Step1_BasicInfo`, `Step2_Resources` vb.) gösterecek.
    *   "İleri" ve "Geri" butonlarını render edecek ve bu butonların `onClick` olaylarını hook'taki ilgili fonksiyonlara bağlayacak.

### Adım 2.3: Adım Bileşenlerini Oluşturma

Bunlar, sadece UI'ı render etmekle sorumlu "aptal" (dumb) bileşenler olacak.

1.  **`Step1_BasicInfo.tsx`:**
    *   `props` olarak `form` nesnesini (react-hook-form'dan) alacak.
    *   Sezon, tarla, işlem tipi gibi temel form alanlarını render edecek.
2.  **`Step2_Resources.tsx`:**
    *   `props` olarak `form` nesnesini ve envanter listesini alacak.
    *   Ekipman seçimi için bir `Select` ve envanter kullanımı için **basitleştirilmiş bir arayüz** sunacak. Bu arayüz, bir `+ Envanter Ekle` butonu, seçilen her envanter için bir `Select` (envanter tipi) ve bir `Input` (toplam miktar) içerecek. **Sahiplere göre dağıtım UI'ı tamamen kaldırılacak.**
3.  **`Step3_Summary.tsx`:**
    *   `props` olarak `form.getValues()` ile alınan tüm form verilerini alacak.
    *   Bu verileri kullanıcıya onay için okunabilir bir formatta gösterecek.

### Adım 2.4: Eski Formu Değiştirme ve Temizleme

1.  İşlem oluşturma sayfasında (örn: `app/dashboard/owner/processes/new/page.tsx`), eski `<ProcessForm />` bileşeni yerine yeni `<ProcessWizard />` bileşeni kullanılacak.
2.  Eski `process-form.tsx` dosyası ve artık kullanılmayan diğer yardımcı bileşenler projeden tamamen silinecek.

---

## Faz 3: Test ve Doğrulama

1.  KULLANICI KENDİSİ YAPACAK
Bu planın uygulanması, kod kalitesini artıracak, bakım maliyetlerini düşürecek ve son kullanıcı için çok daha akıcı ve anlaşılır bir deneyim sunacaktır.
