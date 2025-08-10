# Alış Kaydı ve Borç (Debts) İlişkisi Raporu

Bu rapor, bir `Purchase` (Alış) kaydının oluşturulmasının, sistemde otomatik olarak nasıl `Debt` (Borç) kayıtları ürettiğini ve bu iki varlık arasındaki teknik ve mantıksal ilişkiyi açıklamaktadır.

## Temel Konsept: Otomatik Borçlandırma

Sistemdeki en önemli iş akışlarından biri, bir alış işlemi sırasında manuel bir borç girişi yapmaya gerek kalmadan borçların otomatik olarak oluşturulmasıdır. Bu, bir ortağın tüm grup adına ödeme yaptığı "Alacaklı" (Creditor) modeli üzerine kurulmuştur.

Bir alış işlemi gerçekleştiğinde, eğer tüm ortaklar kendi paylarını peşin ödemediyse, ödemeyi yapan bir "Alacaklı" ortak belirlenir. Sistem, bu alacaklıya borcu olan diğer ortaklar için otomatik olarak `Debt` kayıtları oluşturur.

## "Alacaklı" (Creditor) Kavramı

"Alacaklı", ayrı bir varlık veya kategori değildir. Alış işlemine katılan `User`'lardan (ortaklardan) birinin üstlendiği bir roldür.

-   **Belirlenmesi**: Ön yüzden `POST /api/purchases` endpoint'ine gönderilen istekte, ortaklar listesindeki (`partners` dizisi) bir ortağın objesinde `isCreditor: true` bayrağı bulunur. API, bu bayrağı taşıyan kullanıcıyı o alış işleminin "Alacaklısı" olarak kabul eder.
-   **Görevi**: Alacaklı, alışın toplam tutarını satıcıya ödeyen kişidir. Dolayısıyla, kendi payını ödememiş diğer ortaklar bu alacaklıya borçlanmış olur.

## Teknik Akış: Borç Nasıl Oluşturulur?

Borç oluşturma mantığı, `app/api/purchases/route.ts` dosyasındaki `POST` metodunun içinde, `prisma.$transaction` bloğunda yer alır.

1.  **Alacaklının Tespiti**: Transaction içinde, `PurchaseContributor` kayıtları oluşturulduktan sonra, kod bu kayıtlardan `isCreditor: true` olanı bularak alacaklıyı (`creditor`) tespit eder.

2.  **Borçluların Belirlenmesi**: Sistem, `PurchaseContributor` kayıtları arasında bir filtreleme yapar. Aşağıdaki iki koşulu sağlayan her bir ortak "borçlu" olarak kabul edilir:
    -   `hasPaid: false`: Ortağın kendi payını henüz ödememiş olması.
    -   `contributor.userId !== creditor.userId`: Ortağın, alacaklının kendisi olmaması (bir kişi kendine borçlanamaz).

3.  **`Debt` Kaydının Oluşturulması**: Yukarıdaki filtrelemeyi geçen her bir "borçlu" ortak için `prisma.debt.create` metodu ile yeni bir borç kaydı oluşturulur. Bu kaydın alanları şu şekilde doldurulur:
    -   `amount`: Borçlunun, alıştan payına düşen ve ödemesi gereken tutar (`contribution`).
    -   `creditorId`: Alacaklı olarak tespit edilen ortağın `userId`'si.
    -   `debtorId`: Borçlu olan ortağın `userId`'si.
    -   **`purchaseId`**: Oluşturulan `Debt` kaydını doğrudan kaynak alış işlemine bağlayan, `Purchase` kaydının ID'si. **Bu alan, iki varlık arasındaki en temel ve doğrudan ilişkidir.**
    -   `dueDate`: Borcun son ödeme tarihi.
    -   `description`: Borcun hangi alıştan kaynaklandığını belirten bir açıklama (örn: "Gübre alışı için borç").

## Veritabanı İlişkisi (`prisma/schema.prisma`)

Bu mantıksal ilişki, veritabanı şemasında bir "one-to-many" (bire-çok) ilişki olarak tanımlanmıştır.

-   **`Purchase` Modelinde:**
    ```prisma
    model Purchase {
      // ... diğer alanlar
      debts Debt[] @relation("PurchaseDebts")
    }
    ```
    Bu, bir `Purchase` kaydının birden fazla (`[]`) `Debt` kaydına sahip olabileceğini gösterir.

-   **`Debt` Modelinde:**
    ```prisma
    model Debt {
      // ... diğer alanlar
      purchase   Purchase? @relation("PurchaseDebts", fields: [purchaseId], references: [id])
      purchaseId String?   @db.ObjectId
    }
    ```
    Bu ise her `Debt` kaydının, `purchaseId` alanı üzerinden bir `Purchase` kaydına (isteğe bağlı `?` olarak) bağlanabileceğini tanımlar. `purchaseId` alanı, `Purchase` tablosundaki `id` alanına bir referanstır (foreign key).

## Sonuç

**Alış (`Purchase`) ve Borç (`Debt`) arasındaki ilişki, koşullu ve otomatiktir.** Bir alış kaydı, ancak ve ancak bir "Alacaklı" belirlenmişse ve ödenmemiş paylar varsa borç kayıtları üretir. Bu ilişki, `Debt` modelindeki `purchaseId` alanı ile veritabanı seviyesinde somut bir şekilde kurulur ve sistemin finansal bütünlüğünü sağlamada kritik bir rol oynar.
