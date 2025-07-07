import { type NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { getServerSideSession } from "@/lib/session";

const prisma = new PrismaClient();

// Helper function to round to 2 decimal places
const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

// Helper function to extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim() !== '') {
    return error;
  }
  // Check for object with a string message property
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === 'string') {
      return msg;
    }
  }
  return "Sulama kaydı oluşturulurken bilinmeyen bir hata oluştu.";
}

// Define interfaces for request data and nested types
interface FieldIrrigationInput {
  fieldId: string;
  percentage: number;
  wellId?: string;
  seasonId?: string;
}

interface OwnerDurationInput {
  userId: string;
  duration: number;
  irrigatedArea?: number;
  userName?: string;
}

interface InventoryDeductionInput {
  inventoryId: string;
  quantityUsed: number;
  unitPrice: number;
  ownerId: string;
}

// For the fieldUsageRecords map function, reflecting the actual return type from Prisma.create with specific includes
type IrrigationFieldUsageWithFieldAndOwners = Prisma.IrrigationFieldUsageGetPayload<{
  include: {
    field: {
      select: {
        id: true;
        name: true;
        owners: {
          select: {
            userId: true;
          };
        };
      };
    };
  };
}>;

// Tüm sulama kayıtlarını getir (ownerSummaries eklendi)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSideSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? Number.parseInt(searchParams.get("limit")!)
      : 50;
    const page = searchParams.get("page")
      ? Number.parseInt(searchParams.get("page")!)
      : 1;
    const skip = (page - 1) * limit;
    const seasonId = searchParams.get("seasonId");
    const status = searchParams.get("status");
    const wellId = searchParams.get("wellId");
    const fieldId = searchParams.get("fieldId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const ownerId = searchParams.get("ownerId"); // Yeni filtre: Sahip ID'si
    const createdBy = searchParams.get("createdBy"); // Yeni filtre: Oluşturan kullanıcı ID'si

    const where: Prisma.IrrigationLogWhereInput = {};

    if (seasonId) where.seasonId = seasonId;
    if (status) where.status = status;
    if (wellId) where.wellId = wellId;
    if (fieldId) {
      where.fieldUsages = { some: { fieldId: fieldId } };
    }
    if (startDate && endDate) {
      where.startDateTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    // Sahibe göre filtreleme (ownerSummaries üzerinden)
    if (ownerId) {
      where.ownerSummaries = { some: { ownerId: ownerId } };
    }
    // Oluşturan kullanıcıya göre filtreleme
    if (createdBy) {
      where.createdBy = createdBy;
    }

    const totalCount = await prisma.irrigationLog.count({ where });

    const irrigationLogs = await prisma.irrigationLog.findMany({
      where,
      include: {
        well: true,
        season: true,
        user: { select: { id: true, name: true, email: true } },
        fieldUsages: {
          include: {
            field: { select: { id: true, name: true, size: true } }, // Sadece gerekli alanları seç
            ownerUsages: {
              // Bu hala tarla bazlı detayı gösterir
              include: {
                owner: { select: { id: true, name: true } },
              },
            },
          },
        },
        inventoryUsages: {
          include: {
            inventory: { select: { id: true, name: true, unit: true } }, // Sadece gerekli alanları seç
            ownerUsages: {
              // Bu hala envanter bazlı detayı gösterir
              include: {
                owner: { select: { id: true, name: true } },
              },
            },
          },
        },
        ownerSummaries: {
          // Yeni eklenen özet bilgisi
          include: {
            owner: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { startDateTime: "desc" },
      skip,
      take: limit,
    });

    return NextResponse.json({
      data: irrigationLogs,
      meta: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching irrigation logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch irrigation logs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSideSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { startDateTime, duration, notes, wellId, seasonId }: {
      startDateTime: string;
      duration: number;
      notes?: string;
      wellId: string;
      seasonId: string; // seasonId artık zorunlu
    } = await request.json();

    if (!startDateTime || !duration || !wellId || !seasonId) { // seasonId kontrolü eklendi
      return NextResponse.json({ error: "Eksik alanlar: startDateTime, duration, wellId ve seasonId gereklidir." }, { status: 400 });
    }

    const irrigationLog = await prisma.irrigationLog.create({
      data: {
        startDateTime: new Date(startDateTime),
        duration,
        notes,
        status: "DRAFT", // Başlangıçta taslak olarak oluştur
        wellId: wellId,
        seasonId: seasonId, // seasonId artık null olamaz
        createdBy: session.id,
      },
    });

    return NextResponse.json({ data: { id: irrigationLog.id } }); // Sadece ID'yi döndür
  } catch (caughtError: unknown) {
    console.error("Sulama kaydı başlatma hatası:", caughtError);
    const finalErrorMessage: string = getErrorMessage(caughtError);
    return NextResponse.json({ error: finalErrorMessage }, { status: 400 });
  } finally {
    await prisma.$disconnect();
  }
}
