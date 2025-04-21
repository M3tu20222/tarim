import { NextRequest, NextResponse } from "next/server"; // NextRequest import edildi
import { prisma } from "@/lib/prisma";
import { getServerSideSession } from "@/lib/session";
import type { ProcessType, Role } from "@prisma/client";
// import { calculateProcessCosts } from "@/lib/cost-calculation"; // Maliyet hesaplama fonksiyonunu import et (varsayımsal) - Kaldırıldı
// import { createNotification } from "@/lib/notification-service"; // Bildirim servisini import et (varsayımsal) - Kaldırıldı

// Tüm işlemleri getir (Rol bazlı filtreleme ve sorgu parametreleri ile)
export async function GET(request: NextRequest) { // Request yerine NextRequest kullanıldı
  try {
    const session = await getServerSideSession();
    const { searchParams } = new URL(request.url); // Sorgu parametrelerini al
    const searchTerm = searchParams.get("search");
    const typeFilter = searchParams.get("type") as ProcessType | null;
    // Diğer filtreler (fieldId, dateRange vb.) buraya eklenebilir

    if (!session || !session.id || !session.role) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }
    const userId = session.id;
    const userRole = session.role as Role;

    console.log(`API isteği (/api/processes): Kullanıcı ID: ${userId}, Rol: ${userRole}, Search: ${searchTerm}, Type: ${typeFilter}`);

    let whereClause: any = {}; // any tipine çevrildi

    // Rol Bazlı Ana Filtreleme
    if (userRole === "WORKER") {
      // İşçi sadece kendisine atanmış işlemleri görür
       whereClause.workerId = userId;
    } else if (userRole !== "ADMIN" && userRole !== "OWNER") { // OWNER da tümünü görmeli
      // Diğer roller (eğer varsa) yetkisiz kabul edilir
       return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }
    // ADMIN ve OWNER tüm işlemleri görür (ek filtre yok)

    // Sorgu Parametrelerine Göre Ek Filtreleme
    if (searchTerm) {
      whereClause.OR = [
        { field: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { worker: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        // Arama yapılacak diğer alanlar eklenebilir (örn: işlem tipi etiketi)
      ];
    }

    if (typeFilter) {
      whereClause.type = typeFilter;
    }

     // Diğer filtreler buraya eklenebilir (örn: fieldId, date range)
    // const fieldIdFilter = searchParams.get("fieldId");
    // if (fieldIdFilter) {
    //   whereClause.fieldId = fieldIdFilter;
    // }
    // const startDate = searchParams.get("startDate");
    // const endDate = searchParams.get("endDate");
    // if (startDate && endDate) {
    //   whereClause.date = { gte: new Date(startDate), lte: new Date(endDate) };
    // }


    const processes = await prisma.process.findMany({
      where: whereClause, // Birleştirilmiş filtreler
      include: {
        field: { select: { id: true, name: true } }, // Sadece tarla adı ve id'si
        worker: { select: { id: true, name: true } }, // Sadece işçi adı ve id'si
        processCosts: { // Maliyetleri hesaplamak için gerekli
          select: {
            totalCost: true
          }
        },
        // Diğer gerekli include'lar eklenebilir
      },
      orderBy: {
        date: "desc", // En son işlemleri başta göster
      },
    });

    // İstemci tarafında maliyet hesaplaması yapılıyorsa bu adıma gerek yok.
    // Eğer sunucuda hesaplanması gerekiyorsa:
    // const processesWithTotalCost = processes.map(p => ({
    //   ...p,
    //   totalCost: p.processCosts.reduce((sum, cost) => sum + (cost.totalCost || 0), 0)
    // }));

    return NextResponse.json(processes);

  } catch (error) {
    console.error("Error fetching processes:", error);
    return NextResponse.json(
      { error: "İşlemler getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}


// Yeni işlem oluştur
export async function POST(request: Request) {
  try {
    const session = await getServerSideSession();

    if (!session || !session.id || !session.role) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }
    const userId = session.id;
    const userRole = session.role as Role;

    const body = await request.json();
    const {
      fieldId,
      workerId,
      seasonId,
      type,
      date,
      description,
      processedArea,
      processedPercentage,
      equipmentUsages, // [{ equipmentId: string, usageDuration: number, cost: number }]
      inventoryUsages, // [{ inventoryId: string, quantityUsed: number, cost: number }]
      // Diğer potansiyel alanlar...
    } = body;

    // Veri doğrulama
    if (!fieldId || !workerId || !seasonId || !type || !date || processedArea == null || processedPercentage == null) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik: fieldId, workerId, seasonId, type, date, processedArea, processedPercentage zorunludur." },
        { status: 400 }
      );
    }

    // Yetki Kontrolü: İşlemi kim oluşturabilir?
    // 1. Admin her zaman oluşturabilir.
    // 2. Owner, kendi tarlası için oluşturabilir.
    // 3. Worker, kendisine atanmış bir işlem oluşturabilir (belki bu senaryo istenmiyordur, genelde Owner/Admin atar)
    let canCreate = false;
    if (userRole === 'ADMIN') {
        canCreate = true;
    } else if (userRole === 'OWNER') {
        const fieldOwnership = await prisma.fieldOwnership.findFirst({
            where: {
                fieldId: fieldId,
                userId: userId,
            }
        });
        if (fieldOwnership) {
            canCreate = true;
        }
    }
    // Worker'ın kendi adına işlem oluşturma senaryosu eklenmek istenirse buraya eklenebilir.
    // Örneğin: else if (userRole === 'WORKER' && workerId === userId) { canCreate = true; }

    if (!canCreate) {
         return NextResponse.json({ error: "Bu işlemi oluşturma yetkiniz yok" }, { status: 403 });
    }


    // Transaction başlat
    const newProcess = await prisma.$transaction(async (tx) => {
        // 0. Tarla bilgisini al (totalArea için)
        const field = await tx.field.findUnique({
            where: { id: fieldId },
            select: { size: true }
        });

        if (!field) {
            throw new Error(`Tarla bulunamadı: ${fieldId}`); // Hata fırlat transaction'ı geri almak için
        }
        const totalArea = field.size; // Tarlanın boyutunu totalArea olarak kullan

        // 1. Ana İşlem Kaydını Oluştur
        const createdProcess = await tx.process.create({
            data: {
                fieldId,
                workerId,
                seasonId,
                type: type as ProcessType,
                date: new Date(date),
                description,
                totalArea: totalArea, // Eksik alan eklendi
                processedArea: parseFloat(processedArea),
                processedPercentage: parseInt(processedPercentage, 10),
                // createdBy: userId, // İşlemi kimin oluşturduğu bilgisi - Kaldırıldı (Prisma modelinde yok)
            },
        });

        // 2. Ekipman Kullanımlarını Oluştur (varsa)
        if (equipmentUsages && equipmentUsages.length > 0) {
            await tx.equipmentUsage.createMany({
                data: equipmentUsages.map((usage: any) => ({
                    processId: createdProcess.id,
                    equipmentId: usage.equipmentId,
                    usageDuration: usage.usageDuration ? parseFloat(usage.usageDuration) : null, // Süre varsa ekle
                    cost: parseFloat(usage.cost),
                    // Gerekirse diğer alanlar
                })),
            });
        }

        // 3. Envanter Kullanımlarını Oluştur (varsa)
        if (inventoryUsages && inventoryUsages.length > 0) {
            await tx.inventoryUsage.createMany({
                data: inventoryUsages.map((usage: any) => ({
                    processId: createdProcess.id,
                    inventoryId: usage.inventoryId,
                    quantityUsed: parseFloat(usage.quantityUsed),
                    cost: parseFloat(usage.cost),
                    // Gerekirse diğer alanlar
                })),
            });

             // Envanter stoklarını güncelle (opsiyonel ama önemli)
             for (const usage of inventoryUsages) {
                await tx.inventory.update({
                    where: { id: usage.inventoryId },
                    data: {
                        totalQuantity: { // 'quantity' yerine 'totalQuantity' kullanıldı
                            decrement: parseFloat(usage.quantityUsed)
                        }
                    }
                });
            }
        }

        // 4. İşlem Maliyetlerini Kaydet (varsa)
        // Maliyet hesaplama mantığı projenin gereksinimlerine göre daha detaylı olabilir.
        const totalEquipmentCost = equipmentUsages?.reduce((sum: number, usage: any) => sum + parseFloat(usage.cost || 0), 0) || 0;
        const totalInventoryCost = inventoryUsages?.reduce((sum: number, usage: any) => sum + parseFloat(usage.cost || 0), 0) || 0;
        const totalDirectCost = totalEquipmentCost + totalInventoryCost;

        if (totalDirectCost > 0) {
             // ProcessCost modelinde laborCost, equipmentCost, inventoryCost, fuelCost gibi alanlar var.
             // Bunları ayrı ayrı veya toplam olarak kaydetmek gerekebilir.
             // Şimdilik sadece toplam maliyeti kaydedelim, diğerlerini 0 varsayalım.
             // Gerçek uygulamada bu maliyetlerin nasıl hesaplanacağı belirlenmeli.
             await tx.processCost.create({
                data: {
                    processId: createdProcess.id,
                    // costType: 'DIRECT', // Kaldırıldı (Prisma modelinde yok)
                    // description: 'Ekipman ve Malzeme Kullanımı (Oto)', // Kaldırıldı (Prisma modelinde yok)
                    totalCost: totalDirectCost,
                    equipmentCost: totalEquipmentCost, // Varsayılan atama
                    inventoryCost: totalInventoryCost, // Varsayılan atama
                    laborCost: 0, // Varsayılan
                    fuelCost: 0, // Varsayılan
                    fieldId: fieldId, // fieldId ProcessCost modelinde zorunlu görünüyor, ekleyelim.
                    // fieldExpense ve ownerExpense ilişkileri daha sonra kurulabilir.
                }
            });
        }


        // 5. Bildirim Oluşturma (Opsiyonel - Şimdilik kaldırıldı)
        // Bildirim mantığı ayrı bir adımda veya serviste ele alınabilir.

        return createdProcess;
    });


    return NextResponse.json(newProcess, { status: 201 }); // 201 Created

  } catch (error) {
    console.error("Error creating process:", error);
    // Prisma veya diğer hataları daha detaylı yakala
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2002') {
         return NextResponse.json({ error: "Benzersizlik kısıtlaması ihlali." }, { status: 409 }); // Conflict
    }
     if (error instanceof Error && 'code' in error && (error as any).code === 'P2003') {
         return NextResponse.json({ error: "İlişkili kayıt bulunamadı (örn. tarla, işçi veya sezon)." }, { status: 400 });
    }
    return NextResponse.json(
      { error: "İşlem oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Helper function (process-table.tsx'den alınabilir veya ortak bir yere taşınabilir)
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    PLOWING: "Sürme",
    SEEDING: "Ekim",
    FERTILIZING: "Gübreleme",
    PESTICIDE: "İlaçlama",
    HARVESTING: "Hasat",
    OTHER: "Diğer",
  };
  return labels[type] || type;
}
