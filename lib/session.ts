import { verifyToken } from "./jwt";
import { prisma } from "./prisma";
import { cookies as nextCookies } from "next/headers";
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

export async function getSession() {
  let token: string | undefined;

  try {
    // App Router için (Server Components)
    if (typeof window === "undefined") {
      try {
        const cookieStore = await nextCookies();
        token = cookieStore.get("token")?.value;
      } catch (error) {
        // next/headers kullanılamıyorsa, request headers'dan okuyalım
        // Bu kısım Pages API Routes için çalışacak
        const req = arguments[0]?.req as RequestWithCookies | undefined;
        if (req?.headers?.cookie) {
          const cookies = parse(req.headers.cookie);
          token = cookies["token"];
        }
      }
    } else {
      // Client tarafı için
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
    console.error("Session verification error:", error);
    return null;
  }
}

// Pages API Routes için yardımcı fonksiyon
export async function getSessionFromRequest(req: RequestWithCookies) {
  try {
    const cookies = parse(req.headers.cookie || "");
    const token = cookies["token"];

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      return null;
    }

    return prisma.user.findUnique({
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
  } catch (error) {
    console.error("Session verification error:", error);
    return null;
  }
}
