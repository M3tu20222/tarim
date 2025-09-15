# Kuyu Faturalandırma ve Borçlandırma ER Diyagramı

`prisma.schema` dosyasını kullanarak kuyu faturalandırma ve borçlandırma süreciyle ilgili temel modelleri içeren bir Varlık-İlişki (ER) Diyagramı kodu aşağıda sunulmuştur.

Tüm veritabanı şemasını çizmek diyagramı çok karmaşık hale getireceği için, analizimizin odak noktası olan modellere yoğunlaşılmıştır. Bu, süreci daha net anlamanıza yardımcı olacaktır.

Aşağıdaki [Mermaid](https://mermaid.js.org/) kodunu kopyalayıp [Mermaid Live Editor](https://mermaid.live) gibi online bir araca yapıştırarak görsel diyagramı oluşturabilirsiniz.

## Mermaid Kodu

```mermaid
erDiagram
    User {
        string id PK "Kullanıcı ID"
        string name "İsim"
        string role "Rol"
    }

    Well {
        string id PK "Kuyu ID"
        string name "Kuyu Adı"
    }

    Field {
        string id PK "Tarla ID"
        string name "Tarla Adı"
    }

    FieldOwnership {
        string id PK "Sahiplik ID"
        string userId FK "Kullanıcı ID"
        string fieldId FK "Tarla ID"
        float percentage "Yüzde"
    }

    IrrigationLog {
        string id PK "Sulama Kaydı ID"
        string wellId FK "Kuyu ID"
        datetime startDateTime "Başlangıç Zamanı"
        float duration "Süre (dk)"
    }

    WellBillingPeriod {
        string id PK "Fatura Dönemi ID"
        string wellId FK "Kuyu ID"
        float totalAmount "Toplam Tutar"
        string status "Durum"
    }

    WellBillDistribution {
        string id PK "Dağıtım ID"
        string wellBillingPeriodId FK "Fatura Dönemi ID"
        string ownerId FK "Sahip (Kullanıcı) ID"
        string fieldId FK "Tarla ID"
        string debtId FK "Borç ID"
        float amount "Pay Tutarı"
    }

    Debt {
        string id PK "Borç ID"
        string debtorId FK "Borçlu (Kullanıcı) ID"
        string creditorId FK "Alacaklı (Kullanıcı) ID"
        float amount "Tutar"
        string reason "Neden"
    }

    User ||--|{ FieldOwnership : "sahiplikleri"
    Field ||--|{ FieldOwnership : "sahipleri"
    Well ||--o{ IrrigationLog : "sulama kayıtları"
    Well ||--o{ WellBillingPeriod : "fatura dönemleri"
    WellBillingPeriod ||--o{ WellBillDistribution : "dağıtım kalemleri"
    User ||--o{ WellBillDistribution : "pay sahibi"
    Field ||--o{ WellBillDistribution : "tarla payı"
    Debt }|--|| WellBillDistribution : "sonucudur"
    User ||--o{ Debt : "borçları"
```

## Diyagramdaki İlişkilerin Açıklaması

*   `User` ve `Field` arasında `FieldOwnership` aracılığıyla **çoktan-çoğa** bir ilişki vardır (Bir kullanıcının birden çok tarlası olabilir, bir tarlanın birden çok sahibi olabilir).
*   Bir `Well` (Kuyu), birden çok `IrrigationLog` (Sulama Kaydı) ve `WellBillingPeriod` (Fatura Dönemi) içerebilir.
*   Bir `WellBillingPeriod`, birden çok `WellBillDistribution` (Dağıtım Kalemi) içerir.
*   Her bir `WellBillDistribution` kaydı, **sadece bir** `Debt` (Borç) kaydı oluşturur. Bu, aralarındaki `}|--||` sembolü ile gösterilen **bire-bir** ilişkidir ve sürecin en önemli bağlantısıdır.
*   Bir `User` (Kullanıcı), hem `WellBillDistribution`'da pay sahibi hem de `Debt` tablosunda borçlu veya alacaklı olarak yer alır.
