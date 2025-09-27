# Kuyu Faturalandırma ve Borçlandırma Süreci Analiz Raporu

## 1. Mevcut Durum ve Sorunun Tespiti

Mevcut sistem, bir kuyu faturası oluşturulduğunda, bu faturanın maliyetini sulama kayıtlarına göre önce tarlalara, sonra da o tarlaların sahiplerine dağıtmaktadır. Analiz sonucunda, sistemin her bir **tarla-sahip** payı için **ayrı bir borç (`Debt`) kaydı** oluşturduğu tespit edilmiştir.

Örneğin, bir kullanıcının 3 farklı tarlada hissesi varsa ve bu 3 tarla da aynı kuyu faturasından etkileniyorsa, sistem bu kullanıcı adına 3 ayrı borç kaydı oluşturmaktadır. Bu durum, borç listelerinin gereksiz yere kabarmasına ve bir kullanıcının tek bir faturadan doğan toplam borcunu tek bir kalemde görmesini engellemektedir.

## 2. Teknik Analiz ve Kanıtlar

Bu davranışın kaynağı, hem sistemin tasarım dokümanlarında hem de doğrudan kaynak kodunda doğrulanmıştır.

### a. Tasarım ve Veritabanı Yapısı

*   **`memory-bank/well_billing_distribution_process.md`**: Bu dokümanın 8. Adım'ında, her bir `WellBillDistribution` (Sahip Bazında Dağıtım) kaydı için ayrı bir `Debt` (Borç) kaydı oluşturulacağı açıkça belirtilmiştir.
*   **`prisma/schema.prisma`**: Veritabanı şemas��nda `WellBillDistribution` modeli, `wellBillingPeriodId`, `fieldId` ve `ownerId` alanlarını birincil anahtar olarak kullanır. Bu yapı, "bir fatura dönemindeki, bir tarladan, bir kişiye düşen pay"ı temsil eder ve her bir kaydın ayrı bir borçla ilişkilendirilmesine olanak tanır.

### b. Kaynak Kodu

*   **`app/api/billing/periods/[id]/distribute/route.ts`**: Fatura dağıtımını gerçekleştiren bu dosyadaki kod, bir döngü içerisinde her bir tarla-sahip dağıtımı (`r`) için `prisma.debt.create` komutunu çağırmaktadır.

    ```typescript
    // Kodun ilgili bölümü
    for (const r of rounded) {
      if (r.shareAmount <= 0) continue;

      // Her bir dağıtım için ayrı bir borç kaydı oluşturuluyor
      const newDebt = await tx.debt.create({
        data: {
          amount: r.shareAmount,
          description: `Kuyu Faturası: ... - Tarla: ${r.fieldId}`, // Açıklamaya tarla bilgisi ekleniyor
          debtorId: r.ownerId,
          // ...
        },
      });

      // Dağıtım kaydı, bu yeni ve ayrı borca bağlanıyor
      await tx.wellBillDistribution.create({
        data: {
          // ...
          debtId: newDebt.id,
        },
      });
    }
    ```

## 3. Sonuç ve Öneri

**Sonuç:** Sistem, mevcut tasarımı ve kod mantığı gereği, bir kuyu faturasından do��an borcu kullanıcı bazında **toplulaştırmak yerine**, kullanıcının her bir tarlası için **ayrı ayrı borçlar** oluşturmaktadır. Sorun, bir hatadan ziyade sistemin mevcut çalışma şeklinin bir sonucudur.

**Öneri:** Bu sorunu çözmek için dağıtım mantığının (`distribute/route.ts` dosyasındaki) değiştirilmesi gerekmektedir. Yeni mantık şu adımları izlemelidir:

1.  Mevcut hesaplamalarla her bir tarla-sahip payı (`WellBillDistribution`) yine hesaplanmalıdır.
2.  Ancak bu paylar için hemen borç kaydı oluşturulmamalıdır.
3.  Bunun yerine, tüm `WellBillDistribution` kayıtları oluşturulduktan sonra, bu kayıtlardaki tutarlar **sahip (`ownerId`) bazında toplanmalıdır**.
4.  Her bir sahip için, o faturadan doğan **toplam borç tutarını içeren tek bir `Debt` kaydı** oluşturulmalıdır.
5.  Oluşturulan bu tek `Debt` kaydının ID'si, o sahibe ait olan tüm `WellBillDistribution` kayıtlarına referans olarak eklenmelidir.

Bu değişiklik, kullanıcıların her fatura dönemi için tek bir birleşik borç görmesini sağlayacak ve borç yönetimini sadeleştirecektir.
