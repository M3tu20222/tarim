import { NextResponse } from 'next/server';
import { WeatherDataService } from '@/lib/weather/weather-service';
import { diseaseManagementSystem } from '@/lib/disease/disease-management';
import { prisma } from '@/lib/prisma';

interface RiskAnalysis {
  fieldId: string;
  fieldName: string;
  overallRiskScore: number; // 0-100
  risks: Array<{
    type: 'FROST' | 'WIND' | 'FLOOD' | 'DISEASE';
    level: 0 | 1 | 2 | 3 | 4;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    probability: number;
    actions: string[];
    timing: string;
    description: string;
  }>;
  cropSpecificRisks: {
    cropType: string;
    vulnerabilities: string[];
    recommendations: string[];
  };
  diseaseRisks: Array<{
    disease: string;
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    probability: number;
    recommendations: string[];
  }>;
  treatmentSchedule: Array<{
    diseaseType: string;
    cropType: string;
    riskLevel: number;
    recommendedAction: 'MONITOR' | 'PREVENTIVE' | 'IMMEDIATE' | 'EMERGENCY';
    treatments: string[];
    timing: string;
    nextApplication?: string;
    notes: string;
  }>;
  location: {
    name: string;
    coordinates?: string;
  };
  lastUpdate: string;
}

export async function GET(request: Request, { params }: { params: Promise<{ fieldId: string }> }) {
  try {
    const { fieldId } = await params;

    // Tarla bilgilerini getir
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      select: {
        id: true,
        name: true,
        coordinates: true,
        location: true,
        soilType: true,
        crops: {
          select: {
            name: true,
            status: true,
            plantedDate: true,
            harvestDate: true
          }
        },
        fieldWells: {
          include: {
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

    if (!field) {
      return NextResponse.json({
        success: false,
        error: 'Tarla bulunamadı'
      }, { status: 404 });
    }

    // Weather service'i field koordinatlarıyla yapılandır
    const weatherService = new WeatherDataService();
    let locationSet = false;

    // 1. Öncelik: Tarla koordinatları
    if (field.coordinates) {
      locationSet = weatherService.setLocationFromField(field.coordinates);
    }

    // 2. Fallback: İlişkili kuyu koordinatları
    if (!locationSet && field.fieldWells && field.fieldWells.length > 0) {
      const wellsWithCoords = field.fieldWells.filter(fw =>
        fw.well.latitude && fw.well.longitude
      );

      if (wellsWithCoords.length > 0) {
        const well = wellsWithCoords[0].well;
        const coordString = `${well.latitude},${well.longitude}`;
        locationSet = weatherService.setLocationFromField(coordString);
      }
    }

    // 3. Final fallback: Default lokasyon
    if (!locationSet) {
      await weatherService.setLocationFromWells();
    }

    // Hava durumu analizi
    const analysis = await weatherService.analyzeAgriculturalConditions();

    // Hastalık analizi
    const mainCrop = field.crops && field.crops.length > 0 ? field.crops[0] : null;
    let diseaseRisks: any[] = [];
    let treatmentSchedule: any[] = [];

    if (mainCrop && analysis.current) {
      try {
        diseaseRisks = await diseaseManagementSystem.analyzeDiseaseRisk(
          mainCrop.name,
          {
            temperature: analysis.current.temperature || 20,
            humidity: analysis.current.humidity || 60,
            leafWetness: 4, // Default 4 saat
            windSpeed: analysis.current.windSpeed || 5,
            forecast: analysis.forecast?.slice(0, 3).map(f => ({
              temperature: f.temperature,
              humidity: f.humidity,
              precipitation: f.precipitation
            }))
          }
        );

        if (diseaseRisks.length > 0) {
          treatmentSchedule = await diseaseManagementSystem.createTreatmentSchedule(
            diseaseRisks.map(risk => ({
              disease: risk.disease,
              riskLevel: risk.riskLevel,
              probability: risk.probability
            })),
            {
              cropType: mainCrop.name,
              lastTreatment: undefined, // TODO: Get from database
              treatmentHistory: [] // TODO: Get from database
            }
          );
        }
      } catch (error) {
        console.error('Disease analysis error:', error);
        // Continue without disease analysis
      }
    }

    // Risk analizi
    const riskAnalysis: RiskAnalysis = {
      fieldId: field.id,
      fieldName: field.name,
      overallRiskScore: calculateOverallRiskScore(analysis.risks, diseaseRisks),
      risks: analysis.risks.map(risk => ({
        type: risk.type,
        level: risk.level,
        severity: risk.severity,
        probability: calculateRiskProbability(risk),
        actions: [risk.action],
        timing: risk.timing || 'Hemen',
        description: generateRiskDescription(risk)
      })),
      cropSpecificRisks: generateCropSpecificRisks(field.crops, field.soilType),
      diseaseRisks,
      treatmentSchedule: treatmentSchedule.map(treatment => ({
        ...treatment,
        nextApplication: treatment.nextApplication?.toISOString()
      })),
      location: {
        name: field.location,
        coordinates: field.coordinates || undefined
      },
      lastUpdate: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: riskAnalysis
    });

  } catch (error) {
    console.error('Risk analysis API error:', error);

    return NextResponse.json({
      success: false,
      error: 'Risk analizi alınamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    }, { status: 500 });
  }
}

function calculateOverallRiskScore(risks: any[], diseaseRisks: any[] = []): number {
  if ((!risks || risks.length === 0) && (!diseaseRisks || diseaseRisks.length === 0)) return 0;

  let totalScore = 0;
  let totalItems = 0;

  // Weather risks
  if (risks && risks.length > 0) {
    const weatherRiskScore = risks.reduce((sum, risk) => sum + (risk.level * 20), 0) / risks.length;
    totalScore += weatherRiskScore * 0.6; // %60 weather risks
    totalItems += 0.6;
  }

  // Disease risks
  if (diseaseRisks && diseaseRisks.length > 0) {
    const diseaseRiskScore = diseaseRisks.reduce((sum, risk) => sum + risk.riskScore, 0) / diseaseRisks.length;
    totalScore += diseaseRiskScore * 0.4; // %40 disease risks
    totalItems += 0.4;
  }

  return totalItems > 0 ? Math.min(100, totalScore / totalItems) : 0;
}

function calculateRiskProbability(risk: any): number {
  const levelToProb = {
    0: 0,
    1: 25,
    2: 50,
    3: 75,
    4: 95
  };
  return levelToProb[risk.level as keyof typeof levelToProb] || 0;
}

function generateRiskDescription(risk: any): string {
  const descriptions = {
    FROST: `Don riski tespit edildi. Minimum sıcaklık ${risk.details?.temperature || 'bilinmiyor'}°C`,
    WIND: `Yüksek rüzgar riski. Hız: ${risk.details?.speed || 'bilinmiyor'} km/h`,
    FLOOD: `Sel/taşkın riski. Toplam yağış: ${risk.details?.rainfall || 'bilinmiyor'}mm`,
    DISEASE: `Hastalık riski yüksek. Nem ve sıcaklık koşulları uygun`
  };

  return descriptions[risk.type as keyof typeof descriptions] || 'Risk tespit edildi';
}

function generateCropSpecificRisks(crops: any[], soilType?: string) {
  if (!crops || crops.length === 0) {
    return {
      cropType: 'Bilinmiyor',
      vulnerabilities: ['Genel tarımsal riskler'],
      recommendations: ['Hava durumu takibi yapın']
    };
  }

  const mainCrop = crops[0];
  const cropRisks = {
    'wheat': {
      vulnerabilities: [
        'Pas hastalığı (yüksek nem)',
        'Don riski (çiçeklenme dönemi)',
        'Lodging (yüksek rüzgar)'
      ],
      recommendations: [
        'Fungusit uygulaması planlayın',
        'Don koruması için sulama sistemi',
        'Rüzgar kıranları kontrol edin'
      ]
    },
    'corn': {
      vulnerabilities: [
        'Kuraklık stresi',
        'Fırtına hasarı',
        'Mildiyö riski'
      ],
      recommendations: [
        'Sulama programı optimize edin',
        'Destek çubukları kontrol edin',
        'Erken müdahale için ilaçlama'
      ]
    },
    'tomato': {
      vulnerabilities: [
        'Geç yanıklık',
        'Aşırı nem riski',
        'Sıcaklık stresi'
      ],
      recommendations: [
        'Sistemik fungusit uygulayın',
        'Drenajı iyileştirin',
        'Gölgeleme sistemleri kurun'
      ]
    }
  };

  const cropName = mainCrop.name.toLowerCase();
  const defaultRisk = {
    vulnerabilities: ['Genel hava riski'],
    recommendations: ['Düzenli kontrol yapın']
  };

  return {
    cropType: mainCrop.name,
    ...(cropRisks[cropName as keyof typeof cropRisks] || defaultRisk)
  };
}

// Cache süresi ayarı (30 dakika)
export const revalidate = 1800;