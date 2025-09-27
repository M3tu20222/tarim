/**
 * 🦠 Disease Management System
 * Hastalık risk analizi ve ilaçlama takvimi sistemi
 * Hava durumu koşullarına göre hastalık risk hesaplama
 */

interface DiseaseModel {
  name: string;
  cropTypes: string[];
  conditions: {
    temperature: { min: number; max: number; optimal: number };
    humidity: { min: number; threshold: number };
    leafWetness: { threshold: number };
    windSpeed?: { max: number };
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  treatments: {
    preventive: string[];
    curative: string[];
    chemicals: string[];
    rotationDays: number;
  };
  timing: string;
  description: string;
}

interface TreatmentSchedule {
  diseaseType: string;
  cropType: string;
  riskLevel: number;
  recommendedAction: 'MONITOR' | 'PREVENTIVE' | 'IMMEDIATE' | 'EMERGENCY';
  treatments: string[];
  timing: string;
  nextApplication?: Date;
  notes: string;
}

export class DiseaseManagementSystem {
  private diseaseModels: Record<string, DiseaseModel> = {
    WHEAT_RUST: {
      name: 'Buğday Pası',
      cropTypes: ['wheat', 'buğday'],
      conditions: {
        temperature: { min: 15, max: 25, optimal: 20 },
        humidity: { min: 70, threshold: 85 },
        leafWetness: { threshold: 6 }, // saat
        windSpeed: { max: 15 }
      },
      severity: 'HIGH',
      treatments: {
        preventive: ['Propiconazole', 'Tebuconazole'],
        curative: ['Azoxystrobin', 'Pyraclostrobin'],
        chemicals: ['Folicur', 'Tilt', 'Amistar'],
        rotationDays: 14
      },
      timing: '7-14 gün önce',
      description: 'Nem ve sıcaklık koşulları pas hastalığı için ideal'
    },

    POWDERY_MILDEW: {
      name: 'Külleme Hastalığı',
      cropTypes: ['wheat', 'grape', 'tomato', 'buğday', 'üzüm', 'domates'],
      conditions: {
        temperature: { min: 18, max: 28, optimal: 23 },
        humidity: { min: 60, threshold: 80 },
        leafWetness: { threshold: 4 }
      },
      severity: 'MEDIUM',
      treatments: {
        preventive: ['Sulfur', 'Trifloxystrobin'],
        curative: ['Myclobutanil', 'Penconazole'],
        chemicals: ['Topas', 'Flint', 'Bayleton'],
        rotationDays: 10
      },
      timing: '5-10 gün önce',
      description: 'Yüksek nem ve orta sıcaklık külleme riskini artırıyor'
    },

    SEPTORIA: {
      name: 'Septoria Yaprak Lekesi',
      cropTypes: ['wheat', 'tomato', 'buğday', 'domates'],
      conditions: {
        temperature: { min: 20, max: 27, optimal: 24 },
        humidity: { min: 80, threshold: 90 },
        leafWetness: { threshold: 8 }
      },
      severity: 'HIGH',
      treatments: {
        preventive: ['Chlorothalonil', 'Mancozeb'],
        curative: ['Propiconazole', 'Azoxystrobin'],
        chemicals: ['Bravo', 'Dithane', 'Amistar'],
        rotationDays: 14
      },
      timing: '10-14 gün önce',
      description: 'Uzun süreli yaprak ıslaklığı ve yüksek nem riski'
    },

    LATE_BLIGHT: {
      name: 'Geç Yanıklık',
      cropTypes: ['tomato', 'potato', 'domates', 'patates'],
      conditions: {
        temperature: { min: 18, max: 22, optimal: 20 },
        humidity: { min: 85, threshold: 95 },
        leafWetness: { threshold: 10 }
      },
      severity: 'CRITICAL',
      treatments: {
        preventive: ['Copper compounds', 'Mancozeb'],
        curative: ['Metalaxyl', 'Cymoxanil'],
        chemicals: ['Ridomil', 'Curzate', 'Previcur'],
        rotationDays: 7
      },
      timing: '3-7 gün önce',
      description: 'Kritik risk - hızlı yayılım gösterir'
    },

    EARLY_BLIGHT: {
      name: 'Erken Yanıklık',
      cropTypes: ['tomato', 'potato', 'domates', 'patates'],
      conditions: {
        temperature: { min: 24, max: 29, optimal: 26 },
        humidity: { min: 75, threshold: 90 },
        leafWetness: { threshold: 6 }
      },
      severity: 'MEDIUM',
      treatments: {
        preventive: ['Chlorothalonil', 'Iprodione'],
        curative: ['Difenoconazole', 'Azoxystrobin'],
        chemicals: ['Score', 'Rovral', 'Amistar'],
        rotationDays: 10
      },
      timing: '7-10 gün önce',
      description: 'Sıcak ve nemli koşullarda risk artışı'
    }
  };

  /**
   * 🔍 Hastalık risk analizi yapma
   */
  async analyzeDiseaseRisk(
    cropType: string,
    weatherData: {
      temperature: number;
      humidity: number;
      leafWetness?: number;
      windSpeed?: number;
      forecast?: Array<{
        temperature: number;
        humidity: number;
        precipitation: number;
      }>;
    }
  ): Promise<Array<{
    disease: string;
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    probability: number;
    recommendations: string[];
  }>> {
    const cropLower = cropType.toLowerCase();
    const risks = [];

    for (const [diseaseKey, model] of Object.entries(this.diseaseModels)) {
      // Ekin türü kontrolü
      if (!model.cropTypes.some(ct =>
        ct.toLowerCase() === cropLower ||
        cropLower.includes(ct.toLowerCase())
      )) {
        continue;
      }

      const riskScore = this.calculateDiseaseRisk(model, weatherData);
      const riskLevel = this.getRiskLevel(riskScore);
      const probability = Math.round(riskScore);

      if (riskScore > 30) { // Yalnızca %30'dan yüksek riskleri raporla
        risks.push({
          disease: model.name,
          riskScore,
          riskLevel,
          probability,
          recommendations: this.getRecommendations(model, riskLevel)
        });
      }
    }

    return risks.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * 📅 İlaçlama takvimi oluşturma
   */
  async createTreatmentSchedule(
    risks: Array<{
      disease: string;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      probability: number;
    }>,
    fieldInfo: {
      cropType: string;
      lastTreatment?: Date;
      treatmentHistory?: Array<{
        chemical: string;
        date: Date;
      }>;
    }
  ): Promise<TreatmentSchedule[]> {
    const schedule: TreatmentSchedule[] = [];

    for (const risk of risks) {
      const model = Object.values(this.diseaseModels).find(m => m.name === risk.disease);
      if (!model) continue;

      const action = this.getRecommendedAction(risk.riskLevel, risk.probability);
      const treatments = this.selectTreatments(model, action, fieldInfo.treatmentHistory);

      const nextApplication = this.calculateNextApplication(
        model,
        action,
        fieldInfo.lastTreatment
      );

      schedule.push({
        diseaseType: risk.disease,
        cropType: fieldInfo.cropType,
        riskLevel: risk.probability,
        recommendedAction: action,
        treatments,
        timing: model.timing,
        nextApplication,
        notes: this.generateTreatmentNotes(risk, model, action)
      });
    }

    return schedule.sort((a, b) => {
      const priorityOrder = { 'EMERGENCY': 4, 'IMMEDIATE': 3, 'PREVENTIVE': 2, 'MONITOR': 1 };
      return priorityOrder[b.recommendedAction] - priorityOrder[a.recommendedAction];
    });
  }

  /**
   * 🧮 Hastalık riski hesaplama
   */
  private calculateDiseaseRisk(model: DiseaseModel, weatherData: any): number {
    let riskScore = 0;

    // Sıcaklık skoru
    const tempScore = this.calculateConditionScore(
      weatherData.temperature,
      {
        min: model.conditions.temperature.min,
        max: model.conditions.temperature.max,
        optimal: model.conditions.temperature.optimal
      }
    );
    riskScore += tempScore * 0.4; // %40 ağırlık

    // Nem skoru
    const humidityScore = this.calculateHumidityScore(
      weatherData.humidity,
      model.conditions.humidity
    );
    riskScore += humidityScore * 0.35; // %35 ağırlık

    // Yaprak ıslaklığı skoru
    if (weatherData.leafWetness !== undefined) {
      const leafWetnessScore = this.calculateLeafWetnessScore(
        weatherData.leafWetness,
        model.conditions.leafWetness.threshold
      );
      riskScore += leafWetnessScore * 0.15; // %15 ağırlık
    }

    // Rüzgar etkisi (varsa)
    if (model.conditions.windSpeed && weatherData.windSpeed !== undefined) {
      const windScore = weatherData.windSpeed > model.conditions.windSpeed.max ? 20 : 0;
      riskScore += windScore * 0.1; // %10 ağırlık
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  /**
   * 🌡️ Sıcaklık koşul skoru
   */
  private calculateConditionScore(
    value: number,
    condition: { min: number; max: number; optimal: number }
  ): number {
    if (value < condition.min || value > condition.max) {
      return 0;
    }

    const distanceFromOptimal = Math.abs(value - condition.optimal);
    const maxDistance = Math.max(
      condition.optimal - condition.min,
      condition.max - condition.optimal
    );

    return Math.max(0, 100 - (distanceFromOptimal / maxDistance) * 100);
  }

  /**
   * 💧 Nem skoru hesaplama
   */
  private calculateHumidityScore(humidity: number, condition: { min: number; threshold: number }): number {
    if (humidity < condition.min) return 0;
    if (humidity >= condition.threshold) return 100;

    const range = condition.threshold - condition.min;
    const position = humidity - condition.min;
    return (position / range) * 100;
  }

  /**
   * 🍃 Yaprak ıslaklığı skoru
   */
  private calculateLeafWetnessScore(leafWetness: number, threshold: number): number {
    if (leafWetness < threshold) {
      return (leafWetness / threshold) * 50;
    }
    return 50 + Math.min(50, ((leafWetness - threshold) / threshold) * 50);
  }

  /**
   * 📊 Risk seviyesi belirleme
   */
  private getRiskLevel(riskScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (riskScore >= 80) return 'CRITICAL';
    if (riskScore >= 60) return 'HIGH';
    if (riskScore >= 40) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * 🎯 Önerilen eylem belirleme
   */
  private getRecommendedAction(
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    probability: number
  ): 'MONITOR' | 'PREVENTIVE' | 'IMMEDIATE' | 'EMERGENCY' {
    if (riskLevel === 'CRITICAL' || probability >= 85) return 'EMERGENCY';
    if (riskLevel === 'HIGH' || probability >= 70) return 'IMMEDIATE';
    if (riskLevel === 'MEDIUM' || probability >= 50) return 'PREVENTIVE';
    return 'MONITOR';
  }

  /**
   * 💊 İlaç seçimi
   */
  private selectTreatments(
    model: DiseaseModel,
    action: 'MONITOR' | 'PREVENTIVE' | 'IMMEDIATE' | 'EMERGENCY',
    treatmentHistory?: Array<{ chemical: string; date: Date }>
  ): string[] {
    if (action === 'MONITOR') return ['Düzenli kontrol yapın'];

    const isPreventive = action === 'PREVENTIVE';
    const treatments = isPreventive ? model.treatments.preventive : model.treatments.curative;

    // Kimyasal rotasyon kontrolü
    if (treatmentHistory && treatmentHistory.length > 0) {
      const recentTreatments = treatmentHistory
        .filter(t => {
          const daysSince = (Date.now() - t.date.getTime()) / (1000 * 60 * 60 * 24);
          return daysSince < model.treatments.rotationDays;
        })
        .map(t => t.chemical);

      const availableTreatments = treatments.filter(t => !recentTreatments.includes(t));
      return availableTreatments.length > 0 ? availableTreatments : treatments;
    }

    return treatments;
  }

  /**
   * 📅 Sonraki uygulama tarihini hesaplama
   */
  private calculateNextApplication(
    model: DiseaseModel,
    action: 'MONITOR' | 'PREVENTIVE' | 'IMMEDIATE' | 'EMERGENCY',
    lastTreatment?: Date
  ): Date | undefined {
    if (action === 'MONITOR') return undefined;

    const daysToAdd = {
      'EMERGENCY': 1,
      'IMMEDIATE': 3,
      'PREVENTIVE': 7
    }[action] || 7;

    const baseDate = lastTreatment || new Date();
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + daysToAdd);

    return nextDate;
  }

  /**
   * 📝 İlaçlama notları oluşturma
   */
  private generateTreatmentNotes(
    risk: any,
    model: DiseaseModel,
    action: 'MONITOR' | 'PREVENTIVE' | 'IMMEDIATE' | 'EMERGENCY'
  ): string {
    const urgencyNotes = {
      'EMERGENCY': 'ACİL MÜDAHALE GEREKİYOR! Hava koşulları hastalık gelişimi için ideal.',
      'IMMEDIATE': 'Hızlı müdahale önerilir. Risk seviyesi yüksek.',
      'PREVENTIVE': 'Önleyici ilaçlama yapılmalı. Risk artış eğiliminde.',
      'MONITOR': 'Düzenli takip yeterli. Risk seviyesi düşük.'
    };

    return `${urgencyNotes[action]} ${model.description} Risk olasılığı: %${risk.probability}`;
  }

  /**
   * 💡 Öneriler oluşturma
   */
  private getRecommendations(
    model: DiseaseModel,
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): string[] {
    const baseRecommendations = [
      'Tarla nemini kontrol edin',
      'Yaprak ıslaklığını azaltın',
      'Havalandırmayı artırın'
    ];

    const specificRecommendations = {
      'LOW': ['Düzenli gözlem yapın'],
      'MEDIUM': ['Önleyici ilaçlama planlayın', 'Sulama zamanını ayarlayın'],
      'HIGH': ['İlaçlama yapın', 'Enfekteli bitkileri temizleyin'],
      'CRITICAL': ['ACİL ilaçlama yapın', 'Uzman desteği alın', 'Karantina önlemleri alın']
    };

    return [...baseRecommendations, ...specificRecommendations[riskLevel]];
  }
}

// Singleton instance
export const diseaseManagementSystem = new DiseaseManagementSystem();