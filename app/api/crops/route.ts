import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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