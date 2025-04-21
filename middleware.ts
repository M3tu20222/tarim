import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/jwt";

export async function middleware(request: NextRequest) {
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/dashboard");
  const isLoginPage = request.nextUrl.pathname === "/login";
  let token = request.cookies.get("token")?.value; // Define token here

  // API rotaları için token kontrolü
  if (
    request.nextUrl.pathname.startsWith("/api/") &&
    !request.nextUrl.pathname.startsWith("/api/auth/")
  ) {
    // Eğer request.cookies'ten token alınamazsa, manuel olarak header'dan okumayı dene
    if (!token) {
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        const parsedCookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          if (key === 'token') acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        token = parsedCookies['token'];
        if (token) {
           console.log("Token manuel olarak Cookie header'ından okundu.");
        }
      }
    }

    if (!token) {
      console.log("API isteği token bulunamadı (middleware):", request.nextUrl.pathname);
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli (middleware)" },
        { status: 401 }
      );
    }

    try {
      const decoded = await verifyToken(token);
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", decoded.id);
      requestHeaders.set("x-user-role", decoded.role);

      // Debug için konsola yazdıralım
      console.log(`API isteği: ${request.nextUrl.pathname}`);
      console.log(`Kullanıcı ID: ${decoded.id}, Rol: ${decoded.role}`);

      // Yeni bir Headers nesnesi oluştur ve mevcut başlıkları kopyala
      const newHeaders = new Headers(request.headers);
      // Yeni başlıkları ekle
      newHeaders.set("x-user-id", decoded.id);
      newHeaders.set("x-user-role", decoded.role);

      // İsteği yeni başlıklarla devam ettir
      return NextResponse.next({
        request: {
          // Yeni başlıkları kullan
          headers: newHeaders,
        },
      });
    } catch (error) {
      console.error("Token doğrulama hatası:", error);
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }
  }

  if (!token && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && isLoginPage) {
    try {
      await verifyToken(token);
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } catch (error) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/api/:path*"],
};
