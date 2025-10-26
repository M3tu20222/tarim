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

// GET - Belirli bir hasat kaydını getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Giriş yapmanız gerekiyor' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const harvest = await prisma.harvest.findUnique({
      where: { id },
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
            plantedDate: true,
            status: true
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
      }
    });

    if (!harvest) {
      return NextResponse.json(
        { error: 'Hasat kaydı bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının erişim yetkisini kontrol et
    if (user.role !== 'ADMIN') {
      const ownership = await prisma.fieldOwnership.findFirst({
        where: {
          fieldId: harvest.fieldId,
          userId: user.id
        }
      });

      if (!ownership) {
        return NextResponse.json(
          { error: 'Bu hasat kaydına erişim yetkiniz bulunmuyor' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ data: harvest });

  } catch (error) {
    console.error('Error fetching harvest:', error);
    return NextResponse.json(
      { error: 'Hasat kaydı getirilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// PUT - Hasat kaydını güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Giriş yapmanız gerekiyor' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Mevcut hasat kaydını kontrol et
    const existingHarvest = await prisma.harvest.findUnique({
      where: { id },
      include: { field: true }
    });

    if (!existingHarvest) {
      return NextResponse.json(
        { error: 'Hasat kaydı bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının erişim yetkisini kontrol et
    if (user.role !== 'ADMIN') {
      const ownership = await prisma.fieldOwnership.findFirst({
        where: {
          fieldId: existingHarvest.fieldId,
          userId: user.id
        }
      });

      if (!ownership) {
        return NextResponse.json(
          { error: 'Bu hasat kaydını güncelleme yetkiniz bulunmuyor' },
          { status: 403 }
        );
      }
    }

    const {
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

    // Crop bilgisini getir (cropType için)
    const crop = await prisma.crop.findUnique({
      where: { id: existingHarvest.cropId },
      select: { cropType: true }
    });

    // Mısır için nem fire oranını hesapla
    let moistureDeduction = null;
    if (crop && crop.cropType === 'CORN' && moistureContent !== undefined) {
      if (moistureContent !== null) {
        moistureDeduction = calculateCornMoistureDeduction(parseFloat(moistureContent));
      }
    }

    // Toplam geliri yeniden hesapla
    const totalRevenue = pricePerUnit ? quantity * pricePerUnit : null;

    // Hasat kaydını güncelle
    const updatedHarvest = await prisma.harvest.update({
      where: { id },
      data: {
        ...(harvestDate && { harvestDate: new Date(harvestDate) }),
        ...(harvestedArea !== undefined && { harvestedArea: parseFloat(harvestedArea) }),
        ...(quantity !== undefined && { quantity: parseFloat(quantity) }),
        ...(unit && { unit }),
        ...(pricePerUnit !== undefined && { pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : null }),
        ...(totalRevenue !== undefined && { totalRevenue }),
        ...(quality !== undefined && { quality }),
        ...(moistureContent !== undefined && { moistureContent: moistureContent ? parseFloat(moistureContent) : null }),
        ...(withholdingTaxRate !== undefined && { withholdingTaxRate: withholdingTaxRate ? parseFloat(withholdingTaxRate) : 2 }),
        ...(moistureDeduction !== null && { moistureDeduction }),
        ...(storageLocation !== undefined && { storageLocation }),
        ...(buyerInfo !== undefined && { buyerInfo }),
        ...(transportCost !== undefined && { transportCost: transportCost ? parseFloat(transportCost) : null }),
        ...(laborCost !== undefined && { laborCost: laborCost ? parseFloat(laborCost) : null }),
        ...(notes !== undefined && { notes }),
        ...(weatherConditions !== undefined && { weatherConditions })
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

    return NextResponse.json({
      message: 'Hasat kaydı başarıyla güncellendi',
      data: updatedHarvest
    });

  } catch (error) {
    console.error('Error updating harvest:', error);
    return NextResponse.json(
      { error: 'Hasat kaydı güncellenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE - Hasat kaydını sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Giriş yapmanız gerekiyor' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Mevcut hasat kaydını kontrol et
    const existingHarvest = await prisma.harvest.findUnique({
      where: { id },
      include: { crop: true }
    });

    if (!existingHarvest) {
      return NextResponse.json(
        { error: 'Hasat kaydı bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının erişim yetkisini kontrol et
    if (user.role !== 'ADMIN') {
      const ownership = await prisma.fieldOwnership.findFirst({
        where: {
          fieldId: existingHarvest.fieldId,
          userId: user.id
        }
      });

      if (!ownership) {
        return NextResponse.json(
          { error: 'Bu hasat kaydını silme yetkiniz bulunmuyor' },
          { status: 403 }
        );
      }
    }

    // Hasat kaydını sil
    await prisma.harvest.delete({
      where: { id }
    });

    // Eğer bu crop'un başka hasat kaydı yoksa, durumunu tekrar GROWING yap
    const otherHarvests = await prisma.harvest.findMany({
      where: { cropId: existingHarvest.cropId }
    });

    if (otherHarvests.length === 0) {
      await prisma.crop.update({
        where: { id: existingHarvest.cropId },
        data: {
          status: 'GROWING',
          harvestDate: null
        }
      });
    }

    return NextResponse.json({
      message: 'Hasat kaydı başarıyla silindi'
    });

  } catch (error) {
    console.error('Error deleting harvest:', error);
    return NextResponse.json(
      { error: 'Hasat kaydı silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
}