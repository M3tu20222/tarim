import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Oturum açmanız gerekiyor" },
        { status: 401 }
      );
    }

    if (session.role !== "WORKER") {
      return NextResponse.json(
        { success: false, error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { processedPercentage, description, userId } = body;

    // Kullanıcının kendi ID'si ile eşleşiyor mu kontrol et
    if (userId !== session.id) {
      return NextResponse.json(
        { success: false, error: "Sadece kendi işlemlerinizi güncelleyebilirsiniz" },
        { status: 403 }
      );
    }

    // İşlemi bul
    const process = await prisma.process.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!process) {
      return NextResponse.json(
        { success: false, error: "İşlem bulunamadı" },
        { status: 404 }
      );
    }

    // İşlem bu kullanıcıya mı ait kontrol et
    if (process.workerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Bu işlemi güncelleme yetkiniz yok" },
        { status: 403 }
      );
    }

    // Bugünün tarihini al
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Process tarihini al
    const processDate = new Date(process.date);
    processDate.setHours(0, 0, 0, 0);
    
    // İleri tarihli mi kontrol et
    const isUpcoming = processDate > today;

    // İleri tarihli işlemler güncellenemez
    if (isUpcoming) {
      return NextResponse.json(
        { success: false, error: "İleri tarihli işlemler güncellenemez" },
        { status: 400 }
      );
    }

    // İşlemi güncelle
    const updatedProcess = await prisma.process.update({
      where: {
        id: params.id,
      },
      data: {
        processedPercentage,
        description,
        updatedAt: new Date(),
      },
    });

    // İşlem tamamlandıysa bildirim oluştur
    if (processedPercentage === 100 && process.processedPercentage !== 100) {
      // Tarla sahibini bul (eğer tarla varsa)
      if (process.fieldId) {
        const field = await prisma.field.findUnique({
          where: {
            id: process.fieldId,
          },
          include: {
            owners: {
              include: {
                user: true,
              },
            },
          },
        });

        // Tarla sahiplerine bildirim gönder
        if (field && field.owners.length > 0) {
          for (const owner of field.owners) {
            await prisma.notification.create({
              data: {
                title: "İşlem Tamamlandı",
                message: `${session.name} tarafından ${field.name} tarlasında ${getProcessTypeText(process.type)} işlemi tamamlandı.`,
                type: "PROCESS_COMPLETED",
                priority: "NORMAL",
                receiverId: owner.userId,
                senderId: session.id,
                processId: process.id,
                fieldId: process.fieldId,
              },
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      process: updatedProcess,
    });
  } catch (error) {
    console.error("İşlem güncellenirken hata oluştu:", error);
    return NextResponse.json(
      { success: false, error: "İşlem güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// İşlem tipini Türkçe'ye çevir
function getProcessTypeText(type: string) {
  const types: Record<string, string> = {
    PLOWING: "Sürme",
    SEEDING: "Ekim",
    FERTILIZING: "Gübreleme",
    PESTICIDE: "İlaçlama",
    HARVESTING: "Hasat",
    OTHER: "Diğer"
  };
  return types[type] || type;
}
