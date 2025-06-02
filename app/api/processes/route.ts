import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ProcessType, Unit } from "@prisma/client";

// Tüm işlemleri getir
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

// Yeni işlem oluştur (POST metodu aynı kalıyor)
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
      equipmentId,
      inventoryItems, // { inventoryId, quantity, ownerId }[]
      inventoryDistribution, // JSON string
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

    // Tarla bilgilerini al (Ortaklık yüzdesi ile birlikte)
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      include: {
        owners: {
          // FieldOwnership[]
          select: {
            // Sadece gerekli alanları seçelim
            userId: true,
            percentage: true, // Ortaklık yüzdesini ekle
            user: {
              // Kullanıcı bilgilerini de dahil et
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
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

    // 1. Ekipman bilgisini al
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

    // 2. Yakıt kontrolü
    if (equipment && equipment.fuelConsumptionPerDecare) {
      const fuelNeeded = equipment.fuelConsumptionPerDecare * processedArea;
      const fuelCategory = "FUEL"; // Yakıt kategorisini belirle
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
          break; // Yeterli yakıt varsa döngüden çık
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

    // Transaction ile işlem oluştur
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. İşlem kaydı oluştur
        const process = await tx.process.create({
          data: {
            fieldId,
            // Eğer formdan workerId gelmişse onu kullan, yoksa isteği yapanı ata
            workerId: selectedWorkerId || userId,
            seasonId: seasonId || activeSeason!.id,
            type: type as ProcessType,
            date: new Date(date),
            description,
            totalArea,
            processedArea,
            processedPercentage,
          },
        });

        // 2. Ekipman kullanımlarını kaydet
        const equipmentUsageRecords = [];
        if (equipmentId) {
          // Ekipman kullanımını kaydet
          const equipmentUsage = await tx.equipmentUsage.create({
            data: {
              processId: process.id,
              equipmentId: equipmentId,
              userId: userId, // Kullanıcı ID'si eklendi
              areaProcessed: processedArea,
              processedPercentage,
              fuelConsumed:
                equipment && equipment.fuelConsumptionPerDecare
                  ? processedArea * equipment.fuelConsumptionPerDecare
                  : 0,
              unit: "DECARE" as Unit,
            },
          });

          equipmentUsageRecords.push(equipmentUsage);
        }

        // 3. Envanter kullanımlarını kaydet (sahip bazlı düşüm ile)
        const inventoryUsageRecords: any[] = [];
        if (inventoryItems && inventoryItems.length > 0) {
          for (const usage of inventoryItems) {
            const { inventoryId, quantity, ownerId } = usage;

            // 1. Envanterin genel bilgilerini al
            const inventory = await tx.inventory.findUnique({
              where: { id: inventoryId },
              select: { id: true, name: true, totalQuantity: true, unit: true },
            });

            if (!inventory) {
              throw new Error(`Envanter bulunamadı: ${inventoryId}`);
            }

            // 2. Sahibin bu envanterdeki payını bul
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

            // 3. Sahibin payında yeterli miktar var mı kontrol et
            if (ownerInventoryShare.shareQuantity < quantity) {
              throw new Error(
                `Sahip ${ownerInventoryShare.user.name}'in ${inventory.name} envanterinde yeterli miktar bulunmuyor. ` +
                `Gereken: ${quantity} ${inventory.unit}, Mevcut: ${ownerInventoryShare.shareQuantity} ${inventory.unit}.`
              );
            }

            // 4. Genel envanterde yeterli miktar var mı kontrol et (redundant ama güvenlik için)
            if (inventory.totalQuantity < quantity) {
              throw new Error(
                `Genel ${inventory.name} stoğu yetersiz. Gereken: ${quantity} ${inventory.unit}, Mevcut: ${inventory.totalQuantity} ${inventory.unit}.`
              );
            }

            // 5. Envanter kullanımını kaydet (kullanan kişi envanterin sahibi)
            const newInventoryUsage = await tx.inventoryUsage.create({
              data: {
                processId: process.id,
                inventoryId: inventoryId,
                usedQuantity: quantity,
                usageType: "PROCESSING",
                usedById: ownerId, // Envanteri kullanan kişi (sahibi)
                fieldId,
              },
            });
            inventoryUsageRecords.push(newInventoryUsage);

            // 6. Sahibin envanter payını güncelle
            await tx.inventoryOwnership.update({
              where: { id: ownerInventoryShare.id },
              data: {
                shareQuantity: {
                  decrement: quantity,
                },
              },
            });

            // 7. Genel envanter miktarını güncelle
            await tx.inventory.update({
              where: { id: inventoryId },
              data: {
                totalQuantity: {
                  decrement: quantity,
                },
              },
            });
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

          // Tarla sahiplerini ve yüzdelerini al (field nesnesinden)
          const fieldOwnersWithPercentage = field.owners; // Bu artık { userId, percentage, user: { ... } } içeriyor

          if (
            !fieldOwnersWithPercentage ||
            fieldOwnersWithPercentage.length === 0
          ) {
            throw new Error("Tarla sahibi bilgisi bulunamadı.");
          }

          // Her tarla sahibinin payına düşen yakıtı hesapla ve düş
          for (const ownerInfo of fieldOwnersWithPercentage) {
            const ownerFuelShare =
              totalFuelNeeded * (ownerInfo.percentage / 100);

            if (ownerFuelShare <= 0) continue; // Bu sahip için yakıt gerekmiyorsa atla

            // Sahibin yakıt envanterlerini bul
            const ownerFuelInventories = await tx.inventory.findMany({
              where: {
                category: "FUEL",
                ownerships: {
                  some: {
                    userId: ownerInfo.userId,
                  },
                },
                totalQuantity: { gt: 0 }, // Sadece miktarı 0'dan büyük olanları al
              },
              orderBy: { createdAt: "asc" }, // Önce eski envanterleri kullan
            });

            let remainingOwnerShareToDeduct = ownerFuelShare;
            let ownerTotalFuel = ownerFuelInventories.reduce(
              (sum, item) => sum + item.totalQuantity,
              0
            );

            // Sahibin yeterli yakıtı var mı kontrol et
            if (ownerTotalFuel < ownerFuelShare) {
              // Sahip adını almak için ownerInfo.user.name kullanılabilir
              const ownerName = ownerInfo.user?.name || ownerInfo.userId;
              throw new Error(
                `Sahip ${ownerName}'in envanterinde payına düşen (${ownerFuelShare.toFixed(2)} L) kadar yakıt bulunmuyor (Mevcut: ${ownerTotalFuel.toFixed(2)} L).`
              );
            }

            // Bulunan yakıt envanterlerinden düşüm yap (sahibin payı kadar)
            for (const inventory of ownerFuelInventories) {
              if (remainingOwnerShareToDeduct <= 0) break;

              const deductionAmount = Math.min(
                inventory.totalQuantity,
                remainingOwnerShareToDeduct
              );

              // Envanter kullanımını kaydet
              const fuelUsageRecord = await tx.inventoryUsage.create({ // Değişken tanımlandı
                data: {
                  processId: process.id,
                  inventoryId: inventory.id,
                  usedQuantity: deductionAmount,
                  usageType: "PROCESSING", // Yakıt kullanımı da bir işlem parçası
                  usedById: ownerInfo.userId, // Yakıtın sahibi
              fieldId, // İşlemin yapıldığı tarla
            },
          });

          // Envanter miktarını güncelle
          const updatedInventory = await tx.inventory.update({
            where: { id: inventory.id },
                data: {
                  totalQuantity: {
                    decrement: deductionAmount,
                  },
            },
          });

          // Envanter miktarını güncelle (Bu zaten yukarıda yapılıyor, tekrar gerek yok)
          // const updatedInventory = await tx.inventory.update({ ... });

          // Yakıt kullanım kaydını maliyet hesaplaması için listeye ekle
          inventoryUsageRecords.push(fuelUsageRecord); // Tanımlanan değişken kullanıldı

          remainingOwnerShareToDeduct -= deductionAmount;
        }
      }
    }

        // 4. Proses kaydına inventoryDistribution JSON'ını ekle
        if (inventoryDistribution) {
          await tx.process.update({
            where: { id: process.id },
            data: {
              inventoryDistribution: inventoryDistribution, // JSON string olarak sakla
            },
          });
        }

        // 5. Maliyet hesapla
        // İşçilik maliyeti (örnek olarak sabit bir değer - Geliştirilmeli)
        const laborCost = 100; // TODO: Gerçek işçilik maliyeti hesaplaması eklenmeli

        // Ekipman maliyeti (örnek olarak sabit bir değer - Geliştirilmeli)
        const equipmentCost = equipmentUsageRecords.length > 0 ? 50 : 0; // TODO: Gerçek ekipman maliyeti/amortisman hesaplaması eklenmeli

        // Envanter ve Yakıt Maliyeti (Önce Inventory.costPrice, sonra Purchase.unitPrice)
        let inventoryCost = 0;
        console.log("--- Calculating Process Cost (Prioritizing Inventory.costPrice) ---"); // Log Başlangıç
        console.log("Inventory Usage Records:", JSON.stringify(inventoryUsageRecords, null, 2)); // Log: Kullanım kayıtları

        // 1. Benzersiz inventoryId'leri topla
        const uniqueInventoryIds = [
          ...new Set(
            inventoryUsageRecords
              .map((usage) => usage.inventoryId)
              .filter((id): id is string => !!id)
          ),
        ];

        // 2. İlgili Envanter kayıtlarını (costPrice ile) ve Alış İşlemlerini (purchaseId için) getir
        let inventoryMap = new Map<string, { costPrice: number | null }>(); // inventoryId -> { costPrice }
        let inventoryToPurchaseMap = new Map<string, string>(); // inventoryId -> purchaseId (yedek için)
        if (uniqueInventoryIds.length > 0) {
          // Envanterleri getir
          const inventories = await tx.inventory.findMany({
            where: { id: { in: uniqueInventoryIds } },
            select: { id: true, costPrice: true },
          });
          inventories.forEach((inv) => {
            inventoryMap.set(inv.id, { costPrice: inv.costPrice });
          });
          console.log("Inventory ID to Cost Price Map:", inventoryMap); // Log

          // Alış İşlemlerini getir (yedek olarak)
          const transactions = await tx.inventoryTransaction.findMany({
            where: {
              inventoryId: { in: uniqueInventoryIds },
              type: "PURCHASE",
              purchaseId: { not: null },
            },
            select: { inventoryId: true, purchaseId: true },
            distinct: ["inventoryId"], // Her envanter için bir tane al (genelde ilk/en eski)
          });
          transactions.forEach((t) => {
            if (t.purchaseId) {
              inventoryToPurchaseMap.set(t.inventoryId, t.purchaseId);
            }
          });
          console.log("Inventory ID to Purchase ID Map (Fallback):", inventoryToPurchaseMap); // Log
        }

        // 3. Yedek için ilgili Purchase kayıtlarından unitPrice'ları al
        const uniquePurchaseIdsForFallback = [...new Set(inventoryToPurchaseMap.values())];
        let purchasePriceMap = new Map<string, number>(); // purchaseId -> unitPrice
        if (uniquePurchaseIdsForFallback.length > 0) {
          const purchases = await tx.purchase.findMany({
            where: { id: { in: uniquePurchaseIdsForFallback } },
            select: { id: true, unitPrice: true },
          });
          purchases.forEach((p) => {
            if (p.unitPrice !== null && p.unitPrice !== undefined) {
              purchasePriceMap.set(p.id, p.unitPrice);
            } else {
              console.warn(`(Fallback) Purchase record ${p.id} is missing unitPrice.`); // Log
            }
          });
          console.log("Purchase ID to Unit Price Map (Fallback):", purchasePriceMap); // Log
        }

        // 4. Maliyet Hesaplama Döngüsü (Yeni Önceliklendirme Mantığıyla)
        for (const usage of inventoryUsageRecords) {
          console.log(`Processing usage record ID: ${usage.id}, Inventory ID: ${usage.inventoryId}, Quantity: ${usage.usedQuantity}`); // Log: Her kullanım kaydı
          if (!usage.inventoryId || usage.usedQuantity === null || usage.usedQuantity === undefined) {
            console.warn(`Skipping usage ${usage.id} due to missing inventoryId or usedQuantity.`);
            continue;
          }

          let unitCost: number | null | undefined = undefined;
          let costSource: string = "Not Found";

          // Öncelik 1: Inventory.costPrice'ı kullan
          const inventoryData = inventoryMap.get(usage.inventoryId);
          if (inventoryData?.costPrice !== null && inventoryData?.costPrice !== undefined) {
            unitCost = inventoryData.costPrice;
            costSource = "Inventory.costPrice";
          }

          // Öncelik 2: Purchase.unitPrice'ı kullan (Eğer Inventory.costPrice yoksa)
          if (unitCost === undefined) {
            const purchaseId = inventoryToPurchaseMap.get(usage.inventoryId);
            if (purchaseId) {
              const fallbackPrice = purchasePriceMap.get(purchaseId);
              if (fallbackPrice !== undefined && fallbackPrice !== null) {
                unitCost = fallbackPrice;
                costSource = "Purchase.unitPrice (Fallback)";
              } else {
                 console.warn(`(Fallback) Could not find unitPrice for Purchase ID: ${purchaseId} (linked to Inventory ID: ${usage.inventoryId}).`);
              }
            } else {
               console.warn(`(Fallback) Could not find Purchase Transaction for Inventory ID: ${usage.inventoryId}.`);
            }
          }

          // Maliyeti hesapla ve ekle (eğer birim maliyet bulunduysa)
          if (unitCost !== undefined && unitCost !== null) {
            const itemCost = usage.usedQuantity * unitCost;
            inventoryCost += itemCost;
            console.log(`  Source: ${costSource}, Unit Cost: ${unitCost}. Calculated item cost: ${itemCost}. New total inventoryCost: ${inventoryCost}`); // Log: Maliyet hesaplandı
          } else {
            console.error(`Could not determine unit cost for Inventory ID: ${usage.inventoryId}. Cannot calculate cost for this item.`); // Hata logu
          }
        }

        // Toplam maliyet (Yakıt maliyeti artık inventoryCost içinde)
        const totalCost = laborCost + equipmentCost + inventoryCost;
        console.log(`Final Calculated Costs: Labor=${laborCost}, Equipment=${equipmentCost}, Inventory=${inventoryCost}, Total=${totalCost}`); // Log: Toplam Maliyet

        // Maliyet kaydı oluştur
        const processCost = await tx.processCost.create({
          data: {
            processId: process.id,
            fieldId: fieldId,
            laborCost,
            equipmentCost,
            inventoryCost, // Hem envanter hem yakıt maliyetini içerir
            fuelCost: 0, // Ayrı yakıt maliyeti kaldırıldı, alan DB'de kalıyorsa 0 olarak ayarla
            totalCost,
          },
        });

        // 5. Tarla gideri oluştur
        const fieldExpense = await tx.fieldExpense.create({
          data: {
            fieldId,
            seasonId: seasonId || activeSeason!.id,
            processCostId: processCost.id,
            totalCost,
            periodStart: new Date(date),
            periodEnd: new Date(date),
          },
        });

        // 6. Tarla sahipleri için gider kayıtları oluştur
        const fieldOwnerships = await tx.fieldOwnership.findMany({
          where: { fieldId },
        });

        for (const ownership of fieldOwnerships) {
          await tx.fieldOwnerExpense.create({
            data: {
              fieldOwnershipId: ownership.id,
              processCostId: processCost.id,
              userId: ownership.userId, // Kullanıcı ID'si eklendi
              amount: totalCost * (ownership.percentage / 100),
              percentage: ownership.percentage,
              periodStart: new Date(date),
              periodEnd: new Date(date),
            },
          });
        }

        // 7. Tüm sahiplere ve yöneticilere bildirim gönder
        const owners = await tx.user.findMany({
          where: {
            OR: [{ role: "OWNER" }, { role: "ADMIN" }],
          },
        });

        const worker = await tx.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });

        const processTypeMap: Record<ProcessType, string> = {
          PLOWING: "Sürme",
          SEEDING: "Ekim",
          FERTILIZING: "Gübreleme",
          PESTICIDE: "İlaçlama",
          HARVESTING: "Hasat",
          OTHER: "Diğer",
        };

        const processTypeName = processTypeMap[type as ProcessType] || type;

        for (const owner of owners) {
          // İşçilere bildirim gönderme
          if (owner.id !== userId) {
            // İşlemi yapan kişiye bildirim gönderme
            await tx.notification.create({
              data: {
                title: "Tarla İşlemi Kaydedildi",
                message: `${field.name} tarlasının %${processedPercentage}'lik kısmında ${processTypeName} işlemi ${worker?.name || "bir çalışan"} tarafından gerçekleştirildi.`,
                type: "FIELD_PROCESSING",
                receiverId: owner.id,
                senderId: userId,
                processId: process.id,
                link: `/dashboard/owner/processes/${process.id}`, // Bildirim linki eklendi
              },
            });
          }
        }

        // 8. Atanan işçiye bildirim gönder (eğer varsa ve işlemi başlatan kişi değilse)
        if (selectedWorkerId && selectedWorkerId !== userId) {
          await tx.notification.create({
            data: {
              title: "Yeni İşlem Atandı",
              message: `${field.name} tarlası için size yeni bir ${processTypeName} işlemi atandı.`,
              type: "TASK_ASSIGNED", // Hata düzeltildi: TASK_ASSIGNMENT -> TASK_ASSIGNED
              receiverId: selectedWorkerId,
              senderId: userId, // İşlemi oluşturan yönetici/sahip
              processId: process.id,
              link: `/dashboard/worker/processes/${process.id}`, // İşçinin işlem detay sayfası
              priority: "HIGH", 
            },
          });
        }

        return {
          process,
          equipmentUsages: equipmentUsageRecords,
          inventoryUsages: inventoryUsageRecords,
          processCost,
          fieldExpense,
        };
      },
      { timeout: 20000 }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error creating process:", error);
    return NextResponse.json(
      {
        error: "İşlem oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
        details: (error as Error).message, // Detayları ayrı bir alanda gönder
      },
      { status: 500 }
    );
  }
}
