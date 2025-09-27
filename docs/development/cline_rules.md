# Cline Kuralları: Tarım Yönetim Sistemi Projesi

Bu belge, Tarım Yönetim Sistemi projesinde Cline'ın (yapay zeka asistanı) uyması gereken kuralları ve yönergeleri tanımlar. Bu kurallar, projenin tutarlılığını, sürdürülebilirliğini ve geliştirme süreçlerinin verimliliğini sağlamayı amaçlar.

## 1. Genel Kurallar

*   **Dil Tercihi**: Proje genelinde TypeScript kullanılmaktadır. Yeni kod yazarken veya mevcut kodu düzenlerken TypeScript'in tip güvenliği ve en iyi uygulamalarına uyulmalıdır.
*   **Kodlama Standartları**: ESLint ve Prettier yapılandırmalarına (`.eslintrc.json`, `eslint.config.mjs`) uyulmalıdır. Kod formatlama ve stil tutarlılığına dikkat edilmelidir.
*   **Dosya Adlandırma**:
    *   Component'ler için PascalCase (örn: `MyComponent.tsx`).
    *   Hook'lar için `use` öneki (örn: `useMyHook.tsx`).
    *   API rotaları için kebab-case (örn: `my-api-route.ts`).
    *   Diğer dosyalar için kebab-case veya camelCase (proje genelindeki mevcut kullanıma göre).
*   **Yorumlar**: Karmaşık mantık veya işlevsellik içeren bölümlere açıklayıcı yorumlar eklenmelidir. JSDoc formatı tercih edilir.
*   **Bağımlılıklar**: `package.json` dosyasında tanımlı bağımlılıklar kullanılmalıdır. Yeni bağımlılık eklemeden önce gerekliliği değerlendirilmelidir.

## 2. Proje Yapısı

Projenin ana dizin yapısı aşağıdaki gibidir ve bu yapıya uyulmalıdır:

*   `app/`: Next.js uygulama rotaları ve sayfaları.
    *   `app/api/`: API rotaları.
    *   `app/dashboard/`: Yönetim paneli sayfaları.
    *   `app/auth/`: Kimlik doğrulama sayfaları.
*   `components/`: Yeniden kullanılabilir UI bileşenleri.
    *   `components/ui/`: Shadcn/ui gibi genel UI bileşenleri.
    *   `components/[feature]/`: Belirli bir özelliğe ait bileşenler (örn: `components/inventory/`).
*   `lib/`: Yardımcı fonksiyonlar, servisler ve genel mantık.
    *   `lib/prisma.ts`: Prisma istemcisi ve veritabanı bağlantısı.
    *   `lib/auth.ts`: Kimlik doğrulama yardımcıları.
*   `prisma/`: Prisma şeması ve veritabanı ile ilgili dosyalar.
    *   `prisma/schema.prisma`: Veritabanı şeması tanımı.
    *   `prisma/seed.ts`: Veritabanı başlangıç verileri.
*   `public/`: Statik dosyalar (resimler, fontlar vb.).
*   `types/`: TypeScript tip tanımlamaları.
*   `hooks/`: Özel React hook'ları.
*   `scripts/`: Yardımcı betikler.
*   `__tests__/`: Test dosyaları.

## 3. Teknolojiye Özel Kurallar

### 3.1. Next.js

*   **App Router**: Next.js App Router yapısı kullanılmaktadır. Sayfalar ve API rotaları bu yapıya uygun olarak oluşturulmalıdır.
*   **Server Components / Client Components**: Bileşenlerin nerede çalışacağına (sunucu veya istemci) dikkat edilmeli ve `use client` yönergesi doğru şekilde kullanılmalıdır.
*   **Veri Getirme**: Sunucu bileşenlerinde veri getirme için doğrudan Prisma veya diğer sunucu tarafı kütüphaneleri kullanılmalıdır. İstemci tarafında veri getirme için SWR veya React Query gibi kütüphaneler düşünülebilir.

### 3.2. React

*   **Fonksiyonel Bileşenler**: Tüm bileşenler fonksiyonel bileşenler olarak yazılmalıdır.
*   **Hook'lar**: `useState`, `useEffect`, `useContext`, `useCallback`, `useMemo` gibi React hook'ları doğru ve performanslı bir şekilde kullanılmalıdır. Özel hook'lar (`hooks/` dizininde) oluşturulabilir.
*   **Prop Drilling**: Aşırı prop drilling'den kaçınılmalı, gerekirse Context API veya global state yönetimi (örn: Zustand, Redux) kullanılmalıdır.

### 3.3. Prisma

*   **Schema Tanımı**: `prisma/schema.prisma` dosyası güncel tutulmalı ve veritabanı değişiklikleri bu dosya üzerinden yönetilmelidir.
*   **Migrasyonlar**: Veritabanı şemasında yapılan değişiklikler için Prisma migrasyonları (`npx prisma migrate dev`) kullanılmalıdır.
*   **Veritabanı İşlemleri**: Veritabanı sorguları `lib/prisma.ts` üzerinden sağlanan Prisma istemcisi kullanılarak yapılmalıdır.

### 3.4. Tailwind CSS

*   **Utility-First**: Tailwind CSS'in utility-first yaklaşımı benimsenmelidir. Özel CSS yazmaktan mümkün olduğunca kaçınılmalıdır.
*   **`components.json`**: Shadcn/ui bileşenleri için `components.json` dosyası kullanılmaktadır. Yeni bileşenler eklenirken bu yapıya uyulmalıdır.
*   **`tailwind.config.ts`**: Tema ve özel sınıflar için `tailwind.config.ts` dosyası düzenlenebilir.

## 4. Testler

*   **Test Dosyaları**: Testler `__tests__/` dizini altında ilgili bileşen veya fonksiyonun yanında yer almalıdır (örn: `__tests__/sidebar-navigation.test.js`).
*   **Test Kapsamı**: Yeni özellikler veya önemli hata düzeltmeleri için testler yazılmalıdır.

## 5. API Kuralları

*   **RESTful Prensipler**: `app/api/` altındaki rotalar RESTful prensiplere uygun olmalıdır.
*   **Hata Yönetimi**: API rotalarında uygun HTTP durum kodları ve açıklayıcı hata mesajları döndürülmelidir.
*   **Veri Doğrulama**: Gelen istek verileri sunucu tarafında doğrulanmalıdır.

## 6. Veritabanı

*   **Veri Bütünlüğü**: Veritabanı şemasında ilişkiler ve kısıtlamalar doğru şekilde tanımlanmalıdır.
*   **Performans**: Veritabanı sorgularının performansı göz önünde bulundurulmalı, gerektiğinde indeksler kullanılmalıdır.

## 7. Güvenlik

*   **Kimlik Doğrulama/Yetkilendirme**: `lib/auth.ts` ve NextAuth.js kullanılarak kimlik doğrulama ve yetkilendirme işlemleri güvenli bir şekilde yönetilmelidir.
*   **Çevre Değişkenleri**: Hassas bilgiler `.env.local` dosyasında saklanmalı ve doğrudan koda gömülmemelidir.

Bu kurallar, projenin sağlıklı bir şekilde ilerlemesi için temel bir çerçeve sunar. Herhangi bir belirsizlik durumunda veya yeni bir yaklaşım benimsenmesi gerektiğinde, mevcut proje yapısı ve en iyi uygulamalar göz önünde bulundurularak karar verilmelidir.
## 8. Dial