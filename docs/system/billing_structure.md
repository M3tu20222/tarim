# Kuyu Faturaları için Faturalandırma Sistemi Yapısı (Kapsamlı ve Son Versiyon)

Bu doküman, kuyu faturalarının oluşturulmasından ödenmesine kadar olan tüm süreci ve ilgili veri modellerini kapsamlı bir şekilde açıklamaktadır.

## Veri Modelleri ve İş Akışı

Süreç, bir faturanın oluşturulması, maliyetin tarlalara ve ardından sahiplere dağıtılması, borçlandırılması ve son olarak ödemelerin kaydedilmesi adımlarını izler.

1.  **`WellBillingPeriod` (Fatura Dönemi):** Sürecin başlangıç noktasıdır. Faturanın ana kaydını temsil eder.
    *   **Alanlar:** `wellId`, `startDate`, `endDate`, `totalAmount` (Toplam Tutar) ve `paymentDueDate` (Son Ödeme Tarihi).
    *   **Not:** Bu model, faturanın ne zaman ödenmesi gerektiğini belirtir, ancak fiili ödeme tarihini içermez.

2.  **Hesaplama Temeli (Sulama Kayıtları):**
    *   Fatura tutarının dağıtımı, `WellBillingPeriod`'un tarih aralığındaki `IrrigationLog` (Sulama Kaydı) ve `IrrigationFieldUsage` (Sulama Tarla Kullanımı) verilerine göre yapılır. Bu kayıtlar, hangi tarlanın ne kadar süreyle sulandığını belirler.

3.  **`WellBillFieldDistribution` (Tarla Bazında Dağıtım):**
    *   Hesaplamanın ilk somut çıktısıdır. Toplam fatura tutarının, sulama verilerine göre hangi tarlaya ne kadar pay düştüğünü kaydeder.
    *   **Alanlar:** `wellBillingPeriodId`, `fieldId`, `amount` (Tarlaya Düşen Tutar).

4.  **`FieldExpense` (Tarımsal Gider Kaydı):**
    *   Dağıtımın ikinci adımı, fatura maliyetini genel tarımsal gider yönetimine entegre etmektir.
    *   `WellBillFieldDistribution`'dan gelen tutar, her tarla için bir `FieldExpense` kaydı olarak oluşturulur.
    *   **Önemi:** Bu kayıt, `sourceType: 'WELL_BILL'` olarak işaretlenir ve ilgili `seasonId` (Sezon ID) ile ilişkilendirilerek, kuyu faturasının sezonluk maliyet raporlarına doğru bir şekilde dahil edilmesini sağlar.

5.  **`WellBillDistribution` (Sahip Bazında Dağıtım):**
    *   Tarlaya atanan maliyetin, o tarlanın sahiplerine paylaştırıldığı adımdır.
    *   Dağıtım, `FieldOwnership` modelinde tanımlanan sahiplik yüzdelerine göre yapılır.
    *   **Alanlar:** `wellBillingPeriodId`, `ownerId` (Sahip ID), `amount` (Sahibe Düşen Nihai Tutar).

6.  **`Debt` (Borç):**
    *   Sahip bazında dağıtım yapıldıktan sonra, her bir `WellBillDistribution` kaydı için bir `Debt` (Borç) kaydı oluşturulur. Bu, ödemesi gereken tutarı resmi olarak sahibin hesabına atar.

7.  **`PaymentHistory` (Ödeme Geçmişi):**
    *   Akışın son halkasıdır. Sahip, kendisine atanan borcu ödediğinde, bu işlem bir `PaymentHistory` kaydı ile sisteme girilir.
    *   **Kritik Alan:** Bu model, ödemenin **fiilen yapıldığı tarihi** tutan `paymentDate` alanını içerir. Bu sayede kısmi veya tam ödemelerin ne zaman yapıldığı net bir şekilde takip edilir.

## Özet: Ödeme Tarihlerinin Yönetimi

*   **`WellBillingPeriod.paymentDueDate`**: Faturanın **SON ÖDEME TARİHİ**'ni belirtir. Bu bir "vade" tarihidir.
*   **`PaymentHistory.paymentDate`**: Borcun **FİİLEN ÖDENDİĞİ TARİH**'i kaydeder.

Bu yapı, hem fatura maliyetlerinin tarla ve sezon bazında doğru bir şekilde muhasebeleştirilmesini hem de bireysel sahip borçlarının ve ödemelerinin esnek bir yapıda takip edilmesini sağlar.