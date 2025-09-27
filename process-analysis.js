const { PrismaClient } = require('@prisma/client');

async function analyzeProcesses() {
  const prisma = new PrismaClient();

  try {
    console.log('=== TARLA PROCESS ANALİZİ ===\n');

    // Toplam process sayısı
    const processCount = await prisma.process.count();
    console.log(`🔄 Toplam process sayısı: ${processCount}`);

    // Process türleri
    const processByType = await prisma.process.groupBy({
      by: ['type'],
      _count: {
        type: true
      }
    });

    console.log('\n📊 Process türleri:');
    processByType.forEach(process => {
      console.log(`${process.type}: ${process._count.type} adet`);
    });

    // Sulama logları
    const irrigationCount = await prisma.irrigationLog.count();
    console.log(`\n💧 Sulama log sayısı: ${irrigationCount}`);

    if (irrigationCount > 0) {
      // Son 10 sulama kaydı
      const recentIrrigations = await prisma.irrigationLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          startDateTime: true,
          duration: true,
          amount: true,
          method: true,
          field: {
            select: {
              name: true
            }
          },
          well: {
            select: {
              name: true
            }
          },
          user: {
            select: {
              name: true
            }
          }
        }
      });

      console.log('\n🌊 Son 10 sulama kaydı:');
      recentIrrigations.forEach((irrigation, index) => {
        console.log(`${index + 1}. ${irrigation.field?.name || 'Tarla yok'} (${irrigation.well?.name || 'Kuyu yok'})`);
        console.log(`   Başlangıç: ${new Date(irrigation.startDateTime).toLocaleString()}`);
        console.log(`   Süre: ${irrigation.duration} dk, Miktar: ${irrigation.amount || 'Belirtilmemiş'}L`);
        console.log(`   Yöntem: ${irrigation.method || 'Belirtilmemiş'}, Kullanıcı: ${irrigation.user?.name || 'Bilinmiyor'}`);
      });
    }

    // Örnek bir tarla seçip detaylı analiz yapalım - Adil Hocanın Tarla
    console.log('\n🎯 ÖRNEK TARLA ANALİZİ - Adil Hocanın Tarla');

    const sampleField = await prisma.field.findFirst({
      where: { name: 'Adil Hocanın Tarla' },
      select: {
        id: true,
        name: true,
        size: true,
        crops: {
          select: {
            name: true,
            plantedDate: true,
            harvestDate: true,
            status: true
          }
        },
        fieldWells: {
          select: {
            well: {
              select: {
                name: true,
                latitude: true,
                longitude: true
              }
            }
          }
        }
      }
    });

    if (sampleField) {
      console.log(`📍 Tarla: ${sampleField.name} (${sampleField.size} dönüm)`);
      console.log(`🌱 Bitki: ${sampleField.crops[0]?.name}`);;
      console.log(`📅 Ekim: ${new Date(sampleField.crops[0]?.plantedDate).toLocaleDateString()}`);
      console.log(`🌾 Hasat: ${new Date(sampleField.crops[0]?.harvestDate).toLocaleDateString()}`);
      console.log(`🏔️ Kuyu: ${sampleField.fieldWells[0]?.well?.name}`);

      // Bu tarla için process kayıtları
      const fieldProcesses = await prisma.process.findMany({
        where: { fieldId: sampleField.id },
        select: {
          id: true,
          type: true,
          status: true,
          date: true,
          description: true,
          createdAt: true,
          worker: {
            select: {
              name: true
            }
          }
        },
        orderBy: { date: 'asc' },
        take: 10
      });

      console.log(`\n🔄 Bu tarla için process kayıtları (${fieldProcesses.length} adet):`);
      fieldProcesses.forEach((process, index) => {
        console.log(`${index + 1}. ${process.type} - ${process.status}`);
        console.log(`   Tarih: ${new Date(process.date).toLocaleDateString()}`);
        console.log(`   Açıklama: ${process.description || 'Yok'}`);
        console.log(`   Kullanıcı: ${process.worker?.name || 'Bilinmiyor'}`);
      });

      // Bu tarla için sulama kayıtları
      const fieldIrrigations = await prisma.irrigationLog.findMany({
        where: { fieldId: sampleField.id },
        select: {
          startDateTime: true,
          duration: true,
          amount: true,
          method: true,
          well: {
            select: {
              name: true
            }
          },
          user: {
            select: {
              name: true
            }
          }
        },
        orderBy: { startDateTime: 'asc' },
        take: 10
      });

      console.log(`\n💧 Bu tarla için sulama kayıtları (${fieldIrrigations.length} adet):`);
      fieldIrrigations.forEach((irrigation, index) => {
        console.log(`${index + 1}. ${new Date(irrigation.startDateTime).toLocaleString()} - ${irrigation.duration} dk`);
        console.log(`   Miktar: ${irrigation.amount || 'Belirtilmemiş'}L, Kuyu: ${irrigation.well?.name || 'Bilinmiyor'}`);
        console.log(`   Kullanıcı: ${irrigation.user?.name || 'Bilinmiyor'}`);
      });

      // Ekim tarihindeki hava durumu
      if (sampleField.crops[0]?.plantedDate) {
        const plantingDate = new Date(sampleField.crops[0].plantedDate);
        const plantingWeather = await prisma.weatherSnapshot.findFirst({
          where: {
            fieldId: sampleField.id,
            timestamp: {
              gte: new Date(plantingDate.setHours(0, 0, 0, 0)),
              lte: new Date(plantingDate.setHours(23, 59, 59, 999))
            }
          },
          select: {
            timestamp: true,
            temperature2m: true,
            relativeHumidity2m: true,
            precipitationMm: true,
            windSpeed10m: true
          }
        });

        if (plantingWeather) {
          console.log(`\n🌤️ Ekim günü hava durumu (${new Date(plantingWeather.timestamp).toLocaleDateString()}):`);
          console.log(`   Sıcaklık: ${plantingWeather.temperature2m}°C`);
          console.log(`   Nem: %${plantingWeather.relativeHumidity2m}`);
          console.log(`   Yağış: ${plantingWeather.precipitationMm}mm`);
          console.log(`   Rüzgar: ${plantingWeather.windSpeed10m}km/h`);
        } else {
          console.log(`\n⚠️ Ekim günü hava durumu bulunamadı`);
        }
      }
    }

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeProcesses();