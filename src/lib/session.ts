import { verifyToken } from "./jwt";
import { prisma } from "./prisma";
import { parse } from "cookie";

// JWT token'ın çözülmüş hali için tip tanımı
interface DecodedToken {
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Request tipi için interface
interface RequestWithCookies {
  headers: {
    cookie?: string;
  };
}

// App Router için getServerSideSession
export async function getServerSideSession() {
  try {
    // Dinamik import kullanarak next/headers'ı yüklüyoruz
    // Bu sayede build sırasında hata oluşmayacak
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies(); // await eklendi
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

// Pages API Routes için getSession
export async function getSession(req?: RequestWithCookies) {
  try {
    let token: string | undefined;

    // Server-side (Pages API Routes)
    if (req?.headers?.cookie) {
      const cookies = parse(req.headers.cookie);
      token = cookies["token"];
    }
    // Client-side
    else if (typeof window !== "undefined") {
      const cookiesObj: Record<string, string> = {};
      document.cookie.split(";").forEach((cookie) => {
        const [key, value] = cookie.trim().split("=");
        if (key) cookiesObj[key] = value;
      });
      token = cookiesObj["token"];
    }

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
    console.error("Session error:", error);
    return null;
  }
}

// Eski fonksiyonu koruyoruz, ancak yeni fonksiyonu çağırıyoruz
export async function getSessionFromRequest(req: RequestWithCookies) {
  return getSession(req);
}
