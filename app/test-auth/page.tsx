"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TestAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [cookieToken, setCookieToken] = useState<string | null>(null);

  useEffect(() => {
    // LocalStorage'dan token ve kullanıcı bilgilerini al
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    setToken(storedToken);

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Kullanıcı bilgisi parse edilemedi:", error);
      }
    }

    // Cookie'den token'ı al
    const cookies = document.cookie.split(";");
    const tokenCookie = cookies.find((cookie) =>
      cookie.trim().startsWith("token=")
    );
    if (tokenCookie) {
      setCookieToken(tokenCookie.split("=")[1]);
    }
  }, []);

  const handleClearStorage = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);

    // Cookie'yi de temizle
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setCookieToken(null);
  };

  const handleGoToDashboard = () => {
    if (user) {
      const dashboardPath = `/dashboard/${user.role.toLowerCase()}`;
      window.location.href = dashboardPath;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Kimlik Doğrulama Testi</CardTitle>
          <CardDescription>
            Bu sayfa, kimlik doğrulama durumunuzu test etmek için kullanılır.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">LocalStorage Token:</h3>
            <div className="p-2 bg-muted rounded-md overflow-x-auto">
              <pre className="text-xs">{token || "Token bulunamadı"}</pre>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Cookie Token:</h3>
            <div className="p-2 bg-muted rounded-md overflow-x-auto">
              <pre className="text-xs">
                {cookieToken || "Cookie token bulunamadı"}
              </pre>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Kullanıcı Bilgileri:</h3>
            <div className="p-2 bg-muted rounded-md overflow-x-auto">
              <pre className="text-xs">
                {user
                  ? JSON.stringify(user, null, 2)
                  : "Kullanıcı bilgisi bulunamadı"}
              </pre>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="destructive" onClick={handleClearStorage}>
            Tüm Verileri Temizle
          </Button>
          <Button onClick={handleGoToDashboard} disabled={!user}>
            Dashboard'a Git
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
