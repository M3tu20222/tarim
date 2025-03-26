import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/jwt";

export async function middleware(request: NextRequest) {
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/dashboard");
  const isLoginPage = request.nextUrl.pathname === "/login";
  const token = request.cookies.get("token")?.value;

  // API rotaları için token kontrolü
  if (
    request.nextUrl.pathname.startsWith("/api/") &&
    !request.nextUrl.pathname.startsWith("/api/auth/")
  ) {
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
      const decoded = await verifyToken(token);
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", decoded.id);
      requestHeaders.set("x-user-role", decoded.role);

      // Debug için konsola yazdıralım
      console.log(`API isteği: ${request.nextUrl.pathname}`);
      console.log(`Kullanıcı ID: ${decoded.id}, Rol: ${decoded.role}`);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.error("Token doğrulama hatası:", error);
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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
