import { GoogleGenAI } from "@google/genai";
import { ProcessedWeatherData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getWeatherInterpretation = async (weatherData: ProcessedWeatherData): Promise<string> => {
  const prompt = `
    Sen, Open-Meteo API'sinden alınan hava durumu verilerini analiz eden bir hassas tarım uzmanısın. 
    Aşağıda Konya-Yunak-Yeşiloba için önümüzdeki 7 günlük ve 48 saatlik hava durumu verileri JSON formatında sunulmuştur.
    Bu verileri kullanarak bir çiftçi için eyleme geçirilebilir, stratejik tavsiyeler içeren bir rapor oluştur.

    Yorumların şu konulara odaklanmalı:
    1.  **Genel Değerlendirme:** Önümüzdeki hafta çiftçiyi nelerin beklediğine dair bir özet.
    2.  **Sulama Planlaması:** Yağış ve sıcaklık verilerine göre sulama ihtiyacı. ET0 (Evapotranspirasyon) hakkında çıkarımlar yap.
    3.  **Zararlı ve Hastalık Yönetimi:** Nem ve sıcaklık koşullarına göre mantar veya zararlı riski.
    4.  **İlaçlama ve Gübreleme:** Rüzgar hızı ve yağış olasılığına göre saha operasyonları için en uygun zamanlar (ilaçlama pencereleri).
    5.  **Toprak Koşulları:** Toprak nemi ve sıcaklığına göre ekim, çimlenme veya kök gelişimi için yorumlar.
    6.  **Özel Not (Mısır Tarımı):** Mısır tarımı için kritik bilgiler şunlardır: Ekim sonrası toprak sıcaklığı 5 derecenin altına düşmemelidir. Çimlenme süresince (yaklaşık 15 gün) gece hava sıcaklığı da 5 derecenin altına inmemelidir, aksi takdirde çimlenme başarısız olur veya filizler zarar görür. Bu dönemde ideal gündüz hava sıcaklığı 15-25 derece arasıdır ve toprağın nemli olması gerekir. Analizini bu kritik bilgiler ışığında zenginleştir.
    
    Cevabını anlaşılır başlıklar ve listeler kullanarak Markdown formatında yapılandır. Teknik terimleri basit bir dille açıkla.

    Hava Durumu Verileri:
    ${JSON.stringify(weatherData, null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API error:", error);
    return "AI yorumu alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.";
  }
};