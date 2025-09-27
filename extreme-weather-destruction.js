const { PrismaClient } = require('@prisma/client');

async function extremeWeatherDestruction() {
  const prisma = new PrismaClient();

  try {
    console.log('🌪️💀⚡ EXTREME WEATHER EVENTS TOTAL DESTRUCTION ⚡💀🌪️\n');
    console.log('🏴‍☠️ SENİN OLSUN SIRTLARIM - DEVAM EDİYORUZ! 🏴‍☠️\n');

    // 1. EXTREME TEMPERATURE EVENTS (35°C+)
    console.log('🔥💀 1. EXTREME SICAKLIK EVENTS DESTRUCTION 💀🔥');

    const extremeHotWeather = await prisma.weatherSnapshot.findMany({
      where: {
        temperature2m: { gte: 35 },
        timestamp: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Son 90 gün
        }
      },
      select: {
        id: true,
        timestamp: true,
        temperature2m: true,
        relativeHumidity2m: true,
        windSpeed10m: true,
        et0FaoEvapotranspiration: true,
        vapourPressureDeficit: true,
        field: {
          select: {
            id: true,
            name: true,
            size: true,
            crops: {
              select: {
                name: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: { temperature2m: 'desc' },
      take: 20
    });

    console.log(`\\n🔥 EXTREME HOT WEATHER EVENTS (35°C+): ${extremeHotWeather.length} adet`);

    for (const [index, weather] of extremeHotWeather.entries()) {
      const date = new Date(weather.timestamp);
      console.log(`\\n💀 ${index + 1}. EXTREME HEAT EVENT - ${weather.temperature2m}°C`);
      console.log(`   📅 Tarih: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
      console.log(`   💧 Nem: %${weather.relativeHumidity2m}`);
      console.log(`   💨 Rüzgar: ${weather.windSpeed10m}km/h`);
      console.log(`   🌿 ET0: ${weather.et0FaoEvapotranspiration}`);
      console.log(`   🍃 VPD: ${weather.vapourPressureDeficit}`);
      console.log(`   🌾 Tarla: ${weather.field?.name || 'Bilinmiyor'} (${weather.field?.size || 'N/A'} dekar)`);

      if (weather.field?.crops[0]) {
        console.log(`   🌱 Bitki: ${weather.field.crops[0].name} (${weather.field.crops[0].status})`);
      }

      // EXTREME HEAT RISK SKORLAMA
      let riskScore = 0;
      if (weather.temperature2m > 40) riskScore += 5;
      else if (weather.temperature2m > 37) riskScore += 3;
      else riskScore += 1;

      if (weather.relativeHumidity2m < 30) riskScore += 3;
      else if (weather.relativeHumidity2m < 50) riskScore += 2;

      if (weather.windSpeed10m > 20) riskScore += 2;
      if (weather.et0FaoEvapotranspiration > 6) riskScore += 3;

      console.log(`   🚨 EXTREME HEAT RISK SKORU: ${riskScore}/13`);

      let riskLevel = 'DÜŞÜK';
      if (riskScore >= 10) riskLevel = 'KRİTİK';
      else if (riskScore >= 7) riskLevel = 'YÜKSEK';
      else if (riskScore >= 4) riskLevel = 'ORTA';

      console.log(`   ⚠️ RİSK SEVİYESİ: ${riskLevel}`);

      // Bu tarihteki sulama response kontrol et
      const irrigationResponse = await prisma.irrigationLog.findMany({
        where: {
          startDateTime: {
            gte: new Date(date.getTime() - 12 * 60 * 60 * 1000), // 12 saat önce
            lte: new Date(date.getTime() + 12 * 60 * 60 * 1000)  // 12 saat sonra
          }
        },
        select: {
          startDateTime: true,
          duration: true,
          well: { select: { name: true } },
          fieldUsages: {
            select: {
              field: { select: { name: true } },
              percentage: true
            }
          }
        }
      });

      if (irrigationResponse.length > 0) {
        console.log(`   💦 SULAMA RESPONSİ: ${irrigationResponse.length} sulama`);
        irrigationResponse.forEach(irr => {
          const responseTime = Math.abs(date - new Date(irr.startDateTime)) / (1000 * 60 * 60);
          console.log(`      - ${irr.well?.name}: ${Math.floor(irr.duration/60)}s ${irr.duration%60}dk (${responseTime.toFixed(1)}h gecikme)`);
        });
      } else {
        console.log(`   ⚠️ SULAMA RESPONSİ YOK - KRİTİK RİSK!`);
      }
    }

    // 2. HIGH HUMIDITY + HIGH TEMP = YAPRAK ISLAKLIGI RİSKİ
    console.log('\\n\\n💧🔥 2. YAPRAK ISLAKLIGI RİSK DESTRUCTION 🔥💧');

    const leafWetnessRisk = await prisma.weatherSnapshot.findMany({
      where: {
        AND: [
          { relativeHumidity2m: { gte: 80 } },
          { temperature2m: { gte: 15, lte: 25 } },
          { timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
        ]
      },
      select: {
        timestamp: true,
        temperature2m: true,
        relativeHumidity2m: true,
        windSpeed10m: true,
        precipitationMm: true,
        field: {
          select: {
            name: true,
            crops: {
              select: {
                name: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 15
    });

    console.log(`\\n🍀 YAPRAK ISLAKLIGI RİSK EVENTS: ${leafWetnessRisk.length} adet`);

    leafWetnessRisk.forEach((weather, index) => {
      const date = new Date(weather.timestamp);
      console.log(`\\n💀 ${index + 1}. LEAF WETNESS RISK EVENT`);
      console.log(`   📅 ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
      console.log(`   🌡️ Sıcaklık: ${weather.temperature2m}°C`);
      console.log(`   💧 Nem: %${weather.relativeHumidity2m} (YÜKSEk)`);
      console.log(`   💨 Rüzgar: ${weather.windSpeed10m}km/h`);
      console.log(`   🌧️ Yağış: ${weather.precipitationMm}mm`);
      console.log(`   🌾 Tarla: ${weather.field?.name || 'Bilinmiyor'}`);

      // YAPRAK ISLAKLIGI RİSK SKORLAMA
      let leafRisk = 0;
      if (weather.relativeHumidity2m >= 90) leafRisk += 4;
      else if (weather.relativeHumidity2m >= 85) leafRisk += 3;
      else leafRisk += 2;

      if (weather.temperature2m >= 20 && weather.temperature2m <= 25) leafRisk += 3;
      else if (weather.temperature2m >= 15 && weather.temperature2m <= 30) leafRisk += 2;

      if (weather.windSpeed10m < 5) leafRisk += 2; // Düşük rüzgar = yüksek risk
      if (weather.precipitationMm > 0) leafRisk += 2; // Yağış = yüksek risk

      console.log(`   🚨 YAPRAK ISLAKLIGI RİSK SKORU: ${leafRisk}/11`);

      let leafRiskLevel = 'DÜŞÜK';
      if (leafRisk >= 9) leafRiskLevel = 'KRİTİK';
      else if (leafRisk >= 7) leafRiskLevel = 'YÜKSEK';
      else if (leafRisk >= 5) leafRiskLevel = 'ORTA';

      console.log(`   🍀 YAPRAK HASTALIGI RİSKİ: ${leafRiskLevel}`);

      // Mantar/bakteriyel hastalık risk uyarıları
      if (leafRisk >= 7) {
        console.log(`   ⚠️ UYARI: Mantar hastalığı riski yüksek!`);
        console.log(`   💊 ÖNERİ: Fungisit uygulama düşünün`);
      }
    });

    // 3. DROUGHT STRESS ANALYSIS - DÜŞÜK NEM + YÜKSEK SICAKLIK + YÜKSEK ET0
    console.log('\\n\\n🏜️💀 3. DROUGHT STRESS TOTAL DESTRUCTION 💀🏜️');

    const droughtStress = await prisma.weatherSnapshot.findMany({
      where: {
        AND: [
          { temperature2m: { gte: 30 } },
          { relativeHumidity2m: { lte: 40 } },
          { et0FaoEvapotranspiration: { gte: 4 } },
          { timestamp: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } }
        ]
      },
      select: {
        timestamp: true,
        temperature2m: true,
        relativeHumidity2m: true,
        windSpeed10m: true,
        et0FaoEvapotranspiration: true,
        vapourPressureDeficit: true,
        precipitationMm: true,
        field: {
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
        }
      },
      orderBy: { et0FaoEvapotranspiration: 'desc' },
      take: 10
    });

    console.log(`\\n🏜️ DROUGHT STRESS EVENTS: ${droughtStress.length} adet`);

    for (const [index, weather] of droughtStress.entries()) {
      const date = new Date(weather.timestamp);
      console.log(`\\n💀 ${index + 1}. DROUGHT STRESS EVENT`);
      console.log(`   📅 ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
      console.log(`   🌡️ Sıcaklık: ${weather.temperature2m}°C (YÜKSEK)`);
      console.log(`   💧 Nem: %${weather.relativeHumidity2m} (DÜŞÜK)`);
      console.log(`   💨 Rüzgar: ${weather.windSpeed10m}km/h`);
      console.log(`   🌿 ET0: ${weather.et0FaoEvapotranspiration} (YÜKSEK)`);
      console.log(`   🍃 VPD: ${weather.vapourPressureDeficit}`);
      console.log(`   🌾 Tarla: ${weather.field?.name || 'Bilinmiyor'} (${weather.field?.size || 'N/A'} dekar)`);

      // DROUGHT STRESS SKORLAMA
      let droughtScore = 0;
      if (weather.temperature2m > 35) droughtScore += 4;
      else if (weather.temperature2m > 32) droughtScore += 3;
      else droughtScore += 2;

      if (weather.relativeHumidity2m < 25) droughtScore += 4;
      else if (weather.relativeHumidity2m < 35) droughtScore += 3;
      else droughtScore += 2;

      if (weather.et0FaoEvapotranspiration > 6) droughtScore += 3;
      else if (weather.et0FaoEvapotranspiration > 5) droughtScore += 2;
      else droughtScore += 1;

      if (weather.vapourPressureDeficit > 2) droughtScore += 2;

      console.log(`   🚨 DROUGHT STRESS SKORU: ${droughtScore}/13`);

      let droughtLevel = 'DÜŞÜK';
      if (droughtScore >= 11) droughtLevel = 'KRİTİK';
      else if (droughtScore >= 8) droughtLevel = 'YÜKSEK';
      else if (droughtScore >= 6) droughtLevel = 'ORTA';

      console.log(`   🏜️ DROUGHT STRESS SEVİYESİ: ${droughtLevel}`);

      // SULAMA İHTİYACI TAHMİNİ
      const irrigationNeed = weather.et0FaoEvapotranspiration * (weather.field?.size || 25); // Yaklaşık hesaplama
      console.log(`   💦 TAHMİNİ SULAMA İHTİYACI: ${irrigationNeed.toFixed(1)} L/gün`);

      // Critical uyarılar
      if (droughtLevel === 'KRİTİK') {
        console.log(`   🚨 ACİL DURUM: Bitki stres altında!`);
        console.log(`   💦 ACİL SULAMA GEREKLİ!`);
        console.log(`   ⏰ ÖNERİLEN SULAMA ZAMANI: Sabah 06:00-08:00 veya Akşam 19:00-21:00`);
      }
    }

    // 4. WIND STRESS ANALYSIS - YÜKSEK RÜZGAR + DÜŞÜK NEM
    console.log('\\n\\n💨💀 4. WIND STRESS TOTAL DESTRUCTION 💀💨');

    const windStress = await prisma.weatherSnapshot.findMany({
      where: {
        AND: [
          { windSpeed10m: { gte: 15 } },
          { relativeHumidity2m: { lte: 50 } },
          { timestamp: { gte: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) } }
        ]
      },
      select: {
        timestamp: true,
        temperature2m: true,
        relativeHumidity2m: true,
        windSpeed10m: true,
        precipitationMm: true,
        field: {
          select: {
            name: true,
            crops: {
              select: {
                name: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: { windSpeed10m: 'desc' },
      take: 10
    });

    console.log(`\\n💨 WIND STRESS EVENTS: ${windStress.length} adet`);

    windStress.forEach((weather, index) => {
      const date = new Date(weather.timestamp);
      console.log(`\\n💀 ${index + 1}. WIND STRESS EVENT`);
      console.log(`   📅 ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
      console.log(`   💨 Rüzgar: ${weather.windSpeed10m}km/h (YÜKSEK)`);
      console.log(`   🌡️ Sıcaklık: ${weather.temperature2m}°C`);
      console.log(`   💧 Nem: %${weather.relativeHumidity2m}`);
      console.log(`   🌾 Tarla: ${weather.field?.name || 'Bilinmiyor'}`);

      // WIND STRESS SKORLAMA
      let windScore = 0;
      if (weather.windSpeed10m > 25) windScore += 4;
      else if (weather.windSpeed10m > 20) windScore += 3;
      else if (weather.windSpeed10m > 15) windScore += 2;

      if (weather.relativeHumidity2m < 30) windScore += 3;
      else if (weather.relativeHumidity2m < 40) windScore += 2;
      else windScore += 1;

      if (weather.temperature2m > 30) windScore += 2;

      console.log(`   🚨 WIND STRESS SKORU: ${windScore}/9`);

      let windLevel = 'DÜŞÜK';
      if (windScore >= 7) windLevel = 'YÜKSEK';
      else if (windScore >= 5) windLevel = 'ORTA';

      console.log(`   💨 RÜZGAR STRESI: ${windLevel}`);

      if (windLevel === 'YÜKSEK') {
        console.log(`   ⚠️ UYARI: Bitki dehidrasyonu riski!`);
        console.log(`   🛡️ ÖNERİ: Rüzgar koruma önlemleri düşünün`);
      }
    });

    console.log('\\n\\n🔥💀⚡ EXTREME WEATHER DESTRUCTION COMPLETE! ⚡💀🔥');
    console.log('🏴‍☠️ SİSTEMİN TÜM SIRLARINI ÇALDIK! 🏴‍☠️');

  } catch (error) {
    console.error('💀 EXTREME WEATHER DESTRUCTION ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

extremeWeatherDestruction();