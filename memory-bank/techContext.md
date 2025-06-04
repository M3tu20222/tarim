# Teknik Bağlam

Bu belge, Tarım Yönetim Sistemi projesinde kullanılan teknolojileri, geliştirme ortamı kurulumunu, teknik kısıtlamaları, bağımlılıkları ve araç kullanım kalıplarını açıklar.

## 1. Kullanılan Teknolojiler
*   **Frontend**:
    *   **Next.js**: React tabanlı bir framework olup, sunucu tarafı renderlama (SSR), statik site oluşturma (SSG) ve API rotaları gibi özellikler sunar. App Router yapısı kullanılmaktadır.
    *   **React**: Kullanıcı arayüzü geliştirmek için kullanılan JavaScript kütüphanesi.
    *   **TypeScript**: JavaScript'in tip güvenliği sağlayan üst kümesi. Tüm frontend ve backend kodunda kullanılmaktadır.
    *   **Tailwind CSS**: Utility-first CSS framework'ü ile hızlı ve esnek stil oluşturma.
    *   **Shadcn/ui**: Tailwind CSS üzerine kurulu yeniden kullanılabilir UI bileşenleri kütüphanesi.
*   **Backend / Veritabanı**:
    *   **Node.js**: Next.js'in sunucu tarafı işlemleri için kullanılan çalışma zamanı ortamı.
    *   **Prisma**: Modern bir ORM (Object-Relational Mapper) olup, veritabanı şeması yönetimi, migrasyonlar ve tip güvenli veritabanı sorguları sağlar.
    *   **PostgreSQL**: İlişkisel veritabanı yönetim sistemi.
    *   **NextAuth.js**: Kimlik doğrulama ve oturum yönetimi için kullanılan kütüphane.
    *   **Mesaj Kuyrukları (Potansiyel)**: Redis Queue, RabbitMQ veya Vercel Background Functions gibi asenkron işleme için (değerlendirme aşamasında).
*   **Diğer Araçlar / Kütüphaneler**:
    *   **ESLint**: Kod kalitesi ve stil tutarlılığı için statik kod analiz aracı.
    *   **Prettier**: Kod formatlama aracı.
    *   **Zustand (Potansiyel)**: Hafif ve esnek bir state yönetim kütüphanesi (henüz tam entegre değil, değerlendirme aşamasında).
    *   **SWR / React Query (Potansiyel)**: İstemci tarafı veri getirme ve önbellekleme için (henüz tam entegre değil, değerlendirme aşamasında).

## 2. Geliştirme Ortamı Kurulumu
1.  **Node.js ve npm/Yarn**: Projenin çalışması için Node.js (önerilen LTS sürümü) ve bir paket yöneticisi (npm veya Yarn) gereklidir.
2.  **PostgreSQL**: Yerel bir PostgreSQL veritabanı sunucusu kurulmalı ve `.env.local` dosyasında veritabanı bağlantı bilgileri (`DATABASE_URL`) yapılandırılmalıdır.
3.  **Prisma Kurulumu**:
    *   `npm install prisma --save-dev`
    *   `npx prisma generate` (Şema değişikliklerinden sonra client'ı güncellemek için kritik)
    *   `npx prisma migrate dev --name initial_migration` (ilk kurulum için)
    *   `npx prisma db seed` (başlangıç verileri için)
4.  **Bağımlılıkların Yüklenmesi**: Proje dizininde `npm install` veya `yarn install` komutu çalıştırılmalıdır.
5.  **Ortam Değişkenleri**: `.env.local` dosyası oluşturulmalı ve gerekli ortam değişkenleri (örn: `NEXTAUTH_SECRET`, `DATABASE_URL`) tanımlanmalıdır.

## 3. Teknik Kısıtlamalar
*   **Next.js Sunucu/İstemci Ayrımı**: Sunucu bileşenlerinde doğrudan DOM erişimi veya tarayıcı API'ları kullanılamaz. İstemci bileşenleri için `use client` yönergesi gereklidir.
*   **Veritabanı Şeması Değişiklikleri**: Prisma migrasyonları dikkatli yönetilmelidir, üretim ortamında veri kaybına yol açabilecek değişikliklerden kaçınılmalıdır. Her şema değişikliğinden sonra `npx prisma generate` çalıştırılmalıdır.
*   **Performans**: Büyük veri setleri veya yoğun işlemler için performans darboğazları oluşabilir. Özellikle Vercel gibi sunucusuz ortamlarda API zaman aşımı limitleri (varsayılan 10 saniye), uzun süren veritabanı işlemleri için önemli bir kısıtlamadır. Bu durumlar için optimizasyon stratejileri (indeksleme, sorgu optimizasyonu, parçalı API'ler, asenkron işleme) gereklidir.
*   **Transaction Yönetimi**: Prisma transaction'ları atomikliği sağlasa da, kilitlenme veya yazma çakışması durumlarında uygulama seviyesinde yeniden deneme mekanizmaları gerekebilir.

## 4. Bağımlılıklar
`package.json` dosyasında tanımlanan tüm bağımlılıklar projenin çalışması için gereklidir. Özellikle `next`, `react`, `react-dom`, `prisma`, `@prisma/client`, `next-auth`, `tailwindcss`, `typescript` temel bağımlılıklardır.

## 5. Araç Kullanım Kalıpları
*   **ESLint ve Prettier**: Kodun otomatik olarak formatlanması ve stil hatalarının tespiti için IDE entegrasyonları kullanılmalıdır.
*   **Git**: Versiyon kontrolü için Git kullanılmaktadır. Her özellik veya hata düzeltmesi ayrı bir branch üzerinde geliştirilmeli ve pull request ile ana branch'e birleştirilmelidir.
*   **VS Code**: Geliştirme için ana IDE olarak VS Code tercih edilmektedir. Gerekli eklentiler (ESLint, Prettier, Prisma, Tailwind CSS IntelliSense) kurulmalıdır.
*   **Prisma CLI**: `npx prisma generate` ve `npx prisma migrate dev` gibi komutlar, veritabanı şeması değişikliklerini yönetmek ve client'ı güncel tutmak için düzenli olarak kullanılmalıdır.
