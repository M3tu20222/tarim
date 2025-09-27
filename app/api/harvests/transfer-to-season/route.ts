import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// POST - Hasat edilmiş tarlaları yeni sezona aktar
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
    const { targetSeasonId, fieldIds } = body;

    if (!targetSeasonId) {
      return NextResponse.json(
        { error: 'Hedef sezon ID gereklidir' },
        { status: 400 }
      );
    }

    // Hedef sezonu kontrol et
    const targetSeason = await prisma.season.findUnique({
      where: { id: targetSeasonId }
    });

    if (!targetSeason) {
      return NextResponse.json(
        { error: 'Hedef sezon bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcının erişim yetkisi olan tarlaları belirle
    let accessibleFields: string[] = [];

    if (user.role === 'ADMIN') {
      // Admin tüm tarlalara erişebilir
      const allFields = await prisma.field.findMany({
        select: { id: true }
      });
      accessibleFields = allFields.map(f => f.id);
    } else {
      // Owner sadece sahip olduğu tarlalara erişebilir
      const ownerships = await prisma.fieldOwnership.findMany({
        where: { userId: user.id },
        select: { fieldId: true }
      });
      accessibleFields = ownerships.map(o => o.fieldId);
    }

    // Eğer belirli tarlalar belirtilmişse, kullanıcının erişim yetkisi olup olmadığını kontrol et
    let targetFieldIds = accessibleFields;
    if (fieldIds && Array.isArray(fieldIds)) {
      targetFieldIds = fieldIds.filter(id => accessibleFields.includes(id));

      if (targetFieldIds.length === 0) {
        return NextResponse.json(
          { error: 'Belirtilen tarlalara erişim yetkiniz bulunmuyor' },
          { status: 403 }
        );
      }
    }

    // Hasat edilmiş (HARVESTED) durumundaki tarlaları bul
    // Bir tarlanın hasat edilmiş sayılması için:
    // 1. Tarlada en az bir crop olmalı
    // 2. Bu crop'ların hepsi HARVESTED durumunda olmalı
    // 3. Tarla başka bir aktif sezona bağlı olmamalı

    const harvestedFields = await prisma.field.findMany({
      where: {
        id: { in: targetFieldIds },
        NOT: {
          seasonId: targetSeasonId // Zaten hedef sezonda olan tarlaları hariç tut
        },
        crops: {
          every: {
            status: 'HARVESTED'
          },
          some: {} // En az bir crop olmalı
        }
      },
      include: {
        crops: {
          where: {
            status: 'HARVESTED'
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

    if (harvestedFields.length === 0) {
      return NextResponse.json(
        { error: 'Yeni sezona aktarılabilecek hasat edilmiş tarla bulunamadı' },
        { status: 400 }
      );
    }

    const transferResults = [];

    // Her hasat edilmiş tarla için transfer işlemi
    for (const field of harvestedFields) {
      try {
        // Tarlayı yeni sezona aktar
        const updatedField = await prisma.field.update({
          where: { id: field.id },
          data: {
            seasonId: targetSeasonId,
            status: 'ACTIVE' // Yeni sezona geçerken tarlayı aktif yap
          },
          include: {
            season: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });

        // Bu tarlada yeni sezon için yeni crop kayıtları oluştur
        // Önceki crop'ların bilgilerini referans alarak
        const newCrops = [];
        for (const oldCrop of field.crops) {
          const newCrop = await prisma.crop.create({
            data: {
              name: `${oldCrop.name} - ${targetSeason.name}`,
              cropType: oldCrop.cropType,
              plantedDate: new Date(), // Yeni ekim tarihi - kullanıcı sonradan güncelleyecek
              status: 'GROWING',
              notes: `${targetSeason.name} sezonuna aktarıldı`,
              seasonId: targetSeasonId,
              fieldId: field.id
            }
          });
          newCrops.push(newCrop);
        }

        transferResults.push({
          fieldId: field.id,
          fieldName: field.name,
          previousSeason: field.season?.name || 'Belirsiz',
          newSeason: targetSeason.name,
          cropsTransferred: newCrops.length,
          status: 'success'
        });

      } catch (error) {
        console.error(`Error transferring field ${field.id}:`, error);
        transferResults.push({
          fieldId: field.id,
          fieldName: field.name,
          status: 'error',
          error: 'Transfer sırasında hata oluştu'
        });
      }
    }

    const successCount = transferResults.filter(r => r.status === 'success').length;
    const errorCount = transferResults.filter(r => r.status === 'error').length;

    return NextResponse.json({
      message: `Sezon aktarımı tamamlandı: ${successCount} başarılı, ${errorCount} hatalı`,
      data: {
        targetSeason: {
          id: targetSeason.id,
          name: targetSeason.name
        },
        totalProcessed: transferResults.length,
        successCount,
        errorCount,
        results: transferResults
      }
    });

  } catch (error) {
    console.error('Error transferring fields to new season:', error);
    return NextResponse.json(
      { error: 'Sezon aktarımı sırasında bir hata oluştu' },
      { status: 500 }
    );
  }
}