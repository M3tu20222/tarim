import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth'; // Doğru session fonksiyonunu import et
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { unstable_cache as cache } from 'next/cache';

const requestBodySchema = z.object({
  fieldId: z.string().min(1, "Tarla ID'si gereklidir."),
  startDate: z.string().datetime("Geçerli bir başlangıç tarihi gereklidir."),
  endDate: z.string().datetime("Geçerli bir bitiş tarihi gereklidir."),
});

// Cache fonksiyonu için tag'leri düzelt
const getFieldSummary = cache(
  async (fieldId: string, startDate: string, endDate: string) => {
    const irrigationLogs = await prisma.irrigationLog.findMany({
      where: {
        fieldUsages: {
          some: {
            fieldId: fieldId,
          },
        },
        // 'date' alanı yerine doğru alan adı olan 'startDateTime' kullanılmalı
        startDateTime: { 
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        inventoryUsages: {
          include: {
            inventory: true, // 'inventoryItem' -> 'inventory' olarak düzeltildi
          },
        },
      },
    });

    const totalIrrigationMinutes = irrigationLogs.reduce((sum, log) => sum + log.duration, 0);
    const totalIrrigationHours = totalIrrigationMinutes / 60;

    const inventoryUsage = new Map<string, { totalQuantity: number; unit: string }>();

    irrigationLogs.forEach(log => {
      log.inventoryUsages.forEach(usage => {
        // 'inventoryItem' -> 'inventory', 'quantityUsed' -> 'quantity' olarak düzeltildi
        const { inventory, quantity } = usage;
        if (inventory) {
          const existing = inventoryUsage.get(inventory.name);
          if (existing) {
            existing.totalQuantity += quantity;
          } else {
            inventoryUsage.set(inventory.name, {
              totalQuantity: quantity,
              unit: inventory.unit,
            });
          }
        }
      });
    });

    const inventoryUsageArray = Array.from(inventoryUsage.entries()).map(([itemName, data]) => ({
      itemName,
      ...data,
    }));

    return {
      totalIrrigationHours: parseFloat(totalIrrigationHours.toFixed(2)),
      inventoryUsage: inventoryUsageArray,
      logCount: irrigationLogs.length,
    };
  },
  ['field-summary'], // Cache key prefix
  {
    revalidate: 3600, // Cache for 1 hour
    tags: ['field-reports'], // Basit bir string tag kullanalım
  }
);

export async function POST(request: Request) {
  try {
    const session = await getServerSession(); // Yeni session fonksiyonunu kullan
    if (!session || session.role !== 'OWNER') { // Sadece rolü kontrol et
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const body = await request.json();
    const validation = requestBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Geçersiz istek verileri.', details: validation.error.flatten() }, { status: 400 });
    }

    const { fieldId, startDate, endDate } = validation.data;
    
    // Tarla sahipliği kontrolü kaldırıldı. Owner rolündeki herkes tüm tarlaların raporunu görebilir.

    const summaryData = await getFieldSummary(fieldId, startDate, endDate);

    return NextResponse.json(summaryData);

  } catch (error) {
    console.error('Rapor oluşturma hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 });
  }
}
