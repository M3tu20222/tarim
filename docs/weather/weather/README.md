# 🌾 Hassas Tarım Hava Durumu Paneli

Konya bölgesi için özel olarak tasarlanmış, AI destekli hassas tarım hava durumu analiz uygulaması.

## ✨ Özellikler

### 🌡️ Hava Durumu Analizi
- **Gerçek zamanlı veriler** - Open-Meteo API ile anlık hava durumu
- **7 günlük detaylı tahmin** - Sıcaklık, yağış, rüzgar, nem analizi
- **48 saatlik hassas takip** - Saatlik veri ve trendler
- **Toprak analizi** - Sıcaklık ve nem ölçümü

### 🤖 AI Destekli Özellikler
- **Gemini AI analizi** - Akıllı tarım tavsiyeleri
- **Otomatik uyarılar** - Hava durumu ve tarım riskleri
- **Mısır ekimi analizi** - Özel algoritma ile optimal ekim zamanları

### 📊 Gelişmiş Görselleştirme
- **Interaktif grafikler** - Animasyonlu ve responsive chartlar
- **Akıllı kartlar** - Önemli metriklerin öne çıkarılması
- **Trend analizi** - Geçmiş verilerle karşılaştırma
- **Dark/Light tema** - Kullanıcı tercihi ve otomatik mod

### 🚀 Performans ve UX
- **Akıllı önbellekleme** - Hızlı veri erişimi
- **Offline destek** - Çevrimdışı çalışma kabiliyeti
- **PWA ready** - Mobil uygulama deneyimi
- **Responsive tasarım** - Tüm cihazlarda mükemmel görünüm

### 🌍 Lokasyon Özellikleri
- **Çoklu konum desteği** - Türkiye geneli hava durumu
- **GPS entegrasyonu** - Mevcut konum tespiti
- **Popüler lokasyonlar** - Hızlı erişim
- **Konum arama** - Gelişmiş arama motoruyla

### 📤 Export ve Paylaşım
- **Çoklu format** - JSON, CSV, PDF, PNG export
- **Sosyal paylaşım** - Hızlı veri paylaşımı
- **Rapor oluşturma** - Özelleştirilebilir raporlar
- **Print desteği** - Yazdırma optimizasyonu

## 🛠️ Teknoloji Stack

### Frontend
- **React 19** - Modern component yapısı
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Data visualization
- **Vite** - Lightning fast build tool

### APIs & Services
- **Open-Meteo API** - Meteoroloji verileri
- **Google Gemini AI** - Akıllı analiz ve tavsiyeler
- **Geocoding API** - Konum servisleri

### Performance & Caching
- **Smart caching** - Akıllı veri önbellekleme
- **Retry logic** - Otomatik yeniden deneme
- **Compression** - Veri sıkıştırma
- **Lazy loading** - İhtiyaç halinde yükleme

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- Node.js 18+
- npm veya yarn
- Modern web browser

### Kurulum
```bash
# Proje dosyalarını indirin
git clone https://github.com/your-repo/weather-dashboard.git
cd weather-dashboard

# Bağımlılıkları yükleyin
npm install

# Çevre değişkenlerini ayarlayın
cp .env.example .env.local
# .env.local dosyasına Gemini AI API key'inizi ekleyin

# Geliştirme sunucusunu başlatın
npm run dev
```

### Production Build
```bash
# Production build
npm run build

# Build'i test edin
npm run preview
```

## 🔧 Konfigürasyon

### Environment Variables
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_APP_TITLE=Hassas Tarım Hava Durumu Paneli
VITE_DEFAULT_LOCATION=Konya
```

### Tailwind Konfigürasyonu
Proje özel color palette ve animation'lar ile konfigüre edilmiştir. `tailwind.config.js` dosyasından özelleştirme yapabilirsiniz.

## 📱 Kullanım

### Temel Kullanım
1. **Konum seçin** - Sol üst köşeden lokasyon değiştirin
2. **Tema ayarlayın** - Light/Dark/Auto modlar arasında geçiş yapın
3. **Veri analiz edin** - Kartlar ve grafikler ile detaylı analiz
4. **AI tavsiyesi alın** - Gemini analizi ile tarım tavsiyeleri
5. **Export edin** - Verilerinizi CSV, JSON formatında indirin

### Gelişmiş Özellikler
- **Cache yönetimi** - Developer modda cache istatistikleri
- **Offline çalışma** - İnternet bağlantısı kesildiğinde cached data
- **Keyboard shortcuts** - Hızlı navigasyon
- **Print optimization** - Rapor yazdırma

## 🧪 Test ve Kalite

### Test Komutları
```bash
# Unit testler
npm run test

# Coverage raporu
npm run test:coverage

# E2E testler
npm run test:e2e
```

### Code Quality
- ESLint + Prettier
- TypeScript strict mode
- Husky git hooks
- Automated testing

## 📈 Performans Optimizasyonları

- **Code splitting** - Chunk-based loading
- **Tree shaking** - Unused code elimination
- **Image optimization** - WebP format support
- **Service Worker** - Background sync
- **Virtual scrolling** - Large data handling

## 🌟 Gelecek Özellikler

- [ ] **Çoklu dil desteği** - İngilizce ve diğer diller
- [ ] **Gelişmiş AI** - Özel tarım modelleri
- [ ] **IoT entegrasyonu** - Sensör veri desteği
- [ ] **Mobile app** - React Native versiyonu
- [ ] **API endpoint** - Backend service
- [ ] **Machine learning** - Tahmin algoritmaları

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın.

## 🙏 Teşekkürler

- **Open-Meteo** - Ücretsiz hava durumu API'si
- **Google Gemini** - AI analiz desteği
- **Recharts** - Beautiful chart library
- **Tailwind CSS** - Utility-first CSS framework

## 📞 İletişim

- **Geliştirici**: [Your Name]
- **Email**: [your.email@example.com]
- **GitHub**: [github.com/your-username]

---

**🌾 Hassas tarım için akıllı hava durumu analizi**