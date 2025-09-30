import React, { useState, useRef } from 'react';
import { ProcessedWeatherData } from '../types';
import { WeatherMetrics } from '../utils/weatherMetrics';

interface ExportShareProps {
  weatherData: ProcessedWeatherData;
  metrics: WeatherMetrics;
  currentLocation?: { name: string; latitude: number; longitude: number };
}

interface ExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'png';
  includeCharts: boolean;
  includeMetrics: boolean;
  includeAlerts: boolean;
  dateRange: 'all' | 'today' | 'week';
}

const ExportShare: React.FC<ExportShareProps> = ({
  weatherData,
  metrics,
  currentLocation
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    includeCharts: false,
    includeMetrics: true,
    includeAlerts: true,
    dateRange: 'all'
  });
  const downloadRef = useRef<HTMLAnchorElement>(null);

  const generateFileName = () => {
    const location = currentLocation?.name.replace(/[^a-zA-Z0-9]/g, '_') || 'weather';
    const date = new Date().toISOString().split('T')[0];
    return `${location}_weather_${date}`;
  };

  const filterDataByRange = (data: any[], range: string) => {
    if (range === 'all') return data;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (range === 'today') {
      return data.filter(item => {
        const itemDate = new Date(item.fullTime || item.time);
        return itemDate >= today;
      });
    }

    if (range === 'week') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return data.filter(item => {
        const itemDate = new Date(item.fullTime || item.time);
        return itemDate >= weekAgo;
      });
    }

    return data;
  };

  const generateCSV = () => {
    const { includeMetrics, includeAlerts, dateRange } = exportOptions;

    let csvContent = '';

    // Header with metadata
    csvContent += `# Hava Durumu Raporu\n`;
    csvContent += `# Konum: ${currentLocation?.name || 'Bilinmiyor'}\n`;
    csvContent += `# Koordinatlar: ${currentLocation?.latitude}, ${currentLocation?.longitude}\n`;
    csvContent += `# Tarih: ${new Date().toLocaleString('tr-TR')}\n`;
    csvContent += `# Veri Aralığı: ${dateRange}\n\n`;

    // Daily data
    const dailyData = filterDataByRange(weatherData.dailyData, dateRange);
    csvContent += 'GÜNLÜK VERİLER\n';
    csvContent += 'Tarih,Maks Sıcaklık (°C),Min Sıcaklık (°C),Yağış (mm),Rüzgar (km/h),Güneşlenme (saat)\n';

    dailyData.forEach(day => {
      csvContent += `${day.time},${day.temperature_max},${day.temperature_min},${day.precipitation_sum || 0},${day.wind_speed_max},${day.sunshine_duration_hours || 0}\n`;
    });

    // Hourly data
    const hourlyData = filterDataByRange(weatherData.hourlyData, dateRange);
    csvContent += '\nSAATLİK VERİLER\n';
    csvContent += 'Zaman,Sıcaklık (°C),Hissedilen (°C),Nem (%),Yağış (mm),Rüzgar (km/h),Toprak Sıc (°C),Toprak Nem\n';

    hourlyData.forEach(hour => {
      csvContent += `${hour.time},${hour.temperature},${hour.apparent_temperature},${hour.humidity},${hour.precipitation},${hour.wind_speed},${hour.soil_temperature},${hour.soil_moisture}\n`;
    });

    // Metrics
    if (includeMetrics) {
      csvContent += '\nİSTATİSTİKLER\n';
      csvContent += `En Yüksek Sıcaklık,${metrics.statistics.temperatureStats.max}°C\n`;
      csvContent += `En Düşük Sıcaklık,${metrics.statistics.temperatureStats.min}°C\n`;
      csvContent += `Ortalama Sıcaklık,${metrics.statistics.temperatureStats.average.toFixed(1)}°C\n`;
      csvContent += `Toplam Yağış,${metrics.statistics.precipitationStats.total.toFixed(1)} mm\n`;
      csvContent += `Yağışlı Gün Sayısı,${metrics.statistics.precipitationStats.rainyDays}\n`;
      csvContent += `Ortalama Toprak Sıcaklığı,${metrics.statistics.soilStats.avgTemperature.toFixed(1)}°C\n`;
      csvContent += `Ortalama Toprak Nemi,${(metrics.statistics.soilStats.avgMoisture * 100).toFixed(1)}%\n`;
    }

    // Alerts
    if (includeAlerts) {
      csvContent += '\nHAVA DURUMU UYARILARI\n';
      csvContent += 'Tür,Başlık,Mesaj,Önem Derecesi\n';
      metrics.alerts.weather.forEach(alert => {
        csvContent += `${alert.type},"${alert.title}","${alert.message}",${alert.severity}\n`;
      });

      csvContent += '\nTARIMSAL UYARILAR\n';
      csvContent += 'Ürün,Tür,Mesaj,Öncelik\n';
      metrics.alerts.agricultural.forEach(alert => {
        csvContent += `${alert.crop},${alert.type},"${alert.message}",${alert.priority}\n`;
      });
    }

    return csvContent;
  };

  const generateJSON = () => {
    const { includeMetrics, includeAlerts, dateRange } = exportOptions;

    const exportData: any = {
      metadata: {
        location: currentLocation,
        exportDate: new Date().toISOString(),
        dataRange: dateRange,
        generatedBy: 'Hassas Tarım Hava Durumu Paneli'
      },
      weather: {
        daily: filterDataByRange(weatherData.dailyData, dateRange),
        hourly: filterDataByRange(weatherData.hourlyData, dateRange)
      }
    };

    if (includeMetrics) {
      exportData.metrics = metrics;
    }

    if (includeAlerts) {
      exportData.alerts = metrics.alerts;
    }

    return JSON.stringify(exportData, null, 2);
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    if (downloadRef.current) {
      downloadRef.current.href = url;
      downloadRef.current.download = filename;
      downloadRef.current.click();
    }

    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const baseFilename = generateFileName();

      switch (exportOptions.format) {
        case 'csv':
          const csvContent = generateCSV();
          downloadFile(csvContent, `${baseFilename}.csv`, 'text/csv;charset=utf-8;');
          break;

        case 'json':
          const jsonContent = generateJSON();
          downloadFile(jsonContent, `${baseFilename}.json`, 'application/json');
          break;

        case 'pdf':
          alert('PDF export özelliği yakında eklenecek!');
          break;

        case 'png':
          alert('PNG export özelliği yakında eklenecek!');
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Dışa aktarma sırasında bir hata oluştu.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Hava Durumu Raporu',
      text: `${currentLocation?.name || 'Konum'} için hava durumu raporu - Maks: ${metrics.statistics.temperatureStats.max.toFixed(1)}°C, Min: ${metrics.statistics.temperatureStats.min.toFixed(1)}°C`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Share error:', error);
        fallbackShare(shareData);
      }
    } else {
      fallbackShare(shareData);
    }
  };

  const fallbackShare = (shareData: any) => {
    const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
    navigator.clipboard.writeText(shareText).then(() => {
      alert('Bağlantı panoya kopyalandı!');
    }).catch(() => {
      alert('Paylaşım desteklenmiyor.');
    });
  };

  return (
    <div className="relative">
      <a ref={downloadRef} style={{ display: 'none' }} />

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        <span>Dışa Aktar & Paylaş</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-base-200 rounded-xl shadow-xl border border-gray-700 z-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Dışa Aktar & Paylaş</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Format
                </label>
                <select
                  value={exportOptions.format}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-base-100 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV (Excel)</option>
                  <option value="pdf">PDF (Yakında)</option>
                  <option value="png">PNG (Yakında)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Veri Aralığı
                </label>
                <select
                  value={exportOptions.dateRange}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, dateRange: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-base-100 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Tüm Veriler</option>
                  <option value="today">Bugün</option>
                  <option value="week">Son 7 Gün</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Dahil Edilecekler
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeMetrics}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeMetrics: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-300">İstatistikler ve Metrikler</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeAlerts}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeAlerts: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-300">Uyarılar ve Bildirimler</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeCharts}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeCharts: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    disabled={exportOptions.format !== 'pdf' && exportOptions.format !== 'png'}
                  />
                  <span className="text-sm text-gray-300">Grafikler (PDF/PNG)</span>
                </label>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isExporting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
                <span>{isExporting ? 'Dışa Aktarılıyor...' : 'Dışa Aktar'}</span>
              </button>

              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
                <span>Paylaş</span>
              </button>
            </div>

            <div className="mt-4 p-3 bg-base-100 rounded-lg">
              <div className="text-xs text-gray-400">
                <div>📁 Dosya: {generateFileName()}.{exportOptions.format}</div>
                <div>📍 Konum: {currentLocation?.name || 'Bilinmiyor'}</div>
                <div>📊 Veri: {filterDataByRange(weatherData.dailyData, exportOptions.dateRange).length} gün, {filterDataByRange(weatherData.hourlyData, exportOptions.dateRange).length} saat</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ExportShare;