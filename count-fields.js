const { PrismaClient } = require('@prisma/client');

async function analyzeDatabase() {
  const prisma = new PrismaClient();

  try {
    console.log('=== TARİM YÖNETİM SİSTEMİ VERİTABANI ANALİZİ ===\n');

    // Tarla sayısı
    const fieldCount = await prisma.field.count();
    console.log(`📍 Toplam tarla sayısı: ${fieldCount}`);

    // Bitki/Ürün (Crop) analizi
    const cropCount = await prisma.crop.count();
    console.log(`🌱 Toplam bitki kaydı: ${cropCount}`);

    if (cropCount > 0) {
      const crops = await prisma.crop.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          plantedDate: true,
          harvestDate: true,
          field: {
            select: {
              name: true,
              location: true
            }
          }
        }
      });

      console.log('\n🌾 Bitki detayları:');
      crops.forEach((crop, index) => {
        console.log(`${index + 1}. ${crop.name} - ${crop.status} (${crop.field?.name || 'Tarla bilgisi yok'})`);
        console.log(`   Ekim: ${crop.plantedDate ? new Date(crop.plantedDate).toLocaleDateString() : 'Belirtilmemiş'}`);
        console.log(`   Hasat: ${crop.harvestDate ? new Date(crop.harvestDate).toLocaleDateString() : 'Belirtilmemiş'}`);
      });
    } else {
      console.log('⚠️ Hiç bitki kaydı yok! Weather sistemi için bitki bilgisi gerekli.');
    }

    // Field-Crop ilişkisi kontrolü
    const fieldsWithoutCrops = await prisma.field.findMany({
      where: {
        crops: {
          none: {}
        }
      },
      select: {
        name: true,
        location: true
      }
    });

    if (fieldsWithoutCrops.length > 0) {
      console.log(`\n🚨 Bitki bilgisi olmayan tarlalar (${fieldsWithoutCrops.length} adet):`);
      fieldsWithoutCrops.forEach((field, index) => {
        console.log(`${index + 1}. ${field.name} - ${field.location}`);
      });
    }

    // Weather kayıtları detaylı analiz
    try {
      const weatherSnapshotCount = await prisma.weatherSnapshot.count();
      const weatherDailySummaryCount = await prisma.weatherDailySummary.count();
      console.log(`\n🌤️ WeatherSnapshot kayıt sayısı: ${weatherSnapshotCount}`);
      console.log(`🌤️ WeatherDailySummary kayıt sayısı: ${weatherDailySummaryCount}`);

      if (weatherSnapshotCount > 0) {
        // En son weather snapshot kayıtları
        const latestSnapshots = await prisma.weatherSnapshot.findMany({
          take: 5,
          orderBy: { timestamp: 'desc' },
          select: {
            timestamp: true,
            temperature2m: true,
            relativeHumidity2m: true,
            windSpeed10m: true,
            precipitationMm: true,
            source: true
          }
        });

        console.log('\n📊 Son 5 WeatherSnapshot kaydı:');
        latestSnapshots.forEach((snapshot, index) => {
          console.log(`${index + 1}. ${new Date(snapshot.timestamp).toLocaleString()} - ${snapshot.temperature2m}°C, %${snapshot.relativeHumidity2m} nem, ${snapshot.windSpeed10m}km/h rüzgar, ${snapshot.precipitationMm}mm yağış (${snapshot.source})`);
        });
      }

      if (weatherDailySummaryCount > 0) {
        // En son daily summary kayıtları
        const latestSummaries = await prisma.weatherDailySummary.findMany({
          take: 5,
          orderBy: { date: 'desc' },
          select: {
            date: true,
            tMinC: true,
            tMaxC: true,
            precipitationSumMm: true,
            et0FaoEvapotranspiration: true,
            source: true
          }
        });

        console.log('\n📈 Son 5 WeatherDailySummary kaydı:');
        latestSummaries.forEach((summary, index) => {
          console.log(`${index + 1}. ${new Date(summary.date).toLocaleDateString()} - ${summary.tMinC}°C/${summary.tMaxC}°C, ${summary.precipitationSumMm}mm yağış, ET0: ${summary.et0FaoEvapotranspiration} (${summary.source})`);
        });
      }

      if (weatherSnapshotCount === 0 && weatherDailySummaryCount === 0) {
        console.log('⚠️ Hiç hava durumu verisi yok! Weather sistemi çalışmayacak.');
      }
    } catch (error) {
      console.log('\n🌤️ Weather modelleri bulunamadı veya hata:', error.message);
    }

    // Sezon bilgileri
    const seasonCount = await prisma.season.count();
    console.log(`📅 Sezon sayısı: ${seasonCount}`);

    if (seasonCount > 0) {
      const seasons = await prisma.season.findMany({
        select: {
          name: true,
          isActive: true,
          startDate: true,
          endDate: true,
          _count: {
            select: {
              fields: true,
              crops: true
            }
          }
        }
      });

      console.log('\n📊 Sezon detayları:');
      seasons.forEach((season, index) => {
        console.log(`${index + 1}. ${season.name} (${season.isActive ? 'Aktif' : 'Pasif'})`);
        console.log(`   Tarlalar: ${season._count.fields}, Bitkiler: ${season._count.crops}`);
      });
    }

    // Kuyu analizi
    const wellCount = await prisma.well.count();
    console.log(`\n🏔️ Toplam kuyu sayısı: ${wellCount}`);

    if (wellCount > 0) {
      const wells = await prisma.well.findMany({
        select: {
          id: true,
          name: true,
          locationNote: true,
          status: true,
          latitude: true,
          longitude: true,
          fieldWells: {
            select: {
              field: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      console.log('\n🎯 Kuyu detayları ve bağlı tarlalar:');
      wells.forEach((well, index) => {
        const connectedFields = well.fieldWells.map(fw => fw.field.name).join(', ');
        console.log(`${index + 1}. ${well.name} (${well.locationNote || 'Konum yok'}) - ${well.status}`);
        console.log(`   Koordinat: ${well.latitude}, ${well.longitude}`);
        console.log(`   Bağlı tarlalar: ${connectedFields || 'Yok'}`);
      });
    }

    // Weather veri optimizasyonu önerisi
    console.log('\n🚀 OPTİMİZASYON ÖNERİSİ:');
    console.log(`❌ Şu an: ${fieldCount} tarla × saatlik veri = ${weatherSnapshotCount} kayıt`);
    console.log(`✅ Önerilen: ${wellCount} kuyu × saatlik veri = ~${wellCount * 168} kayıt/hafta`);
    console.log(`💾 Tasarruf: %${Math.round((1 - (wellCount * 168) / weatherSnapshotCount) * 100)} daha az veri`);

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDatabase();