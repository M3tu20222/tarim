import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json(
        { error: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }

    if (user.role !== "ADMIN" && user.role !== "OWNER" && user.id !== user.id) {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const { workerId, wellId } = await request.json();

    if (!workerId) {
      return NextResponse.json(
        { error: "İşçi ID'si gereklidir" },
        { status: 400 }
      );
    }

    // Check if worker exists and has WORKER role
    const worker = await prisma.user.findUnique({
      where: { id: workerId },
    });

    if (!worker) {
      return NextResponse.json({ error: "İşçi bulunamadı" }, { status: 404 });
    }

    if (worker.role !== "WORKER") {
      return NextResponse.json(
        { error: "Kullanıcı bir işçi değil" },
        { status: 400 }
      );
    }

    // Check if well exists if wellId is provided
    if (wellId) {
      const well = await prisma.well.findUnique({
        where: { id: wellId },
      });

      if (!well) {
        return NextResponse.json({ error: "Kuyu bulunamadı" }, { status: 404 });
      }
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.workerWellAssignment.findFirst({
      where: { workerId },
    });

    if (existingAssignment) {
      if (!wellId) {
        // Remove assignment if wellId is null
        await prisma.workerWellAssignment.delete({
          where: { id: existingAssignment.id },
        });

        return NextResponse.json({ message: "Kuyu ataması kaldırıldı" });
      } else {
        // Update existing assignment
        await prisma.workerWellAssignment.update({
          where: { id: existingAssignment.id },
          data: { wellId },
        });

        return NextResponse.json({ message: "Kuyu ataması güncellendi" });
      }
    } else if (wellId) {
      // Create new assignment
      await prisma.workerWellAssignment.create({
        data: {
          workerId,
          wellId,
        },
      });

      return NextResponse.json({ message: "Kuyu ataması oluşturuldu" });
    }

    return NextResponse.json({ message: "Herhangi bir değişiklik yapılmadı" });
  } catch (error) {
    console.error("Error in well assignment:", error);
    return NextResponse.json(
      { error: "Kuyu ataması yapılırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
