import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

// Edge-compatible JWT oluşturma (login route.ts ile aynı)
function createJWT(payload: any, secret: string, expiresIn = 86400): string {
  // Header
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  // Payload
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresIn; // Default: 1 gün (86400 saniye)

  const jwtPayload = {
    ...payload,
    iat: now,
    exp,
  };

  // Base64Url encoding
  const base64UrlEncode = (str: string) => {
    return Buffer.from(str)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  };

  // Header ve payload'ı encode et
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));

  // İmza oluştur (Not: Bu basit bir implementasyon, üretimde crypto kullanılmalı)
  const signature = base64UrlEncode(
    `${secret}-${encodedHeader}-${encodedPayload}`
  );

  // JWT'yi birleştir
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Edge-compatible JWT verification
function decodeToken(token: string): any | null {
  try {
    // JWT'yi manuel olarak decode et
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // Payload'ı decode et (JWT'nin ikinci kısmı)
    return JSON.parse(atob(parts[1]));
  } catch (error) {
    console.error("Token decode hatası:", error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    // Mevcut token'ı al
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Token gerekli",
        },
        { status: 400 }
      );
    }

    // Token'ı decode et
    const decoded = decodeToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Geçersiz token formatı",
        },
        { status: 401 }
      );
    }

    // Token'ın süresi dolmuş mu kontrol et
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      return NextResponse.json(
        {
          success: false,
          message: "Token süresi dolmuş",
        },
        { status: 401 }
      );
    }

    // Kullanıcıyı kontrol et
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "Geçersiz kullanıcı veya hesap aktif değil",
        },
        { status: 401 }
      );
    }

    // Yeni token oluştur
    const newToken = createJWT(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "default-secret",
      86400 // 1 gün
    );

    // Cookie'yi güncelle - await eklendi
    const cookieStore = await cookies();
    cookieStore.set("token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 gün
    });

    return NextResponse.json({
      success: true,
      message: "Token yenilendi",
      token: newToken,
    });
  } catch (error) {
    console.error("Token yenileme hatası:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Token yenileme sırasında bir hata oluştu",
      },
      { status: 500 }
    );
  }
}
