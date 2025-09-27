import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET - Hasat kayıtlarını listele
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
    const cropId = searchParams.get('cropId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Kullanıcının erişim yetkisi olan tarlaları bul
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

    // Filtreleme koşulları
    const whereCondition: any = {
      fieldId: { in: accessibleFields }
    };

    if (fieldId) {
      whereCondition.fieldId = fieldId;
    }
    if (seasonId) {
      whereCondition.seasonId = seasonId;
    }
    if (cropId) {
      whereCondition.cropId = cropId;
    }

    // Hasat kayıtlarını getir
    const [harvests, totalCount] = await Promise.all([
      prisma.harvest.findMany({
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
          crop: {
            select: {
              id: true,
              name: true,
              cropType: true,
              plantedDate: true
            }
          },
          season: {
            select: {
              id: true,
              name: true,
              isActive: true
            }
          },
          harvestedBy: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { harvestDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.harvest.count({ where: whereCondition })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: harvests,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching harvests:', error);
    return NextResponse.json(
      { error: 'Hasat kayıtları getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Yeni hasat kaydı oluştur
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
      cropId,
      fieldId,
      harvestDate,
      harvestedArea,
      quantity,
      unit,
      pricePerUnit,
      quality,
      moistureContent,
      storageLocation,
      buyerInfo,
      transportCost,
      laborCost,
      notes,
      weatherConditions
    } = body;

    // Gerekli alanları kontrol et
    if (!cropId || !fieldId || !harvestDate || !harvestedArea || !quantity) {
      return NextResponse.json(
        { error: 'Gerekli alanlar eksik: cropId, fieldId, harvestDate, harvestedArea, quantity' },
        { status: 400 }
      );
    }

    // Kullanıcının bu tarlaya erişim yetkisi olup olmadığını kontrol et
    if (user.role !== 'ADMIN') {
      const ownership = await prisma.fieldOwnership.findFirst({
        where: {
          fieldId: fieldId,
          userId: user.id
        }
      });

      if (!ownership) {
        return NextResponse.json(
          { error: 'Bu tarlaya erişim yetkiniz bulunmuyor' },
          { status: 403 }
        );
      }
    }

    // Crop ve Field bilgilerini getir
    const [crop, field] = await Promise.all([
      prisma.crop.findUnique({
        where: { id: cropId },
        include: { season: true }
      }),
      prisma.field.findUnique({
        where: { id: fieldId }
      })
    ]);

    if (!crop || !field) {
      return NextResponse.json(
        { error: 'Ekin veya tarla bulunamadı' },
        { status: 404 }
      );
    }

    // Toplam geliri hesapla
    const totalRevenue = pricePerUnit ? quantity * pricePerUnit : null;

    // Hasat kaydını oluştur
    const harvest = await prisma.harvest.create({
      data: {
        cropId,
        fieldId,
        seasonId: crop.seasonId,
        harvestDate: new Date(harvestDate),
        harvestedArea: parseFloat(harvestedArea),
        quantity: parseFloat(quantity),
        unit: unit || 'kg',
        pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : null,
        totalRevenue,
        quality,
        moistureContent: moistureContent ? parseFloat(moistureContent) : null,
        storageLocation,
        buyerInfo,
        transportCost: transportCost ? parseFloat(transportCost) : null,
        laborCost: laborCost ? parseFloat(laborCost) : null,
        notes,
        weatherConditions,
        harvestedById: user.id
      },
      include: {
        field: {
          select: {
            id: true,
            name: true,
            location: true
          }
        },
        crop: {
          select: {
            id: true,
            name: true,
            cropType: true
          }
        },
        season: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Crop'u HARVESTED durumuna güncelle
    await prisma.crop.update({
      where: { id: cropId },
      data: {
        status: 'HARVESTED',
        harvestDate: new Date(harvestDate)
      }
    });

    return NextResponse.json({
      message: 'Hasat kaydı başarıyla oluşturuldu',
      data: harvest
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating harvest:', error);
    return NextResponse.json(
      { error: 'Hasat kaydı oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
}