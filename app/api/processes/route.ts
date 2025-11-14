import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { getAllProcesses, getProcessesWithDetails, getProcessesByField } from "@/lib/data/processes";
import type { ProcessType, Unit, ProcessStatus } from "@prisma/client"; // ProcessStatus eklendi
import { WeatherSnapshotService } from "@/lib/weather/weather-snapshot-service";
import { FuelDeductionService } from "@/lib/services/fuel-deduction-service";
import { getActiveCropPeriod } from "@/lib/crop-period/get-active-period";
import { updateCropPeriodToFertilizing } from "@/lib/crop-period/lifecycle-transitions";

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
    const status = searchParams.get("status");
    const includeDetails = searchParams.get("includeDetails") === "true";

    // Cached data getters'dan veri al
    let processesBase;
    if (includeDetails) {
      console.log("[Cache] Using getProcessesWithDetails");
      processesBase = await getProcessesWithDetails();
    } else {
      console.log("[Cache] Using getAllProcesses");
      processesBase = await getAllProcesses();
    }

    // Bellek içinde filtreleme
    let filtered = processesBase;

    // Tip filtresi
    if (type) {
      filtered = filtered.filter(p => p.type === type);
    }

    // Field filtresi
    if (fieldIdParam) {
      filtered = filtered.filter(p => p.fieldId === fieldIdParam);
    }

    // Sezon filtresi
    if (seasonIdParam) {
      filtered = filtered.filter(p => p.seasonId === seasonIdParam);
    }

    // Tarih aralığı filtresi
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filtered = filtered.filter(p => {
        const pDate = new Date(p.date);
        return pDate >= start && pDate <= end;
      });
    }

    // Status filtresi
    if (status) {
      filtered = filtered.filter(p => p.status === status);
    }

    // Worker rolü için filtreleme
    if (userRole === "WORKER") {
      filtered = filtered.filter(p => p.workerId === userId);
    }

    // Ek ilişkili veri getir (equipmentUsages, inventoryUsages, processCosts)
    const processIds = filtered.map(p => p.id);
    const fieldIds = filtered.map(p => p.fieldId).filter(Boolean);

    let fieldsMap = new Map<string, any>();
    let equipmentUsagesMap = new Map<string, any[]>();
    let inventoryUsagesMap = new Map<string, any[]>();
    let costsMap = new Map<string, any[]>();

    if (fieldIds.length > 0 && !includeDetails) {
      // Field detaylarını getir (includeDetails true ise cached sorgudan geliyor)
      const fields = await prisma.field.findMany({
        where: { id: { in: fieldIds } },
        select: { id: true, name: true, location: true, size: true },
      });
      fieldsMap = new Map(fields.map((f) => [f.id, f]));
    }

    if (processIds.length > 0) {
      // Equipment usages
      const equipmentUsages = await prisma.equipmentUsage.findMany({
        where: { processId: { in: processIds } },
        include: { equipment: true },
      });

      equipmentUsages.forEach(eu => {
        if (!equipmentUsagesMap.has(eu.processId)) {
          equipmentUsagesMap.set(eu.processId, []);
        }
        equipmentUsagesMap.get(eu.processId)!.push(eu);
      });

      // Inventory usages
      const inventoryUsages = await prisma.inventoryUsage.findMany({
        where: { processId: { in: processIds } },
        include: { inventory: true },
      });

      inventoryUsages.forEach(iu => {
        if (!inventoryUsagesMap.has(iu.processId)) {
          inventoryUsagesMap.set(iu.processId, []);
        }
        inventoryUsagesMap.get(iu.processId)!.push(iu);
      });

      // Process costs
      const costs = await prisma.processCost.findMany({
        where: { processId: { in: processIds } },
      });

      costs.forEach(cost => {
        if (!costsMap.has(cost.processId)) {
          costsMap.set(cost.processId, []);
        }
        costsMap.get(cost.processId)!.push(cost);
      });
    }

    // Tüm verileri birleştir
    const processes = filtered.map((p) => ({
      ...p,
      field: !includeDetails && p.fieldId ? fieldsMap.get(p.fieldId) || null : (p as any).field || null,
      equipmentUsages: equipmentUsagesMap.get(p.id) || [],
      inventoryUsages: inventoryUsagesMap.get(p.id) || [],
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
          // 🎯 YENİ: Aktif CropPeriod'u bul
          const activeCropPeriod = await tx.cropPeriod.findFirst({
            where: {
              fieldId,
              status: {
                in: ["PREPARATION", "SEEDING", "IRRIGATION", "FERTILIZING"]
              }
            },
            orderBy: { startDate: "desc" }
          });

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
              cropPeriodId: activeCropPeriod?.id || undefined, // 🎯 YENİ: CropPeriodId'yi ata
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

    // Cache invalidation
    console.log("[Cache] Invalidating processes tags after process creation");
    revalidateTag("processes");
    if (fieldIdParam) {
      revalidateTag(`processes-field-${fieldId}`);
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

            // 2. Envanter kullanımlarını kaydet (sahib bazlı düşüm ile)
            const inventoryUsageRecords: any[] = [];

            // Equipment'ın fuel consumption'ı varsa, inventoryItems'daki fuel'ü exclude et (iki kere düşmesin)
            const hasEquipmentFuelConsumption = equipmentId && equipment && equipment.fuelConsumptionPerDecare > 0;

            if (inventoryItems && inventoryItems.length > 0) {
              for (const usage of inventoryItems) {
                const { inventoryId, quantity, ownerId } = usage;

                const inventory = await tx.inventory.findUnique({
                  where: { id: inventoryId },
                  select: { id: true, name: true, category: true, totalQuantity: true, unit: true },
                });

                if (!inventory) {
                  throw new Error(`Envanter bulunamadı: ${inventoryId}`);
                }

                // Eğer equipment fuel consumption var ise ve bu item yakıt ise, skip et
                if (hasEquipmentFuelConsumption && inventory.category === "FUEL") {
                  console.log(`Skipping inventory item ${inventory.name} (FUEL) because equipment fuel consumption will be calculated automatically`);
                  continue;
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
              // Yeni OOP servisi ile yakıt düşümü yap
              const fuelDeductionResults = await FuelDeductionService.deductFuelForEquipment(
                field.id,
                equipmentId,
                processedArea,
                process.id
              );

              // Sonuçları kontrol et
              const failedDeductions = fuelDeductionResults.filter(result => !result.success);
              if (failedDeductions.length > 0) {
                const errorMessages = failedDeductions.map(result => result.message).join("; ");
                throw new Error(`Yakıt düşümü başarısız: ${errorMessages}`);
              }

              // Başarılı düşümlerin inventoryUsage kayıtlarını getir
              const fuelInventoryUsages = await tx.inventoryUsage.findMany({
                where: {
                  processId: process.id,
                  inventory: {
                    category: "FUEL"
                  }
                }
              });

              // Bu kayıtları inventoryUsageRecords'a ekle
              inventoryUsageRecords.push(...fuelInventoryUsages);
              
              console.log(`✅ Yakıt düşümü başarıyla tamamlandı: ${fuelDeductionResults.length} sahip için`);
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

    // Cache invalidation
    console.log("[Cache] Invalidating processes tags after inventory/equipment update");
    revalidateTag("processes");
    if (process.fieldId) {
      revalidateTag(`processes-field-${process.fieldId}`);
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
