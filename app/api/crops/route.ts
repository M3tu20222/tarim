import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { updateCropPeriodToSeeding } from '@/lib/crop-period/lifecycle-transitions';
import type { CropType, CropStatus } from '@prisma/client';

// GET - Ekin kayıtlarını listele
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Giriş yapmanız gerekiyor' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fieldId = searchParams.get('fieldId');
    const seasonId = searchParams.get('seasonId');
    const status = searchParams.get('status');
    const fetchAll = searchParams.get('fetchAll') === 'true';

    // Basit koşul - eğer fieldId belirtilmişse onu kullan, yoksa boş sonuç dön
    let whereCondition: any = {};

    if (fieldId) {
      whereCondition.fieldId = fieldId;
    } else if (!fetchAll) {
      // Eğer fetchAll değilse ve fieldId yoksa, kullanıcının erişebildiği tarlaları bul
      let accessibleFields: string[] = [];

      if (user.role === 'ADMIN') {
        // Admin tüm tarlalara erişebilir
        const fields = await prisma.field.findMany({
          select: { id: true }
        });
        accessibleFields = fields.map(f => f.id);
      } else {
        // Owner sadece sahip olduğu tarlalara erişebilir
        const ownerships = await prisma.fieldOwnership.findMany({
          where: { userId: user.id },
          select: { fieldId: true }
        });
        accessibleFields = ownerships.map(o => o.fieldId);
      }

      if (accessibleFields.length === 0) {
        // Erişilebilir tarla yoksa boş sonuç dön
        return NextResponse.json({
          data: [],
          count: 0
        });
      }

      whereCondition.fieldId = { in: accessibleFields };
    }

    if (seasonId) {
      whereCondition.seasonId = seasonId;
    }
    if (status) {
      whereCondition.status = status;
    }

    // Ekin kayıtlarını getir
    const crops = await prisma.crop.findMany({
      where: whereCondition,
      include: {
        field: {
          select: {
            id: true,
            name: true,
            location: true,
            size: true
          }
        },
        season: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      },
      orderBy: { plantedDate: 'desc' }
    });

    return NextResponse.json({
      data: crops || [],
      count: crops?.length || 0
    });

  } catch (error) {
    console.error('Error fetching crops:', error);
    return NextResponse.json({
      data: [],
      count: 0,
      error: 'Ekin kayıtları getirilirken bir hata oluştu'
    }, { status: 200 }); // 200 ile döndür ki frontend çalışsın
  }
}

// POST - Yeni ekin kaydı oluştur ve CropPeriod lifecycle'ını tetikle
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Giriş yapmanız gerekiyor' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      fieldId,
      name,
      cropType,
      plantedDate,
      seasonId,
      notes
    } = body;

    // Gerekli alanları kontrol et
    if (!fieldId || !name || !cropType || !plantedDate) {
      return NextResponse.json(
        { error: 'Gerekli alanlar eksik: fieldId, name, cropType, plantedDate' },
        { status: 400 }
      );
    }

    // Tarla bilgilerini kontrol et
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      select: { id: true, name: true }
    });

    if (!field) {
      return NextResponse.json(
        { error: 'Tarla bulunamadı' },
        { status: 404 }
      );
    }

    // Eğer seasonId belirtilmemişse, aktif sezonu bul
    let activeSeason;
    if (!seasonId) {
      activeSeason = await prisma.season.findFirst({
        where: { isActive: true }
      });

      if (!activeSeason) {
        return NextResponse.json(
          { error: 'Aktif sezon bulunamadı. Lütfen bir sezon seçin.' },
          { status: 400 }
        );
      }
    }

    // Transaction içinde crop oluştur ve CropPeriod lifecycle'ını tetikle
    const crop = await prisma.$transaction(async (tx) => {
      // 1. Yeni crop oluştur
      const newCrop = await tx.crop.create({
        data: {
          fieldId,
          name,
          cropType: cropType as CropType,
          plantedDate: new Date(plantedDate),
          seasonId: seasonId || activeSeason!.id,
          status: 'GROWING' as CropStatus,
          notes: notes || null
        },
        include: {
          field: {
            select: { id: true, name: true }
          },
          season: {
            select: { id: true, name: true }
          }
        }
      });

      // 2. 🎯 CropPeriod lifecycle'ını tetikle (PREPARATION → SEEDING)
      const transitionResult = await updateCropPeriodToSeeding(
        fieldId,
        newCrop.id,
        tx
      );

      if (!transitionResult.success) {
        console.warn(`CropPeriod geçişi uyarısı: ${transitionResult.message}`);
      }

      return newCrop;
    });

    return NextResponse.json({
      data: crop,
      message: 'Ekin kaydı başarıyla oluşturuldu'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating crop:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ekin kaydı oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
}
