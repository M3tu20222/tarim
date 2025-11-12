import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import type { ProcessType, Role } from "@prisma/client";
import { FuelDeductionService } from "@/lib/services/fuel-deduction-service";

// Belirli bir işlemi getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Tip güncellendi
) {
  try {
    // Token kontrolü
    const cookieStore = await cookies(); // Await cookies()
    const { id: processId } = await params; // ✅ params nesnesini await ile çözümlüyoruz
    const token = cookieStore.get("token")?.value;

    // Özel durum kontrolünü ilk await'ten sonraya taşı
    // if (processId === "unread-count") { // Bu kontrol processId'ye bağlı, aşağı taşınacak
    //   return NextResponse.json(
    //     {
    //       error: "Geçersiz endpoint. /api/notifications/unread-count kullanın",
    //     },
    //     { status: 400 }
    //   );
    // }

    // Token kontrolü
    if (!token) {
      return NextResponse.json(
        {
          error: "Geçersiz endpoint. /api/notifications/unread-count kullanın",
        },
        { status: 400 }
      );
    }

    // Token kontrolü
    if (!token) {
      console.error("Token bulunamadı:", request.url);
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (error) {
      console.error("Token doğrulama hatası:", error);
      return NextResponse.json(
        { error: "Geçersiz veya süresi dolmuş token" },
        { status: 401 }
      );
    }

    const userId = decoded.id;
    const userRole = decoded.role as Role;
    // const processId = params.id; // <<< Buradan kaldırıldı

    // Özel durum kontrolünü processId tanımlandıktan sonraya taşı
    if (processId === "unread-count") { // processId artık burada mevcut
      return NextResponse.json(
        {
          error: "Geçersiz endpoint. /api/notifications/unread-count kullanın",
        },
        { status: 400 }
      );
    }

    console.log(
      `API isteği (/api/processes/${processId}): Kullanıcı ID: ${userId}, Rol: ${userRole}`
    );

    // Rol bazlı erişim kontrolü
    const whereClause: any = { id: processId };

    if (userRole === "WORKER") {
      // İşçi sadece kendisine atanmış işlemleri görebilir
      whereClause.workerId = userId;
    } else if (userRole !== "ADMIN" && userRole !== "OWNER") {
      // Diğer roller yetkisiz
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const process = await prisma.process.findFirst({
      where: whereClause,
      include: {
        field: { select: { id: true, name: true, size: true } },
        worker: { select: { id: true, name: true } },
        season: { select: { id: true, name: true } },
        equipmentUsages: {
          include: {
            equipment: { select: { id: true, name: true } },
          },
        },
        inventoryUsages: {
          select: {
            id: true,
            inventoryId: true,
            usedQuantity: true,
            usedById: true,
            inventory: {
              select: {
                id: true,
                name: true,
                unit: true,
                category: true,
                costPrice: true,
                ownerships: {
                  include: {
                    user: {
                      select: { id: true, name: true }
                    }
                  }
                }
              }
            },
          },
        },
        processCosts: {
          include: {
            ownerExpenses: {
              include: {
                fieldOwnership: {
                  include: {
                    user: {
                      select: { id: true, name: true }
                    }
                  }
                }
              }
            }
          }
        },
      },
    });

    if (!process) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(process);
  } catch (error) {
    console.error("Error fetching process:", error);
    return NextResponse.json(
      { error: "İşlem getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// İşlemi güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Tip güncellendi
) {
  // processId'yi ilk await'ten SONRA al
  // const processId = params.id; // Buradan kaldırıldı

  try {
    // Token kontrolü
    const cookieStore = await cookies(); // Await cookies()
    const { id: processId } = await params; // ✅ params nesnesini await ile çözümlüyoruz
    const tokenCookie = cookieStore.get("token"); // Get the cookie object
    const token = tokenCookie?.value; // Extract the value

    if (!token) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: "Geçersiz veya süresi dolmuş token" },
        { status: 401 }
      );
    }

    const userId = decoded.id;
    const userRole = decoded.role as Role;
    // const processId = params.id; // <<< Buradan kaldırıldı

    // İşlemi bul
    const existingProcess = await prisma.process.findUnique({ // processId artık burada mevcut
      where: { id: processId }, // Use processId variable
      include: {
        field: { select: { id: true } },
      },
    });

    if (!existingProcess) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    // Yetki kontrolü
    // Yetki kontrolü - Güncellendi: OWNER tüm işlemleri güncelleyebilir
    console.log(`Yetki Kontrolü Başladı: userId=${userId}, userRole=${userRole}, processId=${processId}`);
    let canUpdate = false;
    if (userRole === "ADMIN" || userRole === "OWNER") { // OWNER kontrolü basitleştirildi
      console.log(`Kullanıcı ${userRole}, güncelleme yetkisi verildi.`);
      canUpdate = true;
    // } else if (userRole === "OWNER" && existingProcess.fieldId) { // Eski OWNER kontrolü kaldırıldı
    //   console.log(`Kullanıcı OWNER, fieldId kontrol ediliyor: ${existingProcess.fieldId}`);
    //   // Tarla sahibi kontrolü
    //   const fieldOwnership = await prisma.fieldOwnership.findFirst({
    //     where: {
    //       fieldId: existingProcess.fieldId,
    //       userId: userId,
    //     },
    //   });
    //   console.log(`Tarla Sahipliği Sorgu Sonucu (fieldId: ${existingProcess.fieldId}, userId: ${userId}):`, fieldOwnership);
    //   if (fieldOwnership) {
    //     console.log("Tarla sahipliği bulundu, güncelleme yetkisi verildi.");
    //     canUpdate = true;
    //   } else {
    //     console.log("Tarla sahipliği bulunamadı.");
    //   }
    } else if (userRole === "WORKER" && existingProcess.workerId === userId) {
      console.log(`Kullanıcı WORKER, kendi işlemi kontrol ediliyor: process.workerId=${existingProcess.workerId}, userId=${userId}`);
      // İşçi kendi işlemini güncelleyebilir
      canUpdate = true;
      console.log("İşçi kendi işlemini güncelleyebilir, yetki verildi."); // Log Eklendi
    } else {
       console.log(`Diğer durumlar veya eksik fieldId: userRole=${userRole}, existingProcess.fieldId=${existingProcess.fieldId}`); // Log Eklendi
    }


    if (!canUpdate) {
      console.log("Güncelleme yetkisi verilmedi (canUpdate=false). 403 Forbidden döndürülüyor."); // Log Eklendi
      return NextResponse.json(
        { error: "Bu işlemi güncelleme yetkiniz yok" },
        { status: 403 }
      );
    }

    // İstek gövdesini al
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
      equipmentUsages,
      inventoryUsages,
    } = body;

    // Veri doğrulama
    if (!fieldId || !workerId || !type || !date) {
      return NextResponse.json(
        {
          error:
            "Gerekli alanlar eksik: fieldId, workerId, type, date zorunludur.",
        },
        { status: 400 }
      );
    }

    // Transaction başlat
    const updatedProcess = await prisma.$transaction(async (tx) => {
      // 1. Ana işlem kaydını güncelle
      const updated = await tx.process.update({
        where: { id: processId }, // Use processId variable
        data: {
          fieldId,
          workerId,
          seasonId,
          type: type as ProcessType,
          date: new Date(date),
          description,
          processedArea: processedArea
            ? Number.parseFloat(processedArea)
            : undefined,
          processedPercentage: processedPercentage
            ? Number.parseInt(processedPercentage, 10)
            : undefined,
        },
      });

      // 2. Ekipman kullanımlarını güncelle (varsa)
      if (equipmentUsages && equipmentUsages.length > 0) {
        // Önce mevcut kullanımları sil
        await tx.equipmentUsage.deleteMany({
          where: { processId: processId }, // Use processId variable
        });

        // Sonra yenilerini ekle
        await tx.equipmentUsage.createMany({
          data: equipmentUsages.map((usage: any) => ({
            processId: processId, // Use processId variable
            equipmentId: usage.equipmentId,
            usageDuration: usage.usageDuration
              ? Number.parseFloat(usage.usageDuration)
              : null,
            cost: Number.parseFloat(usage.cost),
          })),
        });
      }

      // 3. Envanter kullanımlarını güncelle (varsa)
      if (inventoryUsages && inventoryUsages.length > 0) {
        // Mevcut kullanımları al (usedById ve usedQuantity fetch et!)
        const existingUsages = await tx.inventoryUsage.findMany({
          where: { processId: processId }, // Use processId variable
          select: {
            id: true,
            inventoryId: true,
            usedQuantity: true,
            usedById: true,
            inventory: { select: { category: true } }
          }
        });

        // Mevcut kullanımları sil
        await tx.inventoryUsage.deleteMany({
          where: { processId: processId }, // Use processId variable
        });

        // Silinen kullanımlar için envanter stoklarını geri ekle
        for (const usage of existingUsages) {
          // Use usedQuantity instead of quantityUsed
          const quantityToIncrement = Number(usage.usedQuantity);
          if (!isNaN(quantityToIncrement) && quantityToIncrement > 0) {
            // Get owner's inventory share to restore it
            const ownerShare = await tx.inventoryOwnership.findFirst({
              where: {
                inventoryId: usage.inventoryId,
                userId: usage.usedById,
              },
              select: { id: true },
            });

            const updateOps: any[] = [
              tx.inventory.update({
                where: { id: usage.inventoryId },
                data: {
                  totalQuantity: {
                    increment: quantityToIncrement,
                  },
                },
              }),
            ];

            // Also restore the owner's share if it exists
            if (ownerShare) {
              updateOps.push(
                tx.inventoryOwnership.update({
                  where: { id: ownerShare.id },
                  data: {
                    shareQuantity: {
                      increment: quantityToIncrement,
                    },
                  },
                })
              );
            }

            await Promise.all(updateOps);
          } else {
             console.warn(`Skipping inventory update for usage ${usage.id} due to invalid quantity: ${usage.usedQuantity}`);
          }
        }

        // Yeni kullanımları ekle (fuel'ü exclude et eğer equipment var ise)
        const hasEquipment = equipmentUsages && equipmentUsages.length > 0;
        const inventoriesToAdd = [];

        for (const usage of inventoryUsages) {
          // Check if this is a fuel inventory
          const inventory = await tx.inventory.findUnique({
            where: { id: usage.inventoryId },
            select: { category: true },
          });

          // Skip fuel items if equipment is being used (fuel will be calculated from equipment consumption)
          if (hasEquipment && inventory?.category === "FUEL") {
            console.log(`Skipping fuel inventory ${usage.inventoryId} because equipment is present`);
            continue;
          }

          inventoriesToAdd.push({
            processId: processId, // Use processId variable
            inventoryId: usage.inventoryId,
            usedQuantity: Number.parseFloat(usage.quantityUsed),
            usageType: "PROCESSING" as const,  // TypeScript için const assertion
            usedById: usage.ownerId || userId,  // Use provided ownerId or current user
            fieldId: updated.fieldId,
            cost: Number.parseFloat(usage.cost),
          });
        }

        if (inventoriesToAdd.length > 0) {
          await tx.inventoryUsage.createMany({
            data: inventoriesToAdd,
          });
        }

        // Yeni kullanımlar için envanter stoklarını azalt (hem total hem owner share'i)
        for (const usage of inventoryUsages) {
          // Check if this is a fuel inventory (skip if equipment is present)
          const inventory = await tx.inventory.findUnique({
            where: { id: usage.inventoryId },
            select: { category: true },
          });

          if (hasEquipment && inventory?.category === "FUEL") {
            continue;
          }

          const usedQuantity = Number.parseFloat(usage.quantityUsed);
          const ownerId = usage.ownerId || userId;

          // Get owner's inventory share
          const ownerShare = await tx.inventoryOwnership.findFirst({
            where: {
              inventoryId: usage.inventoryId,
              userId: ownerId,
            },
            select: { id: true, shareQuantity: true },
          });

          if (!ownerShare) {
            throw new Error(
              `Sahip (${ownerId}) için ${usage.inventoryId} envanteri bulunamadı.`
            );
          }

          if (ownerShare.shareQuantity < usedQuantity) {
            throw new Error(
              `Sahip'in bu envanterinde yeterli miktar bulunmuyor. Gerekli: ${usedQuantity}, Mevcut: ${ownerShare.shareQuantity}`
            );
          }

          // Decrement both total and owner share
          await Promise.all([
            tx.inventory.update({
              where: { id: usage.inventoryId },
              data: {
                totalQuantity: {
                  decrement: usedQuantity,
                },
              },
            }),
            tx.inventoryOwnership.update({
              where: { id: ownerShare.id },
              data: {
                shareQuantity: {
                  decrement: usedQuantity,
                },
              },
            }),
          ]);
        }

        // 3.5. Equipment varsa ve yakıt tüketimi varsa, yakıt düşümünü yap
        if (equipmentUsages && equipmentUsages.length > 0) {
          // Equipment'ları kontrol et ve yakıt tüketimi olanları bul
          for (const equipmentUsage of equipmentUsages) {
            const equipment = await tx.equipment.findUnique({
              where: { id: equipmentUsage.equipmentId },
            });

            if (equipment && equipment.fuelConsumptionPerDecare && equipment.fuelConsumptionPerDecare > 0) {
              // Tarlanın sahiplerini bul
              const field = await tx.field.findUnique({
                where: { id: fieldId },
                include: {
                  owners: {
                    select: {
                      userId: true,
                      percentage: true,
                      user: { select: { id: true, name: true } },
                    },
                  },
                },
              });

              if (!field) {
                throw new Error(`Tarla bulunamadı: ${fieldId}`);
              }

              // Yeni OOP servisi ile yakıt düşümü yap
              const fuelDeductionResults = await FuelDeductionService.deductFuelForEquipment(
                field.id,
                equipment.id,
                processedArea || 0,
                processId
              );

              // Sonuçları kontrol et
              const failedDeductions = fuelDeductionResults.filter(result => !result.success);
              if (failedDeductions.length > 0) {
                const errorMessages = failedDeductions.map(result => result.message).join("; ");
                throw new Error(`Yakıt düşümü başarısız: ${errorMessages}`);
              }

              console.log(`✅ Equipment yakıt düşümü başarıyla tamamlandı: ${fuelDeductionResults.length} sahip için`);
            }
          }
        }
      }

      // 4. Maliyetleri Yeniden Hesapla ve Güncelle
      console.log(`--- Recalculating costs for updated process ${processId} ---`);

      // 4a. Güncel ekipman ve envanter kullanımlarını getir
      const currentEquipmentUsages = await tx.equipmentUsage.findMany({
        where: { processId: processId },
        include: { equipment: true } // Ekipman bilgisi gerekebilir
      });
      const currentInventoryUsages = await tx.inventoryUsage.findMany({
        where: { processId: processId },
      });
      console.log("Current Inventory Usages for Recalculation:", JSON.stringify(currentInventoryUsages, null, 2));

      // 4b. Maliyetleri hesapla (POST'taki mantığı kullanarak)
      const laborCost = 100; // TODO: Gerçek işçilik maliyeti hesaplaması eklenmeli
      const equipmentCost = currentEquipmentUsages.length > 0 ? 50 : 0; // TODO: Gerçek ekipman maliyeti hesaplaması eklenmeli

      let inventoryCost = 0;
      const uniqueInventoryIds = [
        ...new Set(
          currentInventoryUsages
            .map((usage) => usage.inventoryId)
            .filter((id): id is string => !!id)
        ),
      ];

      const inventoryMap = new Map<string, { costPrice: number | null }>();
      const inventoryToPurchaseMap = new Map<string, string>();
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
      const purchasePriceMap = new Map<string, number>();
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

      for (const usage of currentInventoryUsages) {
         if (!usage.inventoryId || usage.usedQuantity === null || usage.usedQuantity === undefined) {
           console.warn(`(Recalc) Skipping usage ${usage.id} due to missing inventoryId or usedQuantity.`);
           continue;
         }
         let unitCost: number | null | undefined = undefined;
         let costSource: string = "Not Found";
         const inventoryData = inventoryMap.get(usage.inventoryId);
         if (inventoryData?.costPrice !== null && inventoryData?.costPrice !== undefined) {
           unitCost = inventoryData.costPrice;
           costSource = "Inventory.costPrice";
         }
         if (unitCost === undefined) {
           const purchaseId = inventoryToPurchaseMap.get(usage.inventoryId);
           if (purchaseId) {
             const fallbackPrice = purchasePriceMap.get(purchaseId);
             if (fallbackPrice !== undefined && fallbackPrice !== null) {
               unitCost = fallbackPrice;
               costSource = "Purchase.unitPrice (Fallback)";
             }
           }
         }
         if (unitCost !== undefined && unitCost !== null) {
           const itemCost = Number(usage.usedQuantity) * unitCost; // Ensure usedQuantity is number
           inventoryCost += itemCost;
           console.log(`  (Recalc) Usage: ${usage.id}, Source: ${costSource}, Unit Cost: ${unitCost}, Qty: ${usage.usedQuantity}. Item Cost: ${itemCost}. New total inventoryCost: ${inventoryCost}`);
         } else {
           console.error(`(Recalc) Could not determine unit cost for Inventory ID: ${usage.inventoryId}.`);
         }
      }

      const totalCost = laborCost + equipmentCost + inventoryCost;
      console.log(`(Recalc) Final Calculated Costs: Labor=${laborCost}, Equipment=${equipmentCost}, Inventory=${inventoryCost}, Total=${totalCost}`);

      // 4c. Mevcut ProcessCost kaydını bul veya oluştur
      const existingCost = await tx.processCost.findFirst({
        where: { processId: processId },
      });

      if (existingCost) {
        // Mevcut kaydı güncelle
        // fieldId'nin null olmadığını kontrol et (ProcessCost için zorunlu olmalı)
        if (!updated.fieldId) {
          throw new Error("ProcessCost güncellenirken ilişkili fieldId bulunamadı.");
        }
        await tx.processCost.update({
          where: { id: existingCost.id },
          data: {
            fieldId: updated.fieldId, // fieldId null değilse atanır
            laborCost,
            equipmentCost,
            inventoryCost,
            totalCost,
            fuelCost: 0, // Bu alan kullanımdan kalktıysa sıfırla
          },
        });
         console.log(`Updated existing ProcessCost ${existingCost.id} for process ${processId}`);
      } else {
        // Yeni kayıt oluştur (Eğer güncelleme sırasında maliyet oluştuysa)
        // fieldId'nin null olmadığını kontrol et (ProcessCost için zorunlu olmalı)
         if (!updated.fieldId) {
          throw new Error("ProcessCost oluşturulurken ilişkili fieldId bulunamadı.");
        }
        await tx.processCost.create({
          data: {
            processId: processId,
            fieldId: updated.fieldId, // fieldId null değilse atanır
            laborCost,
            equipmentCost,
            inventoryCost,
            totalCost,
            fuelCost: 0,
          },
        });
        console.log(`Created new ProcessCost for process ${processId}`);
      }

       // 5. Tarla Giderlerini ve Sahip Giderlerini Güncelle/Oluştur
       // Önce mevcut sahip giderlerini sil (yeniden oluşturulacak)
       await tx.fieldOwnerExpense.deleteMany({
         where: { processCost: { processId: processId } },
       });
       // Önce mevcut tarla giderini sil (yeniden oluşturulacak)
       await tx.fieldExpense.deleteMany({
         where: { 
            sourceType: "PROCESS",
            sourceId: processId 
         },
       });

       // Yeni ProcessCost ID'sini al (güncellenmiş veya yeni oluşturulmuş)
       const currentProcessCost = await tx.processCost.findFirstOrThrow({
          where: { processId: processId },
       });

       // Yeni tarla gideri ve sahip giderleri oluştur (sadece fieldId varsa)
       if (updated.fieldId) {
         // FieldExpense oluşturmadan önce seasonId'nin geçerli bir string olduğunu tekrar kontrol et
         if (!updated.seasonId) {
           // Şemaya göre FieldExpense.seasonId zorunlu olduğundan hata fırlat
           throw new Error(`FieldExpense oluşturulurken geçerli bir seasonId bulunamadı (Process ID: ${processId}). updated.seasonId: ${updated.seasonId}`);
         }

         // Kontrolden geçtiyse FieldExpense oluştur
         const fieldExpense = await tx.fieldExpense.create({
           data: {
             fieldId: updated.fieldId,
             seasonId: updated.seasonId, // Bu noktada string olmalı
             sourceType: "PROCESS",
             sourceId: processId,
             description: `İşlem maliyeti: ${updated.type}`,
             totalCost,
             expenseDate: new Date(updated.date),
         },
       });

       // Yeni tarla sahibi giderleri oluştur (fieldId kontrolü zaten yukarıda yapıldı)
       const fieldOwnerships = await tx.fieldOwnership.findMany({
           where: { fieldId: updated.fieldId }, // updated.fieldId burada null/undefined olamaz
         });

         for (const ownership of fieldOwnerships) {
         await tx.fieldOwnerExpense.create({
           data: {
             fieldOwnershipId: ownership.id,
             processCostId: currentProcessCost.id,
             userId: ownership.userId,
             amount: totalCost * (ownership.percentage / 100),
             percentage: ownership.percentage,
             periodStart: new Date(updated.date),
             periodEnd: new Date(updated.date),
           },
         });
       }
        console.log(`Recreated FieldExpense and FieldOwnerExpense records for process ${processId}`);
       } else {
          // fieldId yoksa FieldExpense ve FieldOwnerExpense oluşturulamaz.
          console.warn(`Skipping FieldExpense and FieldOwnerExpense creation because updated.fieldId is null/undefined for process ${processId}`);
       }

      // 6. Bildirimleri Gönder
      const field = await tx.field.findUnique({ where: { id: updated.fieldId! } });
      const updaterUser = await tx.user.findUnique({ where: { id: userId } }); // İşlemi güncelleyen kullanıcı

      const processTypeMap: Record<ProcessType, string> = {
        PLOWING: "Sürme", SEEDING: "Ekim", FERTILIZING: "Gübreleme",
        PESTICIDE: "İlaçlama", HARVESTING: "Hasat", OTHER: "Diğer",
      };
      const processTypeName = processTypeMap[updated.type as ProcessType] || updated.type;
      const notificationTitle = "Tarla İşlemi Güncellendi";
      const baseMessage = `${field?.name || 'Bilinmeyen Tarla'} tarlasındaki ${processTypeName} işlemi ${updaterUser?.name || 'bir kullanıcı'} tarafından güncellendi.`;

      // Atanan işçiye bildirim
      if (updated.workerId && updated.workerId !== userId) { // Güncelleyen kişi atanmış işçi değilse
        await tx.notification.create({
          data: {
            title: "Atanan İşleminiz Güncellendi",
            message: `${field?.name || 'Bilinmeyen Tarla'} tarlasındaki size atanmış olan ${processTypeName} işlemi güncellendi.`,
            type: "TASK_UPDATED",
            receiverId: updated.workerId,
            senderId: userId,
            processId: updated.id,
            link: `/dashboard/worker/processes/${updated.id}`,
            priority: "HIGH",
          },
        });
      }

      // Eğer işçi değiştirildiyse, eski işçiye bildirim (opsiyonel, şimdilik eklenmedi)

      // Diğer OWNER ve ADMIN'lere bildirim
      const ownersAndAdmins = await tx.user.findMany({
        where: { OR: [{ role: "OWNER" }, { role: "ADMIN" }] },
      });

      for (const recipient of ownersAndAdmins) {
        if (recipient.id !== userId && recipient.id !== updated.workerId) { // Güncelleyen ve yeni atanan işçi hariç
          await tx.notification.create({
            data: {
              title: notificationTitle,
              message: baseMessage,
              type: "PROCESS_UPDATED",
              receiverId: recipient.id,
              senderId: userId,
              processId: updated.id,
              link: `/dashboard/owner/processes/${updated.id}`,
              priority: "NORMAL",
            },
          });
        }
      }

      return updated; // Güncellenmiş ana process kaydını döndür
    });

    return NextResponse.json(updatedProcess);
  } catch (error) {
    console.error("Error updating process:", error);
    return NextResponse.json(
      { error: "İşlem güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// İşlemi sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Tip güncellendi
) {
  // processId'yi ilk await'ten SONRA al
  // const processId = await params.id; // Buradan kaldırıldı

  try {
    // Token kontrolü
    const cookieStore = await cookies(); // Await cookies()
    const { id: processId } = await params; // ✅ params nesnesini await ile çözümlüyoruz
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: "Geçersiz veya süresi dolmuş token" },
        { status: 401 }
      );
    }

    const userId = decoded.id;
    const userRole = decoded.role as Role;
    // const processId = params.id; // <<< Buradan kaldırıldı

    // İşlemi bul
    const existingProcess = await prisma.process.findUnique({ // processId artık burada mevcut
      where: { id: processId }, // Use processId variable
      include: {
        field: { select: { id: true } },
        inventoryUsages: {
          select: {
            id: true,
            inventoryId: true,
            usedQuantity: true,
            usedById: true,
          }
        },
      },
    });

    if (!existingProcess) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    // Yetki kontrolü - Güncellendi: ADMIN veya OWNER her zaman silebilir
    let canDelete = false;
    if (userRole === "ADMIN" || userRole === "OWNER") {
      canDelete = true;
    }

    if (!canDelete) {
      // Bu kod bloğuna normalde ADMIN veya OWNER olmayan roller düşer (örn: WORKER)
      console.log(`Kullanıcı ${userId} (Rol: ${userRole}) işlem ${processId} silme yetkisine sahip değil.`);
      return NextResponse.json(
        { error: "Bu işlemi silme yetkiniz yok" },
        { status: 403 }
      );
    }
    console.log(`Kullanıcı ${userId} (Rol: ${userRole}) işlem ${processId} silme yetkisine sahip.`);

    // Transaction başlat (zaman aşımı süresini artırarak)
    await prisma.$transaction(async (tx) => {
      // 1. Yakıtı geri iade et (yeni OOP servisi ile)
      console.log(`Starting fuel restoration for process: ${processId}`);
      try {
        await FuelDeductionService.restoreFuelForProcess(processId);
        console.log(`✅ Yakıt geri iade işlemi başarıyla tamamlandı`);
      } catch (restoreError) {
        console.error(`❌ Yakıt geri iade hatası:`, restoreError);
        throw restoreError;
      }

      // 2. İlişkili kayıtları sil (Sıralama önemli!)

      // Önce FieldOwnerExpense kayıtlarını sil
      await tx.fieldOwnerExpense.deleteMany({
        where: { processCost: { processId: processId } },
      });

      // Sonra FieldExpense kayıtlarını sil (Yeni Eklendi)
      await tx.fieldExpense.deleteMany({
        where: { 
            sourceType: "PROCESS",
            sourceId: processId 
        },
      });

      // Sonra ProcessCost kayıtlarını sil
      await tx.processCost.deleteMany({
        where: { processId: processId },
      });

      // Diğer ilişkili kayıtları sil
      await tx.equipmentUsage.deleteMany({
        where: { processId: processId }, // Use processId variable
      });

      await tx.inventoryUsage.deleteMany({
        where: { processId: processId }, // Use processId variable
      });


      // 3. Ana işlem kaydını sil
      await tx.process.delete({
        where: { id: processId }, // Use processId variable
      });
    }, {
      timeout: 15000 // Zaman aşımını 15 saniyeye çıkar
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting process:", error);
    return NextResponse.json(
      { error: "İşlem silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
