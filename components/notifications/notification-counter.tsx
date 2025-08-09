"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

export function NotificationCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch("/api/notifications/unread-count");
        if (response.ok) {
          const data = await response.json();
          setCount(data.count || 0);
        }
      } catch (error) {
        console.error("Error fetching notification count:", error);
      }
    };

    fetchCount();

    // Düzenli olarak bildirim sayısını güncelle
    const interval = setInterval(fetchCount, 900000); // Her 15 dakikada bir

    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <Badge
      variant="destructive"
      className="absolute -top-1 -right-1 px-1.5 min-w-[1.25rem] h-5 flex items-center justify-center"
    >
      {count > 99 ? "99+" : count}
    </Badge>
  );
}
