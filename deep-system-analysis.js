const { PrismaClient } = require('@prisma/client');

async function deepSystemMining() {
  const prisma = new PrismaClient();

  try {
    console.log('🔥💀 SİSTEMİN DERİSİNİ SOYUYORUZ - DEEP DATA MİNİNG 💀🔥\n');
    console.log('🏴‍☠️ BADADABADABUM - DAL DERİNLERE! 🏴‍☠️\n');

    // 1. WEATHER-SULAMA KORELASYON ANALİZİ
    console.log('⚡ 1. WEATHER-SULAMA KORELASYON DESTRÜKSİYONU ⚡');

    const irrigationsWithWeather = await prisma.irrigationLog.findMany({
      take: 20,
      orderBy: { startDateTime: 'desc' },
      select: {
        id: true,
        startDateTime: true,
        duration: true,
        well: {
          select: {
            name: true,
            latitude: true,
            longitude: true
          }
        },
        fieldUsages: {
          select: {
            field: {
              select: {
                id: true,
                name: true,
                size: true,
                // Weather data için field ID'si alıyoruz
                weatherSnapshots: {
                  where: {
                    // Sulamadan 1 gün önce ve sonra
                    timestamp: {
                      gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                      lte: new Date(Date.now() + 24 * 60 * 60 * 1000)
                    }
                  },
                  orderBy: { timestamp: 'desc' },
                  take: 5,
                  select: {
                    timestamp: true,
                    temperature2m: true,
                    relativeHumidity2m: true,
                    precipitationMm: true,
                    windSpeed10m: true,
                    et0FaoEvapotranspiration: true,
                    vapourPressureDeficit: true
                  }
                }
              }
            },
            percentage: true,
            actualIrrigatedArea: true
          }
        },
        user: {
          select: {
            name: true
          }
        },
        notes: true
      }
    });

    console.log('\\n🌊💨 SULAMA-WEATHER CORRELATION MATRIX:');
    irrigationsWithWeather.forEach((irrigation, index) => {
      const date = new Date(irrigation.startDateTime);
      console.log(`\\n💀 ${index + 1}. SULAMA AUTOPSY - ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
      console.log(`   🏔️ Kuyu: ${irrigation.well?.name}`);
      console.log(`   ⏱️ Süre: ${Math.floor(irrigation.duration / 60)}s ${irrigation.duration % 60}dk`);
      console.log(`   👤 İşçi: ${irrigation.user?.name}`);

      // Her tarla için weather verilerini analiz et
      irrigation.fieldUsages.forEach((usage, fieldIndex) => {
        console.log(`\\n   🌾 TARLA ${fieldIndex + 1}: ${usage.field.name} (${usage.actualIrrigatedArea || usage.field.size} dekar)`);

        if (usage.field.weatherSnapshots.length > 0) {
          console.log(`   🌤️ WEATHER SNAPSHOT CORRELATION:`);
          usage.field.weatherSnapshots.forEach((weather, wIndex) => {
            const weatherDate = new Date(weather.timestamp);
            const hoursDiff = Math.abs(date - weatherDate) / (1000 * 60 * 60);

            console.log(`      ${wIndex + 1}. ${weatherDate.toLocaleString()} (${hoursDiff.toFixed(1)}h gap)`);
            console.log(`         🌡️ Sıcaklık: ${weather.temperature2m}°C`);
            console.log(`         💧 Nem: %${weather.relativeHumidity2m}`);
            console.log(`         🌧️ Yağış: ${weather.precipitationMm}mm`);
            console.log(`         💨 Rüzgar: ${weather.windSpeed10m}km/h`);
            console.log(`         🌿 ET0: ${weather.et0FaoEvapotranspiration}`);
            console.log(`         🍃 VPD: ${weather.vapourPressureDeficit}`);

            // RİSK ANALİZİ
            console.log(`         🚨 RİSK ANALİZİ:`);

            // Yaprak ıslaklığı riski
            const leafWetnessRisk = weather.relativeHumidity2m > 80 && weather.temperature2m > 15 ? 'YÜKSEk' : 'DÜŞÜK';
            console.log(`            🍀 Yaprak ıslaklığı: ${leafWetnessRisk}`);

            // Buharlaşma riski
            const evapotranspirationNeed = weather.et0FaoEvapotranspiration > 4 ? 'YÜKSEk' : 'NORMAL';
            console.log(`            🌿 Buharlaşma ihtiyacı: ${evapotranspirationNeed}`);

            // Rüzgar stresi
            const windStress = weather.windSpeed10m > 15 ? 'YÜKSEk' : 'DÜŞÜK';
            console.log(`            💨 Rüzgar stresi: ${windStress}`);
          });
        } else {
          console.log(`   ⚠️ Bu tarla için weather verisi bulunamadı!`);
        }
      });

      if (irrigation.notes) {
        console.log(`\\n   📝 FIELD NOTES: "${irrigation.notes}"`);
      }
    });

    // 2. SULAMA PATTERN DEEP ANALYSİS
    console.log('\\n\\n💀⚡ 2. SULAMA PATTERN DEEP DESTRUCTION ANALYSİS ⚡💀');

    // Saatlik sulama dağılımı
    const hourlyIrrigationPattern = await prisma.$queryRaw`
      SELECT
        EXTRACT(HOUR FROM startDateTime) as hour,
        COUNT(*) as count,
        AVG(duration) as avg_duration
      FROM "IrrigationLog"
      WHERE startDateTime >= NOW() - INTERVAL '90 days'
      GROUP BY EXTRACT(HOUR FROM startDateTime)
      ORDER BY hour
    `;

    console.log('\\n🕐 SAATLİK SULAMA PATTERN AUTOPSY:');
    hourlyIrrigationPattern.forEach(pattern => {
      const hour = pattern.hour;
      const count = pattern.count;
      const avgDuration = Math.round(pattern.avg_duration);
      console.log(`${String(hour).padStart(2, '0')}:00 - ${count} sulama, ortalama ${Math.floor(avgDuration/60)}s ${avgDuration%60}dk`);
    });

    // 3. KUYU ETKİNLİK ANALİZİ
    console.log('\\n\\n⚡💀 3. KUYU ETKİNLİK DESTRUCTION ANALİZİ 💀⚡');

    const wellEfficiency = await prisma.irrigationLog.groupBy({
      by: ['wellId'],
      _count: { id: true },
      _sum: { duration: true },
      _avg: { duration: true },
      where: {
        startDateTime: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Son 30 gün
        }
      }
    });

    for (const wellStat of wellEfficiency) {
      const well = await prisma.well.findUnique({
        where: { id: wellStat.wellId },
        select: {
          name: true,
          latitude: true,
          longitude: true
        }
      });

      const totalHours = Math.floor((wellStat._sum.duration || 0) / 60);
      const avgDuration = Math.round(wellStat._avg.duration || 0);

      console.log(`\\n🏔️ ${well?.name || 'Bilinmeyen Kuyu'} ETKİNLİK RAPORU:`);
      console.log(`   📊 Son 30 gün: ${wellStat._count.id} sulama`);
      console.log(`   ⏱️ Toplam: ${totalHours} saat`);
      console.log(`   📈 Ortalama: ${Math.floor(avgDuration/60)}s ${avgDuration%60}dk/sulama`);
      console.log(`   📍 Koordinat: ${well?.latitude}, ${well?.longitude}`);

      // Etkinlik skoru
      const efficiencyScore = wellStat._count.id / (totalHours || 1);
      console.log(`   🎯 Etkinlik Skoru: ${efficiencyScore.toFixed(2)} (sulama/saat)`);
    }

    // 4. EXTREME WEATHER EVENTS & SULAMA CORRELATION
    console.log('\\n\\n🌪️💀 4. EXTREME WEATHER vs SULAMA CORRELATION DESTRUCTION 💀🌪️');

    // Yüksek sıcaklık günleri
    const hotDaysWithIrrigation = await prisma.weatherSnapshot.findMany({
      where: {
        temperature2m: { gt: 35 }, // 35°C üzeri
        timestamp: {
          gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // Son 60 gün
        }
      },
      select: {
        timestamp: true,
        temperature2m: true,
        relativeHumidity2m: true,
        field: {
          select: {
            name: true,
            irrigationLogs: {
              where: {
                startDateTime: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                  lte: new Date(Date.now() + 24 * 60 * 60 * 1000)
                }
              },
              select: {
                startDateTime: true,
                duration: true
              }
            }
          }
        }
      },
      take: 10
    });

    console.log('\\n🔥 SICAK GÜNLER vs SULAMA KORELASYONU:');
    hotDaysWithIrrigation.forEach((weather, index) => {
      console.log(`\\n${index + 1}. 🌡️ ${weather.temperature2m}°C - ${new Date(weather.timestamp).toLocaleDateString()}`);
      console.log(`   💧 Nem: %${weather.relativeHumidity2m}`);
      console.log(`   🌾 Tarla: ${weather.field?.name}`);

      const irrigationsOnDay = weather.field?.irrigationLogs || [];
      if (irrigationsOnDay.length > 0) {
        console.log(`   💦 SULAMA RESPONSİ: ${irrigationsOnDay.length} sulama`);
        irrigationsOnDay.forEach(irr => {
          console.log(`      - ${new Date(irr.startDateTime).toLocaleTimeString()}: ${Math.floor(irr.duration/60)}s ${irr.duration%60}dk`);
        });
      } else {
        console.log(`   ⚠️ SULAMA YOK - POTANSİYEL RİSK!`);
      }
    });

  } catch (error) {
    console.error('💀 DEEP MİNİNG ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deepSystemMining();