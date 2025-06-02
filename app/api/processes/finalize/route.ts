import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ProcessStatus } from "@prisma/client";

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

    const { searchParams } = new URL(request.url);
    const processId = searchParams.get("processId");

    if (!processId) {
      return NextResponse.json({ error: "İşlem ID'si eksik" }, { status: 400 });
    }

    const process = await prisma.process.findUnique({
      where: { id: processId },
      include: {
        field: {
          include: {
            owners: true, // FieldOwnership[]
          },
        },
        equipmentUsages: true,
        inventoryUsages: true,
      },
    });

    if (!process) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    if (process.status !== "PENDING_INVENTORY_EQUIPMENT") {
      return NextResponse.json(
        { error: "İşlem envanter/ekipman bekleme durumunda değil, sonlandırılamaz." },
        { status: 400 }
      );
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 100;
    let retries = 0;
    let finalizeResult;

    while (retries < MAX_RETRIES) {
      try {
        finalizeResult = await prisma.$transaction(
          async (tx) => {
            // Maliyet hesapla
            const laborCost = 100; // TODO: Gerçek işçilik maliyeti hesaplaması eklenmeli
            const equipmentCost = process.equipmentUsages.length > 0 ? 50 : 0; // TODO: Gerçek ekipman maliyeti/amortisman hesaplaması eklenmeli

            let inventoryCost = 0;
            const inventoryUsageRecords = process.inventoryUsages; // Mevcut kullanımları al

            const uniqueInventoryIds = [
              ...new Set(
                inventoryUsageRecords
                  .map((usage) => usage.inventoryId)
                  .filter((id): id is string => !!id)
              ),
            ];

            let inventoryMap = new Map<string, { costPrice: number | null }>();
            let inventoryToPurchaseMap = new Map<string, string>();
            if (uniqueInventoryIds.length > 0) {
              const inventories = await tx.inventory.findMany({
                where: { id: { in: uniqueInventoryIds } },
                select: { id: true, costPrice: true },
              });
              inventories.forEach((inv) => {
                inventoryMap.set(inv.id, { costPrice: inv.costPrice });
              });

              const transactions = await tx.inventoryTransaction.findMany({
                where: {
                  inventoryId: { in: uniqueInventoryIds },
                  type: "PURCHASE",
                  purchaseId: { not: null },
                },
                select: { inventoryId: true, purchaseId: true },
                distinct: ["inventoryId"],
              });
              transactions.forEach((t) => {
                if (t.purchaseId) {
                  inventoryToPurchaseMap.set(t.inventoryId, t.purchaseId);
                }
              });
            }

            const uniquePurchaseIdsForFallback = [...new Set(inventoryToPurchaseMap.values())];
            let purchasePriceMap = new Map<string, number>();
            if (uniquePurchaseIdsForFallback.length > 0) {
              const purchases = await tx.purchase.findMany({
                where: { id: { in: uniquePurchaseIdsForFallback } },
                select: { id: true, unitPrice: true },
              });
              purchases.forEach((p) => {
                if (p.unitPrice !== null && p.unitPrice !== undefined) {
                  purchasePriceMap.set(p.id, p.unitPrice);
                }
              });
            }

            for (const usage of inventoryUsageRecords) {
              if (!usage.inventoryId || usage.usedQuantity === null || usage.usedQuantity === undefined) {
                continue;
              }

              let unitCost: number | null | undefined = undefined;
              const inventoryData = inventoryMap.get(usage.inventoryId);
              if (inventoryData?.costPrice !== null && inventoryData?.costPrice !== undefined) {
                unitCost = inventoryData.costPrice;
              }

              if (unitCost === undefined) {
                const purchaseId = inventoryToPurchaseMap.get(usage.inventoryId);
                if (purchaseId) {
                  const fallbackPrice = purchasePriceMap.get(purchaseId);
                  if (fallbackPrice !== undefined && fallbackPrice !== null) {
                    unitCost = fallbackPrice;
                  }
                }
              }

              if (unitCost !== undefined && unitCost !== null) {
                const itemCost = usage.usedQuantity * unitCost;
                inventoryCost += itemCost;
              } else {
                console.error(`Could not determine unit cost for Inventory ID: ${usage.inventoryId}. Cannot calculate cost for this item.`);
              }
            }

            const totalCost = laborCost + equipmentCost + inventoryCost;

            // Maliyet kaydı oluştur
            const processCost = await tx.processCost.create({
              data: {
                processId: process.id,
                fieldId: process.fieldId!,
                laborCost,
                equipmentCost,
                inventoryCost,
                fuelCost: 0,
                totalCost,
              },
            });

            // Tarla gideri oluştur
            const fieldExpense = await tx.fieldExpense.create({
              data: {
                fieldId: process.fieldId!,
                seasonId: process.seasonId!,
                processCostId: processCost.id,
                totalCost,
                periodStart: process.date,
                periodEnd: process.date,
              },
            });

            // Tarla sahipleri için gider kayıtları oluştur
            const fieldOwnerships = await tx.fieldOwnership.findMany({
              where: { fieldId: process.fieldId! },
            });

            for (const ownership of fieldOwnerships) {
              await tx.fieldOwnerExpense.create({
                data: {
                  fieldOwnershipId: ownership.id,
                  processCostId: processCost.id,
                  userId: ownership.userId,
                  amount: totalCost * (ownership.percentage / 100),
                  percentage: ownership.percentage,
                  periodStart: process.date,
                  periodEnd: process.date,
                },
              });
            }

            // Tüm sahiplere ve yöneticilere bildirim gönder (Asenkron olarak tetiklenebilir)
            // Bu kısım artık ayrı bir servis veya kuyruk tarafından yapılmalı
            // Örneğin: await sendNotificationsToOwners(process, worker, field, processedPercentage, processTypeName);

            // Atanan işçiye bildirim gönder (Asenkron olarak tetiklenebilir)
            // Örneğin: await sendNotificationToWorker(process, field, processTypeName, selectedWorkerId, userId);

            // Proses durumunu FINALIZED olarak güncelle
            await tx.process.update({
              where: { id: process.id },
              data: {
                status: "FINALIZED" as ProcessStatus,
              },
            });

            return {
              processId: process.id,
              processCostId: processCost.id,
              fieldExpenseId: fieldExpense.id,
            };
          },
          { timeout: 20000 }
        );
        break;
      } catch (error: any) {
        console.error(`Finalize process transaction attempt ${retries + 1} failed:`, error);
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

    if (!finalizeResult) {
      throw new Error("İşlem sonlandırma birden fazla denemeye rağmen tamamlanamadı.");
    }

    return NextResponse.json({ message: "İşlem başarıyla tamamlandı.", processId: finalizeResult.processId });

  } catch (error: any) {
    console.error("Error finalizing process:", error);
    return NextResponse.json(
      {
        error: "İşlem sonlandırılırken bir hata oluştu. Lütfen tekrar deneyin.",
      },
      { status: 500 }
    );
  }
}
