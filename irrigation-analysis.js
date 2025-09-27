const { PrismaClient } = require('@prisma/client');

async function realIrrigationAnalysis() {
  const prisma = new PrismaClient();

  try {
    console.log('🔥 GERÇEK SULAMA ANALİZİ - BADADABADABUM! 🔥\n');

    // Toplam sulama sayısı
    const totalIrrigations = await prisma.irrigationLog.count();
    console.log(`💧 Toplam sulama kaydı: ${totalIrrigations}`);

    // Son 15 sulama kaydını tarla detaylarıyla çek
    const recentIrrigations = await prisma.irrigationLog.findMany({
      take: 15,
      orderBy: { startDateTime: 'desc' },
      select: {
        id: true,
        startDateTime: true,
        duration: true,
        amount: true,
        method: true,
        status: true,
        notes: true,
        well: {
          select: {
            name: true,
            latitude: true,
            longitude: true
          }
        },
        field: {
          select: {
            name: true,
            location: true,
            size: true,
            crops: {
              select: {
                name: true,
                status: true
              }
            }
          }
        },
        user: {
          select: {
            name: true
          }
        },
        // Tarla kullanım bilgileri
        fieldUsages: {
          select: {
            field: {
              select: {
                name: true,
                size: true
              }
            },
            percentage: true,
            actualIrrigatedArea: true
          }
        }
      }
    });

    console.log('\n🌊 SON 15 GERÇEK SULAMA KAYDI:');
    recentIrrigations.forEach((irrigation, index) => {
      const date = new Date(irrigation.startDateTime);
      console.log(`\n${index + 1}. 📅 ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
      console.log(`   🏔️ Kuyu: ${irrigation.well?.name || 'Bilinmiyor'}`);
      console.log(`   ⏱️ Süre: ${Math.floor(irrigation.duration / 60)}s ${irrigation.duration % 60}dk`);
      console.log(`   🚿 Durum: ${irrigation.status}`);
      console.log(`   👤 İşçi: ${irrigation.user?.name || 'Bilinmiyor'}`);

      // Ana tarla (field relation)
      if (irrigation.field) {
        console.log(`   🌾 Ana Tarla: ${irrigation.field.name} (${irrigation.field.size} dekar)`);
        if (irrigation.field.crops[0]) {
          console.log(`   🌱 Bitki: ${irrigation.field.crops[0].name} (${irrigation.field.crops[0].status})`);
        }
      }

      // Tarla kullanım detayları (fieldUsages)
      if (irrigation.fieldUsages && irrigation.fieldUsages.length > 0) {
        console.log(`   📊 Sulanan Tarlalar:`);
        irrigation.fieldUsages.forEach(usage => {
          console.log(`      - ${usage.field.name}: ${usage.actualIrrigatedArea || usage.field.size} dekar (%${usage.percentage})`);
        });
      }

      if (irrigation.notes) {
        console.log(`   📝 Not: ${irrigation.notes}`);
      }
    });

    // Kuyu bazında sulama istatistikleri
    console.log('\n📈 KUYU BAZINDA SULAMA İSTATİSTİKLERİ:');
    const wellStats = await prisma.irrigationLog.groupBy({
      by: ['wellId'],
      _count: {
        id: true
      },
      _sum: {
        duration: true,
        amount: true
      }
    });

    for (const stat of wellStats) {
      const well = await prisma.well.findUnique({
        where: { id: stat.wellId },
        select: { name: true }
      });

      console.log(`\n🏔️ ${well?.name || 'Bilinmeyen Kuyu'}:`);
      console.log(`   Sulama sayısı: ${stat._count.id}`);
      console.log(`   Toplam süre: ${Math.floor((stat._sum.duration || 0) / 60)} saat ${(stat._sum.duration || 0) % 60} dk`);
      console.log(`   Toplam miktar: ${stat._sum.amount || 'Belirtilmemiş'} L`);
    }

    // Bu ayın sulama kayıtları
    const thisMonth = new Date();
    const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);

    const monthlyIrrigations = await prisma.irrigationLog.count({
      where: {
        startDateTime: {
          gte: startOfMonth
        }
      }
    });

    console.log(`\n📅 Bu ay toplam sulama: ${monthlyIrrigations} kayıt`);

    // En sık sulanan tarlalar
    console.log('\n🏆 EN SIK SULANAN TARLALAR:');
    const fieldIrrigationStats = await prisma.fieldUsage.groupBy({
      by: ['fieldId'],
      _count: {
        fieldId: true
      },
      orderBy: {
        _count: {
          fieldId: 'desc'
        }
      },
      take: 5
    });

    for (const stat of fieldIrrigationStats) {
      const field = await prisma.field.findUnique({
        where: { id: stat.fieldId },
        select: {
          name: true,
          size: true,
          crops: {
            select: {
              name: true,
              status: true
            }
          }
        }
      });

      if (field) {
        console.log(`${field.name}: ${stat._count.fieldId} sulama (${field.size} dekar, ${field.crops[0]?.name || 'Bilinmeyen bitki'})`);
      }
    }

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

realIrrigationAnalysis();