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
    const { name, location, size, coordinates, status, workerIds } =
      await req.json();

    const existingField = await prisma.field.findUnique({
      where: { id },
      include: {
        workerAssignments: true,
      },
    });

    if (!existingField) {
      return NextResponse.json({ error: "Tarla bulunamadı" }, { status: 404 });
    }

    const updateData: FieldUpdateInput = {};
    if (name) updateData.name = name;
    if (location) updateData.location = location;
    if (size) updateData.size = size;
    if (coordinates) updateData.coordinates = coordinates;
    if (status) updateData.status = status;

    if (Array.isArray(workerIds)) {
      await prisma.fieldWorkerAssignment.deleteMany({
        where: {
          fieldId: id,
          userId: {
            in: existingField.workerAssignments.map(
              (assignment: FieldAssignmentType) => assignment.userId
            ),
          },
        },
      });

      await prisma.fieldWorkerAssignment.createMany({
        data: workerIds.map((userId: string) => ({
          fieldId: id,
          userId,
        })),
      });
    }

    const updatedField = await prisma.field.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(updatedField);
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
