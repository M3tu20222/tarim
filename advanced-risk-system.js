const { PrismaClient } = require('@prisma/client');

// 🔥💀 ADVANCED RISK SCORING SYSTEM - FINAL DESTRUCTION 💀🔥
// The ultimate risk assessment engine for agricultural management

class AdvancedRiskEngine {
  constructor(prisma) {
    this.prisma = prisma;
    this.riskFactors = {
      WEATHER: 0.4,      // 40% weight
      IRRIGATION: 0.25,  // 25% weight
      CROP_STATUS: 0.2,  // 20% weight
      TIMING: 0.15       // 15% weight
    };
  }

  // 🌡️ WEATHER RISK CALCULATION
  calculateWeatherRisk(weather) {
    let weatherScore = 0;

    // Temperature Risk (0-25 points)
    if (weather.temperature2m > 40) weatherScore += 25;
    else if (weather.temperature2m > 35) weatherScore += 20;
    else if (weather.temperature2m > 32) weatherScore += 15;
    else if (weather.temperature2m > 28) weatherScore += 10;
    else if (weather.temperature2m < 5) weatherScore += 15;
    else if (weather.temperature2m < 10) weatherScore += 10;

    // Humidity Risk (0-20 points)
    if (weather.relativeHumidity2m > 90) weatherScore += 15; // Too humid = fungal risk
    else if (weather.relativeHumidity2m > 85) weatherScore += 10;
    else if (weather.relativeHumidity2m < 25) weatherScore += 20; // Too dry = drought
    else if (weather.relativeHumidity2m < 35) weatherScore += 15;
    else if (weather.relativeHumidity2m < 45) weatherScore += 10;

    // Wind Risk (0-15 points)
    if (weather.windSpeed10m > 25) weatherScore += 15;
    else if (weather.windSpeed10m > 20) weatherScore += 12;
    else if (weather.windSpeed10m > 15) weatherScore += 8;

    // ET0 Risk (0-20 points)
    if (weather.et0FaoEvapotranspiration > 7) weatherScore += 20;
    else if (weather.et0FaoEvapotranspiration > 5) weatherScore += 15;
    else if (weather.et0FaoEvapotranspiration > 4) weatherScore += 10;
    else if (weather.et0FaoEvapotranspiration > 3) weatherScore += 5;

    // VPD Risk (0-10 points)
    if (weather.vapourPressureDeficit > 3) weatherScore += 10;
    else if (weather.vapourPressureDeficit > 2.5) weatherScore += 8;
    else if (weather.vapourPressureDeficit > 2) weatherScore += 5;

    // Precipitation Risk (0-10 points)
    if (weather.precipitationMm > 50) weatherScore += 8; // Too much rain
    else if (weather.precipitationMm > 30) weatherScore += 5;
    else if (weather.precipitationMm === 0) weatherScore += 3; // No rain

    return Math.min(weatherScore, 100); // Cap at 100
  }

  // 💧 IRRIGATION RISK CALCULATION
  calculateIrrigationRisk(lastIrrigation, fieldSize, cropType, currentWeather) {
    if (!lastIrrigation) return 80; // No irrigation history = high risk

    const hoursSinceLastIrrigation = (new Date() - new Date(lastIrrigation.startDateTime)) / (1000 * 60 * 60);
    let irrigationScore = 0;

    // Time since last irrigation risk
    const cropIrrigationIntervals = {
      'corn': 48,      // Corn needs irrigation every 48-72 hours in hot weather
      'wheat': 72,     // Wheat is more drought tolerant
      'other': 60      // General crops
    };

    const expectedInterval = cropIrrigationIntervals[cropType] || 60;

    if (hoursSinceLastIrrigation > expectedInterval * 2) irrigationScore += 40;
    else if (hoursSinceLastIrrigation > expectedInterval * 1.5) irrigationScore += 30;
    else if (hoursSinceLastIrrigation > expectedInterval) irrigationScore += 20;
    else if (hoursSinceLastIrrigation > expectedInterval * 0.8) irrigationScore += 10;

    // Irrigation efficiency risk
    const avgDuration = lastIrrigation.duration;
    const recommendedDuration = fieldSize * 12; // 12 minutes per dekar

    if (avgDuration < recommendedDuration * 0.5) irrigationScore += 20; // Under-irrigated
    else if (avgDuration > recommendedDuration * 2) irrigationScore += 15; // Over-irrigated

    // Weather condition at last irrigation
    const lastTemp = currentWeather.temperature2m;
    const lastET0 = currentWeather.et0FaoEvapotranspiration;

    if (lastTemp > 35 && lastET0 > 5) irrigationScore += 15; // Harsh conditions require more frequent irrigation
    else if (lastTemp > 30 && lastET0 > 4) irrigationScore += 10;

    return Math.min(irrigationScore, 100);
  }

  // 🌱 CROP STATUS RISK CALCULATION
  calculateCropRisk(crop, field) {
    let cropScore = 0;

    if (!crop) return 50; // No crop data = medium risk

    const plantedDate = new Date(crop.plantedDate);
    const currentDate = new Date();
    const daysSincePlanting = (currentDate - plantedDate) / (1000 * 60 * 60 * 24);

    // Growth stage risks
    const cropGrowthStages = {
      'corn': {
        germination: [0, 10],     // High water need
        vegetative: [10, 45],     // Medium water need
        flowering: [45, 70],      // Critical water need
        maturation: [70, 120],    // Reducing water need
        harvest: [120, 150]       // Minimal water need
      },
      'wheat': {
        germination: [0, 15],
        tillering: [15, 90],
        heading: [90, 120],
        maturation: [120, 180],
        harvest: [180, 200]
      },
      'other': {
        germination: [0, 12],
        vegetative: [12, 50],
        flowering: [50, 80],
        maturation: [80, 120],
        harvest: [120, 150]
      }
    };

    const stages = cropGrowthStages[crop.name] || cropGrowthStages['other'];

    // Determine current growth stage
    let currentStage = 'harvest';
    let stageRisk = 10;

    if (daysSincePlanting <= stages.germination[1]) {
      currentStage = 'germination';
      stageRisk = 25; // High water sensitivity
    } else if (daysSincePlanting <= stages.vegetative[1]) {
      currentStage = 'vegetative';
      stageRisk = 15;
    } else if (daysSincePlanting <= stages.flowering[1]) {
      currentStage = 'flowering';
      stageRisk = 35; // CRITICAL stage
    } else if (daysSincePlanting <= stages.maturation[1]) {
      currentStage = 'maturation';
      stageRisk = 20;
    } else {
      currentStage = 'harvest';
      stageRisk = 5; // Low water need
    }

    cropScore += stageRisk;

    // Crop status risk
    if (crop.status === 'FAILED') cropScore += 50;
    else if (crop.status === 'HARVESTED') cropScore = 0; // No irrigation needed
    else if (crop.status === 'GROWING') cropScore += 0; // Normal

    // Field size impact
    if (field.size > 50) cropScore += 10; // Larger fields = harder to manage
    else if (field.size > 100) cropScore += 15;

    return { score: Math.min(cropScore, 100), stage: currentStage, daysSincePlanting };
  }

  // ⏰ TIMING RISK CALCULATION
  calculateTimingRisk() {
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth() + 1; // 1-12
    let timingScore = 0;

    // Hour-based risk (irrigation timing)
    if (hour >= 10 && hour <= 16) timingScore += 25; // Hottest part of day - bad for irrigation
    else if (hour >= 8 && hour <= 18) timingScore += 15; // Daylight hours - not ideal
    else if (hour >= 20 || hour <= 6) timingScore += 0; // Optimal irrigation times

    // Seasonal risk
    if (month >= 6 && month <= 8) timingScore += 15; // Summer months - high water demand
    else if (month >= 4 && month <= 5 || month >= 9 && month <= 10) timingScore += 10; // Spring/Fall
    else timingScore += 5; // Winter - low demand

    // Day of week patterns (optional)
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) timingScore += 5; // Weekends - less monitoring

    return timingScore;
  }

  // 🎯 COMPOSITE RISK SCORE CALCULATION
  calculateCompositeRisk(weatherRisk, irrigationRisk, cropRisk, timingRisk) {
    const compositeScore =
      (weatherRisk * this.riskFactors.WEATHER) +
      (irrigationRisk * this.riskFactors.IRRIGATION) +
      (cropRisk.score * this.riskFactors.CROP_STATUS) +
      (timingRisk * this.riskFactors.TIMING);

    let riskLevel = 'LOW';
    if (compositeScore >= 80) riskLevel = 'CRITICAL';
    else if (compositeScore >= 60) riskLevel = 'HIGH';
    else if (compositeScore >= 40) riskLevel = 'MEDIUM';
    else if (compositeScore >= 20) riskLevel = 'LOW';
    else riskLevel = 'MINIMAL';

    return {
      score: Math.round(compositeScore),
      level: riskLevel,
      breakdown: {
        weather: Math.round(weatherRisk * this.riskFactors.WEATHER),
        irrigation: Math.round(irrigationRisk * this.riskFactors.IRRIGATION),
        crop: Math.round(cropRisk.score * this.riskFactors.CROP_STATUS),
        timing: Math.round(timingRisk * this.riskFactors.TIMING)
      }
    };
  }

  // 💊 RECOMMENDATION ENGINE
  generateRecommendations(riskScore, weatherRisk, irrigationRisk, cropRisk, timingRisk, field, weather) {
    const recommendations = [];
    const alerts = [];

    // CRITICAL ALERTS
    if (riskScore.level === 'CRITICAL') {
      alerts.push('🚨 ACİL DURUM: Bitki kritik risk altında!');
      alerts.push('💦 HEMEN SULAMA GEREKLİ!');
    }

    // Weather-based recommendations
    if (weatherRisk > 60) {
      if (weather.temperature2m > 35) {
        recommendations.push('🌡️ Yüksek sıcaklık: Gece saatlerinde (22:00-02:00) sulayın');
        recommendations.push('💧 Su miktarını %20 artırın');
      }
      if (weather.relativeHumidity2m < 30) {
        recommendations.push('🏜️ Düşük nem: Sık ve kısa sulama uygulayın');
      }
      if (weather.windSpeed10m > 20) {
        recommendations.push('💨 Yüksek rüzgar: Rüzgar kesildiğinde sulayın');
      }
      if (weather.et0FaoEvapotranspiration > 5) {
        recommendations.push('🌿 Yüksek buharlaşma: Günlük su ihtiyacını %30 artırın');
      }
    }

    // Irrigation-based recommendations
    if (irrigationRisk > 50) {
      recommendations.push('⏰ Sulama frekansını artırın');

      const recommendedDuration = field.size * 12; // 12 dk/dekar
      recommendations.push(`⏱️ Önerilen sulama süresi: ${recommendedDuration} dakika`);

      const estimatedWater = field.size * 1000 * 3; // 3L/m²
      recommendations.push(`💧 Tahmini su ihtiyacı: ${estimatedWater} L`);
    }

    // Crop-based recommendations
    if (cropRisk.score > 40) {
      if (cropRisk.stage === 'flowering') {
        recommendations.push('🌸 Çiçeklenme döneminde: Su stresinden MUTLAKA kaçının!');
        recommendations.push('💦 Bu dönemde sulama eksikliği verim kaybına neden olur');
      } else if (cropRisk.stage === 'germination') {
        recommendations.push('🌱 Çimlenme döneminde: Toprağı nemli tutun');
      } else if (cropRisk.stage === 'vegetative') {
        recommendations.push('🌿 Vegetatif dönemde: Düzenli sulama yapın');
      }
    }

    // Timing-based recommendations
    if (timingRisk > 30) {
      recommendations.push('⏰ Optimal sulama saatleri: 22:00-02:00 veya 05:00-07:00');
      recommendations.push('☀️ Gündüz saatlerinde sulamaktan kaçının');
    }

    return { recommendations, alerts };
  }
}

// 🔥💀 MAIN RISK ANALYSIS FUNCTION 💀🔥
async function advancedRiskSystemDestruction() {
  const prisma = new PrismaClient();
  const riskEngine = new AdvancedRiskEngine(prisma);

  try {
    console.log('🔥💀⚡ ADVANCED RISK SCORING SYSTEM - TOTAL DESTRUCTION ⚡💀🔥\n');
    console.log('🏴‍☠️ DEEP DIVE INTO AGRICULTURAL RISK MANAGEMENT! 🏴‍☠️\n');

    // Get all fields with latest data
    const fields = await prisma.field.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        crops: {
          where: { status: 'GROWING' },
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        fieldWells: {
          include: {
            well: true
          }
        },
        weatherSnapshots: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      },
      take: 10
    });

    console.log(`📊 ${fields.length} TARLA İÇİN RISK ANALİZİ BAŞLATIYOR...\n`);

    for (const field of fields) {
      console.log(`\n💀 =========================== FIELD DESTRUCTION: ${field.name} ===========================`);
      console.log(`📍 Konum: ${field.location}, Büyüklük: ${field.size} dekar`);

      const weather = field.weatherSnapshots[0];
      const crop = field.crops[0];
      const well = field.fieldWells[0]?.well;

      if (!weather) {
        console.log('⚠️ Weather data bulunamadı, analiz atlanıyor...');
        continue;
      }

      // Get latest irrigation for this field
      const lastIrrigation = await prisma.irrigationLog.findFirst({
        where: {
          fieldUsages: {
            some: {
              fieldId: field.id
            }
          }
        },
        orderBy: { startDateTime: 'desc' }
      });

      console.log(`\n🌤️ WEATHER CONDITIONS:`);
      console.log(`   🌡️ Sıcaklık: ${weather.temperature2m}°C`);
      console.log(`   💧 Nem: %${weather.relativeHumidity2m}`);
      console.log(`   💨 Rüzgar: ${weather.windSpeed10m}km/h`);
      console.log(`   🌿 ET0: ${weather.et0FaoEvapotranspiration}`);
      console.log(`   🍃 VPD: ${weather.vapourPressureDeficit}`);

      // CALCULATE ALL RISK COMPONENTS
      const weatherRisk = riskEngine.calculateWeatherRisk(weather);
      const irrigationRisk = riskEngine.calculateIrrigationRisk(
        lastIrrigation,
        field.size,
        crop?.name || 'other',
        weather
      );
      const cropRisk = riskEngine.calculateCropRisk(crop, field);
      const timingRisk = riskEngine.calculateTimingRisk();

      console.log(`\n🎯 RISK COMPONENT BREAKDOWN:`);
      console.log(`   🌤️ Weather Risk: ${weatherRisk}/100`);
      console.log(`   💧 Irrigation Risk: ${irrigationRisk}/100`);
      console.log(`   🌱 Crop Risk: ${cropRisk.score}/100 (Stage: ${cropRisk.stage}, Day: ${Math.round(cropRisk.daysSincePlanting)})`);
      console.log(`   ⏰ Timing Risk: ${timingRisk}/100`);

      // CALCULATE COMPOSITE RISK SCORE
      const compositeRisk = riskEngine.calculateCompositeRisk(weatherRisk, irrigationRisk, cropRisk, timingRisk);

      console.log(`\\n🔥 COMPOSITE RISK ANALYSIS:`);
      console.log(`   📊 Overall Score: ${compositeRisk.score}/100`);
      console.log(`   🚨 Risk Level: ${compositeRisk.level}`);
      console.log(`   📈 Breakdown: Weather(${compositeRisk.breakdown.weather}) + Irrigation(${compositeRisk.breakdown.irrigation}) + Crop(${compositeRisk.breakdown.crop}) + Timing(${compositeRisk.breakdown.timing})`);

      // GENERATE RECOMMENDATIONS
      const { recommendations, alerts } = riskEngine.generateRecommendations(
        compositeRisk, weatherRisk, irrigationRisk, cropRisk, timingRisk, field, weather
      );

      if (alerts.length > 0) {
        console.log(`\\n🚨 CRITICAL ALERTS:`);
        alerts.forEach(alert => console.log(`   ${alert}`));
      }

      if (recommendations.length > 0) {
        console.log(`\\n💡 SMART RECOMMENDATIONS:`);
        recommendations.forEach((rec, i) => console.log(`   ${i + 1}. ${rec}`));
      }

      console.log(`\\n💦 IRRIGATION STATUS:`);
      if (lastIrrigation) {
        const hoursSince = (new Date() - new Date(lastIrrigation.startDateTime)) / (1000 * 60 * 60);
        console.log(`   ⏰ Son sulama: ${hoursSince.toFixed(1)} saat önce`);
        console.log(`   ⏱️ Süre: ${Math.floor(lastIrrigation.duration/60)}s ${lastIrrigation.duration%60}dk`);
        console.log(`   🏔️ Kuyu: ${well?.name || 'Bilinmiyor'}`);
      } else {
        console.log(`   ⚠️ Sulama geçmişi bulunamadı!`);
      }

      // PRIORITY SCORING
      let priority = 'LOW';
      if (compositeRisk.score >= 80) priority = 'URGENT';
      else if (compositeRisk.score >= 60) priority = 'HIGH';
      else if (compositeRisk.score >= 40) priority = 'MEDIUM';

      console.log(`\\n🎯 ACTION PRIORITY: ${priority}`);

      if (priority === 'URGENT') {
        console.log(`   🚨 Bu tarla ACIL müdahale gerektiriyor!`);
      } else if (priority === 'HIGH') {
        console.log(`   ⚠️ Bu tarla yakın takip gerektiriyor!`);
      }
    }

    console.log(`\\n\\n🔥💀⚡ ADVANCED RISK SCORING DESTRUCTION COMPLETE! ⚡💀🔥`);
    console.log(`🏴‍☠️ TÜM TARLA RİSKLERİ ANALİZ EDİLDİ! 🏴‍☠️`);

  } catch (error) {
    console.error('💀 ADVANCED RISK SYSTEM ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 🚀 EXECUTE THE DESTRUCTION
advancedRiskSystemDestruction();