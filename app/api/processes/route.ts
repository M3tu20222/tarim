import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ProcessType, Unit, ProcessStatus } from "@prisma/client"; // ProcessStatus eklendi
import { WeatherSnapshotService } from "@/lib/weather/weather-snapshot-service";

const weatherSnapshotService = new WeatherSnapshotService();

// Tüm işlemleri getir (GET metodu aynı kalacak)
export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const fieldIdParam = searchParams.get("fieldId");
    const seasonIdParam = searchParams.get("seasonId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status"); // Yeni: Status filtresi

    // Filtre oluştur
    const filter: any = {};
    if (type) {
      filter.type = type;
    }
    if (fieldIdParam) {
      filter.fieldId = fieldIdParam;
    }
    if (seasonIdParam) {
      filter.seasonId = seasonIdParam;
    }
    if (startDate && endDate) {
      filter.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    if (status) { // Yeni: Status filtresi eklendi
      filter.status = status;
    }

    // Kullanıcı rolüne göre filtreleme
    if (userRole === "WORKER") {
      filter.workerId = userId;
    }
    // Owner ve Admin tüm işlemleri görebilir

    // Adım 1: İşlemleri getir (field ve processCosts ilişkisi olmadan)
    const processesBase = await prisma.process.findMany({
      where: filter,
      include: {
        // field ve processCosts hariç diğer ilişkiler
        worker: {
          select: { id: true, name: true, email: true },
        },
        season: {
          select: { id: true, name: true },
        },
        equipmentUsages: {
          include: { equipment: true },
        },
        inventoryUsages: {
          include: { inventory: true },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    // Adım 2: ID'leri topla
    const processIdsWithNonNullFieldId: string[] = [];
    const fieldIds: string[] = [];
    processesBase.forEach((p) => {
      if (p.fieldId) {
        processIdsWithNonNullFieldId.push(p.id);
        fieldIds.push(p.fieldId);
      }
    });
    // Tekilleştir (gerçi fieldId listesi için gerekmeyebilir ama garanti olsun)
    const uniqueFieldIds = [...new Set(fieldIds)];

    // Adım 3a: İlişkili tarlaları ayrı sorguyla getir (sadece fieldId varsa)
    let fieldsMap: Map<string, any> = new Map();
    if (uniqueFieldIds.length > 0) {
      const fields = await prisma.field.findMany({
        where: { id: { in: uniqueFieldIds } },
        select: { id: true, name: true, location: true, size: true },
      });
      fieldsMap = new Map(fields.map((f) => [f.id, f]));
    }

    // Adım 3b: İlişkili maliyetleri ayrı sorguyla getir (sadece fieldId'si null olmayan işlemler için)
    let costsMap: Map<string, any[]> = new Map();
    if (processIdsWithNonNullFieldId.length > 0) {
      const costs = await prisma.processCost.findMany({
        where: { processId: { in: processIdsWithNonNullFieldId } }, // fieldId filtresi kaldırıldı
      });
      // fieldId'si null olmayanları filtrele
      const filteredCosts = costs.filter((cost) => cost.fieldId !== null);
      // Maliyetleri processId'ye göre grupla
      filteredCosts.forEach((cost) => {
        if (!costsMap.has(cost.processId)) {
          costsMap.set(cost.processId, []);
        }
        costsMap.get(cost.processId)!.push(cost);
      });
    }

    // Adım 4: Tüm verileri birleştir
    const processes = processesBase.map((p) => ({
      ...p,
      field: p.fieldId ? fieldsMap.get(p.fieldId) || null : null,
      // Sadece ilgili processId için maliyet varsa ekle, yoksa boş dizi ata
      processCosts: costsMap.get(p.id) || [],
    }));

    return NextResponse.json(processes);
  } catch (error) {
    console.error("Error fetching processes:", error);
    return NextResponse.json(
      { error: "İşlemler getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Yeni işlem başlat (POST /api/processes/initiate)
export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    const {
      fieldId,
      type,
      date,
      description,
      processedPercentage,
      seasonId,
      workerId: selectedWorkerId,
    } = await request.json();

    // Veri doğrulama
    if (!fieldId || !type || !date || processedPercentage === undefined) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik" },
        { status: 400 }
      );
    }

    // Tarla bilgilerini al
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      select: { id: true, size: true }, // Sadece gerekli alanları al
    });

    if (!field) {
      return NextResponse.json({ error: "Tarla bulunamadı" }, { status: 404 });
    }

    // İşlenen alan hesapla
    const totalArea = field.size;
    const processedArea = (totalArea * processedPercentage) / 100;

    // Aktif sezonu bul
    let activeSeason;
    if (!seasonId) {
      activeSeason = await prisma.season.findFirst({
        where: { isActive: true },
      });

      if (!activeSeason) {
        return NextResponse.json(
          { error: "Aktif sezon bulunamadı. Lütfen bir sezon seçin." },
          { status: 400 }
        );
      }
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 100;
    let retries = 0;
    let process;

    while (retries < MAX_RETRIES) {
      try {
        process = await prisma.$transaction(async (tx) => {
          // İşlem kaydı oluştur (DRAFT durumunda)
          return await tx.process.create({
            data: {
              fieldId,
              workerId: selectedWorkerId || userId,
              seasonId: seasonId || activeSeason!.id,
              type: type as ProcessType,
              date: new Date(date),
              description,
              totalArea,
              processedArea,
              processedPercentage,
              status: "DRAFT" as ProcessStatus, // Başlangıç durumu DRAFT
            },
          });
        }, { timeout: 10000 }); // Daha kısa timeout
        break;
      } catch (error: any) {
        console.error(`Initiate process transaction attempt ${retries + 1} failed:`, error);
        if (
          error.code === 'P2034' ||
          (error instanceof Error && (error.message.includes('write conflict') || error.message.includes('deadlock')))
        ) {
          retries++;
          if (retries < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            continue;
          }
        }
        throw error;
      }
    }

    if (!process) {
      throw new Error("İşlem başlatma birden fazla denemeye rağmen tamamlanamadı.");
    }

    // 📸 Hava durumu snapshot'ı oluştur (async, hata durumunda process'i etkilemesin)
    try {
      await weatherSnapshotService.captureProcessWeatherSnapshot(process.id, fieldId);
      console.log(`✅ Process ${process.id} için weather snapshot oluşturuldu`);
    } catch (snapshotError) {
      console.warn(`⚠️ Process ${process.id} weather snapshot hatası:`, snapshotError);
      // Snapshot hatası process'i etkilemesin
    }

    return NextResponse.json({
      processId: process.id,
      message: "İşlem taslağı başarıyla oluşturuldu.",
      weatherSnapshotCaptured: true
    });

  } catch (error: any) {
    console.error("Error initiating process:", error);
    return NextResponse.json(
      {
        error: "İşlem başlatılırken bir hata oluştu. Lütfen tekrar deneyin.",
      },
      { status: 500 }
    );
  }
}

// Envanter ve Ekipman Kullanımını Güncelle (PUT /api/processes/:processId/inventory-equipment)
export async function PUT(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const processId = searchParams.get("processId");

    if (!processId) {
      return NextResponse.json({ error: "İşlem ID'si eksik" }, { status: 400 });
    }

    const {
      equipmentId,
      inventoryItems, // { inventoryId, quantity, ownerId }[]
      inventoryDistribution, // JSON string
    } = await request.json();

    const process = await prisma.process.findUnique({
      where: { id: processId },
      include: {
        field: {
          include: {
            owners: {
              select: {
                userId: true,
                percentage: true,
                user: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!process) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    if (process.status !== "DRAFT") {
      return NextResponse.json(
        { error: "İşlem taslak durumunda değil, güncellenemez." },
        { status: 400 }
      );
    }

    const processedArea = process.processedArea;
    const field = process.field;

    if (!field) {
      return NextResponse.json({ error: "İşlemle ilişkili tarla bulunamadı." }, { status: 400 });
    }

    // 1. Ekipman bilgisini al (yakıt kontrolü için)
    let equipment: { id: string; fuelConsumptionPerDecare: number } | null =
      null;
    if (equipmentId) {
      equipment = await prisma.equipment.findUnique({
        where: { id: equipmentId },
      });

      if (!equipment) {
        return NextResponse.json(
          { error: "Ekipman bulunamadı" },
          { status: 404 }
        );
      }
    }

    // 2. Yakıt kontrolü (sadece kontrol, düşüm transaction içinde)
    if (equipment && equipment.fuelConsumptionPerDecare) {
      const fuelNeeded = equipment.fuelConsumptionPerDecare * processedArea;
      const fuelCategory = "FUEL";
      const fieldOwners = field.owners;

      let hasEnoughFuel = false;
      let fuelAvailabilityMessage = "";

      for (const owner of fieldOwners) {
        const ownerInventory = await prisma.inventory.findMany({
          where: {
            category: fuelCategory,
            ownerships: {
              some: {
                userId: owner.userId,
              },
            },
          },
        });

        const totalFuel = ownerInventory.reduce(
          (sum: number, item: any) => sum + item.totalQuantity,
          0
        );

        if (totalFuel >= fuelNeeded) {
          hasEnoughFuel = true;
          break;
        } else {
          fuelAvailabilityMessage = `Sahip ${owner.user.name}'in envanterinde yeterli yakıt bulunmuyor.`;
        }
      }

      if (!hasEnoughFuel) {
        return NextResponse.json(
          {
            error:
              fuelAvailabilityMessage ||
              "Tarlanın sahiplerinin envanterinde yeterli yakıt bulunmuyor.",
          },
          { status: 400 }
        );
      }
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 100;
    let retries = 0;
    let transactionResult;

    while (retries < MAX_RETRIES) {
      try {
        transactionResult = await prisma.$transaction(
          async (tx) => {
            // 1. Ekipman kullanımlarını kaydet
            const equipmentUsageRecords = [];
            if (equipmentId) {
              const equipmentUsage = await tx.equipmentUsage.create({
                data: {
                  processId: process.id,
                  equipmentId: equipmentId,
                  userId: userId,
                  areaProcessed: processedArea,
                  processedPercentage: process.processedPercentage,
                  fuelConsumed:
                    equipment && equipment.fuelConsumptionPerDecare
                      ? processedArea * equipment.fuelConsumptionPerDecare
                      : 0,
                  unit: "DECARE" as Unit,
                },
              });
              equipmentUsageRecords.push(equipmentUsage);
            }

            // 2. Envanter kullanımlarını kaydet (sahip bazlı düşüm ile)
            const inventoryUsageRecords: any[] = [];
            if (inventoryItems && inventoryItems.length > 0) {
              for (const usage of inventoryItems) {
                const { inventoryId, quantity, ownerId } = usage;

                const inventory = await tx.inventory.findUnique({
                  where: { id: inventoryId },
                  select: { id: true, name: true, totalQuantity: true, unit: true },
                });

                if (!inventory) {
                  throw new Error(`Envanter bulunamadı: ${inventoryId}`);
                }

                const ownerInventoryShare = await tx.inventoryOwnership.findFirst({
                  where: {
                    inventoryId: inventoryId,
                    userId: ownerId,
                  },
                  select: { id: true, shareQuantity: true, user: { select: { name: true } } },
                });

                if (!ownerInventoryShare) {
                  throw new Error(`Sahip (${ownerId}) için ${inventory.name} envanteri bulunamadı.`);
                }

                if (ownerInventoryShare.shareQuantity < quantity) {
                  throw new Error(
                    `Sahip ${ownerInventoryShare.user.name}'in ${inventory.name} envanterinde yeterli miktar bulunmuyor. ` +
                    `Gereken: ${quantity} ${inventory.unit}, Mevcut: ${ownerInventoryShare.shareQuantity} ${inventory.unit}.`
                  );
                }

                if (inventory.totalQuantity < quantity) {
                  throw new Error(
                    `Genel ${inventory.name} stoğu yetersiz. Gereken: ${quantity} ${inventory.unit}, Mevcut: ${inventory.totalQuantity} ${inventory.unit}.`
                  );
                }

                const newInventoryUsage = await tx.inventoryUsage.create({
                  data: {
                    processId: process.id,
                    inventoryId: inventoryId,
                    usedQuantity: quantity,
                    usageType: "PROCESSING",
                    usedById: ownerId,
                    fieldId: field.id,
                  },
                });
                inventoryUsageRecords.push(newInventoryUsage);

                await Promise.all([
                  tx.inventoryOwnership.update({
                    where: { id: ownerInventoryShare.id },
                    data: {
                      shareQuantity: {
                        decrement: quantity,
                      },
                    },
                  }),
                  tx.inventory.update({
                    where: { id: inventoryId },
                    data: {
                      totalQuantity: {
                        decrement: quantity,
                      },
                    },
                  }),
                ]);
              }
            }

            // Ekipman kullanımı varsa ve yakıt tüketimi hesaplanmışsa, yakıt envanterinden ORANTILI düşüm yap
            if (
              equipmentId &&
              equipment &&
              equipment.fuelConsumptionPerDecare > 0
            ) {
              const totalFuelNeeded =
                equipment.fuelConsumptionPerDecare * processedArea;

              const fieldOwnersWithPercentage = field.owners;

              if (
                !fieldOwnersWithPercentage ||
                fieldOwnersWithPercentage.length === 0
              ) {
                throw new Error("Tarla sahibi bilgisi bulunamadı.");
              }

              for (const ownerInfo of fieldOwnersWithPercentage) {
                const ownerFuelShare =
                  totalFuelNeeded * (ownerInfo.percentage / 100);

                if (ownerFuelShare <= 0) continue;

                const ownerFuelInventories = await tx.inventory.findMany({
                  where: {
                    category: "FUEL",
                    ownerships: {
                      some: {
                        userId: ownerInfo.userId,
                      },
                    },
                    totalQuantity: { gt: 0 },
                  },
                  orderBy: { createdAt: "asc" },
                });

                let remainingOwnerShareToDeduct = ownerFuelShare;
                let ownerTotalFuel = ownerFuelInventories.reduce(
                  (sum, item) => sum + item.totalQuantity,
                  0
                );

                if (ownerTotalFuel < ownerFuelShare) {
                  const ownerName = ownerInfo.user?.name || ownerInfo.userId;
                  throw new Error(
                    `Sahip ${ownerName}'in envanterinde payına düşen (${ownerFuelShare.toFixed(2)} L) kadar yakıt bulunmuyor (Mevcut: ${ownerTotalFuel.toFixed(2)} L).`
                  );
                }

                for (const inventory of ownerFuelInventories) {
                  if (remainingOwnerShareToDeduct <= 0) break;

                  const deductionAmount = Math.min(
                    inventory.totalQuantity,
                    remainingOwnerShareToDeduct
                  );

                  const [fuelUsageRecord, updatedInventory] = await Promise.all([
                    tx.inventoryUsage.create({
                      data: {
                        processId: process.id,
                        inventoryId: inventory.id,
                        usedQuantity: deductionAmount,
                        usageType: "PROCESSING",
                        usedById: ownerInfo.userId,
                        fieldId: field.id,
                      },
                    }),
                    tx.inventory.update({
                      where: { id: inventory.id },
                      data: {
                        totalQuantity: {
                          decrement: deductionAmount,
                        },
                      },
                    }),
                  ]);
                  inventoryUsageRecords.push(fuelUsageRecord);
                  remainingOwnerShareToDeduct -= deductionAmount;
                }
              }
            }

            // Proses kaydına inventoryDistribution JSON'ını ekle ve durumu güncelle
            await tx.process.update({
              where: { id: process.id },
              data: {
                inventoryDistribution: inventoryDistribution,
                status: "PENDING_INVENTORY_EQUIPMENT" as ProcessStatus, // Durumu güncelle
              },
            });

            return {
              equipmentUsages: equipmentUsageRecords,
              inventoryUsages: inventoryUsageRecords,
            };
          },
          { timeout: 20000 }
        );
        break;
      } catch (error: any) {
        console.error(`Update inventory/equipment transaction attempt ${retries + 1} failed:`, error);
        if (
          error.code === 'P2034' ||
          (error instanceof Error && (error.message.includes('write conflict') || error.message.includes('deadlock')))
        ) {
          retries++;
          if (retries < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            continue;
          }
        }
        throw error;
      }
    }

    if (!transactionResult) {
      throw new Error("Envanter ve ekipman güncelleme birden fazla denemeye rağmen tamamlanamadı.");
    }

    return NextResponse.json({ message: "Envanter ve ekipman bilgileri başarıyla güncellendi." });

  } catch (error: any) {
    console.error("Error updating inventory/equipment for process:", error);
    return NextResponse.json(
      {
        error: "Envanter ve ekipman bilgileri güncellenirken bir hata oluştu. Lütfen tekrar deneyin.",
      },
      { status: 500 }
    );
  }
}
