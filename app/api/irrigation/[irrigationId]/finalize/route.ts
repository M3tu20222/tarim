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
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === 'string') {
      return msg;
    }
  }
  return "Sulama kaydı sonlandırılırken bilinmeyen bir hata oluştu.";
}

// Define interfaces for request data and nested types
interface OwnerDurationInput {
  userId: string;
  duration: number;
  irrigatedArea?: number;
  userName?: string;
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

export async function POST(
  request: NextRequest,
  { params }: { params: { irrigationId: string } }
) {
  try {
    const session = await getServerSideSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { irrigationId } = await params;
    if (!irrigationId) {
      return NextResponse.json({ error: "Sulama ID'si eksik." }, { status: 400 });
    }

    const requestData = await request.json();
    const { ownerDurations, costAllocations }: {
      ownerDurations: OwnerDurationInput[];
      costAllocations?: any[];
    } = requestData;

    const result = await prisma.$transaction(async (tx) => {
      const irrigationLog = await tx.irrigationLog.findUnique({
        where: { id: irrigationId },
        select: { id: true, status: true, wellId: true, seasonId: true, createdBy: true, duration: true },
      });

      if (!irrigationLog) {
        throw new Error("Sulama kaydı bulunamadı.");
      }
      if (irrigationLog.status !== "DRAFT") {
        throw new Error("Sadece taslak durumundaki sulama kayıtları sonlandırılabilir.");
      }

      // Sulama kaydının durumunu COMPLETED olarak güncelle
      await tx.irrigationLog.update({
        where: { id: irrigationId },
        data: { status: "COMPLETED" },
      });

      // Bildirimleri Oluştur (Mevcut POST'tan taşındı)
      const createdByUser = await tx.user.findUnique({ where: { id: session.id } });
      const well = irrigationLog.wellId ? await tx.well.findUnique({ where: { id: irrigationLog.wellId } }) : null;

      // Tarla isimlerini topla
      const ownerFieldNames: Record<string, string[]> = {};
      const fieldUsageRecords = await tx.irrigationFieldUsage.findMany({
        where: { irrigationLogId: irrigationId },
        include: {
          field: {
            select: {
              id: true,
              name: true,
              owners: {
                select: {
                  userId: true
                }
              }
            }
          }
        }
      });

      for (const usage of fieldUsageRecords) {
        if (usage.field && usage.field.owners) {
          for (const owner of usage.field.owners) {
            if (!ownerFieldNames[owner.userId]) {
              ownerFieldNames[owner.userId] = [];
            }
            if (!ownerFieldNames[owner.userId].includes(usage.field.name)) {
              ownerFieldNames[owner.userId].push(usage.field.name);
            }
          }
        }
      }

      const uniqueOwnerIds = [...new Set(ownerDurations.map((os: OwnerDurationInput) => os.userId))];
      for (const ownerId of uniqueOwnerIds) {
        if (ownerId !== session.id) {
          const fieldNames = ownerFieldNames[ownerId] || [];
          const fieldNamesText = fieldNames.length > 0
            ? fieldNames.map(name => `<span class="neon-text-green">${name}</span>`).join(', ')
            : "tarlanız/tarlalarınız";

          const ownerFieldIds = fieldUsageRecords
            .filter(usage => usage.field?.owners?.some(owner => owner.userId === ownerId))
            .map(usage => usage.field?.id)
            .filter(Boolean);

          const primaryFieldId = ownerFieldIds.length > 0 ? ownerFieldIds[0] : null;

          await tx.notification.create({
            data: {
              title: "Tarlanızda Sulama Yapıldı",
              message: `${well?.name || (irrigationLog.wellId ? `Kuyu (ID: ${irrigationLog.wellId})` : 'Bilinmeyen Kuyu')}'dan ${fieldNamesText} için ${irrigationLog.duration} dakika sulama yapıldı.`,
              type: "IRRIGATION_COMPLETED",
              receiverId: ownerId as string,
              senderId: session.id as string,
              irrigationId: irrigationLog.id,
              fieldId: primaryFieldId,
              link: `/dashboard/owner/irrigation/${irrigationLog.id}`,
              priority: "NORMAL",
            },
          });
        }
      }

      const admins = await tx.user.findMany({ where: { role: "ADMIN" } });

      const allFieldNames = fieldUsageRecords
        .map(usage => usage.field?.name)
        .filter(Boolean) as string[];

      const allFieldNamesText = allFieldNames.length > 0
        ? allFieldNames.map(name => `<span class="neon-text-green">${name}</span>`).join(', ')
        : "bilinmeyen tarlalar";

      for (const admin of admins) {
        if (admin.id !== session.id) {
          const primaryFieldId = fieldUsageRecords.length > 0 && fieldUsageRecords[0].field ?
            fieldUsageRecords[0].field.id : null;

          await tx.notification.create({
            data: {
              title: "Yeni Sulama Kaydı Oluşturuldu",
              message: `${well?.name || 'Bilinmeyen Kuyu'}'dan ${allFieldNamesText} için ${irrigationLog.duration} dakika süren yeni bir sulama kaydı (${createdByUser?.name || 'bir kullanıcı'} tarafından) oluşturuldu.`,
              type: "IRRIGATION_COMPLETED",
              receiverId: admin.id as string,
              senderId: session.id as string,
              irrigationId: irrigationLog.id,
              fieldId: primaryFieldId,
              link: `/dashboard/admin/irrigation/${irrigationLog.id}`,
              priority: "NORMAL",
            },
          });
        }
      }

      // Maliyet tahsislerini işle (costAllocations) - eğer veritabanına kaydedilecekse burada yapılabilir
      // Şimdilik sadece bildirimleri işliyoruz.

      return { id: irrigationId, status: "COMPLETED" };
    },
    {
      timeout: 20000,
    });

    return NextResponse.json({ data: result });
  } catch (caughtError: unknown) {
    console.error("Sulama kaydı sonlandırma hatası:", caughtError);
    const finalErrorMessage: string = getErrorMessage(caughtError);
    return NextResponse.json({ error: finalErrorMessage }, { status: 400 });
  } finally {
    await prisma.$disconnect();
  }
}
