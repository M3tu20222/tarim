# Sistem Kalıpları

Bu belge, Tarım Yönetim Sistemi projesinin sistem mimarisini, temel teknik kararlarını, kullanılan tasarım kalıplarını ve bileşen ilişkilerini açıklar.

## 1. Sistem Mimarisi
Proje, Next.js'in App Router yapısını kullanarak bir monolitik uygulama olarak tasarlanmıştır. Bu yapı, hem sunucu tarafı renderlama (SSR) hem de istemci tarafı etkileşimleri için esneklik sağlar. Karmaşık işlemler için API'ler parçalara ayrılmış ve asenkron işleme potansiyeli entegre edilmiştir.

```mermaid
graph TD
    A[Kullanıcı] --> B(Tarım Yönetim Sistemi Web Uygulaması)
    B --> C{Next.js Sunucu Bileşenleri}
    B --> D{Next.js İstemci Bileşenleri}
    C --> E[API Katmanı]
    D --> E
    E --> F[Prisma ORM]
    F --> G[MongoDB Veritabanı]
    E --> H[Harici Servisler/API'ler]
    E -- "Asenkron İşlemler (Kuyruk)" --> I[Arka Plan İşleyici]
    I --> F
```

## 2. Temel Teknik Kararlar
*   **Next.js App Router**: Modern web uygulamaları için güçlü bir yapı sunması, sunucu ve istemci bileşenlerini bir arada kullanabilme yeteneği.
*   **TypeScript**: Geliştirme sürecinde tip güvenliği sağlayarak hataları azaltma ve kod kalitesini artırma.
*   **Prisma ORM**: Veritabanı etkileşimlerini basitleştirme, şema yönetimi ve migrasyon kolaylığı. **Özellikle karmaşık ve çok adımlı işlemlerin atomik olarak yönetilmesi için `prisma.$transaction` kullanımı benimsenmiştir.**
*   **MongoDB**: Esnek şema yapısı ve ölçeklenebilirlik avantajları nedeniyle tercih edilmiştir.
*   **Tailwind CSS**: Hızlı ve esnek UI geliştirme, stil tutarlılığı.
*   **NextAuth.js**: Güvenli ve kolay kimlik doğrulama çözümü.
*   **Parçalı API Tasarımı**: Uzun süren veya karmaşık işlemleri (örn. `Process` kaydetme, `IrrigationLog` oluşturma) daha küçük, yönetilebilir API endpoint'lerine bölme.
*   **Asenkron İşleme Yaklaşımı**: Performans darboğazlarını gidermek ve kullanıcı deneyimini iyileştirmek için zaman alıcı işlemleri (örn. maliyet hesaplama, bildirim gönderme) arka plana taşıma potansiyeli.

## 3. Tasarım Kalıpları
*   **Modüler Tasarım**: Her bir ana özellik (Envanter, Sulama, Süreç vb.) kendi içinde bağımsız modüller olarak geliştirilir.
*   **Bileşen Tabanlı Mimari**: React bileşenleri kullanılarak UI'ın küçük, yeniden kullanılabilir parçalara ayrılması.
*   **Katmanlı Mimari**: Uygulama, sunum (UI), iş mantığı (API rotaları, servisler) ve veri erişim (Prisma) katmanlarına ayrılmıştır.
*   **Repository/Service Pattern**: Veritabanı etkileşimleri için `lib/prisma.ts` üzerinden merkezi bir Prisma istemcisi kullanılması ve iş mantığının servis katmanlarında ayrıştırılması.
*   **Wizard Form Pattern**: Karmaşık ve çok adımlı veri giriş süreçleri için kullanıcı deneyimini iyileştiren ve backend yükünü dağıtan bir yaklaşım. **Sulama kaydı oluşturma süreci bu kalıba uygun olarak yeniden yapılandırılmıştır.**

## 4. Bileşen İlişkileri
*   **`app/`**: Ana uygulama rotalarını ve sayfalarını barındırır. `app/dashboard` gibi alt dizinler, belirli kullanıcı rolleri veya ana bölümler için düzenlenmiştir.
*   **`components/`**: Yeniden kullanılabilir UI bileşenlerini içerir. `components/ui` genel bileşenler için, `components/[feature]` ise özelliğe özel bileşenler içindir.
*   **`lib/`**: Yardımcı fonksiyonlar, servisler, veritabanı bağlantısı (`lib/prisma.ts`) ve kimlik doğrulama yardımcıları (`lib/auth.ts`) gibi genel mantık katmanını barındırır.
*   **`prisma/`**: Veritabanı şeması (`schema.prisma`) ve migrasyon dosyalarını içerir.
*   **`types/`**: TypeScript tip tanımlamalarını merkezi olarak barındırır.

## 5. Kritik Uygulama Yolları
*   **Kimlik Doğrulama Akışı**: Kullanıcı girişi -> NextAuth.js ile kimlik doğrulama -> JWT oluşturma -> Oturum yönetimi.
*   **Sulama Kaydı Oluşturma Akışı (Çok Adımlı Wizard)**:
    1.  **Adım 0 (Temel Bilgiler)**: İstemci bileşeni (form) -> `POST /api/irrigation` (initiate) -> `IrrigationLog` taslağı oluşturulur, `irrigationLogId` döner.
    2.  **Adım 1 (Tarla Bilgileri)**: İstemci bileşeni (form) -> `PUT /api/irrigation/{irrigationLogId}/details` (field details update) -> `IrrigationFieldUsage` kayıtları oluşturulur, tarlaların dekarsal bazda sulanma bilgileri işlenir.
    3.  **Adım 2 (Envanter Kullanımları)**: İstemci bileşeni (form) -> `PUT /api/irrigation/{irrigationLogId}/details` (inventory update) -> `IrrigationInventoryUsage` ve `IrrigationInventoryOwnerUsage` kayıtları oluşturulur, envanter düşüşleri sahiplik oranlarına göre yapılır, yetersiz stok durumunda borçlar oluşturulur.
    4.  **Adım 3 (Sonlandırma)**: İstemci bileşeni (form) -> `POST /api/irrigation/{irrigationLogId}/finalize` (finalize) -> `IrrigationOwnerSummary` kayıtları oluşturulur, genel maliyet dağıtımı gibi son işlemler tetiklenir (potansiyel olarak asenkron), `IrrigationLog` durumu `COMPLETED` olarak güncellenir.
*   **Raporlama Akışı**: Kullanıcı isteği (rapor türü) -> API rotası (GET /api/reports) -> Veritabanından veri çekme -> Veri işleme -> İstemciye rapor verisi gönderme.