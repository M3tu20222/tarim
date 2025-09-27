
# Kuyu Faturası Dağıtım Algoritması ve İş Akışı Detayları

Bu doküman, bir `WellBillingPeriod` (Kuyu Fatura Dönemi) kaydına girilen toplam fatura tutarının, ilgili sulama verilerine dayanarak tarla sahiplerine borç olarak yansıtılmasına kadar olan tüm teknik süreci adım adım açıklamaktadır.

## 1. Sürecin Tetiklenmesi ve Gerekli Girdiler

Süreç, genellikle bir API endpoint'ine yapılan istek ile tetiklenir. Örneğin: `POST /api/billing/well-periods/{periodId}/distribute`.

Bu işlemi başlatmak için sisteme aşağıdaki bilgilerin daha önceden girilmiş olması gerekir:
*   **`WellBillingPeriod` Kaydı:**
    *   `id`: İşlem yapılacak fatura döneminin ID'si.
    *   `wellId`: Hangi kuyuya ait olduğu.
    *   `startDate`, `endDate`: Faturanın kapsadığı tarih aralığı.
    *   `totalAmount`: Dağıtılacak toplam fatura tutarı.
    *   `status`: "PENDING" (Beklemede) durumunda olmalıdır.

## 2. Ana Dağıtım Algoritması (Adım Adım)

Tüm dağıtım süreci, veri bütünlüğünü korumak için tek bir **atomik veritabanı işlemi** (`prisma.$transaction`) içinde yürütülmelidir. Bu, adımlardan herhangi biri başarısız olursa, yapılan tüm değişikliklerin geri alınmasını sağlar.

---

### **Adım 1: İlgili Sulama Kayıtlarının Toplanması**

İlk olarak, fatura dönemi (`startDate`, `endDate`) içinde gerçekleşen tüm sulama olaylarını bulmamız gerekir.

1.  **Filtreleme:** `IrrigationLog` tablosu, `wellId` ve tarih aralığına göre sorgulanır.
    *   Bir sulama kaydının bitiş zamanı (`startDateTime` + `duration`) hesaplanır.
    *   Sadece başlangıç veya bitiş zamanı fatura dönemiyle **kesişen** `IrrigationLog` kayıtları seçilir. Yani, `log.startDateTime < period.endDate` VE `log.endDateTime > period.startDate` koşulunu sağlayan tüm loglar alınır.

---

### **Adım 2: Her Sulama İçin "Etkin Süre" Hesaplanması**

Bir sulama, fatura döneminden önce başlayıp dönem içinde bitebilir veya dönem içinde başlayıp dönemden sonra bitebilir. Bu nedenle, her bir sulama kaydının sadece fatura d��nemi **içinde kalan kısmını** hesaplamalıyız. Buna "Etkin Süre" diyelim.

*   **Formül:**
    *   `overlapStart = max(log.startDateTime, period.startDate)`
    *   `overlapEnd = min(log.endDateTime, period.endDate)`
    *   `etkinSureDakika = (overlapEnd - overlapStart) / 60000` (Milisaniyeden dakikaya çevrim)

Eğer `etkinSureDakika <= 0` ise bu log dikkate alınmaz.

---

### **Adım 3: Tarla Bazında Toplam Ağırlıkların Hesaplanması**

Her bir sulama logunun, hangi tarlaya yüzde kaç oranında su verdiğini bilmemiz gerekir. Bu bilgi `IrrigationFieldUsage` modelinde tutulur.

1.  **Ağırlıklandırma:** Geçerli her `IrrigationLog` için, ilişkili `IrrigationFieldUsage` kayıtları çekilir.
2.  **Tarla Ağırlığı Hesaplama:** Her bir tarla için "ağırlıklı sulama süresi" hesaplanır.
    *   `tarlaAgirligi = etkinSureDakika * (fieldUsage.percentage / 100)`
3.  **Kümülatif Toplam:** Bu ağırlıklar, bir `Map` veya `dictionary` yapısında tarla ID'si bazında toplanır.
    *   `tarlaAgirliklari = { "fieldId_A": 120, "fieldId_B": 350, ... }`
    *   Bu yapı, dönem boyunca her bir tarlanın toplam ağırlıklı sulama süresini dakika cinsinden verir.

---

### **Adım 4: Toplam Maliyetin Tarlalara Oransal Dağıtımı**

Artık her tarlanın toplam ağırlığına sahip olduğumuza göre, toplam fatura tutarını (`totalAmount`) bu ağırlıklara orantılı olarak dağıtabiliriz.

1.  **Genel Toplam Ağırlık:** `toplamAgirlik = sum(tarlaAgirliklari.values())`
2.  **Tarla Başına Maliyet:** Her bir tarla için:
    *   `tarlaPayi = (tarlaAgirliklari[fieldId] / toplamAgirlik) * totalAmount`

Eğer `toplamAgirlik == 0` ise (hiç sulama yoksa), süreç bir hata ile durdurulur ve transaction geri alınır.

---

### **Adım 5: Tarla Gider Kayıtlarının Oluşturulması**

Hesaplanan `tarlaPayi`, iki ayrı modele kaydedilerek hem fatura dağıtımını hem de genel sezonluk gider takibini sağlar.

1.  **`WellBillFieldDistribution` Kaydı:**
    *   Her tarla için `create` işlemi yapılır: `{ wellBillingPeriodId, fieldId, amount: tarlaPayi }`. Bu, faturanın hangi tarlaya ne kadar yansıdığını doğrudan gösterir.
2.  **`FieldExpense` Kaydı:**
    *   Fatura dönemine göre ilgili `Season` (Sezon) bulunur.
    *   Her tarla için `create` işlemi yapılır: `{ fieldId, seasonId, totalCost: tarlaPayi, description: "Kuyu Faturası: {Dönem Adı}", expenseDate: period.endDate, sourceType: 'WELL_BILL', sourceId: period.id }`. Bu, maliyetin sezonluk raporlara dahil edilmesini sağlar.

---

### **Adım 6: Tarla Maliyetinin Sahiplere Dağıtımı**

Şimdi, her bir tarlaya atanan maliyeti, o tarlanın sahiplerine bölüştürmeliyiz.

1.  **Sahiplik Bilgisi:** Her `tarlaPayi` için, ilgili `fieldId`'ye ait `FieldOwnership` kayıtları çekilir. Bu kayıtlar, hangi sahibin (`userId`) tarlanın yüzde kaçına (`percentage`) sahip olduğunu belirtir.
2.  **Sahip Payı Hesaplama:**
    *   `sahipPayi = tarlaPayi * (ownership.percentage / 100)`

---

### **Adım 7: Yuvarlama Hatalarının Yönetimi**

Yüzdeli hesaplamalar ve float sayılar nedeniyle, `sahipPayi`'larının toplamı, `tarlaPayi`'na tam olarak eşit olmayabilir (kuruş farkları).

1.  **Farkı Hesapla:** `fark = tarlaPayi - sum(tüm sahipPaylari)`
2.  **Düzeltme:** Bu küçük fark, en büyük paya sahip olan sahibin payına eklenir. Bu, toplam tutarlılığı sağlar.

---

### **Adım 8: Nihai Sahip Kayıtlarının ve Borçların Oluşturulması**

Artık her bir sahibin ödemesi gereken net tutar belli olduğuna göre, son kayıtları oluşturabiliriz.

1.  **`WellBillDistribution` Kaydı:**
    *   Her bir sahip için `create` işlemi yapılır: `{ wellBillingPeriodId, ownerId, amount: sahipPayi, ... }`. Bu, faturanın hangi sahibe ne kadar dağıtıldığını belgeler.
2.  **`Debt` (Borç) Kaydı:**
    *   Oluşturulan `WellBillDistribution` kaydıyla ilişkili bir `Debt` kaydı yaratılır.
    *   `create` işlemi: `{ debtorId: ownerId, amount: sahipPayi, dueDate: period.paymentDueDate, reason: "Kuyu Faturası Dağıtımı", ... }`. Bu, borcu resmi olarak sahibin hesabına atar.

---

### **Adım 9: İşlemin Tamamlanması ve Durum Güncellemesi**

Tüm bu adımlar `prisma.$transaction` içinde başarıyla tamamlanırsa:

1.  **Commit:** Veritabanı işlemi onaylanır ve tüm kayıtlar kalıcı hale gelir.
2.  **Durum Güncelleme:** `WellBillingPeriod` kaydının `status` alanı "PENDING"den "DISTRIBUTED" (Dağıtıldı) olarak güncellenir.

## 3. Hata Yönetimi ve Geri Alma (Rollback)

Eğer süreç boyunca herhangi bir adımda (örneğin, bir tarlanın sahibi bulunamazsa veya hiç sulama kaydı yoksa) bir hata oluşursa, `prisma.$transaction` sayesinde o ana kadar yapılan tüm veritabanı değişiklikleri (yeni oluşturulan kayıtlar vb.) otomatik olarak geri alınır. `WellBillingPeriod`'un durumu "PENDING" olarak kalır ve API, istemciye bir hata mesajı döndürür. Bu, sistemde yarım kalmış veya tutarsız veri oluşmasını engeller.
