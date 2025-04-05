import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ProcessType } from "@prisma/client";

// Belirli bir işlemi getir
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    const process = await prisma.process.findUnique({
      where: { id: params.id },
      include: {
        field: {
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
          },
        },
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        season: true,
        equipmentUsages: {
          include: {
            equipment: true,
          },
        },
        inventoryUsages: {
          include: {
            inventory: true,
          },
        },
        processCosts: {
          include: {
            fieldExpenses: true,
            ownerExpenses: {
              include: {
                fieldOwnership: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!process) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    // Yetki kontrolü
    if (userRole === "WORKER" && process.workerId !== userId) {
      return NextResponse.json(
        { error: "Bu işlemi görüntüleme yetkiniz yok" },
        { status: 403 }
      );
    }

    if (
      userRole === "OWNER" &&
      process.workerId !== userId &&
      !process.field.owners.some((owner) => owner.userId === userId)
    ) {
      return NextResponse.json(
        { error: "Bu işlemi görüntüleme yetkiniz yok" },
        { status: 403 }
      );
    }

    return NextResponse.json(process);
  } catch (error) {
    console.error("Error fetching process:", error);
    return NextResponse.json(
      { error: "İşlem getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// İşlemi güncelle
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // Sadece admin, sahip ve işlemi yapan işçi güncelleyebilir
    const process = await prisma.process.findUnique({
      where: { id: params.id },
    });

    if (!process) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    if (userRole === "WORKER" && process.workerId !== userId) {
      return NextResponse.json(
        { error: "Bu işlemi güncelleme yetkiniz yok" },
        { status: 403 }
      );
    }

    const { type, date, description } = await request.json();

    // Veri doğrulama
    if (!type || !date) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik" },
        { status: 400 }
      );
    }

    // İşlemi güncelle
    const updatedProcess = await prisma.process.update({
      where: { id: params.id },
      data: {
        type: type as ProcessType,
        date: new Date(date),
        description,
      },
    });

    return NextResponse.json(updatedProcess);
  } catch (error) {
    console.error("Error updating process:", error);
    return NextResponse.json(
      { error: "İşlem güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// İşlemi sil
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // Sadece admin ve sahip kullanıcılar işlem silebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    // İşlemi kontrol et
    const process = await prisma.process.findUnique({
      where: { id: params.id },
      include: {
        processCosts: true,
      },
    });

    if (!process) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    // Transaction ile ilişkili kayıtları sil
    await prisma.$transaction(async (tx) => {
      // 1. Tarla sahibi giderlerini sil
      if (process.processCosts.length > 0) {
        for (const cost of process.processCosts) {
          await tx.fieldOwnerExpense.deleteMany({
            where: { processCostId: cost.id },
          });
        }
      }

      // 2. Tarla giderlerini sil
      if (process.processCosts.length > 0) {
        for (const cost of process.processCosts) {
          await tx.fieldExpense.deleteMany({
            where: { processCostId: cost.id },
          });
        }
      }

      // 3. İşlem maliyetlerini sil
      await tx.processCost.deleteMany({
        where: { processId: params.id },
      });

      // 4. Ekipman kullanımlarını sil
      await tx.equipmentUsage.deleteMany({
        where: { processId: params.id },
      });

      // 5. Envanter kullanımlarını sil
      await tx.inventoryUsage.deleteMany({
        where: { processId: params.id },
      });

      // 6. Bildirimleri sil
      await tx.notification.deleteMany({
        where: { processId: params.id },
      });

      // 7. İşlemi sil
      await tx.process.delete({
        where: { id: params.id },
      });
    });

    return NextResponse.json({ message: "İşlem başarıyla silindi" });
  } catch (error) {
    console.error("Error deleting process:", error);
    return NextResponse.json(
      { error: "İşlem silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
