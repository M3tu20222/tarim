"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LockIcon, UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Token'ın geçerli olup olmadığını kontrol eden yardımcı fonksiyon (ARTIK GEREKSİZ)
// function isTokenExpired(token: string): boolean {
//   try {
//     const parts = token.split(".");
//     if (parts.length !== 3) return true;

//     const payload = JSON.parse(atob(parts[1]));
//     return payload.exp * 1000 < Date.now();
//   } catch (error) {
//     return true;
//   }
// }

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  // Ana sayfa yönlendirmesini güncelle (useEffect'i TAMAMEN KALDIR)
  // useEffect(() => {
  //   const token = localStorage.getItem("token");
  //   const user = localStorage.getItem("user");

  //   if (token && user) {
  //     try {
  //       // Token'ın süresi dolmuş mu kontrol et (GEREKSİZ)
  //       if (isTokenExpired(token)) {
  //         console.log("Token süresi dolmuş, temizleniyor");
  //         localStorage.removeItem("token");
  //         localStorage.removeItem("user");
  //         document.cookie =
  //           "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  //         return;
  //       }

  //       const userData = JSON.parse(user);
  //       const dashboardPath = `/dashboard/${userData.role.toLowerCase()}`;
  //       console.log(
  //         "Token ve kullanıcı bilgisi bulundu, yönlendiriliyor:",
  //         dashboardPath
  //       );

  //       // Doğrudan yönlendirme yapalım (GEREKSİZ)
  //       window.location.href = dashboardPath;
  //     } catch (error) {
  //       console.error("Kullanıcı bilgisi parse edilemedi:", error);
  //       // Hatalı veri varsa temizleyelim
  //       localStorage.removeItem("token");
  //       localStorage.removeItem("user");
  //       document.cookie =
  //         "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  //     }
  //   }
  // }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      console.log("Giriş denemesi:", username);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: username, password }),
      });

      const data = await response.json();
      console.log("Giriş yanıtı:", data);

      if (!response.ok) {
        throw new Error(data.message || "Giriş başarısız");
      }

      // Token'ı localStorage'a kaydet
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // Ayrıca document.cookie'ye de ekleyelim (client-side)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 1); // 1 gün
        document.cookie = `token=${
          data.token
        }; path=/; expires=${expiryDate.toUTCString()}; SameSite=Strict`;

        console.log("Token ve kullanıcı bilgileri kaydedildi");
      }

      // Başarılı giriş
      toast({
        title: "Giriş başarılı!",
        description: `${
          data.user.role.charAt(0).toUpperCase() + data.user.role.slice(1)
        } rolüyle giriş yapıldı.`,
        variant: "default",
      });

      // Kısa bir gecikme ekleyelim ki toast görülebilsin
      setTimeout(() => {
        // Role göre yönlendirme
        const dashboardPath = `/dashboard/${data.user.role.toLowerCase()}`;
        console.log("Yönlendirme yapılıyor:", dashboardPath);

        // Doğrudan window.location ile yönlendirme yapalım
        window.location.href = dashboardPath;
      }, 1500);
    } catch (err: any) {
      console.error("Giriş hatası:", err);
      setError(err.message || "Kullanıcı adı veya şifre hatalı!");
      toast({
        title: "Giriş başarısız!",
        description: err.message || "Kullanıcı adı veya şifre hatalı.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Demo kullanıcı bilgilerini doldur
  const fillDemoUser = (role: string) => {
    if (role === "admin") {
      setUsername("admin@example.com");
      setPassword("admin123");
    } else if (role === "owner") {
      setUsername("owner@example.com");
      setPassword("owner123");
    } else if (role === "worker") {
      setUsername("worker@example.com");
      setPassword("worker123");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label
          htmlFor="username"
          className="text-sm font-medium text-foreground"
        >
          Kullanıcı Adı / E-posta
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            id="username"
            type="text"
            placeholder="Kullanıcı adınızı veya e-postanızı girin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="pl-10 bg-background/50 border-purple-500/30 focus:border-purple-500 focus:neon-glow"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="password"
          className="text-sm font-medium text-foreground"
        >
          Şifre
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <LockIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Şifrenizi girin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 bg-background/50 border-purple-500/30 focus:border-purple-500 focus:neon-glow"
            required
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-500 animate-pulse">{error}</div>
      )}

      <div className="pt-2">
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 transition-all duration-300 neon-glow"
          disabled={isLoading}
        >
          {isLoading ? "Giriş Yapılıyor..." : "Giriş Yap"}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground mt-4">
        <p className="text-center">Demo Kullanıcılar:</p>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div
            className="text-center p-1 rounded bg-purple-500/10 cursor-pointer hover:bg-purple-500/20 transition-colors"
            onClick={() => fillDemoUser("admin")}
          >
            <p className="font-medium">Admin</p>
            <p>admin@example.com</p>
          </div>
          <div
            className="text-center p-1 rounded bg-cyan-500/10 cursor-pointer hover:bg-cyan-500/20 transition-colors"
            onClick={() => fillDemoUser("owner")}
          >
            <p className="font-medium">Sahip</p>
            <p>owner@example.com</p>
          </div>
          <div
            className="text-center p-1 rounded bg-pink-500/10 cursor-pointer hover:bg-pink-500/20 transition-colors"
            onClick={() => fillDemoUser("worker")}
          >
            <p className="font-medium">İşçi</p>
            <p>worker@example.com</p>
          </div>
        </div>
        <p className="text-center mt-2">
          Tüm şifreler: admin123, owner123, worker123
        </p>
      </div>
    </form>
  );
}
