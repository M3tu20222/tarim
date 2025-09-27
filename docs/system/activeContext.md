# Aktif Bağlam

Bu belge, projenin mevcut çalışma odağını, son değişiklikleri, sonraki adımları, aktif kararları ve önemli kalıpları/tercihleri ile öğrenilenleri ve proje içgörülerini takip eder.

## 1. Mevcut Çalışma Odağı
Şu anda, Tarım Yönetim Sistemi projesinin temel altyapısının ve ana modüllerinin (Envanter, Sulama, Süreç, Finans, Kullanıcı Yönetimi) stabilizasyonu ve hatalarının giderilmesi üzerinde çalışılmaktadır. Özellikle API katmanındaki veri bütünlüğü ve doğru veri işleme akışları kritik öneme sahiptir.

## 2. Son Değişiklikler
*   Temel proje yapısı (Next.js App Router, bileşen dizinleri, lib klasörü) oluşturuldu.
*   Prisma şeması (`prisma/schema.prisma`) ve temel veritabanı modelleri (User, Inventory, Field, Irrigation, Process vb.) tanımlandı.
*   Kimlik doğrulama (NextAuth.js) entegrasyonu başlatıldı.
*   Bazı temel UI bileşenleri (Shadcn/ui) entegre edildi.
*   API rotaları için temel yapılandırmalar yapıldı.
*   **Process Modülü Yeniden Yapılandırması**:
    *   `Process` modeline `status` alanı ve `ProcessStatus` enum'u eklendi.
    *   `app/api/processes/route.ts` dosyası, çok adımlı işlem kaydetme akışını desteklemek üzere `/api/processes` (initiate), `/api/processes?processId={id}` (PUT - inventory/equipment update) ve `/api/processes/finalize?processId={id}` (POST - finalize) endpoint'lerine bölündü.
    *   Frontend'deki `components/processes/process-form.tsx` bileşeni, bu çok adımlı API akışını yönetecek şekilde bir wizard formuna dönüştürüldü.
    *   Veritabanı transaction'larında kilitlenme/çakışma ve zaman aşımı sorunlarını azaltmak için yeniden deneme mantığı ve Promise.all ile eşzamanlı güncelleme optimizasyonları uygulandı.
*   **Sulama API Hatası Düzeltmesi**:
    *   `app/api/irrigation/[irrigationId]/route.ts` dosyasındaki `PUT` metodunda, `data` değişkeninin tanımlanmadan kullanılmasına neden olan `ReferenceError` hatası düzeltildi. Bu düzeltme, `worker` rolünün sulama kayıtlarını başarıyla tamamlamasını sağladı.
*   **Sulama Kaydı Güncelleme ve Veri Bütünlüğü Düzeltmesi**:
    *   `PUT /api/irrigation/[irrigationId]` endpoint'inde, Prisma'ya gönderilen veri yapısının şema ile uyumsuz olması nedeniyle oluşan `PrismaClientValidationError` hatası giderildi.
    *   API'nin veri dönüştürme mantığı, ön yüzden gelen esnek yapıyı Prisma'nın beklediği katı ve ilişkisel formata doğru bir şekilde çevirecek şekilde düzeltildi. Bu, hem API çökmesini engelledi hem de bunun sonucunda ortaya çıkan bozuk verileri (ve ön yüzdeki görüntüleme hatalarını) önledi.

## 3. Sonraki Adımlar
*   Mevcut modüllerin (Envanter, Sulama, Süreç) CRUD (Oluşturma, Okuma, Güncelleme, Silme) operasyonlarını tamamlamak.
*   Kullanıcı rolleri ve yetkilendirme mekanizmasını detaylandırmak.
*   Raporlama ve analiz modüllerinin tasarımına başlamak.
*   Test kapsamını genişletmek.
*   **Process Modülü Testleri**: Yeniden yapılandırılan işlem kaydetme akışının uçtan uca testlerini yapmak ve Vercel ortamında stabil çalıştığını doğrulamak.

## 4. Aktif Kararlar ve Değerlendirmeler
*   **State Yönetimi**: İstemci tarafı state yönetimi için React Context API ve gerektiğinde Zustand gibi hafif bir kütüphane kullanılması düşünülüyor.
*   **Hata Yönetimi**: API ve UI katmanlarında tutarlı bir hata yönetimi stratejisi benimsenmesi.
*   **Performans Optimizasyonu**: İlk aşamadan itibaren performansın göz önünde bulundurulması, gereksiz yeniden render'lardan kaçınılması. Özellikle yoğun veritabanı işlemlerini asenkron kuyruklara taşıma stratejisi (örneğin, maliyet hesaplama ve bildirim gönderme gibi) aktif olarak değerlendirilmektedir.
*   **Monolitik Yapıdan Ayrışma**: `Process` modülündeki API bölme deneyimi, gelecekte diğer karmaşık modüller için de benzer ayrıştırma stratejilerinin uygulanabilirliğini göstermiştir.

## 5. Önemli Kalıplar ve Tercihler
*   **Modüler Tasarım**: Her bir modülün bağımsız ve yeniden kullanılabilir olması hedefleniyor.
*   **Tip Güvenliği**: TypeScript'in tüm projede aktif olarak kullanılması ve tip tanımlamalarına özen gösterilmesi.
*   **Kod Temizliği**: Okunabilir, sürdürülebilir ve iyi belgelenmiş kod yazma prensibi.
*   **Wizard Form Yaklaşımı**: Karmaşık veri giriş süreçleri için çok adımlı form (wizard) yaklaşımının kullanıcı deneyimini iyileştirdiği ve backend yükünü azalttığı teyit edildi.
*   **API Veri Dönüşüm Katmanı**: API endpoint'leri, ön yüzden gelen veriyi veritabanı şemasına uygun hale getirmekle yükümlüdür. Bu, veri bütünlüğünü sağlamak ve `PrismaClientValidationError` gibi hataları önlemek için kritik bir kalıptır.

## 6. Öğrenilenler ve Proje İçgörüleri
*   Next.js App Router'ın sunucu bileşenleri ve istemci bileşenleri arasındaki ayrımın iyi anlaşılması, performans açısından kritik.
*   Prisma'nın veritabanı etkileşimlerini basitleştirmesi, geliştirme hızını artırıyor. Ancak, yoğun transaction'larda kilitlenme ve zaman aşımı sorunlarına karşı dikkatli olunmalı ve uygulama seviyesinde yeniden deneme/optimizasyon stratejileri uygulanmalıdır.
*   Vercel gibi sunucusuz ortamlarda API zaman aşımı limitlerinin, uzun süren veritabanı işlemleri için önemli bir kısıtlama olduğu ve bu tür işlemlerin parçalara ayrılması veya asenkron hale getirilmesi gerektiği öğrenildi.
*   API katmanında veri yapısı uyuşmazlıkları, sadece anlık hatalara değil, aynı zamanda tespit edilmesi zor olan veri bütünlüğü sorunlarına ve dolaylı yoldan ön yüz hatalarına yol açabilir. Bu nedenle API'lerdeki veri doğrulama ve dönüştürme mantığı son derece önemlidir.