# Kuyu Faturaları ve Borç Kayıtları Arasındaki İlişkinin Analizi

Bu doküman, sistemdeki kuyu faturalarının (Well Invoices) nasıl işlendiğini ve ilgili borç kayıtlarının (Debt records) bu süreçle nasıl ilişkili olduğunu açıklar.

## Sürecin Genel Bakışı

Kuyu faturasının borca dönüşmesi iki ana adımdan oluşan bir süreçtir:

1.  **Fatura Dönemi Oluşturma**: İlk olarak, bir fatura taslağı oluşturulur.
2.  **Dağıtım ve Borçlandırma**: Oluşturulan bu taslak, ilgili tarla sahiplerine dağıtılarak resmi borç kayıtlarına dönüştürülür.

### Adım 1: Fatura Dönemi Oluşturma (`WellBillingPeriod`)

Süreç, bir **Yönetici (Admin)** veya **Tarla Sahibi (Owner)** kullanıcısının, sisteme yeni bir kuyu faturası dönemi girmesiyle başlar. Bu işlem teknik olarak `POST /api/billing/periods` uç noktasına yapılan bir istekle gerçekleşir.

-   **Girdiler**: `wellId` (ilgili kuyu), `startDate`, `endDate` (fatura tarih aralığı), `totalAmount` (toplam fatura tutarı) ve `paymentDueDate` (son ödeme tarihi).
-   **Sonuç**: Veritabanında `WellBillingPeriod` modeline yeni bir kayıt eklenir. Bu kaydın `status` alanı başlangıçta **`PENDING`** (Beklemede) olarak ayarlanır.
-   **Önemli Not**: Bu aşamada henüz bir borçlandırma veya dağıtım işlemi yapılmaz. Sadece faturanın taslak kaydı oluşturulmuş olur.

### Adım 2: Dağıtım ve Borçlandırma (`Distribute`)

Fatura dönemi `PENDING` durumundayken, kullanıcı bu faturayı dağıtma işlemini tetikler. Bu işlem, `POST /api/billing/periods/[id]/distribute` uç noktasına yapılan bir istekle gerçekleştirilir. Bu adım, sürecin en kritik mantığını içerir.

1.  **Sulama Kayıtlarının Toplanması**: Sistem, fatura döneminin (`startDate`, `endDate`) tarih aralığıyla çakışan, ilgili kuyuya ait tüm sulama kayıtlarını (`IrrigationLog`) bulur.
2.  **Alan Bazlı Ağırlık Hesaplaması**: Her bir sulama kaydı için, sulanan tarlaların **sulama alanları** dikkate alınır. Dağıtım, sulama süresinin yüzdesine göre değil, her bir tarlanın o sulama olayındaki **sulanan alanının toplam sulanan alana oranına** göre yapılır.
3.  **Sahip Paylarının Hesaplanması**: Her tarla için hesaplanan pay, o tarlanın sahipleri (`FieldOwnership`) arasında, sahiplik yüzdelerine göre bölünür.
4.  **Toplam Payların Birleştirilmesi**: Tüm sulama kayıtları incelendikten sonra, her bir tarla sahibinin (`ownerId`) toplam fatura tutarından alacağı nihai pay (`shareAmount`) hesaplanır. Bu hesaplama, sahibin tüm ilgili tarlalardaki toplam sulama süresi (`basisDuration`) temel alınarak yapılır.

## Borç Oluşturma Mantığı ve İlişkisi

Dağıtım hesaplamaları tamamlandıktan sonra, sistem bu payları resmi borç kayıtlarına dönüştürür. Bu, atomik bir veritabanı işlemi (`transaction`) içinde gerçekleşir, bu da tüm adımların başarılı olmasını veya bir hata durumunda hiçbirinin uygulanmamasını garanti eder.

1.  **Her Pay İçin Borç Oluşturma**: Hesaplanan her bir sahip payı (`shareAmount`) için, `Debt` tablosunda yeni bir borç kaydı oluşturulur.
    -   `amount`: Sahibin ödemesi gereken tutar.
    -   `dueDate`: Fatura döneminden gelen son ödeme tarihi.
    -   `creditorId`: Faturayı oluşturan kullanıcının ID'si (alacaklı).
    -   `debtorId`: Payın sahibi olan kullanıcının ID'si (borçlu).
    -   `reason`: Borcun nedenini belirtmek için `'WELL_BILL'` olarak ayarlanır.

2.  **Dağıtım Kaydını Oluşturma ve İlişkilendirme**: Borç kaydı oluşturulduktan hemen sonra, `WellBillDistribution` tablosuna bu paya ait detayları içeren bir kayıt eklenir.
    -   Bu kayıt, hesaplamanın temelini oluşturan `basisDuration`, `basisArea`, `sharePercentage` gibi bilgileri içerir.
    -   **En Önemli Adım**: `WellBillDistribution` kaydındaki `debtId` alanı, az önce oluşturulan `Debt` kaydının ID'si ile doldurulur.

3.  **Durum Güncellemesi**: Tüm dağıtım ve borçlandırma kayıtları başarıyla oluşturulduktan sonra, orijinal `WellBillingPeriod` kaydının `status` alanı **`DISTRIBUTED`** (Dağıtıldı) olarak güncellenir.

## Sonuç: Modeller Arası İlişki

Özetle, kuyu faturaları ve borçlar arasındaki ilişki şu şekilde kurulur:

-   `WellBillingPeriod`: Faturanın ana kaydını (başlık, dönem, toplam tutar) temsil eder.
-   `WellBillDistribution`: Faturanın her bir tarla sahibine düşen payını, hesaplama detaylarıyla birlikte tutan bir **köprü tablosudur**.
-   `Debt`: Her bir tarla sahibinin fiili borcunu temsil eden nihai kayıttır.

İlişki şeması: `WellBillingPeriod` -> (birçok) `WellBillDistribution` -> (her biri bir) `Debt`.

Bu yapı sayesinde, bir kuyu faturasının hangi tarla sahiplerine, hangi hesaplamalara dayanarak ve ne kadar borç olarak yansıtıldığı net bir şekilde izlenebilir.
