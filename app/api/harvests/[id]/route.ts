import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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
      quality,
      moistureContent,
      storageLocation,
      buyerInfo,
      transportCost,
      laborCost,
      notes,
      weatherConditions
    } = body;

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