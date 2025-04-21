import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { FieldUpdateInput } from "@/types/prisma-types";

// Güncellenmiş tip
type FieldAssignmentType = {
  id: string;
  userId: string;
  fieldId: string;
  createdAt: Date;
  updatedAt: Date;
};

// Belirli bir tarlayı getir
export async function GET(req: NextRequest) {
  const id = req.nextUrl.pathname.split("/").pop() || "";

  try {
    const field = await prisma.field.findUnique({
      where: { id },
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
        workerAssignments: {
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
        crops: true,
        // wells: true, // Hatalı include kaldırıldı
        fieldWells: { // Doğru include eklendi
          include: {
            well: true,
          },
        },
        irrigationLogs: {
          orderBy: {
            date: "desc",
          },
        },
        processingLogs: {
          orderBy: {
            date: "desc",
          },
        },
      },
    });

    if (!field) {
      return NextResponse.json({ error: "Tarla bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(field);
  } catch (error) {
    console.error("Error fetching field:", error);
    return NextResponse.json(
      { error: "Tarla getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Tarlayı güncelle
export async function PUT(req: NextRequest) {
  const id = req.nextUrl.pathname.split("/").pop() || "";

  try {
    // wellIds dizisini request body'den al
    const { name, location, size, coordinates, status, workerIds, wellIds } =
      await req.json(); // wellId -> wellIds

    // Mevcut tarlayı fieldWells ile birlikte getir
    const existingField = await prisma.field.findUnique({
      where: { id },
      include: {
        workerAssignments: true,
        // wells: true, // Hatalı include kaldırıldı
        fieldWells: { // Doğru include eklendi
          select: { // Sadece wellId'leri almak yeterli
            wellId: true,
          },
        },
      },
    });

    if (!existingField) {
      return NextResponse.json({ error: "Tarla bulunamadı" }, { status: 404 });
    }

    // Temel tarla güncelleme verileri
    const updateData: FieldUpdateInput = {};
    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (size !== undefined) updateData.size = size;
    if (coordinates !== undefined) updateData.coordinates = coordinates;
    if (status !== undefined) updateData.status = status;

    // Mevcut kuyu ID'lerini al
    const currentWellIds = existingField.fieldWells.map(fw => fw.wellId);
    // Gelen yeni kuyu ID'leri (boş veya null değilse)
    const newWellIds = Array.isArray(wellIds) ? wellIds.filter(id => id) : []; // Gelen ID'leri filtrele

    // Atomik işlem için transaction başlat
    const transactionOperations = [];

    // 1. Temel tarla bilgilerini güncelle
    transactionOperations.push(
      prisma.field.update({
        where: { id },
        data: updateData,
      })
    );

    // 2. Kuyu bağlantılarını (FieldWell) güncelle
    // Önce mevcut tüm FieldWell kayıtlarını sil (bu tarla için)
    transactionOperations.push(
      prisma.fieldWell.deleteMany({
        where: { fieldId: id },
      })
    );
    // Sonra yeni kuyu ID'leri için FieldWell kayıtları oluştur (eğer varsa)
    if (newWellIds.length > 0) {
      transactionOperations.push(
        prisma.fieldWell.createMany({
          data: newWellIds.map((wellId: string) => ({
            fieldId: id,
            wellId: wellId,
          })),
        })
      );
    }


    // 3. İşçi atamalarını güncelle (varsa)
    if (Array.isArray(workerIds)) {
       // Önce mevcut atamaları sil (sadece bu tarla için)
       transactionOperations.push(
         prisma.fieldWorkerAssignment.deleteMany({
           where: { fieldId: id },
         })
       );
       // Sonra yeni atamaları ekle (eğer workerIds boş değilse)
       if (workerIds.length > 0) {
         transactionOperations.push(
           prisma.fieldWorkerAssignment.createMany({
             data: workerIds.map((userId: string) => ({
               fieldId: id,
               userId,
             })),
           })
         );
       }
    }

    // Transaction'ı çalıştır
    const results = await prisma.$transaction(transactionOperations);
    const updatedFieldResult = results[0]; // İlk işlem field update sonucudur

    // Güncellenmiş tarlayı ilişkileriyle birlikte getirip döndür
    const finalUpdatedField = await prisma.field.findUnique({
      where: { id },
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
        workerAssignments: {
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
        // wells: true, // Hatalı include kaldırıldı
        fieldWells: { // Doğru include eklendi
          include: {
            well: true, // İlişkili kuyu bilgilerini de getir
          },
        },
      },
    });

    // finalUpdatedField değişkenini döndür
    return NextResponse.json(finalUpdatedField);
  } catch (error) {
    console.error("Error updating field:", error);
    return NextResponse.json(
      { error: "Tarla güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Tarlayı sil
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.pathname.split("/").pop() || "";

  try {
    // Interaktif transaction başlat
    await prisma.$transaction(async (tx) => {
      // Önce tarlanın varlığını kontrol et (transaction içinde)
      const existingField = await tx.field.findUnique({
        where: { id },
        select: { id: true }, // Sadece ID'yi seçmek yeterli
      });

      if (!existingField) {
        // Hata fırlatarak transaction'ı geri al
        throw new Error("Tarla bulunamadı");
      }

      // İlişkili kayıtları sırayla sil
      await tx.irrigationLog.deleteMany({ where: { fieldId: id } });
      await tx.processingLog.deleteMany({ where: { fieldId: id } });
      await tx.crop.deleteMany({ where: { fieldId: id } });
      await tx.fieldWell.deleteMany({ where: { fieldId: id } });
      await tx.processCost.deleteMany({ where: { fieldId: id } });
      await tx.fieldExpense.deleteMany({ where: { fieldId: id } });
      await tx.process.deleteMany({ where: { fieldId: id } });
      await tx.fieldOwnerExpense.deleteMany({ where: { fieldOwnership: { fieldId: id } } });
      await tx.fieldOwnership.deleteMany({ where: { fieldId: id } });
      await tx.fieldWorkerAssignment.deleteMany({ where: { fieldId: id } });
      await tx.inventoryUsage.deleteMany({ where: { fieldId: id } });

      // En son tarlayı sil
      await tx.field.delete({ where: { id } });

    }, {
      maxWait: 30000, // 30 saniye
      timeout: 60000, // 60 saniye
    }); // Transaction seçenekleri buraya taşındı

    return NextResponse.json({ message: "Tarla başarıyla silindi" });

  } catch (error: any) { // Hata tipini any olarak belirle veya daha spesifik bir tip kullan
    console.error("Error deleting field:", error);
    // Transaction içinde fırlatılan özel hatayı kontrol et
    if (error.message === "Tarla bulunamadı") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    // Diğer hatalar için genel hata mesajı
    return NextResponse.json(
      { error: "Tarla silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
