import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// Mısır nem oranına göre fire ve kesinti hesaplama
function calculateCornMoistureDeduction(moistureContent: number): number {
  if (moistureContent <= 14.0) return 0;
  if (moistureContent <= 14.5) return 1.4;
  if (moistureContent <= 15.0) return 2.7;
  if (moistureContent <= 15.5) return 4.0;
  if (moistureContent <= 16.0) return 5.3;
  if (moistureContent <= 16.5) return 6.7;
  if (moistureContent <= 17.0) return 8.0;
  if (moistureContent <= 17.5) return 9.4;
  if (moistureContent <= 18.0) return 10.7;
  if (moistureContent <= 18.5) return 12.0;
  if (moistureContent <= 19.0) return 13.3;
  if (moistureContent <= 19.5) return 14.7;
  if (moistureContent <= 20.0) return 16.0;
  // 20% üzeri için varsayılan
  return 16.0 + ((moistureContent - 20) * 1.3); // Her 0.5% için yaklaşık %1.3 artış
}

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

    if (user.role === 'ADMIN' || user.role === 'OWNER') {
      // Admin ve Owner tüm tarlalara erişebilir
      const fields = await prisma.field.findMany({
        select: { id: true }
      });
      accessibleFields = fields.map(f => f.id);
    } else {
      // Worker sadece atandığı tarlalara erişebilir
      const assignments = await prisma.fieldWorkerAssignment.findMany({
        where: { userId: user.id },
        select: { fieldId: true }
      });
      accessibleFields = assignments.map(a => a.fieldId);
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
      withholdingTaxRate,
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

    // Yetkilendirme kontrolü
    // ADMIN ve OWNER kullanıcıları tüm tarlaların hasat kaydını yapabilir
    // WORKER sadece atandığı tarlaların hasat kaydını yapabilir
    if (user.role === 'WORKER') {
      const assignment = await prisma.fieldWorkerAssignment.findFirst({
        where: {
          fieldId: fieldId,
          userId: user.id
        }
      });

      if (!assignment) {
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

    // Mısır için nem fire oranını hesapla
    let moistureDeduction = null;
    if (crop.cropType === 'CORN' && moistureContent) {
      moistureDeduction = calculateCornMoistureDeduction(parseFloat(moistureContent));
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
        withholdingTaxRate: withholdingTaxRate ? parseFloat(withholdingTaxRate) : 2,
        moistureDeduction,
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

    // Tarla sahibine/sahiplerine bildirim gönder
    // Eğer hasat kaydını yapan kişi tarla sahibi değilse bildirim gönder
    const fieldOwners = await prisma.fieldOwnership.findMany({
      where: { fieldId },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (fieldOwners && fieldOwners.length > 0) {
      for (const ownership of fieldOwners) {
        // Sadece hasat kaydını yapan kişi dışındaki sahiplere bildirim gönder
        if (ownership.userId !== user.id) {
          await prisma.notification.create({
            data: {
              title: 'Yeni Hasat Kaydı',
              message: `${field.name} tarlasında ${crop.name} ekini için ${user.name} tarafından hasat kaydı oluşturuldu. Miktar: ${quantity} ${unit}`,
              type: 'HARVEST',
              priority: 'NORMAL',
              receiverId: ownership.userId,
              senderId: user.id,
              harvestId: harvest.id,
              fieldId: fieldId,
              cropId: cropId,
              link: `/dashboard/harvests/${harvest.id}`
            }
          });
        }
      }
    }

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