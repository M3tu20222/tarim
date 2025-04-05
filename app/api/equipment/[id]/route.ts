import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { EquipmentType, EquipmentStatus } from "@prisma/client";

// Belirli bir ekipmanı getir
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const equipmentId = params.id;

    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        ownerships: {
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
        capabilities: true,
        usages: {
          include: {
            process: {
              include: {
                field: true,
                worker: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { error: "Ekipman bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return NextResponse.json(
      { error: "Ekipman getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Ekipmanı güncelle
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const equipmentId = params.id;

    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const {
      name,
      type,
      fuelConsumptionPerDecare,
      description,
      status,
      capabilities,
    } = await request.json();

    if (!name || !type || fuelConsumptionPerDecare === undefined) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik" },
        { status: 400 }
      );
    }

    const existingEquipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: { capabilities: true },
    });

    if (!existingEquipment) {
      return NextResponse.json(
        { error: "Ekipman bulunamadı" },
        { status: 404 }
      );
    }

    const equipment = await prisma.equipment.update({
      where: { id: equipmentId },
      data: {
        name,
        type: type as EquipmentType,
        fuelConsumptionPerDecare: Number(fuelConsumptionPerDecare),
        description,
        status: status as EquipmentStatus,
      },
    });

    if (capabilities) {
      await prisma.equipmentCapability.deleteMany({
        where: { equipmentId },
      });

      await prisma.equipmentCapability.createMany({
        data: capabilities.map((cat: string) => ({
          equipmentId,
          inventoryCategory: cat,
          canUse: true,
        })),
      });
    }

    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Error updating equipment:", error);
    return NextResponse.json(
      { error: "Ekipman güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Ekipmanı sil
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const equipmentId = params.id;

    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const usageCount = await prisma.equipmentUsage.count({
      where: { equipmentId },
    });

    if (usageCount > 0) {
      return NextResponse.json(
        {
          error:
            "Bu ekipman kullanımda olduğu için silinemez. Önce ilgili işlemleri silmelisiniz.",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.equipmentCapability.deleteMany({
        where: { equipmentId },
      }),
      prisma.equipmentOwnership.deleteMany({
        where: { equipmentId },
      }),
      prisma.equipment.delete({
        where: { id: equipmentId },
      }),
    ]);

    return NextResponse.json({ message: "Ekipman başarıyla silindi" });
  } catch (error) {
    console.error("Error deleting equipment:", error);
    return NextResponse.json(
      { error: "Ekipman silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
