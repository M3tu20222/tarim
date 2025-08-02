# Kuyu Faturası Otomatik Bölüştürme Planı (Prisma Şemasına Uyumlu)

Bu doküman, Prisma `schema.prisma` dosyası incelenerek kuyu faturası (Well Bill) girildiğinde, belirtilen tarih aralığında ilgili kuyudan sulanan tarlaları ve sahipliklerini baz alarak toplam tutarın otomatik olarak dağıtılmasını konu alan sistem tasarımını içerir.

Prisma incelemesi sonucu mevcut modeller:
- Well, Field, FieldOwnership, IrrigationLog, IrrigationFieldUsage, IrrigationOwnerUsage, IrrigationOwnerSummary
- WellBillingPeriod, WellBillingIrrigationUsage
- WorkerWellAssignment, FieldWell (well-field ilişkisi)
- Debt/Payment yapıları (Debt, PaymentHistory vb.)
Bu yapı, kuyu faturası ve dağıtım mantığını büyük ölçüde destekliyor. Bu nedenle, yeni “WellBill” adlı ayrı bir model yerine “WellBillingPeriod” modelini faturanın kendisi olarak konumlandırıp, dağıtım kalemleri için yeni bir “WellBillDistribution” modelini eklemek en uyumlu yol olacaktır.

## 1) Kavramsal Model

- WellBillingPeriod: Dönemsel kuyu faturası. Alanlar mevcut: wellId, startDate, endDate, totalAmount, totalUsage?, status (PENDING/PAID). 
- IrrigationLog: Sulama olayları. Süre: duration (dakika), startDateTime. Kuyu: wellId. 
- IrrigationFieldUsage: Bir sulama olayında hangi tarlaların hangi yüzdeyle sulandığı (percentage) ve opsiyonel gerçek sulanan alan (actualIrrigatedArea).
- IrrigationOwnerUsage ve IrrigationOwnerSummary: Sahip bazlı sulama kullanım kayıtları/özetleri.
- FieldOwnership: Tarla sahiplik oranları (percentage).

Not: Mevcut şema zaten WellBillingPeriod ile IrrigationLog’ları “WellBillingIrrigationUsage” üzerinden ilişkilendirme imkanı sunuyor. Ancak, son dağıtımı (kimin ne kadar ödeyeceği) kişi bazında tutmak için fazladan bir dağıtım tablosuna ihtiyaç var.

## 2) Şema Genişletme Önerisi

Yeni model (eklenecek):
- WellBillDistribution
  - id: String @id
  - wellBillingPeriodId: String (FK)
  - fieldId: String
  - ownerId: String
  - basisDuration: Float // Dakika bazlı temel
  - basisArea: Float? // Opsiyonel - alan bazlı kullanılırsa
  - basisWeight: Float // Hesaplamada kullanılan normalize ağırlık (örn: duration ya da area)
  - sharePercentage: Float // Bu owner’ın toplamdan aldığı yüzde
  - amount: Float // TL tutar
  - createdAt: DateTime

İlişkiler:
- wellBillingPeriod WellBillingPeriod @relation(fields: [wellBillingPeriodId], references: [id])
- owner User @relation(fields: [ownerId], references: [id])
- field Field @relation(fields: [fieldId], references: [id])

Gerekçe:
- WellBillingPeriod: Fatura başlığı/dönemi.
- WellBillDistribution: Nihai kişi bazlı dağıtım kalemleri (fieldId + ownerId boyutunda). 
- WellBillingIrrigationUsage (mevcut): Dönem ile log arası bağ ve log bazlı tutar/süre yüzdesi gibi ara hesap verileri için kullanılabilir.

Not: “totalUsage” ve “status” alanları mevcut; dağıtım sonrası “PENDING” => “PAID”/“DISTRIBUTED” gibi bir ara statü eklenmesi istenirse status enum yerine string alanı kullanılmaya devam edilebilir. Şimdilik mevcut string statüyü kullanıp değerleri: PENDING, DISTRIBUTED, PAID olarak belirlemeyi öneriyoruz.

## 3) Hesaplama Algoritması (Prisma’ya Uyumlu)

Girdi: { wellId, periodStart, periodEnd, totalAmount }

Adımlar:
1) Dönem yarat (WellBillingPeriod)
   - unique kontrol (opsiyonel): Aynı wellId ve kesişen tarih aralıkları için uyarı.
   - status = "PENDING", totalAmount set edilir.

2) Dönemdeki logları bul
   - IrrigationLog where wellId = input.wellId AND 
     log.startDateTime + duration aralığı period ile kesişiyor mu?
   - Kesişim süresi hesapla:
     - logEnd = log.startDateTime + duration (dakika)
     - overlapStart = max(log.startDateTime, periodStart)
     - overlapEnd = min(logEnd, periodEnd)
     - overlapMinutes = max(0, (overlapEnd - overlapStart) dakikaya çevrilmiş)
   - overlapMinutes > 0 olan loglar dikkate alınır.

3) Logların tarlalara dağılımını çek
   - Her IrrigationLog için IrrigationFieldUsage kayıtlarını getir.
   - fieldWeightForThisLog = overlapMinutes * (IrrigationFieldUsage.percentage / 100)
   - Her fieldId için periodSumWeight[fieldId] += fieldWeightForThisLog
   - İleride alan bazlı ağırlık (actualIrrigatedArea) dahil edilecekse:
     - basisWeight = (overlapMinutes * alpha) + (actualIrrigatedArea * beta)
     - alpha/beta konfigürasyonları ile.

4) Tüm alanların toplam ağırlığı:
   - totalWeight = sum(periodSumWeight[fieldId] for all fields)
   - Eğer totalWeight == 0: dağıtım yapılamaz. WellBillingPeriod status "PENDING" bırakılır ve uyarı notu kaydedilir.

5) FieldOwnership bazında owner’lara böl
   - FieldOwnership where fieldId = X kayıtlarını çek.
   - Eğer ownership yoksa fallback: alanın owner’ı yoksa o alan yoksayılabilir veya sistem sahibine (admin) yazılabilir. Tercih: Ownership zorunlu varsayalım. Yoksa “tek sahip” modeli uygulanacaksa Field üzerinde owner ilişkisi gerekirdi; mevcut şemada sahiplik FieldOwnership ile çözülüyor.
   - fieldShareAmount = totalAmount * (periodSumWeight[fieldId] / totalWeight)
   - Her ownership için ownerShare = fieldShareAmount * (FieldOwnership.percentage / 100)

6) Yuvarlama
   - ownerShare’ları 2 ondalık yuvarla.
   - Toplam sapmayı en büyük paylı kaleme ekleyerek kapat.

7) WellBillDistribution kayıtlarını oluştur
   - wellBillingPeriodId = oluşturulan dönem
   - fieldId, ownerId, basisDuration = ilgili field için toplanan etkili dakika
   - basisArea = varsa ağırlıkta kullanılan toplam actualIrrigatedArea
   - basisWeight = periodSumWeight[fieldId] * ownerPercentage (owner bazlı)
   - sharePercentage: ownerShare / totalAmount * 100
   - amount = ownerShare

8) WellBillingIrrigationUsage kayıtlarını oluştur (opsiyonel)
   - Dönem ile log ilişkisi, duration=overlapMinutes, percentage=(overlapMinutes / period totalMinutes) * 100, amount=totalAmount * oran
   - Bu kayıtlar dönem-log analizi için faydalı; dağıtım kişi bazlı WellBillDistribution’da.

9) Durum güncelle
   - Başarılı dağıtım sonrası WellBillingPeriod.status = "DISTRIBUTED"

10) Ödeme/borç entegrasyonu (opsiyonel, ikinci faz)
   - Her WellBillDistribution için Debt oluşturulabilir (debtor=owner, creditor=örn. admin veya kuyu sahibi işletme). 
   - Debt.reason = "WellBillingPeriod"
   - WellBillingPeriod.status = "PAID" durumu, tüm borçlar kapatıldıysa veya manuel işaretleme ile kullanılabilir.

## 4) API Uç Noktaları

- POST /api/billing/well-billing-periods
  Body: { wellId, startDate, endDate, totalAmount }
  İşlem:
  - WellBillingPeriod oluştur
  - İlgili IrrigationLog’ları ve IrrigationFieldUsage’ları topla
  - Hesaplamayı çalıştır
  - WellBillDistribution ve WellBillingIrrigationUsage kayıtlarını oluştur
  - status="DISTRIBUTED"
  Response: { period, distributionsSummary }

- GET /api/billing/well-billing-periods/:id
  - period, irrigation usages, distributions döndür

- POST /api/billing/well-billing-periods/:id/post (opsiyonel)
  - Borçlara yansıtma, status="PAID" gibi işlemler

- DELETE /api/billing/well-billing-periods/:id
  - Eğer “PAID” değilse iptal/silme

Not: Repo içinde components/billing altında “well-bill-form.tsx” mevcut. Bu formun backend ile eşleşecek şekilde body alanlarını { wellId, startDate, endDate, totalAmount } biçiminde POST etmesi sağlanmalı.

## 5) UI Akışı (Mevcut Component’lere Uyum)

- “Kuyu Faturası Ekle” formu (components/billing/well-bill-form.tsx ile hizalı)
  - wellId (select)
  - date range (startDate, endDate)
  - totalAmount
  - submit => backend hesaplar ve önizleme+sonuç döndürür
- Dönem listesi (WellBillingPeriod)
  - status rozetleri: PENDING, DISTRIBUTED, PAID
- Dönem detay sayfası
  - Üstte fatura bilgileri
  - Orta: WellBillingIrrigationUsage (log bazlı özet)
  - Alt: WellBillDistribution (field-owner bazlı kalemler)
  - Export CSV/PDF (opsiyonel)
  - “Borçlara yansıt” butonu (opsiyonel)

## 6) Test Senaryoları

A) Tek tarla, tek sahip, tek log:
- overlapMinutes > 0
- tüm tutar tek owner’a

B) İki tarla, farklı yüzdeler:
- IrrigationFieldUsage.percentage oranlarıyla doğru tartımlama

C) Bir tarla, iki sahip (60/40):
- FieldOwnership.percent ile bölüşüm

D) Kısmi dönem:
- overlap hesapları doğru mu?

E) totalWeight=0 (hiç overlap yok):
- status="PENDING", dağıtım kaydı yok, uyarı

F) Yuvarlama:
- dağıtım toplamı == totalAmount

G) Dönem tekrarları:
- aynı aralığa çakışan ikinci period uyarı veriyor mu? (opsiyonel kontrol)

## 7) İndeks ve Performans

- IrrigationLog: index (wellId, startDateTime)
- WellBillingPeriod: index (wellId, startDate, endDate, status)
- WellBillDistribution: index (wellBillingPeriodId, ownerId), (fieldId), (ownerId)
- WellBillingIrrigationUsage: index (wellBillingPeriodId, irrigationLogId)

Filtreleme: period aralığı ile log sayısını minimize et. Ağırlık hesaplarında memory Map kullan.

## 8) Güvenlik ve Yetkilendirme

- Sadece ADMIN veya ilgili kuyunun yetkili OWNER’ı dönem/fatura oluşturabilsin.
- Detaylar sadece ilgili kuyunun sahipleri ve admin tarafından görülebilsin.
- PAID statüsündeki period değiştirilemesin.

## 9) Hata Yönetimi

- Validasyon: tarih aralığı (start < end), totalAmount > 0, well mevcut mu, IrrigationFieldUsage kayıtları var mı.
- İş kuralı: aynı wellId için çakışan period varsa uyarı (opsiyonel).
- Geri alma: DISTRIBUTED ama borçlara yansıtılmadıysa iptal edilebilir.

## 10) Uygulama Adımları (Iteratif)

1) Şema güncellemesi:
   - Prisma’ya WellBillDistribution modelini ekle.
   - Gerekirse WellBillingPeriod.status değer setlerini (PENDING, DISTRIBUTED, PAID) olarak süreçte kullan (string serbest).

2) API:
   - POST /api/billing/well-billing-periods: hesaplama + kayıt üretimi
   - GET detay
   - Opsiyonel POST /:id/post, DELETE /:id

3) UI:
   - well-bill-form.tsx ile backend entegrasyonu
   - Liste + detay ekranı

4) Borç Entegrasyonu (opsiyonel 2. faz):
   - WellBillDistribution’dan Debt oluşturma
   - Ödeme akışına bağlama

5) Testler ve raporlama:
   - Birim testler (hesap fonksiyonu)
   - Uçtan uca örnekler
   - CSV/PDF export (opsiyonel)

## 11) Teknik Notlar (Prisma Nesneleri)

- IrrigationLog.duration dakika cinsinden: temel ağırlık süresi doğrudan buradan türetilecek (overlap ile).
- IrrigationFieldUsage.percentage: bir log içindeki field dağılımını verir, period boyunca ağırlıklandırmada çarpan olarak kullanılır.
- FieldOwnership.percentage: owner dağıtımı için ikinci çarpandır.
- IrrigationOwnerUsage/IrrigationOwnerSummary: İleride direkt owner bazlı tüketimden dağıtım yapmak istenirse doğrudan kullanılabilir, şimdilik temel hesap “FieldUsage + Ownership” zinciri üzerinden tasarlandı.
