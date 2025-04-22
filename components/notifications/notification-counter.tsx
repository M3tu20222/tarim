"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export function NotificationCounter() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${apiUrl}/api/notifications/unread-count`
        );
        if (response.ok) {
          const data = await response.json();
          setCount(data.count);
        }
      } catch (error) {
        console.error("Error fetching unread notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCount();

    // Her 30 saniyede bir yenile
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [apiUrl]);

  if (loading || count === 0) return null;

  return (
    <Badge
      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive hover:bg-destructive"
      onClick={() => router.push("/dashboard/notifications")}
    >
      {count > 99 ? "99+" : count}
    </Badge>
  );
}
