import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { getAllFields, getFieldsWithOwnerships } from "@/lib/data/fields";
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

    // Cached data getters'dan veri al
    let allFields;
    if (includeOwnerships) {
      console.log("[Cache] Using getFieldsWithOwnerships");
      allFields = await getFieldsWithOwnerships();
    } else {
      console.log("[Cache] Using getAllFields");
      allFields = await getAllFields();
    }

    // Filtreleme işlemini bellek içinde yap
    let fields = allFields;

    // Well ID'ye göre filtreleme
    if (wellId) {
      fields = await Promise.resolve().then(async () => {
        const fieldWells = await prisma.fieldWell.findMany({
          where: { wellId },
          select: { fieldId: true },
        });
        const fieldWellIds = fieldWells.map((fw) => fw.fieldId);
        return fields.filter((f) => fieldWellIds.includes(f.id));
      });
    }

    // Arama filtresi
    if (search) {
      fields = fields.filter(
        (f) =>
          f.name.toLowerCase().includes(search.toLowerCase()) ||
          f.location?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Status filtresi
    if (status) {
      fields = fields.filter((f) => f.status === status);
    }

    // Worker rolü için filtreleme
    if (!fetchAll && userRole === "WORKER" && !wellId) {
      const workerAssignments = await prisma.fieldWorkerAssignment.findMany({
        where: { userId },
        select: { fieldId: true },
      });
      const assignedFieldIds = workerAssignments.map((wa) => wa.fieldId);
      fields = fields.filter((f) => assignedFieldIds.includes(f.id));
    }

    // Ilişkili veri getir (wells, season, ownerships)
    const fieldIds = fields.map((f) => f.id);
    let fieldsWithRelations = fields;

    if (fieldIds.length > 0) {
      const fieldWells = await prisma.fieldWell.findMany({
        where: { fieldId: { in: fieldIds } },
        include: {
          well: {
            select: { id: true, name: true },
          },
        },
      });

      const seasons = await prisma.season.findMany({
        where: { id: { in: fields.map((f) => f.seasonId).filter(Boolean) } },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
      });

      const seasonMap = new Map(seasons.map((s) => [s.id, s]));
      const fieldWellsMap = new Map<string, any[]>();
      fieldWells.forEach((fw) => {
        if (!fieldWellsMap.has(fw.fieldId)) {
          fieldWellsMap.set(fw.fieldId, []);
        }
        fieldWellsMap.get(fw.fieldId)!.push({
          id: fw.id,
          well: fw.well,
        });
      });

      fieldsWithRelations = fields.map((f) => ({
        ...f,
        fieldWells: fieldWellsMap.get(f.id) || [],
        season: f.seasonId ? seasonMap.get(f.seasonId) : null,
      }));
    }

    // Pagination
    const totalCount = fieldsWithRelations.length;
    const paginatedFields = fieldsWithRelations.slice(skip, skip + limit);

    return NextResponse.json({
      data: paginatedFields,
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

    // Cache invalidation
    console.log("[Cache] Invalidating fields tag after field creation");
    revalidateTag("fields");

    return NextResponse.json(field);
  } catch (error) {
    console.error("Tarla oluşturulurken hata:", error);
    return NextResponse.json(
      { error: "Tarla oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
