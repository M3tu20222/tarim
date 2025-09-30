import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'auto';

interface ThemeConfig {
  theme: Theme;
  systemTheme: 'light' | 'dark';
  currentTheme: 'light' | 'dark';
}

export const useTheme = () => {
  const [config, setConfig] = useState<ThemeConfig>(() => {
    const savedTheme = localStorage.getItem('weather-app-theme') as Theme;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = savedTheme || 'auto';
    const currentTheme = theme === 'auto' ? systemTheme : theme;

    return {
      theme,
      systemTheme,
      currentTheme
    };
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setConfig(prev => ({
        ...prev,
        systemTheme: e.matches ? 'dark' : 'light',
        currentTheme: prev.theme === 'auto' ? (e.matches ? 'dark' : 'light') : prev.currentTheme
      }));
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(config.currentTheme);

    // Update meta theme color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', config.currentTheme === 'dark' ? '#111827' : '#f9fafb');
    }
  }, [config.currentTheme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem('weather-app-theme', newTheme);

    setConfig(prev => ({
      ...prev,
      theme: newTheme,
      currentTheme: newTheme === 'auto' ? prev.systemTheme : newTheme
    }));
  };

  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(config.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return {
    ...config,
    setTheme,
    toggleTheme,
    isDark: config.currentTheme === 'dark'
  };
};