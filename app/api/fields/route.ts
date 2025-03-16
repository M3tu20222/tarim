import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Tüm tarlaları getir
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

    let fields;

    // Rol bazlı erişim kontrolü
    if (userRole === "ADMIN") {
      // Admin tüm tarlaları görebilir
      fields = await prisma.field.findMany({
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          crops: true,
          wells: true,
        },
      });
    } else if (userRole === "OWNER") {
      // Sahip sadece kendi tarlalarını görebilir
      fields = await prisma.field.findMany({
        where: {
          ownerId: userId,
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          crops: true,
          wells: true,
        },
      });
    } else if (userRole === "WORKER") {
      // İşçi sadece kendisine atanan tarlaları görebilir
      // Not: Burada workers ilişkisi yerine başka bir yaklaşım kullanmalıyız
      // Örneğin, bir FieldWorker ara tablosu oluşturulabilir
      fields = await prisma.field.findMany({
        where: {
          // Şu anda workers ilişkisi olmadığı için geçici olarak tüm tarlaları gösterelim
          // Gerçek uygulamada bu kısım düzeltilmelidir
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          crops: true,
          wells: true,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Geçersiz kullanıcı rolü" },
        { status: 403 }
      );
    }

    return NextResponse.json(fields);
  } catch (error) {
    console.error("Error fetching fields:", error);
    return NextResponse.json(
      { error: "Tarlalar getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Yeni tarla oluştur
export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // Sadece admin ve sahip kullanıcılar tarla oluşturabilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const { name, location, size, coordinates, status, ownerId } =
      await request.json();

    // Veri doğrulama
    if (!name || !location || !size) {
      return NextResponse.json(
        { error: "Tarla adı, konum ve büyüklük zorunludur" },
        { status: 400 }
      );
    }

    // Sahip kontrolü
    const owner = ownerId || userId;
    if (!owner) {
      return NextResponse.json(
        { error: "Tarla sahibi bulunamadı" },
        { status: 400 }
      );
    }

    // Tarla oluştur
    const field = await prisma.field.create({
      data: {
        name,
        location,
        size,
        coordinates,
        status,
        owner: {
          connect: { id: owner },
        },
        // workers ilişkisi şu anda desteklenmiyor, bu kısmı kaldırdık
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(field);
  } catch (error) {
    console.error("Error creating field:", error);
    return NextResponse.json(
      { error: "Tarla oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
