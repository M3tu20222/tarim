"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token'ın geçerli olup olmadığını kontrol eden yardımcı fonksiyon
export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;

    const payload = JSON.parse(atob(parts[1]));
    return payload.exp * 1000 < Date.now();
  } catch (error) {
    return true;
  }
}

interface AuthProviderProps {
  children: ReactNode;
  initialToken?: string | null;
}

export function AuthProvider({ children, initialToken }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // Sayfa yüklendiğinde localStorage'dan kullanıcı bilgilerini al ve initialToken'ı kontrol et
  useEffect(() => {
    let tokenToUse = initialToken;

    if (initialToken) {
      if (isTokenExpired(initialToken)) {
        tokenToUse = null;
      }
    }

    if (!tokenToUse) {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        try {
          // Token'ın süresi dolmuş mu kontrol et
          if (isTokenExpired(storedToken)) {
            clearAuthData();
          } else {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            setToken(storedToken);
          }
        } catch (error) {
          console.error("Kullanıcı bilgisi parse edilemedi:", error);
          clearAuthData();
        }
      }
    } else {
      setToken(tokenToUse)
    }

    setIsLoading(false);
  }, [initialToken]);

  // Kullanıcı aktivite takibi
  useEffect(() => {
    if (!token) return;

    let inactivityTimer: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        toast({
          title: "Oturum süresi doldu",
          description:
            "Uzun süre işlem yapmadığınız için oturumunuz sonlandırıldı.",
          variant: "destructive",
        });
        logout();
      }, 30 * 60 * 1000); // 30 dakika inaktivite süresi
    };

    // Kullanıcı aktivitelerini dinle
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];
    events.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer);
    });

    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [token]);

  const clearAuthData = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setUser(null);
    setToken(null);
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Giriş başarısız");
      }

      // Token'ı ve kullanıcı bilgilerini kaydet
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        setUser(data.user);
        setToken(data.token);
      }

      toast({
        title: "Giriş başarılı!",
        description: `${
          data.user.role.charAt(0).toUpperCase() + data.user.role.slice(1)
        } rolüyle giriş yapıldı.`,
        variant: "default",
      });

      // Role göre yönlendirme
      // const dashboardPath = `/dashboard/${data.user.role.toLowerCase()}`; // YANLIŞ
      const dashboardPath = `/dashboard/dashboard`; // DOĞRU - Her zaman ana dashboard'a yönlendir
      router.push(dashboardPath);
    } catch (error: any) {
      console.error("Giriş hatası:", error);
      toast({
        title: "Giriş başarısız!",
        description: error.message || "Kullanıcı adı veya şifre hatalı.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      clearAuthData();
      router.push("/");

      toast({
        title: "Çıkış başarılı",
        description: "Oturumunuz güvenli bir şekilde sonlandırıldı.",
      });
    } catch (error) {
      console.error("Çıkış hatası:", error);
      toast({
        title: "Çıkış yapılırken bir hata oluştu",
        description: "Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
