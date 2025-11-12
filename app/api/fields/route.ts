import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

// Route-level ISR (120 sn): sabit referans veriler için DB yükünü azaltır
export const revalidate = 120;

interface FieldOwnershipInput {
  userId: string;
  percentage: number;
}

interface CreateFieldPayload {
  name: string;
  location: string;
  size: number;
  coordinates?: string;
  crop: string;
  plantingDate: string;
  expectedHarvestDate: string;
  soilType: string;
  seasonId?: string | null;
  wellId?: string | null;
  ownerships: FieldOwnershipInput[];
}

export async function GET(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? Number.parseInt(searchParams.get("limit")!)
      : 50;
    const page = searchParams.get("page")
      ? Number.parseInt(searchParams.get("page")!)
      : 1;
    const skip = (page - 1) * limit;
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const wellId = searchParams.get("wellId");
    const includeOwnerships = searchParams.get("includeOwnerships") === "true";
    const fetchAll = searchParams.get("fetchAll") === "true";

    // Filtreleme koşulları
    const where: Prisma.FieldWhereInput = {};

    // Kuyu ID'sine göre filtreleme
    if (wellId) {
      where.fieldWells = {
        some: {
          wellId: wellId
        }
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    // Kullanıcı rolüne göre filtreleme (Sadece fetchAll false ise uygula)
    if (!fetchAll) {
      // Geri bildirim üzerine: OWNER rolündeki kullanıcıların sadece kendi tarlalarını değil,
      // sistemdeki tüm tarlaları görebilmesi için sahiplik filtresi kaldırıldı.
      if (userRole === "WORKER") {
        // Worker'lar için filtreleme yapma, tüm tarlaları görebilsinler
        // Ancak wellId parametresi varsa, o kuyuya bağlı tarlaları göster
        if (!wellId) {
          where.workerAssignments = {
            some: {
              userId: userId,
            },
          };
        }
      }
    }

    // Toplam kayıt sayısını al
    const totalCount = await prisma.field.count({ where });

    // Tarlaları getir (projection: yanıtı küçült)
    const fields = await prisma.field.findMany({
      where,
      select: {
        id: true,
        name: true,
        location: true, // Eklendi: Konum bilgisi
        status: true,   // Eklendi: Durum bilgisi
        size: true,
        seasonId: true,
        // İsteğe bağlı sahiplik bilgileri (yalnızca gereken alanlar)
        ...(includeOwnerships
          ? {
              owners: {
                select: {
                  id: true, // Eklendi: FieldOwnership ID'si
                  userId: true,
                  percentage: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            }
          : {}),
        // Kuyu bilgisi: yalnızca id ve name
        fieldWells: {
          select: {
            id: true, // Eklendi: FieldWell ilişki kaydının ID'si
            well: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        // Sezon bilgisi minimal
        season: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    // Prisma'dan gelen 'fields' dizisi doğrudan kullanılacak.
    // formattedFields map işlemi kaldırıldı.

    // Revalidate/TTL: App Router'da route-level revalidate önerilir
    // Bu dosyanın tepesine `export const revalidate = 120` ekleyebiliriz.
    // Response init içinde 'next' tipi bulunmadığı için burada standart JSON döndürüyoruz.
    return NextResponse.json({
      data: fields,
      meta: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Tarlaları çekerken hata:", error);
    return NextResponse.json({ error: "Tarlalar çekilemedi" }, { status: 500 });
  }
}

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

    const {
      name,
      location,
      size,
      coordinates,
      crop,
      plantingDate,
      expectedHarvestDate,
      soilType,
      seasonId,
      wellId,
      ownerships,
    } = (await request.json()) as CreateFieldPayload;

    // Veri doğrulama
    if (
      !name ||
      !location ||
      !size ||
      !crop ||
      !plantingDate ||
      !expectedHarvestDate ||
      !soilType
    ) {
      return NextResponse.json(
        { error: "Tüm zorunlu alanları doldurun" },
        { status: 400 }
      );
    }

    // Sahiplik kontrolü
    if (!ownerships || ownerships.length === 0) {
      return NextResponse.json(
        { error: "En az bir tarla sahibi eklemelisiniz" },
        { status: 400 }
      );
    }

    const totalPercentage = ownerships.reduce(
      (sum, owner) => sum + owner.percentage,
      0
    );
    if (totalPercentage !== 100) {
      return NextResponse.json(
        { error: "Sahiplik yüzdeleri toplamı %100 olmalıdır" },
        { status: 400 }
      );
    }

    // Tarla oluştur
    const field = await prisma.field.create({
      data: {
        name,
        location,
        size,
        coordinates: coordinates || null,
        status: "ACTIVE",
        season: seasonId
          ? {
              connect: { id: seasonId },
            }
          : undefined,
        crops: {
          create: {
            name: crop,
            plantedDate: new Date(plantingDate),
            harvestDate: new Date(expectedHarvestDate),
            status: "GROWING",
            season: seasonId
              ? {
                  connect: { id: seasonId },
                }
              : undefined,
          },
        },
        owners: {
          create: ownerships.map((ownership) => ({
            user: {
              connect: { id: ownership.userId },
            },
            percentage: ownership.percentage,
          })),
        },
      },
    });

    // Kuyu bağlantısı varsa FieldWell kaydı oluştur
    if (wellId) {
      await prisma.fieldWell.create({
        data: {
          field: { connect: { id: field.id } },
          well: { connect: { id: wellId } },
        },
      });
    }

    return NextResponse.json(field);
  } catch (error) {
    console.error("Tarla oluşturulurken hata:", error);
    return NextResponse.json(
      { error: "Tarla oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
