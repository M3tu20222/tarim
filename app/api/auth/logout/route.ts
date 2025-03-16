
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    // Cookie'yi sil
    const cookieStore = await cookies();
    cookieStore.delete("token");

    return NextResponse.json({
      success: true,
      message: "Çıkış başarılı",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Çıkış işlemi sırasında bir hata oluştu",
      },
      { status: 500 }
    );
  }
}
