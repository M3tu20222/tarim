import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/jwt";

export async function middleware(request: NextRequest) {
  const cookieStore = request.cookies;
  const token = cookieStore.get("token")?.value;

  // Herkese açık rotalar (login ve register)
  if (
    request.nextUrl.pathname.startsWith("/api/auth/login") ||
    request.nextUrl.pathname.startsWith("/api/auth/register") ||
    request.nextUrl.pathname === "/login" // API olmayan /login rotası
  ) {
    return NextResponse.next(); // Bu rotalara müdahale etme
  }

  if (!token) {
    // Token yoksa ve istek herkese açık olmayan bir rotaya yapılıyorsa, login'e yönlendir
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Token'ı doğrula
    const decoded = await verifyToken(token);

    // Yetkilendirme kontrolü (örneğin, sadece admin'lerin erişebileceği bir rota)
    if (
      request.nextUrl.pathname.startsWith("/admin") &&
      decoded.role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/", request.url)); // Ana sayfaya yönlendir
    }

    // API rotaları için yetkilendirme (x-user-id ve x-user-role header'ları)
    if (
      request.nextUrl.pathname.startsWith("/api/") &&
      !request.nextUrl.pathname.startsWith("/api/auth/")
    ) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", decoded.id);
      requestHeaders.set("x-user-role", decoded.role);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    // Dashboard rotaları için yetkilendirme (x-user-id ve x-user-role header'ları)
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", decoded.id);
      requestHeaders.set("x-user-role", decoded.role);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return NextResponse.next();
  } catch (error) {
    // Token geçersizse, login sayfasına yönlendir
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

// Hangi rotalarda middleware'in çalışacağını belirt (daha basit matcher)
export const config = {
  matcher: [
    "/dashboard/:path*", // Dashboard ve alt sayfaları
    "/api/:path*", // API rotaları (auth hariç)
    "/", // Ana sayfa (eğer middleware tarafından korunuyorsa)
    // '/((?!_next/static|_next/image|favicon.ico).*)', // Diğer dosyalar (gerekli olmayabilir)
  ],
};
