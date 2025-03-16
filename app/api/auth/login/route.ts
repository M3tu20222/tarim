"use server"
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcrypt";
import { cookies } from "next/headers";

// Edge-compatible JWT oluşturma
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
  // Gerçek bir imza oluşturmak için jose gibi Edge-compatible bir kütüphane kullanılmalıdır
  const signature = base64UrlEncode(
    `${secret}-${encodedHeader}-${encodedPayload}`
  );

  // JWT'yi birleştir
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    console.log("Login isteği:", email);

    // Veri doğrulama
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "E-posta ve şifre zorunludur",
        },
        { status: 400 }
      );
    }

    // E-posta formatı kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Geçerli bir e-posta adresi giriniz",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    console.log("Kullanıcı bulundu:", user ? "Evet" : "Hayır");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı",
        },
        { status: 401 }
      );
    }

    // Şifre kontrolü
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Şifre hatalı",
        },
        { status: 401 }
      );
    }

    // Kullanıcı durumu kontrolü
    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Hesabınız aktif değil. Lütfen yönetici ile iletişime geçin.",
        },
        { status: 403 }
      );
    }

    // Token oluştur
    const token = createJWT(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "default-secret",
      86400 // 1 gün
    );

    console.log("Token oluşturuldu");

    // Cookie'yi ayarla - await eklendi
    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 gün
    });

    console.log("Cookie ayarlandı");

    // Kullanıcı bilgilerini frontend'e döndürün
    return NextResponse.json({
      success: true,
      message: "Giriş başarılı",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: token, // Token'ı da döndür ki localStorage'a kaydedilebilsin
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          "Giriş sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
      },
      { status: 500 }
    );
  }
}
