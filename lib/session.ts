import { verifyToken } from "./jwt";
import { prisma } from "./prisma";
import { cookies } from "next/headers";

export async function getSession() {
  const cookieStore = await cookies(); // Promise'ı çözmek için await ekliyoruz
  const token = cookieStore.get("token")?.value; // Çözülen cookieStore üzerinden get() kullanıyoruz

  if (!token) {
    console.log("Token bulunamadı");
    return null;
  }

  try {
    const decoded = await verifyToken(token);
    console.log("Token doğrulandı:", decoded);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      console.log("Kullanıcı bulunamadı");
      return null;
    }

    console.log("Session oluşturuldu:", user);
    return { user };
  } catch (error) {
    console.error("Oturum doğrulama hatası:", error);
    return null;
  }
}
