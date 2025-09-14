/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Kullanıcıları listeler
 *     description: Tüm kullanıcıları veya belirli bir role sahip kullanıcıları listeler. Sadece ADMIN ve OWNER rollerinin erişimi vardır.
 *     tags:
 *       - Users
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMIN, OWNER, WORKER]
 *         description: İsteğe bağlı olarak kullanıcıları role göre filtreler.
 *     responses:
 *       200:
 *         description: Başarılı bir şekilde kullanıcı listesini döndürür.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Yetkilendirme hatası (token eksik veya geçersiz).
 *       403:
 *         description: Erişim reddedildi.
 */
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // URL'den role parametresini al
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    // Header'lardan kullanıcı bilgilerini al
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    // Yetkilendirme kontrolü
    if (!userId || !userRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // OWNER rolündeki kullanıcıların da kullanıcı listesine erişmesine izin verelim

    // GET fonksiyonundaki yetkilendirme kontrolünü şu şekilde değiştirelim:
    // Eğer kullanıcı ADMIN veya OWNER değilse erişimi reddet
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
      });
    }

    // Filtre oluştur
    const filter: any = {};

    // Eğer role parametresi varsa, sadece o roldeki kullanıcıları getir
    if (role) {
      filter.role = role;
    }

    // Kullanıcıları getir
    const users = await prisma.user.findMany({
      where: filter,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    console.log(
      `API: Fetched ${users.length} users with role filter: ${role || "none"}`
    );
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Yeni kullanıcı oluşturur
 *     description: Yeni bir kullanıcı kaydı oluşturur. Sadece ADMIN ve OWNER rollerinin erişimi vardır.
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreateInput'
 *     responses:
 *       200:
 *         description: Başarılı bir şekilde yeni kullanıcıyı döndürür.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Eksik veya geçersiz veri.
 *       401:
 *         description: Yetkilendirme hatası.
 *       403:
 *         description: Erişim reddedildi.
 */
// POST metodu da benzer şekilde güncellendi
export async function POST(request: NextRequest) {
  try {
    // Header'lardan kullanıcı bilgilerini al
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    // Yetkilendirme kontrolü
    if (!userId || !userRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // POST fonksiyonundaki yetkilendirme kontrolünü de benzer şekilde değiştirelim:
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
      });
    }

    const data = await request.json();

    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(data.password, 10);
    // Kullanıcı oluştur
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword, // Gerçek uygulamada şifre hash'lenmeli
        role: data.role,
        status: data.status || "ACTIVE", // Varsayılan olarak ACTIVE
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
