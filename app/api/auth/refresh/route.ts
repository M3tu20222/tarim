import { NextResponse, NextRequest } from "next/server"; // NextRequest eklendi
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { signToken, decodeToken } from "@/lib/jwt"; // Gerekli fonksiyonları içe aktar

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value; // 'token' adını kullan

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Token bulunamadı",
        },
        { status: 401 }
      );
    }

    // Token'ı decode et (decodeToken kullanılıyor)
    const decoded = await decodeToken(token); // await ekle
    if (!decoded || !decoded.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Geçersiz token",
        },
        { status: 401 }
      );
    }

    // Token'ın süresinin dolup dolmadığını kontrol et
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

    // Kullanıcıyı veritabanından bul
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Kullanıcı bulunamadı",
        },
        { status: 401 }
      );
    }

    // Yeni token oluştur (signToken kullanılıyor)
    const newToken = await signToken({ id: user.id, role: user.role });

    // Yeni token'ı cookie'ye yaz
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
      token: newToken, // Yeni token'ı döndür
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
