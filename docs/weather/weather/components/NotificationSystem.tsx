import React, { useState, useEffect, useCallback } from 'react';
import { WeatherAlert, AgriculturalAlert } from '../utils/weatherMetrics';

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
}

interface NotificationSystemProps {
  weatherAlerts?: WeatherAlert[];
  agriculturalAlerts?: AgriculturalAlert[];
}

interface NotificationContextType {
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const NotificationContext = React.createContext<NotificationContextType | null>(null);

export const useNotification = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

const NotificationItem: React.FC<{
  notification: Notification;
  onRemove: (id: string) => void;
}> = ({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (notification.duration && !notification.persistent) {
      const timer = setTimeout(() => {
        setIsLeaving(true);
        setTimeout(() => onRemove(notification.id), 300);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification, onRemove]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(notification.id), 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getColorClasses = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-success-500 border-success-400 text-white';
      case 'warning':
        return 'bg-warning-500 border-warning-400 text-white';
      case 'error':
        return 'bg-error-500 border-error-400 text-white';
      case 'info':
      default:
        return 'bg-info-500 border-info-400 text-white';
    }
  };

  return (
    <div
      className={`
        notification relative flex items-start p-4 mb-3 rounded-lg shadow-lg border-l-4 backdrop-blur-sm
        transition-all duration-300 ease-in-out transform
        ${getColorClasses()}
        ${isLeaving ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        ${isVisible ? 'animate-slide-down' : ''}
      `}
    >
      <div className="flex-shrink-0 mr-3 mt-0.5">
        {getIcon()}
      </div>

      <div className="flex-grow">
        <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
        <p className="text-sm opacity-90">{notification.message}</p>
      </div>

      <button
        onClick={handleClose}
        className="flex-shrink-0 ml-3 hover:opacity-70 transition-opacity"
        aria-label="Close notification"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  weatherAlerts = [],
  agriculturalAlerts = []
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration || 5000
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep max 5 notifications
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convert weather alerts to notifications
  useEffect(() => {
    weatherAlerts.forEach(alert => {
      const existingNotification = notifications.find(n => n.title === alert.title);
      if (!existingNotification) {
        addNotification({
          type: alert.type === 'danger' ? 'error' : alert.type === 'warning' ? 'warning' : 'info',
          title: alert.title,
          message: alert.message,
          duration: alert.severity > 3 ? 10000 : 7000,
          persistent: alert.severity === 5
        });
      }
    });
  }, [weatherAlerts, addNotification]);

  // Convert agricultural alerts to notifications
  useEffect(() => {
    agriculturalAlerts.forEach(alert => {
      const existingNotification = notifications.find(n => n.title.includes(alert.crop));
      if (!existingNotification) {
        addNotification({
          type: alert.priority === 'critical' ? 'error' :
                alert.priority === 'high' ? 'warning' :
                alert.type === 'optimal' ? 'success' : 'info',
          title: `${alert.crop} - ${alert.type === 'optimal' ? 'Optimal Koşullar' : 'Tarım Uyarısı'}`,
          message: alert.message,
          duration: alert.priority === 'critical' ? 15000 : 8000,
          persistent: alert.priority === 'critical'
        });
      }
    });
  }, [agriculturalAlerts, addNotification]);

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification, clearAll }}>
      <div className="fixed top-4 right-4 z-50 max-w-sm w-full space-y-2">
        {notifications.length > 0 && (
          <div className="mb-4">
            <button
              onClick={clearAll}
              className="text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1 rounded-full transition-colors"
            >
              Tümünü Temizle ({notifications.length})
            </button>
          </div>
        )}

        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={removeNotification}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export default NotificationSystem;