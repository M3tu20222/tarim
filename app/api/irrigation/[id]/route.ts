import { type NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSideSession } from "@/lib/session"; // Updated import

const prisma = new PrismaClient();

// Belirli bir sulama kaydını getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSideSession(); // Use custom session function
    if (!session || !session.id) { // Check for session.id instead of session.user
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;

    const irrigationLog = await prisma.irrigationLog.findUnique({
      where: { id },
      include: {
        well: true,
        season: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        fieldUsages: {
          include: {
            field: true,
            ownerUsages: {
              include: {
                owner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        inventoryUsages: {
          include: {
            inventory: true,
            ownerUsages: {
              include: {
                owner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!irrigationLog) {
      return NextResponse.json(
        { error: "Irrigation log not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: irrigationLog });
  } catch (error) {
    console.error("Error fetching irrigation log:", error);
    return NextResponse.json(
      { error: "Failed to fetch irrigation log" },
      { status: 500 }
    );
  }
}

// Sulama kaydını güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSideSession(); // Use custom session function
    if (!session || !session.id) { // Check for session.id instead of session.user
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;
    const data = await request.json();
    const { startDateTime, duration, wellId, notes, status, seasonId } = data;

    // Veri doğrulama
    if (!startDateTime || !duration || !wellId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Sulama kaydını güncelle
    const updatedIrrigationLog = await prisma.irrigationLog.update({
      where: { id },
      data: {
        startDateTime: new Date(startDateTime),
        duration,
        wellId,
        notes,
        status,
        seasonId,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ data: updatedIrrigationLog });
  } catch (error) {
    console.error("Error updating irrigation log:", error);
    return NextResponse.json(
      { error: "Failed to update irrigation log" },
      { status: 500 }
    );
  }
}

// Sulama kaydını sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSideSession(); // Use custom session function
    if (!session || !session.id) { // Check for session.id instead of session.user
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;

    // Transaction ile tüm ilişkili kayıtları sil
    await prisma.$transaction(async (tx) => {
      // 1. Envanter sahip kullanımlarını sil
      const inventoryUsages = await tx.irrigationInventoryUsage.findMany({
        where: { irrigationLogId: id },
      });

      for (const usage of inventoryUsages) {
        await tx.irrigationInventoryOwnerUsage.deleteMany({
          where: { irrigationInventoryUsageId: usage.id },
        });
      }

      // 2. Envanter kullanımlarını sil
      await tx.irrigationInventoryUsage.deleteMany({
        where: { irrigationLogId: id },
      });

      // 3. Tarla sahip kullanımlarını sil
      const fieldUsages = await tx.irrigationFieldUsage.findMany({
        where: { irrigationLogId: id },
      });

      for (const usage of fieldUsages) {
        await tx.irrigationOwnerUsage.deleteMany({
          where: { irrigationFieldUsageId: usage.id },
        });
      }

      // 4. Tarla kullanımlarını sil
      await tx.irrigationFieldUsage.deleteMany({
        where: { irrigationLogId: id },
      });

      // 5. Kuyu fatura kullanımlarını sil
      await tx.wellBillingIrrigationUsage.deleteMany({
        where: { irrigationLogId: id },
      });

      // 6. Sulama kaydını sil
      await tx.irrigationLog.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting irrigation log:", error);
    return NextResponse.json(
      { error: "Failed to delete irrigation log" },
      { status: 500 }
    );
  }
}
