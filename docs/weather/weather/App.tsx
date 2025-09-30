import React, { useState, useEffect } from 'react';
import WeatherDashboard from './components/WeatherDashboard';
import AdvancedInsights from './components/AdvancedInsights';
import NotificationSystem from './components/NotificationSystem';
import { CloudIcon } from './components/icons';
import { ProcessedWeatherData } from './types';
import { WeatherMetrics, calculateWeatherMetrics } from './utils/weatherMetrics';
import { fetchWeatherData } from './services/openMeteoService';

type ActivePage = 'dashboard' | 'insights' | 'alerts';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [weatherData, setWeatherData] = useState<ProcessedWeatherData | null>(null);
  const [metrics, setMetrics] = useState<WeatherMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWeatherData = async () => {
      try {
        setLoading(true);
        const data = await fetchWeatherData();
        setWeatherData(data);
        const calculatedMetrics = calculateWeatherMetrics(data);
        setMetrics(calculatedMetrics);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
    };

    loadWeatherData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-300 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-info mx-auto mb-4"></div>
          <p className="text-xl text-white">Hava durumu verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-300 flex items-center justify-center p-4">
        <div className="text-center bg-error/20 p-8 rounded-xl border border-error/50">
          <h2 className="text-2xl font-bold text-error mb-4">Hata Oluştu</h2>
          <p className="text-white mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn bg-primary hover:bg-primary/80 text-white px-6 py-2 rounded-lg"
          >
            Yeniden Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-300 via-base-300 to-blue-900/20 text-gray-300 font-['Inter',_sans-serif]">
      <NotificationSystem
        weatherAlerts={metrics?.alerts.weather || []}
        agriculturalAlerts={metrics?.alerts.agricultural || []}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <div className="flex flex-col gap-6 max-w-7xl mx-auto">
            <div className="glass-dark p-6 rounded-2xl">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-info-500 to-info-600 rounded-xl shadow-glow">
                    <CloudIcon className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-1">
                      Hassas Tarım Hava Durumu Paneli
                    </h1>
                    <p className="text-lg text-gray-400">Konya için AI Destekli Meteoroloji & Tarım Analizi</p>
                    <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                      <span>🌡️ Gerçek Zamanlı</span>
                      <span>🤖 AI Analiz</span>
                      <span>🌱 Tarım Odaklı</span>
                    </div>
                  </div>
                </div>

                {metrics && (
                  <div className="flex flex-wrap gap-2">
                    {metrics.alerts.weather.length > 0 && (
                      <div className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm flex items-center">
                        <span className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse"></span>
                        {metrics.alerts.weather.length} Hava Uyarısı
                      </div>
                    )}
                    {metrics.alerts.agricultural.length > 0 && (
                      <div className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm flex items-center">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse"></span>
                        {metrics.alerts.agricultural.length} Tarım Uyarısı
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <nav className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setActivePage('dashboard')}
                className={`btn-animated px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                  activePage === 'dashboard'
                    ? 'bg-gradient-to-r from-info-500 to-info-600 text-white shadow-glow'
                    : 'glass text-gray-300 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <span>Ana Panel</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePage('insights')}
                className={`btn-animated px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                  activePage === 'insights'
                    ? 'bg-gradient-to-r from-info-500 to-info-600 text-white shadow-glow'
                    : 'glass text-gray-300 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Detaylı Analiz</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePage('alerts')}
                className={`btn-animated px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                  activePage === 'alerts'
                    ? 'bg-gradient-to-r from-info-500 to-info-600 text-white shadow-glow'
                    : 'glass text-gray-300 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Uyarılar</span>
                {metrics && (metrics.alerts.weather.length + metrics.alerts.agricultural.length) > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">
                    {metrics.alerts.weather.length + metrics.alerts.agricultural.length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </header>
        <main className="animate-fade-in">
          {activePage === 'dashboard' && <WeatherDashboard />}
          {activePage === 'insights' && <AdvancedInsights />}
          {activePage === 'alerts' && metrics && (
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="glass p-6 rounded-xl text-center">
                    <div className="text-3xl font-bold text-white mb-2">
                      {metrics.alerts.weather.length}
                    </div>
                    <div className="text-gray-400">Hava Durumu Uyarısı</div>
                  </div>
                  <div className="glass p-6 rounded-xl text-center">
                    <div className="text-3xl font-bold text-white mb-2">
                      {metrics.alerts.agricultural.length}
                    </div>
                    <div className="text-gray-400">Tarımsal Uyarı</div>
                  </div>
                  <div className="glass p-6 rounded-xl text-center">
                    <div className="text-3xl font-bold text-white mb-2">
                      {metrics.alerts.weather.filter(a => a.severity >= 4).length +
                       metrics.alerts.agricultural.filter(a => a.priority === 'critical').length}
                    </div>
                    <div className="text-gray-400">Kritik Uyarı</div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                {/* Weather Alerts */}
                {metrics.alerts.weather.length > 0 && (
                  <div className="glass p-6 rounded-xl">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                      <svg className="w-6 h-6 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Hava Durumu Uyarıları
                    </h3>
                    <div className="space-y-4">
                      {metrics.alerts.weather.map((alert, index) => (
                        <div key={index} className={`p-4 rounded-lg border-l-4 ${
                          alert.type === 'danger' ? 'border-red-500 bg-red-500/10' :
                          alert.type === 'warning' ? 'border-yellow-500 bg-yellow-500/10' :
                          'border-blue-500 bg-blue-500/10'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-white">{alert.title}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              alert.severity >= 4 ? 'bg-red-100 text-red-800' :
                              alert.severity >= 3 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              Önem: {alert.severity}/5
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm mb-2">{alert.message}</p>
                          <p className="text-gray-400 text-xs">📅 {alert.timeRange}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agricultural Alerts */}
                {metrics.alerts.agricultural.length > 0 && (
                  <div className="glass p-6 rounded-xl">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                      <svg className="w-6 h-6 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                      </svg>
                      Tarımsal Uyarılar
                    </h3>
                    <div className="space-y-4">
                      {metrics.alerts.agricultural.map((alert, index) => (
                        <div key={index} className={`p-4 rounded-lg border-l-4 ${
                          alert.priority === 'critical' ? 'border-red-500 bg-red-500/10' :
                          alert.priority === 'high' ? 'border-orange-500 bg-orange-500/10' :
                          alert.priority === 'medium' ? 'border-yellow-500 bg-yellow-500/10' :
                          'border-green-500 bg-green-500/10'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-white">{alert.crop} - {alert.type}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              alert.priority === 'critical' ? 'bg-red-100 text-red-800' :
                              alert.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {alert.priority === 'critical' ? 'Kritik' :
                               alert.priority === 'high' ? 'Yüksek' :
                               alert.priority === 'medium' ? 'Orta' : 'Düşük'}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm mb-3">{alert.message}</p>
                          {alert.recommendations.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-white mb-2">Öneriler:</h5>
                              <ul className="space-y-1">
                                {alert.recommendations.map((rec, recIndex) => (
                                  <li key={recIndex} className="text-xs text-gray-300 flex items-start">
                                    <span className="text-green-400 mr-2">•</span>
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
        <footer className="text-center mt-16 pb-8">
          <div className="glass p-6 rounded-xl max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                </svg>
                <span>Open-Meteo API</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>Google Gemini AI</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span>Gerçek Zamanlı</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              © 2024 Hassas Tarım Hava Durumu Paneli - AI Destekli Meteoroloji Analizi
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
