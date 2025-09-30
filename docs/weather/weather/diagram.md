# Proje Diyagramlari

## Zaman Cizelgesi
- **Hafta 1 - Planlama ve Kurulum:** Gereksinimlerin netlestirilmesi, hedef kullanicilarin belirlenmesi, Open-Meteo ve Gemini API erisimlerinin hazirlanmasi, Vite + React iskeletinin olusturulmasi.
- **Hafta 2 - Veri Entegrasyonu:** `services/openMeteoService.ts` icerisinde gercek zamanli ve tarihsel veri uclarinin baglanmasi, `types.ts` kapsaminda tiplerin genisletilmesi.
- **Hafta 3 - Arayuz ve Gorsellestirme:** `components/WeatherDashboard.tsx` duzeninin tamamlanmasi, `WeatherChart.tsx` ile 7 gunluk ve saatlik grafiklerin entegrasyonu, Tailwind temalarinin uygulanmasi.
- **Hafta 4 - Yapay Zeka Analizi:** `services/geminiService.ts` araciligiyla Gemini yorum modulu baglanmasi, `GeminiInterpretation.tsx` deneyiminin iyilestirilmesi, hata ve yukleme durumlarinin eklenmesi.
- **Hafta 5 - Test ve Yayin:** Manuel ve otomasyon senaryolarinin yazilmasi (Vitest), performans incelemeleri, `npm run build` ve `npm run preview` ile yayin oncesi dogrulamalar, belgelerin guncellenmesi.

## Akis Diyagrami
```mermaid
flowchart TD
    A[Kullanici Tarayicisi] --> B[Vite Dev Sunucusu / Build]
    B --> C[index.tsx]
    C --> D[App.tsx]
    D --> E[WeatherDashboard]
    E -->|Hook cagirilari| F[fetchWeatherData()]
    E -->|Yillar degistiginde| G[fetchHistoricalData()]
    E -->|"Gemini Analiz" butonu| H[getWeatherInterpretation()]
    F --> I[Open-Meteo API]
    G --> I
    I --> F
    I --> G
    H --> J[Gemini API]
    J --> H
    F --> K[types.ts ile tiplenmis veri]
    G --> K
    K --> L[WeatherChart bilesenleri]
    H --> M[GeminiInterpretation]
    L --> N[Grafikler ve Gostergeler]
    M --> N
    N --> O[Ekrana Render]
```
