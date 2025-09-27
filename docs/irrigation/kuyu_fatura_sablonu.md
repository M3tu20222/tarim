# Kuyu Faturası Otomatik Dağıtım Planı (Güncel API Analiziyle)

Bu doküman, mevcut API yapıları (`/api/billing/well-periods` ve ilgili modeller) incelenerek, bir kuyu faturası tutarının, ilgili sulama kayıtlarına dayanarak tarla sahiplerine otomatik olarak nasıl dağıtılacağını ve borçlandırılacağını detaylandıran bir eylem planıdır.

## Analiz ve Strateji

*   **Mevcut Durum:** Sistemde `WellBillingPeriod` adında bir model ve bu modeli yöneten API (`/api/billing/well-periods`) bulunmaktadır. Bu yapı, bir kuyu için belirli bir başlangıç ve bitiş tarihine sahip dönemler oluşturulmasına olanak tanır. API, bu dönem içindeki sulama kayıtlarını (`IrrigationLog`) bularak `WellBillingIrrigationUsage` ara tablosuna kaydeder. Ancak, bu tutarın **tarla sahiplerine dağıtılması ve borç olarak yansıtılması** kısmı eksiktir.
*   **Strateji:** Mevcut `WellBillingPeriod` yapısını, faturanın ana kaydı olarak kullanmaya devam edeceğiz. Fatura tutarı girildikten sonra çalışacak yeni bir "Hesapla ve Dağıt" mekanizması ekleyerek, bu tutarı ilgili tarla sahiplerine borç olarak yansıtacağız.

---

## Eylem Planı

### Aşama 1: Veritabanı Şemasını Genişletme (`prisma/schema.prisma`)

Hem tarla bazında hem de kişi bazında dağıtımı ve sezonluk gider entegrasyonunu desteklemek için şemayı güncelleyeceğiz.

1.  **Yeni `WellBillFieldDistribution` Modeli:**
    *   Faturanın hangi tarlaya ne kadar maliyet yansıttığını net bir şekilde kaydetmek için bu yeni modeli ekleyeceğiz.

    ```prisma
    model WellBillFieldDistribution {
      id                  String            @id @default(auto()) @map("_id") @db.ObjectId
      wellBillingPeriod   WellBillingPeriod @relation(fields: [wellBillingPeriodId], references: [id], onDelete: Cascade)
      wellBillingPeriodId String            @db.ObjectId
      field               Field             @relation(fields: [fieldId], references: [id])
      fieldId             String            @db.ObjectId
      amount              Float             // Bu tarlaya düşen toplam tutar (TL)
      createdAt           DateTime          @default(now())
    }
    ```

2.  **`FieldExpense` Modelini Genelleştirme:**
    *   Bu en önemli değişiklik. `FieldExpense` modelini sadece `ProcessCost`'a (İşlem Maliyeti) bağlı olmaktan çıkarıp, "Kuyu Faturası" gibi farklı kaynaklardan gelen giderleri de kabul edebilecek genel bir "Tarla Gideri" kaydına dönüştüreceğiz.

    ```prisma
    // Önceki haliyle FieldExpense sadece ProcessCost'a bağlıydı.
    // Yeni, daha esnek hali:
    model FieldExpense {
      id            String    @id @default(auto()) @map("_id") @db.ObjectId
      field         Field     @relation(fields: [fieldId], references: [id])
      fieldId       String    @db.ObjectId
      season        Season    @relation(fields: [seasonId], references: [id])
      seasonId      String    @db.ObjectId
      totalCost     Float     // Giderin toplam maliyeti
      description   String    // "Kuyu Faturası: Haziran 2025" veya "İlaçlama Gideri"
      expenseDate   DateTime  // Giderin tarihi
      sourceType    String    // Giderin kaynağı: "PROCESS_COST" veya "WELL_BILL"
      sourceId      String    // Kaynak kaydının ID'si (ProcessCost veya WellBillingPeriod ID'si)
      createdAt     DateTime  @default(now())
      updatedAt     DateTime  @updatedAt
    }
    ```

3.  **`WellBillDistribution` (Kişi Bazlı) Modeli:**
    *   Bu modeli, kişi bazlı borç takibi için planladığımız gibi koruyoruz.

    ```prisma
    model WellBillDistribution {
      id                  String            @id @default(auto()) @map("_id") @db.ObjectId
      wellBillingPeriod   WellBillingPeriod @relation(fields: [wellBillingPeriodId], references: [id], onDelete: Cascade)
      wellBillingPeriodId String            @db.ObjectId
      owner               User              @relation(fields: [ownerId], references: [id])
      ownerId             String            @db.ObjectId
      amount              Float             // Bu sahibe düşen tutar (TL)
      debt                Debt?             @relation(fields: [debtId], references: [id]) // Oluşturulan borç kaydıyla ilişki
      debtId              String?           @db.ObjectId @unique
      createdAt           DateTime          @default(now())

      @@unique([wellBillingPeriodId, ownerId]) // Bir sahip için dönemde tek dağıtım olabilir
    }
    ```

4.  **Veritabanını Senkronize Etme:**
    *   `npx prisma migrate dev --name feature_well_bill_distribution` komutu ile veritabanı şeması güncellenir.

---

### Aşama 2: "Hesapla ve Dağıt" API Endpoint'ini Güncelleme (Backend)

`POST /api/billing/well-periods/[id]/distribute` endpoint'inin mantığını, yeni modelleri dolduracak şekilde genişleteceğiz.

*   **Genişletilmiş İş Akışı (`prisma.$transaction` içinde):**
    1.  **Ön Kontroller ve Veri Toplama:** (Değişiklik yok)
    2.  **Ağırlık Hesaplama:** (Değişiklik yok) Tarla bazında sulama ağırlıkları hesaplanır.
    3.  **Tarla Bazında Gider Kaydı (YENİ ADIM):**
        *   Her bir tarla için toplam fatura tutarından payına düşen miktar (`field_amount`) hesaplanır.
        *   Bu bilgiyle bir `WellBillFieldDistribution` kaydı oluşturulur.
        *   Fatura döneminin tarihlerine göre ilgili `Season` (Sezon) bulunur.
        *   `sourceType: 'WELL_BILL'` ve `sourceId` olarak fatura dönemi ID'si belirtilerek, her tarla için yeni bir **`FieldExpense`** kaydı oluşturulur. **Bu adım, faturanın sezonluk giderlere eklenmesini sağlar.**
    4.  **Sahip Bazlı Dağıtım ve Borçlandırma:**
        *   Her bir tarlaya düşen maliyet (`field_amount`), o tarlanın sahiplerine (`FieldOwnership` yüzdelerine göre) dağıtılır.
        *   Her sahip için `WellBillDistribution` (kişi bazlı) ve buna bağlı bir `Debt` (Borç) kaydı oluşturulur.

---

### Aşama 3: Kullanıcı Arayüzü Etkileri (Frontend)

Bu backend güncellemesi, kullanıcı arayüzünde çok değerli yeni raporlama imkanları sunar:

1.  **Tarla Detay Sayfası:**
    *   Artık her tarlanın detay sayfasında, o tarlaya ait tüm `FieldExpense` kayıtları listelenebilir. Bu liste, hem ilaçlama gibi işlem maliyetlerini hem de "Kuyu Faturası" gibi harici giderleri bir arada gösterir.
2.  **Sezonluk Raporlar:**
    *   Bir sezon için toplam gider raporu alındığında, `FieldExpense` tablosu sorgulanacağı için kuyu faturası maliyetleri de otomatik olarak bu rapora dahil edilir.
3.  **Fatura Oluşturma Akışı:**
    *   Kullanıc�� için fatura oluşturma akışında bir değişiklik olmaz. Kullanıcı yine sadece kuyuyu, dönemi ve toplam tutarı girer. Tüm karmaşık kayıt işlemini arka plan halleder.

Bu güncellenmiş planla, kuyu faturaları sadece kişilere borç olarak yansıtılmakla kalmaz, aynı zamanda tarla ve sezon bazında finansal bir gider olarak sisteme entegre edilir. Bu, çok daha bütünsel ve doğru bir maliyet takibi sağlar.