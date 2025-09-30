import React, { useState } from 'react';
import { WeatherAlert, AgriculturalAlert } from '../utils/weatherMetrics';

interface AlertsPanelProps {
  weatherAlerts: WeatherAlert[];
  agriculturalAlerts: AgriculturalAlert[];
}

interface AlertItemProps {
  alert: WeatherAlert | AgriculturalAlert;
  type: 'weather' | 'agricultural';
}

const AlertItem: React.FC<AlertItemProps> = ({ alert, type }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getAlertIcon = () => {
    if (type === 'weather') {
      const weatherAlert = alert as WeatherAlert;
      switch (weatherAlert.type) {
        case 'danger':
          return (
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          );
        case 'warning':
          return (
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          );
        default:
          return (
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          );
      }
    } else {
      const agAlert = alert as AgriculturalAlert;
      switch (agAlert.type) {
        case 'frost':
          return (
            <svg className="w-5 h-5 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2L13.09 8.26L20 9L14 14.74L15.18 21.02L10 18L4.82 21.02L6 14.74L0 9L6.91 8.26L10 2Z" />
            </svg>
          );
        case 'drought':
          return (
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03z" clipRule="evenodd" />
            </svg>
          );
        case 'optimal':
          return (
            <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          );
        default:
          return (
            <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          );
      }
    }
  };

  const getSeverityColor = () => {
    if (type === 'weather') {
      const weatherAlert = alert as WeatherAlert;
      switch (weatherAlert.type) {
        case 'danger':
          return 'border-red-500 bg-red-500/10';
        case 'warning':
          return 'border-yellow-500 bg-yellow-500/10';
        default:
          return 'border-blue-500 bg-blue-500/10';
      }
    } else {
      const agAlert = alert as AgriculturalAlert;
      switch (agAlert.priority) {
        case 'critical':
          return 'border-red-500 bg-red-500/10';
        case 'high':
          return 'border-orange-500 bg-orange-500/10';
        case 'medium':
          return 'border-yellow-500 bg-yellow-500/10';
        default:
          return 'border-green-500 bg-green-500/10';
      }
    }
  };

  const getSeverityBadge = () => {
    if (type === 'weather') {
      const weatherAlert = alert as WeatherAlert;
      const severityLabels = ['Düşük', 'Orta', 'Yüksek', 'Çok Yüksek', 'Kritik'];
      return severityLabels[weatherAlert.severity - 1] || 'Orta';
    } else {
      const agAlert = alert as AgriculturalAlert;
      const priorityLabels = {
        low: 'Düşük',
        medium: 'Orta',
        high: 'Yüksek',
        critical: 'Kritik'
      };
      return priorityLabels[agAlert.priority];
    }
  };

  const isWeatherAlert = type === 'weather';
  const weatherAlert = isWeatherAlert ? (alert as WeatherAlert) : null;
  const agAlert = !isWeatherAlert ? (alert as AgriculturalAlert) : null;

  return (
    <div className={`border-l-4 rounded-r-lg p-4 mb-3 transition-all duration-200 ${getSeverityColor()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0 mt-1">
            {getAlertIcon()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-semibold text-white truncate">
                {isWeatherAlert ? weatherAlert!.title : `${agAlert!.crop} - ${agAlert!.type}`}
              </h4>
              <span className={`
                px-2 py-1 text-xs font-medium rounded-full
                ${isWeatherAlert && weatherAlert!.severity >= 4 ? 'bg-red-100 text-red-800' :
                  isWeatherAlert && weatherAlert!.severity >= 3 ? 'bg-yellow-100 text-yellow-800' :
                  !isWeatherAlert && agAlert!.priority === 'critical' ? 'bg-red-100 text-red-800' :
                  !isWeatherAlert && agAlert!.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  'bg-blue-100 text-blue-800'}
              `}>
                {getSeverityBadge()}
              </span>
            </div>

            <p className="text-gray-300 text-sm mb-2">
              {isWeatherAlert ? weatherAlert!.message : agAlert!.message}
            </p>

            {isWeatherAlert && weatherAlert!.timeRange && (
              <p className="text-gray-400 text-xs mb-2">
                📅 {weatherAlert!.timeRange}
              </p>
            )}

            {!isWeatherAlert && agAlert!.recommendations && agAlert!.recommendations.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors"
              >
                {isExpanded ? 'Önerileri Gizle' : 'Önerileri Göster'} ({agAlert!.recommendations.length})
              </button>
            )}

            {isExpanded && !isWeatherAlert && agAlert!.recommendations && (
              <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                <h5 className="text-sm font-medium text-white mb-2">Öneriler:</h5>
                <ul className="space-y-1">
                  {agAlert!.recommendations.map((rec, index) => (
                    <li key={index} className="text-xs text-gray-300 flex items-start">
                      <span className="text-green-400 mr-2">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AlertsPanel: React.FC<AlertsPanelProps> = ({ weatherAlerts, agriculturalAlerts }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'weather' | 'agricultural'>('all');
  const [sortBy, setSortBy] = useState<'severity' | 'time'>('severity');

  const allAlerts = [
    ...weatherAlerts.map(alert => ({ ...alert, alertType: 'weather' as const })),
    ...agriculturalAlerts.map(alert => ({ ...alert, alertType: 'agricultural' as const }))
  ];

  const filteredAlerts = allAlerts.filter(alert => {
    if (activeTab === 'all') return true;
    return alert.alertType === activeTab;
  });

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    if (sortBy === 'severity') {
      const getSeverity = (alert: any) => {
        if (alert.alertType === 'weather') return alert.severity;
        const priorityMap = { critical: 5, high: 4, medium: 3, low: 2 };
        return priorityMap[alert.priority] || 1;
      };
      return getSeverity(b) - getSeverity(a);
    }
    return 0; // Time sorting would require timestamps
  });

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'weather': return weatherAlerts.length;
      case 'agricultural': return agriculturalAlerts.length;
      default: return allAlerts.length;
    }
  };

  const getCriticalCount = () => {
    return allAlerts.filter(alert => {
      if (alert.alertType === 'weather') return alert.severity >= 4;
      return alert.priority === 'critical';
    }).length;
  };

  if (allAlerts.length === 0) {
    return (
      <div className="bg-base-200 p-6 rounded-xl shadow-lg">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Uyarı Yok</h3>
          <p className="text-gray-400">Şu anda aktif hava durumu veya tarım uyarısı bulunmuyor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-200 p-6 rounded-xl shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center">
            <svg className="w-6 h-6 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Uyarılar & Bildirimler
          </h2>
          {getCriticalCount() > 0 && (
            <p className="text-red-400 text-sm mt-1">
              {getCriticalCount()} kritik uyarı mevcut
            </p>
          )}
        </div>

        <div className="flex space-x-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'severity' | 'time')}
            className="bg-base-100 border border-gray-600 text-white text-sm rounded-lg px-3 py-2"
          >
            <option value="severity">Önem Derecesi</option>
            <option value="time">Zaman</option>
          </select>
        </div>
      </div>

      <div className="flex space-x-1 mb-6 bg-base-100 p-1 rounded-lg">
        {(['all', 'weather', 'agricultural'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors
              ${activeTab === tab
                ? 'bg-primary-500 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-base-200'
              }
            `}
          >
            {tab === 'all' ? 'Tümü' : tab === 'weather' ? 'Hava Durumu' : 'Tarımsal'}
            <span className="ml-2 px-2 py-0.5 bg-gray-700 rounded-full text-xs">
              {getTabCount(tab)}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedAlerts.map((alert, index) => (
          <AlertItem
            key={index}
            alert={alert}
            type={alert.alertType}
          />
        ))}
      </div>
    </div>
  );
};

export default AlertsPanel;