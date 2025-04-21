import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ProcessType, Role } from "@prisma/client"; // UserRole yerine Role import edildi
import { getServerSideSession } from "@/lib/session"; // getServerSideSession import edildi

// Belirli bir işlemi getir
export async function GET(
  request: Request,
  context: { params: { id: string } } // context objesi olarak al
) {
  try {
    const { id } = await context.params; // id'yi destruct et
    // Middleware yerine doğrudan session'dan kullanıcı bilgilerini al
    const session = await getServerSideSession();

    if (!session || !session.id || !session.role) {
      console.log("API isteği oturum bulunamadı:", request.url);
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli (API)" },
        { status: 401 }
      );
    }
    const userId = session.id;
    const userRole = session.role as Role; // Rolü Role olarak cast et

    console.log(`API isteği (/api/processes/[id]): Kullanıcı ID: ${userId}, Rol: ${userRole}`);

    const process = await prisma.process.findUnique({
      where: { id: id }, // Destruct edilen id'yi kullan
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
      // process.field null ise veya sahip değilse yetki yok
      !(process.field && process.field.owners.some((owner) => owner.userId === userId))
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
  context: { params: { id: string } } // context objesi olarak al
) {
  try {
    const { id } = context.params; // id'yi destruct et
    // Middleware yerine doğrudan session'dan kullanıcı bilgilerini al
    const session = await getServerSideSession();

    if (!session || !session.id || !session.role) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }
    const userId = session.id;
    const userRole = session.role as Role;

    // Sadece admin, sahip ve işlemi yapan işçi güncelleyebilir
    const process = await prisma.process.findUnique({
      where: { id: id }, // Destruct edilen id'yi kullan
      include: {
        field: {
          include: {
            owners: true,
          },
        },
      },
    });

    if (!process) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    // Yetki kontrolü: Admin, işlemi yapan işçi veya tarlanın sahibi
    const isOwner = process.field?.owners.some(owner => owner.userId === userId);
    if (userRole !== 'ADMIN' && process.workerId !== userId && !(userRole === 'OWNER' && isOwner)) {
       return NextResponse.json(
        { error: "Bu işlemi güncelleme yetkiniz yok" },
        { status: 403 }
      );
    }


    const { type, date, description, fieldId, workerId, seasonId, processedArea, processedPercentage, equipmentUsages, inventoryUsages } = await request.json();

    // Veri doğrulama (Temel)
    if (!type || !date || !fieldId || !workerId || !seasonId || processedArea == null || processedPercentage == null) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik" },
        { status: 400 }
      );
    }

    // TODO: Daha detaylı veri doğrulama eklenebilir (örn. tarih formatı, sayısal değerler)
    // TODO: equipmentUsages ve inventoryUsages yapılarının doğrulanması

    // İşlemi güncelle
    const updatedProcess = await prisma.process.update({
      where: { id: id }, // Destruct edilen id'yi kullan
      data: {
        type: type as ProcessType,
        date: new Date(date),
        description,
        fieldId,
        workerId,
        seasonId,
        processedArea,
        processedPercentage,
        // TODO: equipmentUsages ve inventoryUsages güncelleme mantığı eklenecek
      },
    });

    // TODO: İlişkili equipmentUsages ve inventoryUsages kayıtlarını güncelle/sil/ekle

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
  context: { params: { id: string } } // context objesi olarak al
) {
  try {
    const { id } = context.params; // id'yi destruct et
    // Middleware yerine doğrudan session'dan kullanıcı bilgilerini al
    const session = await getServerSideSession();

    if (!session || !session.id || !session.role) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }
    const userId = session.id;
    const userRole = session.role as Role;


    // İşlemi kontrol et ve sahibini al
    const process = await prisma.process.findUnique({
      where: { id: id }, // Destruct edilen id'yi kullan
      include: {
        processCosts: true,
        field: {
          include: {
            owners: true,
          },
        },
      },
    });

    if (!process) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    // Yetki kontrolü: Admin veya tarlanın sahibi
    const isOwner = process.field?.owners.some(owner => owner.userId === userId);
    if (userRole !== 'ADMIN' && !(userRole === 'OWNER' && isOwner)) {
       return NextResponse.json(
        { error: "Bu işlemi silme yetkiniz yok" },
        { status: 403 }
      );
    }


    // Transaction ile ilişkili kayıtları sil
    await prisma.$transaction(async (tx) => {
      // 1. Tarla sahibi giderlerini sil
      if (process.processCosts.length > 0) {
        const costIds = process.processCosts.map(cost => cost.id);
        await tx.fieldOwnerExpense.deleteMany({
          where: { processCostId: { in: costIds } },
        });
        // 2. Tarla giderlerini sil
        await tx.fieldExpense.deleteMany({
          where: { processCostId: { in: costIds } },
        });
        // 3. İşlem maliyetlerini sil
        await tx.processCost.deleteMany({
          where: { processId: id }, // Destruct edilen id'yi kullan
        });
      }


      // 4. Ekipman kullanımlarını sil
      await tx.equipmentUsage.deleteMany({
        where: { processId: id }, // Destruct edilen id'yi kullan
      });

      // 5. Envanter kullanımlarını sil
      await tx.inventoryUsage.deleteMany({
        where: { processId: id }, // Destruct edilen id'yi kullan
      });

      // 6. Bildirimleri sil
      await tx.notification.deleteMany({
        where: { processId: id }, // Destruct edilen id'yi kullan
      });

      // 7. İşlemi sil
      await tx.process.delete({
        where: { id: id }, // Destruct edilen id'yi kullan
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
