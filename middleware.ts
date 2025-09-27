import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "./lib/jwt"

export async function middleware(request: NextRequest) {
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/dashboard")
  const isLoginPage = request.nextUrl.pathname === "/login"
  const token = request.cookies.get("token")?.value

  const isApiRoute = request.nextUrl.pathname.startsWith("/api/") && !request.nextUrl.pathname.startsWith("/api/auth/")
  const isCronWeatherSync = request.nextUrl.pathname === "/api/cron/weather-sync"

  if (isApiRoute && isCronWeatherSync) {
    return NextResponse.next()
  }

  // API rotaları için token kontrolü
  if (isApiRoute) {
    if (!token) {
      console.log("API isteği token bulunamadı:", request.nextUrl.pathname)
      return NextResponse.json({ error: "Kimlik doğrulama gerekli" }, { status: 401 })
    }

    try {
      const decoded = await verifyToken(token)
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set("x-user-id", decoded.id)
      requestHeaders.set("x-user-role", decoded.role)
      requestHeaders.set("Cookie", `token=${token}`) // Cookie'yi ekle

      // Debug için konsola yazdıralım
      console.log(`API isteği: ${request.nextUrl.pathname}`)
      console.log(`Kullanıcı ID: ${decoded.id}, Rol: ${decoded.role}`)

      // Worker'ların irrigation API'lerine erişimini sağla
      if (decoded.role === "WORKER" && request.nextUrl.pathname.startsWith("/api/irrigation")) {
        console.log("Worker kullanıcısı irrigation API'sine erişiyor:", request.nextUrl.pathname)
      }

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    } catch (error) {
      console.error("Token doğrulama hatası:", error)
      return NextResponse.json({ error: "Kimlik doğrulama gerekli" }, { status: 401 })
    }
  }

  if (!token && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Worker'ların irrigation sayfalarına erişimini sağla
  if (token && isProtectedRoute) {
    try {
      const decoded = await verifyToken(token)

      // Worker kullanıcısı irrigation sayfalarına erişmeye çalışıyorsa
      if (decoded.role === "WORKER" && request.nextUrl.pathname.startsWith("/dashboard/owner/irrigation")) {
        console.log("Worker kullanıcısı irrigation sayfasına erişiyor:", request.nextUrl.pathname)
        // Worker'ın kendi dashboard'una yönlendirmek yerine erişime izin ver
        return NextResponse.next()
      }
    } catch (error) {
      console.error("Token doğrulama hatası:", error)
    }
  }

  if (token && isLoginPage) {
    try {
      await verifyToken(token)
      return NextResponse.redirect(new URL("/dashboard", request.url))
    } catch (error) {
      const response = NextResponse.redirect(new URL("/login", request.url))
      response.cookies.delete("token")
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/api/(.*)"],
}
