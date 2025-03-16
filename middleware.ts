import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Edge-compatible JWT verification
function isTokenValid(token: string): { valid: boolean; decoded?: any } {
  try {
    // JWT'yi manuel olarak decode et
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { valid: false };
    }

    // Payload'ı decode et (JWT'nin ikinci kısmı)
    const payload = JSON.parse(atob(parts[1]));

    // Token'ın süresi dolmuş mu kontrol et
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false };
    }

    // Not: Bu basit bir doğrulama. Gerçek bir imza doğrulaması yapmıyor.
    // Üretim ortamında jose gibi Edge-compatible bir kütüphane kullanılmalıdır.
    return { valid: true, decoded: payload };
  } catch (error) {
    console.error("Token doğrulama hatası:", error);
    return { valid: false };
  }
}

export function middleware(request: NextRequest) {
  // Dashboard rotalarını kontrol et
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    // Token kontrolü - hem cookie'den hem de Authorization header'dan kontrol et
    const cookieToken = request.cookies.get("token")?.value;
    const authHeader = request.headers.get("authorization");
    const headerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;
    const token = headerToken || cookieToken;

    // Token yoksa login sayfasına yönlendir
    if (!token) {
      console.log("Token bulunamadı, login sayfasına yönlendiriliyor");
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Token'ı doğrula
    const { valid, decoded } = isTokenValid(token);

    if (!valid) {
      console.log("Token geçersiz, login sayfasına yönlendiriliyor");
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Token geçerliyse devam et
    const requestHeaders = new Headers(request.headers);
    if (decoded) {
      requestHeaders.set("x-user-id", decoded.id);
      requestHeaders.set("x-user-role", decoded.role);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // API rotalarını kontrol et
  if (
    request.nextUrl.pathname.startsWith("/api/") &&
    !request.nextUrl.pathname.startsWith("/api/auth/")
  ) {
    // Authorization header'ı al
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;
    const cookieToken = request.cookies.get("token")?.value;
    const finalToken = token || cookieToken;

    if (!finalToken) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    // Token'ı doğrula
    const { valid, decoded } = isTokenValid(finalToken);

    if (!valid) {
      return NextResponse.json(
        { error: "Geçersiz veya süresi dolmuş token" },
        { status: 401 }
      );
    }

    // İsteği devam ettir
    const requestHeaders = new Headers(request.headers);
    if (decoded) {
      requestHeaders.set("x-user-id", decoded.id);
      requestHeaders.set("x-user-role", decoded.role);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // API olmayan rotalar için normal akışa devam et
  return NextResponse.next();
}

// Middleware'in çalışacağı rotaları belirt
export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
