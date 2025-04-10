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
        wells: true,
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
    // wellId'yi de request body'den al
    const { name, location, size, coordinates, status, workerIds, wellId } =
      await req.json();

    // Mevcut tarlayı kuyularıyla birlikte getir
    const existingField = await prisma.field.findUnique({
      where: { id },
      include: {
        workerAssignments: true,
        wells: true, // Mevcut kuyuları getir
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

    // Mevcut kuyu ID'sini belirle (varsa)
    const currentWellId = existingField.wells?.[0]?.id;
    const newWellId = wellId === "no-well" ? null : wellId; // "no-well" ise null yap

    // Atomik işlem için transaction başlat
    const transactionOperations = [];

    // 1. Temel tarla bilgilerini güncelle
    transactionOperations.push(
      prisma.field.update({
        where: { id },
        data: updateData,
      })
    );

    // 2. Kuyu bağlantısını güncelle (eğer değiştiyse)
    if (currentWellId !== newWellId) {
      // Eski kuyunun bağlantısını kes (varsa)
      if (currentWellId) {
        transactionOperations.push(
          prisma.well.update({
            where: { id: currentWellId },
            data: { fieldId: null },
          })
        );
      }
      // Yeni kuyuyu bağla (varsa ve null değilse)
      if (newWellId) {
        transactionOperations.push(
          prisma.well.update({
            where: { id: newWellId },
            data: { fieldId: id }, // Tarlanın ID'si ile bağla
          })
        );
      }
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
    const existingField = await prisma.field.findUnique({
      where: { id },
    });

    if (!existingField) {
      return NextResponse.json({ error: "Tarla bulunamadı" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.irrigationLog.deleteMany({
        where: { fieldId: id },
      }),
      prisma.processingLog.deleteMany({
        where: { fieldId: id },
      }),
      prisma.crop.deleteMany({
        where: { fieldId: id },
      }),
      prisma.well.deleteMany({
        where: { fieldId: id },
      }),
      prisma.fieldWorkerAssignment.deleteMany({
        where: { fieldId: id },
      }),
      prisma.field.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ message: "Tarla başarıyla silindi" });
  } catch (error) {
    console.error("Error deleting field:", error);
    return NextResponse.json(
      { error: "Tarla silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
