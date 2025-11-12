import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "./lib/jwt"
import { prisma } from "./lib/prisma"

export async function middleware(request: NextRequest) {
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/dashboard")
  const isLoginPage = request.nextUrl.pathname === "/login"
  const token = request.cookies.get("token")?.value

  const isApiRoute = request.nextUrl.pathname.startsWith("/api/") && !request.nextUrl.pathname.startsWith("/api/auth/")
  const isCronWeatherSync = request.nextUrl.pathname === "/api/cron/weather-sync"
  const isTestFetch = request.nextUrl.pathname === "/api/weather/test-fetch"

  if (isApiRoute && (isCronWeatherSync || isTestFetch)) {
    return NextResponse.next()
  }

  // API rotaları için token kontrolü
  if (isApiRoute) {
    if (!token) {
      console.log("API isteği token bulunamadı:", request.nextUrl.pathname)
      return NextResponse.json({ error: "Kimlik doğrulama gerekli" }, { status: 401 })
    }

    try {
      // Step 1: Verify token
      const decoded = await verifyToken(token)

      if (!decoded || !decoded.id) {
        console.error("Token decode başarısız")
        return NextResponse.json({ error: "Geçersiz token" }, { status: 401 })
      }

      // Step 2: Fetch user from database (NEW!)
      // This ensures user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
        },
      })

      // Step 3: Validate user exists
      if (!user) {
        console.error(`Kullanıcı bulunamadı: ${decoded.id}`)
        return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 401 })
      }

      // Step 4: Validate user is active (NEW!)
      // Prevents deactivated users from accessing API
      if (user.status !== "ACTIVE") {
        console.warn(`İnaktif kullanıcı erişim denemesi: ${user.id}, Status: ${user.status}`)
        return NextResponse.json(
          { error: "Kullanıcı hesabı deaktif veya silinmiş" },
          { status: 401 }
        )
      }

      // Step 5: Set all user info in headers (NEW!)
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set("x-user-id", user.id)
      requestHeaders.set("x-user-role", user.role)
      requestHeaders.set("x-user-name", user.name)
      requestHeaders.set("x-user-email", user.email)
      requestHeaders.set("Cookie", `token=${token}`)

      console.log(`[Middleware] Auth success - User: ${user.id}, Role: ${user.role}, Path: ${request.nextUrl.pathname}`)

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    } catch (error) {
      console.error("[Middleware] Auth error:", error)
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
