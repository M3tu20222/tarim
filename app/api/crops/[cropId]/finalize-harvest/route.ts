import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { finalizeCropPeriod } from '@/lib/crop-period/lifecycle-transitions';

/**
 * POST /api/crops/:cropId/finalize-harvest
 *
 * Hasat tamamlandığında çağrılır:
 * 1. CropPeriod'u CLOSED durumuna geçir
 * 2. CropPeriod.endDate'i ayarla
 * 3. Yeni PREPARATION dönem oluştur
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cropId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Giriş yapmanız gerekiyor' },
        { status: 401 }
      );
    }

    const { cropId } = await params;

    if (!cropId) {
      return NextResponse.json(
        { error: 'Crop ID eksik' },
        { status: 400 }
      );
    }

    // Crop'u getir
    const crop = await prisma.crop.findUnique({
      where: { id: cropId },
      include: {
        field: {
          select: { id: true, name: true }
        },
        harvest: {
          select: { id: true, harvestDate: true },
          orderBy: { harvestDate: 'desc' },
          take: 1
        }
      }
    });

    if (!crop) {
      return NextResponse.json(
        { error: 'Ekin bulunamadı' },
        { status: 404 }
      );
    }

    if (crop.status !== 'HARVESTED') {
      return NextResponse.json(
        { error: 'Ekin hasat durumunda değil. Finalize yapılamaz.' },
        { status: 400 }
      );
    }

    // İlişkili CropPeriod'u bul
    const cropPeriod = await prisma.cropPeriod.findFirst({
      where: {
        cropId: cropId,
        status: 'HARVESTING'
      },
      orderBy: { startDate: 'desc' }
    });

    if (!cropPeriod) {
      return NextResponse.json(
        { error: 'HARVESTING durumundaki CropPeriod bulunamadı' },
        { status: 404 }
      );
    }

    // Transaction içinde finalize işlemini yap
    const result = await prisma.$transaction(async (tx) => {
      // CropPeriod'u finalize et (CLOSED + yeni PREPARATION oluştur)
      const finalizeResult = await finalizeCropPeriod(cropPeriod.id, tx);

      if (!finalizeResult.success) {
        throw new Error(finalizeResult.message);
      }

      return {
        success: true,
        closedPeriodId: finalizeResult.closedPeriod?.id,
        newPreparationPeriodId: finalizeResult.newPeriod?.id,
        message: 'Dönem başarıyla kapatıldı ve yeni PREPARATION dönem oluşturuldu'
      };
    });

    return NextResponse.json({
      message: result.message,
      data: {
        cropId,
        fieldId: crop.field.id,
        closedPeriodId: result.closedPeriodId,
        newPreparationPeriodId: result.newPreparationPeriodId
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error finalizing crop period:', error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Hasat finalize işlemi sırasında bir hata oluştu'
      },
      { status: 500 }
    );
  }
}
