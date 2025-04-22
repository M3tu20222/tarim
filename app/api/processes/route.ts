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
      equipmentId, // Ekipman ID'si
      inventoryItems,
      seasonId,
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
            workerId: userId,
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

        // 3. Envanter kullanımlarını kaydet (ve yakıt kullanımlarını da burada topla)
        const inventoryUsageRecords: any[] = []; // Tip any olarak değiştirildi veya uygun bir tip tanımlanmalı
        if (inventoryItems && inventoryItems.length > 0) {
          for (const usage of inventoryItems) {
            // Envanter bilgilerini al
            const inventory = await tx.inventory.findUnique({
              where: { id: usage.inventoryId },
            });

            if (!inventory) {
              throw new Error(`Envanter bulunamadı: ${usage.inventoryId}`);
            }

            // Envanter kullanımını kaydet
            const inventoryUsage = await tx.inventoryUsage.create({
              data: {
                processId: process.id,
                inventoryId: usage.inventoryId,
                usedQuantity: usage.quantity,
                usageType: "PROCESSING",
                usedById: userId,
                fieldId,
              },
            });

            // Envanter miktarını güncelle
            await tx.inventory.update({
              where: { id: usage.inventoryId },
              data: {
                totalQuantity: {
                  decrement: usage.quantity,
                },
              },
            });

            inventoryUsageRecords.push(inventoryUsage);
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

        // 4. Maliyet hesapla
        // İşçilik maliyeti (örnek olarak sabit bir değer - Geliştirilmeli)
        const laborCost = 100; // TODO: Gerçek işçilik maliyeti hesaplaması eklenmeli

        // Ekipman maliyeti (örnek olarak sabit bir değer - Geliştirilmeli)
        const equipmentCost = equipmentUsageRecords.length > 0 ? 50 : 0; // TODO: Gerçek ekipman maliyeti/amortisman hesaplaması eklenmeli

        // Envanter ve Yakıt Maliyeti (Purchase'dan unitPrice alınarak hesaplanacak)
        let inventoryCost = 0;
        console.log("--- Calculating Process Cost (Fetching from Purchase) ---"); // Log Başlangıç
        console.log("Inventory Usage Records:", JSON.stringify(inventoryUsageRecords, null, 2)); // Log: Kullanım kayıtları

        // 1. Benzersiz inventoryId'leri topla
        const uniqueInventoryIds = [
          ...new Set(
            inventoryUsageRecords
              .map((usage) => usage.inventoryId)
              .filter((id): id is string => !!id) // null/undefined filtrele ve tip güvenliği sağla
          ),
        ];
        console.log("Unique Inventory IDs:", uniqueInventoryIds); // Log

        // 2. İlgili InventoryTransaction'ları bul (Purchase tipinde olanları)
        let inventoryToPurchaseMap = new Map<string, string>(); // inventoryId -> purchaseId
        if (uniqueInventoryIds.length > 0) {
          const transactions = await tx.inventoryTransaction.findMany({
            where: {
              inventoryId: { in: uniqueInventoryIds },
              type: "PURCHASE",
              purchaseId: { not: null }, // purchaseId'si null olmayanları al
            },
            select: {
              inventoryId: true,
              purchaseId: true,
            },
            // Belki aynı envanter için birden fazla alış işlemi olabilir,
            // en sonuncusunu almak mantıklı olabilir ama şimdilik ilk bulduğunu alalım.
            // Daha sağlam bir çözüm için Inventory ve Purchase arasında doğrudan ilişki gerekebilir.
            distinct: ["inventoryId"], // Her inventoryId için sadece bir kayıt almayı dene (ilk bulduğunu alır genelde)
          });
          console.log("Found Transactions linking Inventory to Purchase:", transactions); // Log

          transactions.forEach((t) => {
            // purchaseId'nin null olmadığını tekrar kontrol et (distinct sonrası garanti değil)
            if (t.purchaseId) {
              inventoryToPurchaseMap.set(t.inventoryId, t.purchaseId);
            }
          });
          console.log("Inventory ID to Purchase ID Map:", inventoryToPurchaseMap); // Log
        }

        // 3. İlgili Purchase kayıtlarından unitPrice'ları al
        const uniquePurchaseIds = [...new Set(inventoryToPurchaseMap.values())];
        let purchasePriceMap = new Map<string, number>(); // purchaseId -> unitPrice
        if (uniquePurchaseIds.length > 0) {
          const purchases = await tx.purchase.findMany({
            where: {
              id: { in: uniquePurchaseIds },
            },
            select: {
              id: true,
              unitPrice: true,
            },
          });
          console.log("Found Purchases with Unit Prices:", purchases); // Log

          purchases.forEach((p) => {
            // unitPrice null veya undefined değilse ekle
            if (p.unitPrice !== null && p.unitPrice !== undefined) {
               purchasePriceMap.set(p.id, p.unitPrice);
            } else {
               console.warn(`Purchase record ${p.id} is missing unitPrice.`); // Log
            }
          });
           console.log("Purchase ID to Unit Price Map:", purchasePriceMap); // Log
        }

        // 4. Maliyet Hesaplama Döngüsü (Yeni Mantıkla)
        for (const usage of inventoryUsageRecords) {
          console.log(`Processing usage record ID: ${usage.id}, Inventory ID: ${usage.inventoryId}, Quantity: ${usage.usedQuantity}`); // Log: Her kullanım kaydı
          if (!usage.inventoryId || usage.usedQuantity === null || usage.usedQuantity === undefined) {
            console.warn(`Skipping usage ${usage.id} due to missing inventoryId or usedQuantity.`);
            continue;
          }

          const purchaseId = inventoryToPurchaseMap.get(usage.inventoryId);
          if (!purchaseId) {
            console.warn(`Could not find Purchase Transaction for Inventory ID: ${usage.inventoryId}. Cannot calculate cost.`);
            continue;
          }

          const unitPrice = purchasePriceMap.get(purchaseId);
          if (unitPrice === undefined || unitPrice === null) {
            console.warn(`Could not find unitPrice for Purchase ID: ${purchaseId} (linked to Inventory ID: ${usage.inventoryId}). Cannot calculate cost.`);
            continue;
          }

          // Maliyeti hesapla ve ekle
          const itemCost = usage.usedQuantity * unitPrice;
          inventoryCost += itemCost;
          console.log(`  Found Purchase ID: ${purchaseId}, Unit Price: ${unitPrice}. Calculated item cost: ${itemCost}. New total inventoryCost: ${inventoryCost}`); // Log: Maliyet hesaplandı
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
              },
            });
          }
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
        error:
          "İşlem oluşturulurken bir hata oluştu: " + (error as Error).message,
      },
      { status: 500 }
    );
  }
}
