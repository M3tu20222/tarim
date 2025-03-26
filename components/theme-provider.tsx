"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect } from "react";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Sayfa yüklendiğinde her zaman dark theme uygula
  useEffect(() => {
    // HTML elementine dark sınıfını ekle
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <NextThemesProvider {...props} forcedTheme="dark">
      {children}
    </NextThemesProvider>
  );
}
