import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "./jwt";
import { prisma } from "./prisma";

// Server-side session için
export async function getServerSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: payload.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return user;
  } catch (error) {
    console.error("Server session error:", error);
    return null;
  }
}
