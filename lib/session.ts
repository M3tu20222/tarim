  import { verifyToken } from "./jwt";
  import { prisma } from "./prisma";
  import { cookies } from "next/headers";

  export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value; // 'token' olarak değiştir

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
