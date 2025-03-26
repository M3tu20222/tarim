import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    // URL'den role parametresini al
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    // Oturum kontrolü
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

// POST metodu değişmedi
export async function POST(request: NextRequest) {
  try {
    // Oturum kontrolü
    const session = await getSession();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    // Kullanıcı oluştur
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password, // Gerçek uygulamada şifre hash'lenmeli
        role: data.role,
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
