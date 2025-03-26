"use server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { signToken } from "@/lib/jwt";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    console.log("Login isteği:", { email, password });

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "E-posta ve şifre zorunludur" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: "Geçerli bir e-posta adresi giriniz" },
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

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("Şifre doğrulama sonucu:", isPasswordValid);
    if (!isPasswordValid) {
      console.log("Veritabanındaki şifre:", user.password);
      return NextResponse.json(
        { success: false, message: "Şifre hatalı" },
        { status: 401 }
      );
    }

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

    const token = await signToken({ id: user.id, role: user.role });
    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return NextResponse.json({
      success: true,
      message: "Giriş başarılı",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Giriş sırasında bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}
