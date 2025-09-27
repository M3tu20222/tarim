import * as jose from "jose";

// Token'ın içeriğini temsil eden arayüz
interface DecodedToken {
  id: string;
  role: string;
  iat: number;
  exp: number;
}

// Type guard fonksiyonu
function isDecodedToken(payload: any): payload is DecodedToken {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "id" in payload &&
    typeof payload.id === "string" &&
    "role" in payload &&
    typeof payload.role === "string" &&
    "iat" in payload &&
    typeof payload.iat === "number" &&
    "exp" in payload &&
    typeof payload.exp === "number"
  );
}

// Token oluşturma fonksiyonu
export async function signToken(payload: { id: string; role: string }) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const alg = "HS256";

  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(secret);

  return jwt;
}

// Token doğrulama fonksiyonu
export async function verifyToken(token: string): Promise<DecodedToken> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

  try {
    const { payload } = await jose.jwtVerify(token, secret);

    if (isDecodedToken(payload)) {
      return payload;
    } else {
      throw new Error("Invalid token payload");
    }
  } catch (error) {
    throw new Error("Invalid token");
  }
}

// Token çözümleme fonksiyonu (isteğe bağlı güncelleme)
export async function decodeToken(token: string): Promise<DecodedToken | null> {
  try {
    const payload = jose.decodeJwt(token); // decodeJwt senkron bir fonksiyondur
    if (payload && isDecodedToken(payload)) {
      return payload;
    }
    return null;
  } catch (error) {
    return null;
  }
}
