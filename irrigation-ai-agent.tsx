import React, { useState, useEffect, useCallback } from "react";
import { GoogleGenAI, Type } from "@google/genai";

// 🌾💧 IRRIGATION AI AGENT - TARIM SİSTEMİNE BAĞLANDI! 💧🌾
// Based on the agent.tsx structure but adapted for irrigation prediction

interface IrrigationAIProps {
  onPrediction: (prediction: IrrigationPrediction) => void;
  weatherData?: WeatherData[];
  fieldData?: FieldData[];
  irrigationHistory?: IrrigationLog[];
}

interface WeatherData {
  timestamp: string;
  temperature2m: number;
  relativeHumidity2m: number;
  precipitationMm: number;
  windSpeed10m: number;
  et0FaoEvapotranspiration: number;
  vapourPressureDeficit: number;
}

interface FieldData {
  id: string;
  name: string;
  size: number;
  crop: string;
  cropStatus: string;
  plantedDate: string;
  lastIrrigation?: string;
}

interface IrrigationLog {
  startDateTime: string;
  duration: number;
  fieldName: string;
  wellName: string;
  notes?: string;
}

interface IrrigationPrediction {
  predictions: FieldPrediction[];
  globalRecommendations: string[];
  riskAnalysis: RiskAnalysis;
  nextIrrigationSchedule: IrrigationSchedule[];
}

interface FieldPrediction {
  fieldId: string;
  fieldName: string;
  irrigationNeed: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
  recommendedDuration: number; // minutes
  recommendedTime: string; // "22:00" format
  waterAmount: number; // liters
  reasoning: string;
  riskFactors: string[];
}

interface RiskAnalysis {
  leafWetnessRisk: "HIGH" | "MEDIUM" | "LOW";
  droughtStress: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  windStress: "HIGH" | "MEDIUM" | "LOW";
  temperatureStress: "EXTREME" | "HIGH" | "MEDIUM" | "LOW";
  overallRisk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

interface IrrigationSchedule {
  fieldName: string;
  recommendedDateTime: string;
  duration: number;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  wellName: string;
}

const LoadingSpinner: React.FC = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
);

const IrrigationIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v6a4 4 0 004 4h4V5z" />
  </svg>
);

const WeatherIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.002 4.002 0 003 15z" />
  </svg>
);

const IrrigationAI: React.FC<IrrigationAIProps> = ({
  onPrediction,
  weatherData = [],
  fieldData = [],
  irrigationHistory = []
}) => {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrediction, setLastPrediction] = useState<IrrigationPrediction | null>(null);

  // Response schema for structured AI output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      predictions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            fieldId: { type: Type.STRING },
            fieldName: { type: Type.STRING },
            irrigationNeed: {
              type: Type.STRING,
              description: "Must be one of: CRITICAL, HIGH, MEDIUM, LOW, NONE"
            },
            recommendedDuration: {
              type: Type.NUMBER,
              description: "Recommended irrigation duration in minutes"
            },
            recommendedTime: {
              type: Type.STRING,
              description: "Recommended time in HH:MM format, e.g., '22:00'"
            },
            waterAmount: {
              type: Type.NUMBER,
              description: "Estimated water amount needed in liters"
            },
            reasoning: {
              type: Type.STRING,
              description: "Detailed reasoning for this recommendation"
            },
            riskFactors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of risk factors affecting this field"
            }
          },
          required: ["fieldId", "fieldName", "irrigationNeed", "recommendedDuration", "recommendedTime", "waterAmount", "reasoning", "riskFactors"]
        }
      },
      globalRecommendations: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "General recommendations for all fields"
      },
      riskAnalysis: {
        type: Type.OBJECT,
        properties: {
          leafWetnessRisk: { type: Type.STRING },
          droughtStress: { type: Type.STRING },
          windStress: { type: Type.STRING },
          temperatureStress: { type: Type.STRING },
          overallRisk: { type: Type.STRING }
        },
        required: ["leafWetnessRisk", "droughtStress", "windStress", "temperatureStress", "overallRisk"]
      },
      nextIrrigationSchedule: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            fieldName: { type: Type.STRING },
            recommendedDateTime: { type: Type.STRING },
            duration: { type: Type.NUMBER },
            priority: { type: Type.STRING },
            wellName: { type: Type.STRING }
          },
          required: ["fieldName", "recommendedDateTime", "duration", "priority", "wellName"]
        }
      }
    },
    required: ["predictions", "globalRecommendations", "riskAnalysis", "nextIrrigationSchedule"]
  };

  const handlePredictIrrigation = async () => {
    if (!weatherData.length && !fieldData.length) {
      setError("Weather data veya field data gerekli.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY as string });

      // 🔥💀 SİSTEM TALİMATLARI - DEEP AGRICULTURAL INTELLIGENCE 💀🔥
      const systemInstructionText = `Sen tarım sulama uzmanı bir AI'sın.
Verilen weather data, field data ve irrigation history'ye göre akıllı sulama önerileri yapıyorsun.

GÖREVIN:
1. Her tarla için sulama ihtiyacını analiz et (CRITICAL/HIGH/MEDIUM/LOW/NONE)
2. Optimal sulama zamanını belirle (genelde 22:00-06:00 arası)
3. Su miktarını hesapla (field size ve crop type'a göre)
4. Risk analizi yap (yaprak ıslaklığı, kuraklık, rüzgar, sıcaklık)
5. Gelecek sulama programı oluştur

ANALİZ KRİTERLERİ:
- ET0 > 4: YÜKSEK su ihtiyacı
- Nem < 40%: Kuraklık riski
- Nem > 80% + Sıcaklık 15-25°C: Yaprak ıslaklığı riski
- Rüzgar > 15km/h: Rüzgar stresi
- Sıcaklık > 35°C: Ekstrem sıcaklık riski
- Son sulamadan geçen süre
- Bitki türü ve durumu

SULAMA HESAPLAMALARI:
- Mısır: 3-5L/m²/gün (yoğun dönemde)
- Buğday: 2-3L/m²/gün
- Diğer bitkiler: 2-4L/m²/gün
- Field size (dekar) × 1000m² × L/m²/gün

ZAMANLAMA:
- Sıcak günlerde: 22:00-02:00 (gece)
- Normal günlerde: 06:00-08:00 veya 19:00-21:00
- Rüzgarlı günlerde: Rüzgar azken

Türkçe açıklamalar yap ama technical terimler İngilizce olabilir.`;

      // Prepare context data
      const contextData = {
        currentDateTime: new Date().toISOString(),
        weatherData: weatherData.slice(-48), // Son 48 saat
        fieldData,
        irrigationHistory: irrigationHistory.slice(-20), // Son 20 sulama
        userPrompt: prompt || "Tüm tarlalar için sulama analizi ve önerileri yap"
      };

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp", // En gelişmiş model
        contents: {
          parts: [
            {
              text: \`Sulama analizi yapılacak veriler:\\n\\n\${JSON.stringify(contextData, null, 2)}\\n\\nLütfen tüm tarlaları analiz edip sulama önerileri ver.\`
            }
          ]
        },
        config: {
          systemInstruction: systemInstructionText,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.3, // Daha tutarlı sonuçlar için düşük temperature
        },
      });

      const jsonText = response.text.trim();
      const parsed: IrrigationPrediction = JSON.parse(jsonText);

      if (!parsed.predictions || !parsed.riskAnalysis) {
        throw new Error("Invalid JSON structure from AI.");
      }

      setLastPrediction(parsed);
      onPrediction(parsed);
      setPrompt("");

    } catch (err) {
      console.error("🔥 Irrigation AI Error:", err);
      setError("AI analizi başarısız. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-analyze when data changes
  useEffect(() => {
    if (weatherData.length > 0 && fieldData.length > 0 && !isLoading) {
      // Auto-trigger prediction when new data arrives
      setTimeout(() => {
        handlePredictIrrigation();
      }, 1000);
    }
  }, [weatherData.length, fieldData.length]);

  return (
    <div className="w-full bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-lg shadow-lg border">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-lg">
          <IrrigationIcon />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">🤖 IRRIGATION AI AGENT</h2>
          <p className="text-sm text-gray-600">Akıllı Sulama Tahmin Sistemi</p>
        </div>
      </div>

      {/* Data Status */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-3 rounded border">
          <div className="text-xs text-gray-500">Weather Data</div>
          <div className="font-semibold text-blue-600">{weatherData.length} kayıt</div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-xs text-gray-500">Field Data</div>
          <div className="font-semibold text-green-600">{fieldData.length} tarla</div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-xs text-gray-500">Irrigation History</div>
          <div className="font-semibold text-purple-600">{irrigationHistory.length} log</div>
        </div>
      </div>

      {/* Prompt Input */}
      <div className="mb-4">
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Özel analiz talebi... (opsiyonel - boş bırakırsan genel analiz yapar)"
          className="w-full text-sm bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md resize-none p-3"
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handlePredictIrrigation}
        disabled={isLoading || (!weatherData.length && !fieldData.length)}
        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold rounded-md shadow-sm hover:from-blue-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center h-12 transition-all"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <LoadingSpinner />
            <span>AI Analiz Yapıyor...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <WeatherIcon />
            <span>🔥 SULAMA ANALİZİ BAŞLAT</span>
          </div>
        )}
      </button>

      {/* Last Prediction Summary */}
      {lastPrediction && !isLoading && (
        <div className="mt-6 bg-white p-4 rounded border shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-2">📊 Son Analiz Özeti</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Toplam Tarla:</div>
              <div className="font-semibold">{lastPrediction.predictions.length}</div>
            </div>
            <div>
              <div className="text-gray-600">Genel Risk:</div>
              <div className={\`font-semibold \${
                lastPrediction.riskAnalysis.overallRisk === 'CRITICAL' ? 'text-red-600' :
                lastPrediction.riskAnalysis.overallRisk === 'HIGH' ? 'text-orange-600' :
                lastPrediction.riskAnalysis.overallRisk === 'MEDIUM' ? 'text-yellow-600' :
                'text-green-600'
              }\`}>
                {lastPrediction.riskAnalysis.overallRisk}
              </div>
            </div>
          </div>
          <div className="mt-2">
            <div className="text-gray-600 text-xs">Kritik Sulama İhtiyacı:</div>
            <div className="text-red-600 font-semibold">
              {lastPrediction.predictions.filter(p => p.irrigationNeed === 'CRITICAL').length} tarla
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IrrigationAI;