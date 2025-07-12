# Hata ve Geliştirme Kayıt Defteri

Bu belge, tarım yönetim sisteminde karşılaşılan hataları, uygulanan çözümleri ve yapılan geliştirmeleri takip etmek amacıyla oluşturulmuştur. Her kayıt, sorunu, analizini ve çözümünü bir bütün olarak ele alır.

---
##Şablon:
**Durum:** 

### Sorun


### Analiz ve Kök Neden


### Önerilen Çözüm

---


## Hata: Alacaklısı Belirsiz Alımlarda Satın Alma Sayfasının Çökmesi

**Durum:** Çözüldü

### Sorun
`/dashboard/owner/purchases` sayfası, `BANK_TRANSFER` gibi ödeme yöntemleriyle alacaklısı (`creditor`) belli olmayan bir satınalma oluşturulduğunda çöküyordu. Hata mesajı `PrismaClientUnknownRequestError: Invalid prisma.purchase.findMany() invocation: Inconsistent query result: Field creditor is required to return data, got null instead.` şeklindeydi.

### Analiz ve Kök Neden
1.  **Veritabanı-Şema Tutarsızlığı:** `prisma/schema.prisma` dosyasında `Debt` (Borç) modelinin `creditorId` alanı zorunlu olarak tanımlanmıştı.
2.  **Hatalı Mantık:** `app/api/purchases/route.ts` dosyasındaki mantık, bazı ödeme senaryolarında alacaklıyı net olarak belirleyemiyor ve bu da veritabanına `creditorId`'si `null` olan bir `Debt` kaydı oluşturulmasına yol aç��yordu.
3.  **Hatalı Veri Getirme:** Ön yüz (`components/purchases/purchases-table.tsx`), verileri çekerken Prisma `null` olan `creditorId` nedeniyle zorunlu ilişkiyi kuramıyor ve sorgu başarısız oluyordu.

Özetle, arka uç hatalı veri üretiyor, ön yüz bu bozuk veriyi okumaya çalışırken çöküyordu.

### Uygulanan Çözüm
Sorunu kökünden çözmek için alacaklı belirleme süreci hem ön yüzde hem de arka yüzde yeniden yapılandırıldı:

1.  **Ön Yüz (Frontend):** Satın alma formuna (`components/purchases/new-purchase-form.tsx`) **"Ödemeyi Yapan (Alacaklı)"** adında zorunlu bir seçim alanı eklendi. Bu alan, `OWNER` rolündeki tüm kullanıcıları listeler ve kullanıcının ödemeyi kimin yaptığını net bir şekilde belirtmesini zorunlu kılar.
2.  **Arka Uç (Backend):** Arka uçtaki (`app/api/purchases/route.ts`) varsayımlara dayalı alacaklı bulma mantığı kaldırıldı. Yeni mantık, artık sadece ön yüzden gelen ve `isCreditor: true` olarak işaretlenmiş kullanıcıyı alacaklı olarak kabul eder. Bu sayede alacaklısı belli olmayan borç kaydı oluşturulması engellendi.

---

## Geliştirme: Ertelenmiş Borçlandırma Mantığı

**Durum:** Geliştirildi

### İhtiyaç (Sorun)
Kredi kartı gibi vadeli ödeme yöntemleriyle yapılan alımlarda, borçların hemen değil, alacaklının kendi ödemesi yaklaştığında oluşması gerekiyordu. Örneğin, alacaklı kredi kartı ekstresini 11 Ekim'de ödeyecekse, diğer ortakların borçlarının son ödeme tarihi 10 Ekim olmalıydı.

### Analiz ve Kök Neden
Sistemde alacaklının kendi ödeme vadesini saklayacak bir alan veya bu tarihi işleyecek bir mantık bulunmuyordu.

### Uygulanan Çözüm
"Ertelenmiş Borçlandırma" özelliği geliştirildi:

1.  **Veritabanı:** `Purchase` modeline, alacaklının ödeme vadesini saklamak için `creditorPaymentDueDate` adında yeni bir alan eklendi.
2.  **Ön Yüz (Frontend):** Satın alma formu (`components/purchases/enhanced-purchase-form.tsx`) güncellendi. Ödeme yöntemi "Kredi Kartı" veya "Kredi" olarak seçildiğinde, **"Alacaklının Son Ödeme Tarihi"** adında bir takvim alanı görünür hale getirildi.
3.  **Arka Uç (Backend):** Borç oluşturma mantığı (`app/api/purchases/route.ts`) güncellendi. Eğer "Alacaklının Son Ödeme Tarihi" formdan geldiyse, borçlu ortakların borçlarının son ödeme tarihi, bu tarihten **bir gün öncesi** olarak otomatik hesaplanacak şekilde ayarlandı.

---

## Hata: Yeni Alış Kaydının Envanter Stoğuna Yansımaması

**Durum:** Çözüldü

### Sorun
Yeni bir ürün için satınalma kaydı oluşturulduğunda, bu ürün `inventory` koleksiyonuna ekleniyor ancak `totalStock` (toplam stok) alanı `0` olarak kaydediliyordu. Bu nedenle, stoğu olan ürünler sulama kaydı oluşturma sayfasında görünmüyordu.

### Analiz ve Kök Neden
Sorunun kaynağı, `prisma/schema.prisma` dosyasındaki `Inventory` modelinde `totalStock` alanının `@default(0)` olarak tanımlanmasıydı. Bu varsayılan değer, kod içerisinde `totalStock` alanına bir değer atansa bile, Prisma'nın bu değeri ezip `0` olarak kaydetmesine neden oluyordu.

### Uygulanan Çözüm
`prisma.schema` dosyasına dokunmadan sorunu çözmek için, `app/api/purchases/route.ts` dosyasındaki `POST` fonksiyonu güncellendi. Envanter kaydı oluşturulduktan (`create`) hemen sonra, aynı veritabanı işlemi (transaction) içinde bir `update` komutu eklenerek, oluşturulan envanterin `totalStock` değeri, satın alınan `quantity` (miktar) değerine eşitlendi. Bu sayede Prisma şemasındaki varsayılan değer davranışı kod mantığıyla ezildi.

---

## Hata: Sulama Kaydında Hatalı Envanter Listeleme

**Durum:** Çözüldü

### Sorun
Sulama kaydı oluşturma ekranında, bir tarla seçildiğinde o tarlanın sahiplerine ait envanterlerin listelenmesi gerekirken, sistemdeki tüm kullanıcıların envanterleri gösteriliyordu.

### Analiz ve Kök Neden
Sulama formu bileşeni (`components/irrigation/irrigation-form.tsx`), envanterleri `/api/inventory` endpoint'inden çekerken, tarla sahiplerinin ID'lerini yanlış bir parametre ismiyle (`ownerIds`) gönderiyordu. API endpoint'i ise bu filtreleme için `userIds` parametresini bekliyordu.

### Uygulanan Çözüm
`components/irrigation/irrigation-form.tsx` dosyasında, envanterleri getiren `fetch` isteğindeki `ownerIds` parametresi, `userIds` olarak düzeltildi. Bu değişiklik, frontend'in backend API'si ile doğru bir şekilde iletişim kurmasını sağladı.

---

## Geliştirme: Alış Formunda Vade Tarihi Alanının İyileştirilmesi

**Durum:** Çözüldü

### Sorun
`http://localhost:3000/dashboard/owner/purchases/new` adresindeki alış formunda, ödeme yöntemi "Kredi Kartı" seçilip "Alacaklının Son Ödeme Tarihi" girildiğinde, her bir ortak için ayrı ayrı "Vade Tarihi" seçme alanı aktif kalmaya devam ediyor. Bu durum, kullanıcı için kafa karışıklığı yaratabilir çünkü arka uç mantığı, ana vade tarihini baz alarak işlem yapar ve bireysel tarihleri yok sayar.

### Analiz ve Kök Neden
Kullanıcı arayüzü (`components/purchases/enhanced-purchase-form.tsx`), "Alacaklının Son Ödeme Tarihi" girildiğinde, ortakların bireysel vade tarihi alanlarını dinamik olarak devre dışı bırakmıyor veya gizlemiyor. Bu da kullanıcıların birbiriyle çelişen veriler girebileceği bir arayüz sunuyor.

### Önerilen Çözüm
`enhanced-purchase-form.tsx` bileşeninde şu mantık uygulanmalıdır:
- Eğer `paymentMethod` olarak `CREDIT_CARD` veya `CREDIT` seçilmişse VE
- `creditorPaymentDueDate` alanına bir tarih girilmişse,
- O zaman her bir ortak için listelenen `partners.${index}.dueDate` takvim alanı ya tamamen gizlenmeli ya da düzenlenemez (disabled) hale getirilmelidir.

---


**Başlık**: Sulama kaydı önbelleklenecek
**Durum:** Çözüldü
### Sorun
http://localhost:3000/dashboard/owner/irrigation Sayfasında günlük yaklaşık 4-5 değişiklik olur, bu sayfada Toplam 192 kayıt bulundu. Sayfa 1/20
192 kaydı sürekli database den ve siteden çekiyor, kullanıcının browserına (mobil ve desktop) önbellekleme yapabilir miyiz, çok kayıt çekmesin
### Sorun 2
aynı sayfada tarlaları yeşil renkle (referans olarak notifications taki tarlaları yeşil renkte yapmıştık aynı şekilde ) gösterebilir miyiz. Bir de sulama kaydında not varsa http://localhost:3000/dashboard/owner/irrigation sayfasındaki listede bu notu görebileceğim bir şey yapabilir miyiz

### Analiz ve Kök Neden


### Önerilen Çözüm
---

**Başlık**: Sulama Kaydı Filtrelerinde `undefined` Veri Hatası
**Durum:** Çözüldü

### Sorun
Sulama kayıtları sayfasındaki (`/dashboard/owner/irrigation`) filtreler için veri çeken sorgular (kuyu, tarla, sezon, işçi), API'den boş yanıt geldiğinde `undefined` data döndürerek sayfanın çökmesine neden oluyordu. Hata mesajı `Query data cannot be undefined. ... Affected query key: ["workers"]` şeklindeydi.

### Analiz ve Kök Neden
`components/irrigation/irrigation-list.tsx` dosyasındaki `useQuery` kancaları, API'den gelen JSON yanıtındaki `data` alanını doğrudan kullanmaya çalışıyordu (`...then(data => data.data)`). Eğer API yanıtında `data` alanı yoksa, bu ifade `undefined` olarak sonuçlanıyor ve `useQuery` bunu bir hata olarak kabul ediyordu.

### Uygulanan Çözüm
Sorunu çözmek için ilgili tüm `useQuery` sorgu fonksiyonları güncellendi. Sorgu fonksiyonları, API yanıtında `data` alanı bulunmadığı veya `null` olduğu durumlarda `undefined` yerine boş bir dizi (`[]`) döndürecek şekilde `...then(data => data.data || [])` mantığıyla düzeltildi. Bu değişiklik, bileşenin veri olmadan da kararlı bir şekilde çalışmasını sağladı ve hatayı ortadan kaldırdı.  

**Başlık**: Borçlar Sayfasında Ondalık Sayı Hatası
**Durum:** Çözüldü

### Sorun
Yeni bir alış kaydı oluşturulduktan sonra `/dashboard/owner/debts` sayfası açılmıyordu veya borçları doğru listeleyemiyordu. Sorunun, bir borç kaydının `amount` (tutar) alanında `9800.000000000002` gibi hatalı bir ondalık sayı bulunmasından kaynaklandığı tespit edildi.

### Analiz ve Kök Neden
Hatanın kök nedeni, `app/api/purchases/route.ts` içerisindeki alış oluşturma mantığında yapılan finansal hesaplamaların (toplam maliyet ve ortak payları) standart kayan nokta (floating-point) sayıları ile yapılmasıydı. Bu durum, JavaScript'in ondalık sayıları işlemedeki doğal hassasiyet sorunları nedeniyle, veritabanına çok uzun ondalıklı sayıların kaydedilmesine yol açıyordu. Bu hatalı veri, borç listeleme sayfasında okunurken (gerek API'de gerekse ön yüzde) beklenmedik hatalara ve çökmelere neden oluyordu.

### Uygulanan Çözüm
Sorun iki aşamada çözüldü:

1.  **Kalıcı Kod Düzeltmesi:**
    *   `app/api/purchases/route.ts` dosyasındaki `POST` fonksiyonu güncellendi.
    *   Toplam maliyet (`totalCost`) ve her bir ortağın katkı payı (`contribution`) hesaplandıktan hemen sonra, sonuçlar `Number(... .toFixed(2))` yöntemi kullanılarak iki ondalık basamağa yuvarlandı.
    *   Bu değişiklik, veritabanına yazılan tüm finansal verilerin tutarlı ve doğru formatta olmasını sağlayarak hatanın tekrarlanmasını engeller.

2.  **Mevcut Verinin Düzeltilmesi:**
    *   Veritabanında mevcut olan hatalı kaydı (`amount: 9800.000000000002`) düzeltmek için geçici bir `ts-node` script'i oluşturuldu ve çalıştırıldı.
    *   Bu script, sorunlu bor�� kaydını bularak `amount` alanını doğru değeri olan `9800.00` ile güncelledi.
    *   İşlem tamamlandıktan sonra geçici script projeden silindi.

Bu iki adımlı çözümle hem mevcut sorun giderildi hem de gelecekte benzer hataların oluşması engellendi.

**sorun**: http://localhost:3000/dashboard/owner/debts adresi hala çalışmıyor.
**durum** : Çözülmedi
**neler oldu** : Önceki düzeltmeler işe yarmadı
**logs** : 
vscode: ○ Compiling /dashboard/owner/debts ...
 ✓ Compiled /dashboard/owner/debts in 1551ms (4275 modules)
E:\Web_site\mart\tarim-yonetim-sistemi\node_modules\@prisma\client\runtime\library.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
E:\Web_site\mart\tarim-yonetim-sistemi\node_modules\@prisma\client\runtime\library.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
E:\Web_site\mart\tarim-yonetim-sistemi\node_modules\@prisma\client\runtime\library.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
E:\Web_site\mart\tarim-yonetim-sistemi\node_modules\@prisma\client\runtime\library.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: TypeError [ERR_INVALID_ARG_TYPE]: The "payload" argument must be of type object. Received null
 ⨯ Error [PrismaClientUnknownRequestError]:
Invalid `prisma.debt.findMany()` invocation:


Inconsistent query result: Field creditor is required to return data, got `null` instead.
    at async DebtsPage (app\dashboard\owner\debts\page.tsx:16:16)
  14 | export default async function DebtsPage() {
  15 |   // Tüm borçları getir
> 16 |   const debts = await prisma.debt.findMany({
     |                ^
  17 |     include: {
  18 |       creditor: {
  19 |         select: { {
  clientVersion: '6.7.0',
  digest: '3076049759'
}
 GET /dashboard/owner/debts 200 in 2379ms
 browser: Unhandled Runtime Error
Server


PrismaClientUnknownRequestError: 
Invalid `prisma.debt.findMany()` invocation:


Inconsistent query result: Field creditor is required to return data, got `null` instead.

app\dashboard\owner\debts\page.tsx (16:17) @ async DebtsPage


  14 | export default async function DebtsPage() {
  15 |   // Tüm borçları getir
> 16 |   const debts = await prisma.debt.findMany({
     |                 ^
  17 |     include: {
  18 |       creditor: {
  19 |         select: {
Call Stack
7

Hide 6 ignore-listed frame(s)
async DebtsPage
app\dashboard\owner\debts\page.tsx (16:17)
resolveErrorDev
node_modules\next\dist\compiled\react-server-dom-webpack\cjs\react-server-dom-webpack-client.browser.development.js (1845:1)
processFullStringRow
node_modules\next\dist\compiled\react-server-dom-webpack\cjs\react-server-dom-webpack-client.browser.development.js (2225:1)
processFullBinaryRow
node_modules\next\dist\compiled\react-server-dom-webpack\cjs\react-server-dom-webpack-client.browser.development.js (2213:1)
progress
node_modules\next\dist\compiled\react-server-dom-webpack\cjs\react-server-dom-webpack-client.browser.development.js (2459:1)
InnerLayoutRouter
..\src\client\components\layout-router.tsx (408:5)
OuterLayoutRouter
..\src\client\components\layout-router.tsx (607:19)
**database** : mongodb (migrate yapma)
**mongodb son debt  kayıtları**:
id
68721b2bf4f4eb983419185e
amount
5600
dueDate
2025-10-10T21:00:00.000+00:00
status
"PENDING"
description
"PotNitrat_Me_Be alışı için borç"
createdAt
2025-07-12T08:22:02.849+00:00
reminderSent
false
reason
"PURCHASE"
creditorId
60c72b2f9b1e8b001c8e4d5a
debtorId
67e6fcdfc5ca6634a4456844
purchaseId
68721b27f4f4eb9834191856
_id
68723f26f5cb791c33b57573
amount
4200
dueDate
2025-10-09T21:00:00.000+00:00
status
"PENDING"
description
"PotNitrat_H_M_B alışı için borç"
createdAt
2025-07-12T10:55:34.600+00:00
reminderSent
false
reason
"PURCHASE"
creditorId
67e6fcc2c5ca6634a4456843
debtorId
67e6fcdfc5ca6634a4456844
purchaseId
68723f23f5cb791c33b5756a
_id
68723f26f5cb791c33b57574
amount
9800
dueDate
2025-10-09T21:00:00.000+00:00
status
"PENDING"
description
"PotNitrat_H_M_B alışı için borç"
createdAt
2025-07-12T10:55:34.600+00:00
reminderSent
false
reason
"PURCHASE"
creditorId
67e6fcc2c5ca6634a4456843
debtorId
67e5b093c8fccd39d1444093
purchaseId
68723f23f5cb791c33b5756a