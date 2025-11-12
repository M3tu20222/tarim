import { prisma } from '@/lib/prisma';

export interface FieldOwner {
  userId: string;
  percentage: number;
  user?: {
    id: string;
    name: string;
  };
}

export interface FuelInventory {
  id: string;
  name: string;
  totalQuantity: number;
  unit: string;
}

export interface OwnerFuelShare {
  inventoryId: string;
  shareQuantity: number;
  id: string;
}

export interface FuelDeductionResult {
  success: boolean;
  message: string;
  deductedAmount: number;
  ownerName?: string;
}

/**
 * Yakıt Düşüm Servisi
 * Ortak tarlalarda yakıt tüketimini her bir tarla sahibi için doğru şekilde yönetir
 */
export class FuelDeductionService {
  /**
   * Tarlanın sahiplerini getirir
   */
  static async getFieldOwners(fieldId: string): Promise<FieldOwner[]> {
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      include: {
        owners: {
          select: {
            userId: true,
            percentage: true,
            user: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!field) {
      throw new Error(`Tarla bulunamadı: ${fieldId}`);
    }

    if (!field.owners || field.owners.length === 0) {
      throw new Error(`Tarlanın sahibi bulunamadı: ${fieldId}`);
    }

    return field.owners;
  }

  /**
   * Bir kullanıcının yakıt envanterlerini getirir
   */
  static async getUserFuelInventories(userId: string): Promise<FuelInventory[]> {
    const inventories = await prisma.inventory.findMany({
      where: {
        category: "FUEL",
        ownerships: {
          some: {
            userId: userId,
          },
        },
        totalQuantity: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        totalQuantity: true,
        unit: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return inventories;
  }

  /**
   * Bir kullanıcının belirli bir yakıt envanterindeki payını getirir
   */
  static async getOwnerFuelShare(
    inventoryId: string,
    userId: string
  ): Promise<OwnerFuelShare | null> {
    const share = await prisma.inventoryOwnership.findFirst({
      where: {
        inventoryId: inventoryId,
        userId: userId,
      },
      select: {
        id: true,
        shareQuantity: true,
        inventoryId: true,
      },
    });

    return share;
  }

  /**
   * Bir kullanıcının toplam yakıt miktarını hesaplar
   */
  static async getUserTotalFuel(userId: string): Promise<number> {
    const inventories = await this.getUserFuelInventories(userId);
    return inventories.reduce((total, inventory) => total + inventory.totalQuantity, 0);
  }

  /**
   * Bir kullanıcının yakıt envanterinden belirli miktarda yakıt düşer
   */
  static async deductFuelFromUser(
    userId: string,
    amountToDeduct: number,
    processId: string,
    fieldId: string
  ): Promise<FuelDeductionResult> {
    const inventories = await this.getUserFuelInventories(userId);
    const totalFuel = inventories.reduce((sum, item) => sum + item.totalQuantity, 0);

    if (totalFuel < amountToDeduct) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      });

      return {
        success: false,
        message: `${user?.name || userId} kullanıcısının envanterinde yeterli yakıt bulunmuyor. Gerekli: ${amountToDeduct.toFixed(2)}L, Mevcut: ${totalFuel.toFixed(2)}L`,
        deductedAmount: 0,
        ownerName: user?.name
      };
    }

    let remainingToDeduct = amountToDeduct;
    const deductionResults = [];

    for (const inventory of inventories) {
      if (remainingToDeduct <= 0) break;

      const deductionAmount = Math.min(inventory.totalQuantity, remainingToDeduct);
      
      // Owner'ın bu envanterdeki payını kontrol et
      const ownerShare = await this.getOwnerFuelShare(inventory.id, userId);
      
      if (!ownerShare) {
        throw new Error(`Kullanıcı (${userId}) için ${inventory.name} envanteri share'i bulunamadı.`);
      }

      if (ownerShare.shareQuantity < deductionAmount) {
        throw new Error(
          `Kullanıcının bu yakıt envanterinde yeterli miktar bulunmuyor. Gerekli: ${deductionAmount}L, Mevcut: ${ownerShare.shareQuantity}L`
        );
      }

      // Transaction içinde düşüm yap
      await prisma.$transaction(async (tx) => {
        // InventoryUsage kaydı oluştur
        await tx.inventoryUsage.create({
          data: {
            processId: processId,
            inventoryId: inventory.id,
            usedQuantity: deductionAmount,
            usageType: "PROCESSING",
            usedById: userId,
            fieldId: fieldId,
          },
        });

        // Toplam stoktan düş
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            totalQuantity: {
              decrement: deductionAmount,
            },
          },
        });

        // Owner'ın payından düş
        await tx.inventoryOwnership.update({
          where: { id: ownerShare.id },
          data: {
            shareQuantity: {
              decrement: deductionAmount,
            },
          },
        });
      });

      remainingToDeduct -= deductionAmount;
      deductionResults.push({
        inventoryId: inventory.id,
        amount: deductionAmount
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    return {
      success: true,
      message: `${user?.name || userId} kullanıcısından ${amountToDeduct.toFixed(2)}L yakıt düşüldü`,
      deductedAmount: amountToDeduct,
      ownerName: user?.name
    };
  }

  /**
   * Ekipman için yakıt düşümünü tüm tarla sahipleri için yapar
   */
  static async deductFuelForEquipment(
    fieldId: string,
    equipmentId: string,
    processedArea: number,
    processId: string
  ): Promise<FuelDeductionResult[]> {
    // Ekipman bilgisini al
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    });

    if (!equipment || !equipment.fuelConsumptionPerDecare || equipment.fuelConsumptionPerDecare <= 0) {
      return [{
        success: false,
        message: "Ekipman bulunamadı veya yakıt tüketimi tanımlı değil",
        deductedAmount: 0
      }];
    }

    // Toplam yakıt ihtiyacını hesapla
    const totalFuelNeeded = equipment.fuelConsumptionPerDecare * processedArea;
    
    // Tarla sahiplerini getir
    const fieldOwners = await this.getFieldOwners(fieldId);
    
    console.log(`🔥 Yakıt düşümü başlatılıyor:`);
    console.log(`   - Tarla: ${fieldId}`);
    console.log(`   - Ekipman: ${equipmentId} (${equipment.fuelConsumptionPerDecare}L/dekar)`);
    console.log(`   - İşlem alanı: ${processedArea} dekar`);
    console.log(`   - Toplam yakıt ihtiyacı: ${totalFuelNeeded}L`);
    console.log(`   - Tarla sahipleri: ${fieldOwners.length} kişi`);
    
    const results: FuelDeductionResult[] = [];
    
    // Her bir tarla sahibi için yakıt düş
    for (const owner of fieldOwners) {
      const ownerFuelShare = totalFuelNeeded * (owner.percentage / 100);
      
      if (ownerFuelShare <= 0) {
        console.log(`   ⚠️ ${owner.user?.name || owner.userId} (%${owner.percentage}): 0L - atlanıyor`);
        continue;
      }
      
      console.log(`   📊 ${owner.user?.name || owner.userId} (%${owner.percentage}): ${ownerFuelShare.toFixed(2)}L yakıt düşülecek`);
      
      const result = await this.deductFuelFromUser(
        owner.userId,
        ownerFuelShare,
        processId,
        fieldId
      );
      
      results.push(result);
      
      if (result.success) {
        console.log(`   ✅ ${result.ownerName}: ${result.deductedAmount.toFixed(2)}L yakıt düşüldü`);
      } else {
        console.log(`   ❌ ${result.ownerName}: ${result.message}`);
      }
    }
    
    // Özet log
    const successfulDeductions = results.filter(r => r.success);
    const totalDeducted = successfulDeductions.reduce((sum, r) => sum + r.deductedAmount, 0);
    
    console.log(`📈 Yakıt düşümü özeti:`);
    console.log(`   - Başarılı düşüm: ${successfulDeductions.length}/${fieldOwners.length} sahip`);
    console.log(`   - Toplam düşülen yakıt: ${totalDeducted.toFixed(2)}L`);
    console.log(`   - Beklenen toplam: ${totalFuelNeeded}L`);
    
    if (totalDeducted < totalFuelNeeded) {
      console.log(`   ⚠️ UYARI: Düşülen yakıt beklenenden az!`);
    }
    
    return results;
  }

  /**
   * Process silindiğinde yakıtı geri iade eder
   */
  static async restoreFuelForProcess(processId: string): Promise<void> {
    const inventoryUsages = await prisma.inventoryUsage.findMany({
      where: { 
        processId: processId,
        inventory: {
          category: "FUEL"
        }
      },
      select: {
        id: true,
        inventoryId: true,
        usedQuantity: true,
        usedById: true,
      }
    });

    for (const usage of inventoryUsages) {
      const quantityToRestore = Number(usage.usedQuantity);
      
      if (!isNaN(quantityToRestore) && quantityToRestore > 0) {
        await prisma.$transaction(async (tx) => {
          // Toplam stoku geri ekle
          await tx.inventory.update({
            where: { id: usage.inventoryId },
            data: {
              totalQuantity: {
                increment: quantityToRestore,
              },
            },
          });

          // Owner'ın payını geri ekle
          const ownerShare = await tx.inventoryOwnership.findFirst({
            where: {
              inventoryId: usage.inventoryId,
              userId: usage.usedById,
            },
            select: { id: true },
          });

          if (ownerShare) {
            await tx.inventoryOwnership.update({
              where: { id: ownerShare.id },
              data: {
                shareQuantity: {
                  increment: quantityToRestore,
                },
              },
            });
          }
        });
      }
    }
  }
}