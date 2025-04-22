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

    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const seasonId = searchParams.get("seasonId");
    const ownerId = searchParams.get("ownerId");
    const wellId = searchParams.get("wellId");
    const processType = searchParams.get("processType");
    const searchTerm = searchParams.get("search");

    // Filtre oluştur
    const filter: any = {};
    if (activeOnly) {
      filter.status = "ACTIVE";
    }
    if (seasonId) {
      filter.seasonId = seasonId;
    }
    if (ownerId) {
      filter.owners = {
        some: {
          userId: ownerId,
        },
      };
    }
    // Güncellendi: Filtreleme fieldWells üzerinden yapılıyor
    if (wellId) {
      filter.fieldWells = {
        some: {
          wellId: wellId,
        },
      };
    }
    if (processType) {
      filter.processingLogs = {
        some: {
          processType,
        },
      };
    }
    if (searchTerm) {
      filter.OR = [
        {
          name: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          location: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      ];
    }

    // Kullanıcı rolüne göre tarlaları getir
    let fields;
    if (userRole === "ADMIN" || userRole === "OWNER") {
      // Admin ve Owner tüm tarlaları görebilir
      fields = await prisma.field.findMany({
        where: filter,
        include: {
          owners: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          season: true,
          // Güncellendi: wells -> fieldWells
          fieldWells: { 
            include: {
              well: true,
            },
          },
          processingLogs: {
            take: 5,
            orderBy: {
              date: "desc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      // Worker sadece kendisine atanmış tarlaları görebilir
      fields = await prisma.field.findMany({
        where: {
          ...filter,
          OR: [
            {
              workerAssignments: {
                some: {
                  userId,
                },
              },
            },
          ],
        },
        include: {
          owners: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          season: true,
          // Güncellendi: wells -> fieldWells
          fieldWells: { 
            include: {
              well: true,
            },
          },
          processingLogs: {
            take: 5,
            orderBy: {
              date: "desc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
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

    const {
      name,
      location,
      size,
      crop,
      plantingDate,
      expectedHarvestDate,
      soilType,
      notes,
      seasonId,
      wellIds, // wellIds dizisi olarak değiştirildi
      ownerships,
    } = await request.json();

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
      (sum: number, o: any) => sum + o.percentage,
      0
    );
    // Kayan nokta hatalarını tolere etmek için küçük bir epsilon değeri
    const epsilon = 0.01;
    if (Math.abs(totalPercentage - 100) > epsilon) {
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
          create: ownerships.map((ownership: any) => ({
            user: {
              connect: { id: ownership.userId },
            },
            percentage: ownership.percentage,
          })),
        },
        // FieldWell kayıtları burada oluşturulacak
        fieldWells: wellIds && wellIds.length > 0 ? {
          create: wellIds.map((id: string) => ({
            well: { connect: { id: id } },
          })),
        } : undefined,
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
