import { verifyToken } from "./jwt";
import { prisma } from "./prisma";
import { cookies } from "next/headers";

export async function getSession(req?: Request) {
  let token;

  // Eğer bir request nesnesi varsa, ondan cookie'yi al
  if (req) {
    const cookieHeader = req.headers.get("cookie");
    const tokenCookie = cookieHeader
      ?.split(";")
      .find((c) => c.trim().startsWith("token="));
    token = tokenCookie?.split("=")[1];
  } else {
    // Client tarafında çalışırken veya API route'larında
    // document.cookie'den token'ı al
    if (typeof window !== "undefined") {
      const cookies = document.cookie.split(";");
      const tokenCookie = cookies.find((c) => c.trim().startsWith("token="));
      token = tokenCookie?.split("=")[1];
    }
  }

  if (!token) {
    return null;
  }

  try {
    const decoded = await verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return null;
    }

    return { user };
  } catch (error) {
    console.error("Oturum doğrulama hatası:", error);
    return null;
  }
}