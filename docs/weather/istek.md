# Hava Durumu Entegrasyon Notlari

Bu dokuman, Open-Meteo tabanli hava durumu entegrasyonunun mevcut durumunu ve sonraki adimlarini ozetler.

## Toplama Katmani
- **Forecast API**: 7 gun ileri + 2 gun geriye (past_days) veri cekiliyor, coklu koordinat destegiyle tek istekte birden fazla tarla senkronlaniyor.
- **Archive API**: D+6 sonrasinda nihai veriler ile forecast kayitlari guncelleniyor.
- **Historical Forecast**: Tahmin performansi icin karar anindaki model ciktisi saklanacak (backlog).

## Depolama & Modeller
- WeatherSnapshot: saatlik ham veriler (30-90 gun tutulur).
- WeatherDailySummary: gundelik ozetler (uzun vadeli saklanir, WeatherSource ile forecast/archive ayrimi yapilir).
- AgroFeatureDaily: GDD, ETc, su dengesi, stres saatleri, oneriler.
- Cron job (/api/cron/weather-sync): 3 saatte bir calisir, hata raporunu JSON olarak dondurur.

## Agronomik Hesaplamalar
- **GDD**: urune gore Tbase/Tupper tablosu ile hesaplanir.
- **ETc**: FAO-56 yaklasimi (Kc * ET0). Kc egri verileri fenoloji evrelerine gore saklanir.
- **Su Dengesi**: yagis + sulama - ETc dagilimi, ardil kuru/gun sayaci.
- **Stres Gozlemi**: sicaklik > esik, don < 0 deg C, yuksek RH/VPD saatleri.

## Dashboard & Arayuz
- app/dashboard/owner/weather/page.tsx: Tarla secimi, anlik widget, 7 gunluk tahmin tablosu, gecmis ozet ve yol haritasi kartlari.
- WeatherWidget: anlik durum, agronomik ozet, koordinat kaynagi.
- Gelecek adimlar: saatlik grafikler, bildirim tetikleyicileri, CSV/PDF ciktilar.

## Konfigurasyon
- .env: OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1/forecast, WEATHER_PAST_DAYS, WEATHER_FORECAST_DAYS, WEATHER_SYNC_CHUNK_SIZE.
- Varsayilan koordinat: WEATHER_DEFAULT_COORDINATES tarla/kuyu bilgisi eksik oldugunda devreye girer.

## Yol Haritasi
1. Tahmin vs gerceklesme dogruluk analizleri icin Historical Forecast baglantisi.
2. Bildirim altyapisi (yagis, don, yuksek VPD) ve planlanmis sulama oneri sistemi.
3. Tarla operasyon kayitlari (operations, yields) ile hava/su verimliligi korelasyonu.
4. Export ve paylasim (CSV, PDF) ozellikleri.

