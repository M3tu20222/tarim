const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.MONGODB_URI || 'mongodb://localhost:27017/tarim-yonetim-sistemi'
    }
  }
});

async function debugBillingDistribution() {
  try {
    // Önce "Adil Hocanın Tarla" için mevcut dağıtım kaydını bulalım
    const distributions = await prisma.wellBillDistribution.findMany({
      include: {
        owner: true,
        field: true,
        wellBillingPeriod: {
          include: {
            well: true
          }
        }
      },
      where: {
        field: {
          name: "Adil Hocanın Tarla"
        }
      }
    });

    console.log("Mevcut dağıtım kayıtları:");
    for (const dist of distributions) {
      console.log(`\nDağıtım ID: ${dist.id}`);
      console.log(`Tarla: ${dist.field.name}`);
      console.log(`Sahip: ${dist.owner.name}`);
      console.log(`Toplam Süre (dakika): ${dist.basisDuration}`);
      console.log(`Toplam Süre (saat): ${(dist.basisDuration / 60).toFixed(2)}`);
      console.log(`Tutar: ${dist.amount} TL`);
      console.log(`Yüzde Pay: ${dist.sharePercentage.toFixed(2)}%`);
    }

    // Şimdi bu dağıtıma ait sulama kayıtlarını inceleyelim
    if (distributions.length > 0) {
      const firstDist = distributions[0];
      const periodStart = firstDist.wellBillingPeriod.startDate;
      const periodEnd = firstDist.wellBillingPeriod.endDate;
      const wellId = firstDist.wellBillingPeriod.wellId;

      console.log("\n\nİlgili sulama kayıtları:");
      const irrigationLogs = await prisma.irrigationLog.findMany({
        where: {
          wellId: wellId,
          startDateTime: { lte: periodEnd },
          // Dönem içindeki sulamaları filtrele
          fieldUsages: {
            some: {
              fieldId: firstDist.fieldId
            }
          }
        },
        include: {
          fieldUsages: {
            include: {
              field: true,
              ownerUsages: {
                include: {
                  owner: true
                }
              }
            }
          }
        },
        orderBy: {
          startDateTime: 'asc'
        }
      });

      let totalDuration = 0;
      for (const log of irrigationLogs) {
        const logStart = log.startDateTime;
        const logEnd = new Date(log.startDateTime.getTime() + log.duration * 60000);
        
        // Dönem ile kesişim süresini hesapla
        const overlapStart = new Date(Math.max(logStart, periodStart));
        const overlapEnd = new Date(Math.min(logEnd, periodEnd));
        const overlapMinutes = Math.max(0, (overlapEnd - overlapStart) / 60000);
        
        totalDuration += overlapMinutes;
        
        console.log(`\nSulama Kaydı ID: ${log.id}`);
        console.log(`Başlangıç: ${log.startDateTime}`);
        console.log(`Süre: ${log.duration} dakika`);
        console.log(`Dönem içi süre: ${overlapMinutes.toFixed(2)} dakika`);
        
        for (const fu of log.fieldUsages) {
          if (fu.fieldId === firstDist.fieldId) {
            console.log(`\nTarla: ${fu.field.name}`);
            console.log(`Sulama Yüzdesi: ${fu.percentage}%`);
            
            for (const ou of fu.ownerUsages) {
              console.log(`Sahip: ${ou.owner.name}`);
              console.log(`Sahip Yüzdesi: ${ou.ownershipPercentage}%`);
              console.log(`Bu sahibin bu sulamadaki payı: ${ou.usagePercentage}%`);
            }
          }
        }
      }
      
      console.log(`\nToplam Dönem İçi Süre: ${totalDuration.toFixed(2)} dakika (${(totalDuration / 60).toFixed(2)} saat)`);
    }

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugBillingDistribution();
