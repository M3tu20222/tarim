# Karmaşık İşlemler İçin Çok Adımlı Form ve Parçalı API Yaklaşımı

Bu belge, `Process` modülünde uygulanan ve birden fazla veritabanı işlemi içeren karmaşık kayıt süreçlerini yönetmek için geliştirilen çok adımlı form (wizard) ve parçalı API endpoint'leri yaklaşımını özetlemektedir. Bu yaklaşım, benzer performans ve eşzamanlılık sorunları yaşayan diğer modüllere de uygulanabilir.

## 1. Sorun Tanımı
Geleneksel olarak, bir form gönderildiğinde tüm veritabanı işlemlerinin tek bir API çağrısı ve tek bir veritabanı transaction'ı içinde yapılması yaygındır. Ancak, bu transaction çok sayıda okuma, yazma ve güncelleme işlemi içerdiğinde (örneğin, `Process` modülündeki gibi envanter düşüşleri, yakıt hesaplamaları, maliyet kayıtları, bildirimler gibi), aşağıdaki sorunlar ortaya çıkabilir:
*   **Zaman Aşımı (Timeout)**: Özellikle sunucusuz ortamlarda (Vercel gibi), API isteği belirli bir süre içinde yanıt vermediğinde zaman aşımına uğrar (örn. 504 Gateway Timeout).
*   **Veritabanı Kilitlenmeleri/Çakışmaları (Deadlock/Write Conflict)**: Uzun süren veya çok sayıda eşzamanlı işlem içeren transaction'lar, veritabanında kilitlenmelere veya yazma çakışmalarına yol açabilir (örn. Prisma P2034 hatası).
*   **Kötü Kullanıcı Deneyimi**: Kullanıcının form gönderildikten sonra uzun süre beklemesi veya işlemin başarısız olması durumunda net geri bildirim alamaması.

## 2. Çözüm: Çok Adımlı Form (Wizard) ve Parçalı API Endpoint'leri

Bu yaklaşım, karmaşık bir işlemi mantıksal adımlara bölerek hem frontend'deki kullanıcı deneyimini iyileştirir hem de backend'deki yükü dağıtır.

### 2.1. Mimari Yaklaşım (Backend - API Katmanı)

Mevcut monolitik `POST` API'si, işlemin farklı aşamalarına karşılık gelen birden fazla endpoint'e bölünür. Her endpoint, kendi içinde daha küçük ve daha hızlı tamamlanacak atomik veritabanı işlemlerini gerçekleştirir.

*   **`POST /api/[modul_adi]` (Initiate Endpoint)**:
    *   **Amaç**: İşlemin temel bilgilerini alır ve ana kaydı (örneğin, `Process` kaydını) bir taslak (`DRAFT`) durumunda oluşturur.
    *   **Dönen Değer**: Oluşturulan kaydın benzersiz ID'si (örneğin, `processId`). Bu ID, sonraki adımlarda kullanılacaktır.
    *   **Örnek İşlemler**: `Process` kaydını oluşturma, temel doğrulama.
    *   **Faydası**: En hızlı ve en hafif adımdır, kullanıcıya anında geri bildirim sağlar.

*   **`PUT /api/[modul_adi]?id=[kayit_id]` (Update/Intermediate Step Endpoint)**:
    *   **Amaç**: Belirli bir taslak kaydın ara bilgilerini (örneğin, envanter, ekipman, ek detaylar) günceller.
    *   **Giriş**: Güncellenecek kaydın ID'si (URL parametresi olarak) ve ilgili adımın verileri.
    *   **Örnek İşlemler**: Envanter düşüşleri, ekipman kullanım kayıtları, ilgili alt tabloların güncellenmesi. Bu işlemler kendi içinde atomik transaction'lar içerebilir.
    *   **Faydası**: Büyük transaction'ı parçalara ayırır, her adımda daha az yük bindirir.

*   **`POST /api/[modul_adi]/finalize?id=[kayit_id]` (Finalize Endpoint)**:
    *   **Amaç**: İşlemi sonlandırır, taslak kaydın durumunu "tamamlandı" (`FINALIZED`) olarak günceller ve zaman alıcı asenkron görevleri tetikler.
    *   **Giriş**: Sonlandırılacak kaydın ID'si.
    *   **Örnek İşlemler**: Maliyet hesaplamaları, bildirim gönderme, rapor güncellemeleri gibi doğrudan kullanıcı deneyimini anında etkilemeyen işlemler. Bu işlemler bir mesaj kuyruğuna (Redis Queue, Vercel Background Functions vb.) gönderilebilir.
    *   **Faydası**: Kullanıcıya anında "işlem tamamlandı" geri bildirimi verirken, ağır iş yükünü arka plana taşır.

### 2.2. Kullanıcı Arayüzü Yaklaşımı (Frontend - Component Katmanı)

Çok adımlı form (wizard) yapısı, kullanıcının karmaşık veri girişini daha kolay yönetmesini sağlar.

*   **Adım Yönetimi**: `useState` ile `currentStep` gibi bir state tutularak formun hangi adımda olduğu belirlenir.
*   **Form Şeması Doğrulama**: Her adım için ayrı Zod şemaları tanımlanır ve `form.trigger()` kullanılarak sadece o adımdaki alanlar doğrulanır. Bu, kullanıcının sadece ilgili adımın verilerini doğru girmesini sağlar.
*   **Navigasyon**: "İleri", "Geri" ve "Kaydet/Bitir" gibi butonlar, `currentStep` state'ini ve ilgili API çağrılarını yönetir.
*   **`processId` Taşıma**: İlk adımda oluşturulan kaydın ID'si (`processId`), sonraki adımlara state veya URL parametresi olarak taşınır.
*   **Geri Bildirim**: Her adımın sonunda kullanıcıya anlık başarı veya hata bildirimleri (toast mesajları) sunulur. Son adımda, asenkron işlemlerin başlatıldığına dair bilgi verilir.
*   **İlerleme Göstergesi**: Kullanıcının işlemin neresinde olduğunu görmesi için bir ilerleme çubuğu (progress bar) veya adım göstergesi kullanılır.

### 2.3. Genelleştirilebilirlik ve Faydaları

Bu yaklaşım, `Process` modülündeki envanter ekleme mantığı gibi, birden fazla bağımlı veritabanı işlemi içeren herhangi bir karmaşık modüle uygulanabilir:

*   **Örnek Modüller**:
    *   **Satın Alma (Purchases)**: Satın alma kaydı başlatma, katılımcı ekleme, ödeme planı oluşturma, onay süreci başlatma, envantere ekleme gibi adımlar.
    *   **Sulama Planlama (Irrigation Scheduling)**: Sulama planı oluşturma, tarla/kuyu atamaları, envanter (su, gübre) düşüşleri, işçi atamaları gibi adımlar.
*   **Faydaları**:
    *   **Performans Artışı**: Her API çağrısı daha kısa sürer, zaman aşımı riskini azaltır.
    *   **Veritabanı Stabilitesi**: Daha kısa transaction'lar, kilitlenme ve çakışma olasılığını düşürür.
    *   **Daha İyi Kullanıcı Deneyimi**: Kullanıcıya aşamalı ve anlaşılır bir akış sunar, anlık geri bildirim sağlar.
    *   **Daha Yönetilebilir Kod**: Her adımın mantığı kendi API endpoint'inde ve frontend bileşeninde izole edilir, bu da bakımı ve geliştirmeyi kolaylaştırır.
    *   **Ölçeklenebilirlik**: Ağır iş yükleri arka plana taşınarak uygulamanın genel ölçeklenebilirliği artırılır.

Bu yaklaşım, uygulamanızdaki karmaşık iş akışlarını daha sağlam, performanslı ve kullanıcı dostu hale getirmek için güçlü bir model sunar.
