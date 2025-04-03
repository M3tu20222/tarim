import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Owner rolündeki kullanıcıları getir
export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // Sadece admin ve owner kullanıcılar bu listeye erişebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    // Owner rolündeki kullanıcıları getir
    const owners = await prisma.user.findMany({
      where: {
        role: "OWNER",
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(owners);
  } catch (error) {
    console.error("Error fetching owners:", error);
    return NextResponse.json(
      { error: "Kullanıcılar getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
