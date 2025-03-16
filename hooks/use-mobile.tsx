"use client";

import { useEffect, useState } from "react";

// Mobil cihaz kontrolü için breakpoint
const MOBILE_BREAKPOINT = 768; // md breakpoint

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // İlk yüklemede kontrol et
    checkIfMobile();

    // Pencere boyutu değiştiğinde kontrol et
    function handleResize() {
      checkIfMobile();
    }

    function checkIfMobile() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}

// Eski adı da destekleyelim (geriye dönük uyumluluk için)
export const useMobile = useIsMobile;
