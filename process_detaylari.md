# Process API - Detaylı Düzeltme Dokümantasyonu

## Özet
Process API'sinde **inventory management** ve **multi-owner support** ile ilgili 4 kritik sorun tespit edilip düzeltildi.

---

## 1. İki Ortaklı Tarlada Yakıt Tüketimi Hesaplama Hatası

### Sorun
Yakıt deduction işlemi sırasında sadece global stok (`Inventory.totalQuantity`) düşülüyordu. Owner'ın kişisel payı (`InventoryOwnership.shareQuantity`) düşülmüyordu.

### Impact
- İki ortaklı tarlada yakıt tüketimi hatalı hesaplanıyor
- Bir owner'ın tüm stok tüketiliyormuş gibi gözüküyordu
- Diğer owner'ın stok verisi düzeltilmiyordu

### Root Cause
`app\api\processes\route.ts` (line 511-573): Fuel consumption loop'unda

**HATA KÖK:**
```typescript
// ESKI KOD - YANLIŞ
for (const inventory of ownerFuelInventories) {
  // ...
  await Promise.all([
    tx.inventoryUsage.create({...}),
    tx.inventory.update({
      where: { id: inventory.id },
      data: { totalQuantity: { decrement: deductionAmount } }
    }),
    // ❌ InventoryOwnership.shareQuantity eksik!
  ]);
}
```

### Çözüm
Owner'ın fuel inventory share'ini bulup decrement etme:

```typescript
// YENİ KOD - DOĞRU
for (const inventory of ownerFuelInventories) {
  if (remainingOwnerShareToDeduct <= 0) break;

  const deductionAmount = Math.min(
    inventory.totalQuantity,
    remainingOwnerShareToDeduct
  );

  // Owner'ın bu yakıt envanterindeki payını bul
  const ownerFuelShare = await tx.inventoryOwnership.findFirst({
    where: {
      inventoryId: inventory.id,
      userId: ownerInfo.userId,
    },
    select: { id: true, shareQuantity: true },
  });

  // Validation: Owner'ın yeterli payı var mı?
  if (!ownerFuelShare || ownerFuelShare.shareQuantity < deductionAmount) {
    throw new Error(
      `Sahip'in bu yakıt envanterinde yeterli miktar bulunmuyor. ` +
      `Gerekli: ${deductionAmount}L, Mevcut: ${ownerFuelShare?.shareQuantity}L`
    );
  }

  // Hem global hem owner share'i decrement et
  const [fuelUsageRecord, updatedInventory] = await Promise.all([
    tx.inventoryUsage.create({
      data: {
        processId: process.id,
        inventoryId: inventory.id,
        usedQuantity: deductionAmount,
        usageType: "PROCESSING",
        usedById: ownerInfo.userId,  // ✅ Owner tracking
        fieldId: field.id,
      },
    }),
    tx.inventory.update({
      where: { id: inventory.id },
      data: {
        totalQuantity: { decrement: deductionAmount },
      },
    }),
    // ✅ YENI: Owner share'i decrement et
    tx.inventoryOwnership.update({
      where: { id: ownerFuelShare.id },
      data: {
        shareQuantity: { decrement: deductionAmount },
      },
    }),
  ]);
}
```

### Dosya & Satırlar
- **File:** `app\api\processes\route.ts`
- **Lines:** 551-602
- **Endpoint:** `PUT /api/processes` (Create process with inventory)

---

## 2. İki Kere Yakıt Düşülmesi (Duplicate Deduction)

### Sorun
**Sıra:** User aynı process'te hem:
1. Manüel yakıt inventory item eklenmiş
2. Equipment (makine) seçilmiş ve equipment'ın fuel consumption var

**Sonuç:** Yakıt iki kere düşülüyor!

**Senaryo Örneği:**
```
Traktör yakıtı: 20.19 litre (manüel)
+ Traktör equipment fuel consumption: 13.95 litre
= TOPLAM 34.14 litre düşülüyor

Ama gerçekte sadece 20.19 litre kullanılmış!
```

### Root Cause
İki ayrı loop aynı fuel'ü işliyor:

```typescript
// LOOP 1: Manüel inventory items
if (inventoryItems && inventoryItems.length > 0) {
  for (const usage of inventoryItems) {
    // Eğer usage.inventoryId bir yakıt ürünü ise
    // → fuel düşülüyor
  }
}

// LOOP 2: Equipment fuel consumption (otomatik)
if (equipmentId && equipment?.fuelConsumptionPerDecare > 0) {
  const totalFuelNeeded = equipment.fuelConsumptionPerDecare * processedArea;

  for (const ownerInfo of fieldOwnersWithPercentage) {
    // → fuel TEKRAR düşülüyor
  }
}
```

### Impact
- Yakıt stok'u yanlış hesaplanıyor
- İki ortakla çok daha kötü (her owner'ın share'i bozuluyor)
- System consistency kırılıyor

### Çözüm
Equipment fuel consumption varsa, manüel fuel items'ı skip et:

**POST Endpoint (`app\api\processes\route.ts` line 420-443):**
```typescript
const inventoryUsageRecords: any[] = [];

// Equipment'ın fuel consumption'ı varsa, inventoryItems'daki fuel'ü exclude et
const hasEquipmentFuelConsumption =
  equipmentId && equipment && equipment.fuelConsumptionPerDecare > 0;

if (inventoryItems && inventoryItems.length > 0) {
  for (const usage of inventoryItems) {
    const { inventoryId, quantity, ownerId } = usage;

    const inventory = await tx.inventory.findUnique({
      where: { id: inventoryId },
      select: { id: true, name: true, category: true, totalQuantity: true, unit: true },
    });

    // ✅ YENİ: Equipment fuel consumption varsa, fuel items'ı skip et
    if (hasEquipmentFuelConsumption && inventory.category === "FUEL") {
      console.log(
        `Skipping inventory item ${inventory.name} (FUEL) because ` +
        `equipment fuel consumption will be calculated automatically`
      );
      continue;  // FUEL kategorisini atla
    }

    // Geri kalan işlemler (non-fuel items)
    // ...
  }
}
```

**PUT Endpoint (`app\api\processes\[id]\route.ts` line 364-396):**
```typescript
const hasEquipment = equipmentUsages && equipmentUsages.length > 0;
const inventoriesToAdd = [];

for (const usage of inventoryUsages) {
  const inventory = await tx.inventory.findUnique({
    where: { id: usage.inventoryId },
    select: { category: true },
  });

  // ✅ Skip fuel items eğer equipment var ise
  if (hasEquipment && inventory?.category === "FUEL") {
    console.log(
      `Skipping fuel inventory ${usage.inventoryId} because equipment is present`
    );
    continue;
  }

  inventoriesToAdd.push({...});
}
```

### Dosyalar & Satırlar
- **File 1:** `app\api\processes\route.ts`
  - **Lines:** 423-443
  - **Endpoint:** `PUT /api/processes` (Create)

- **File 2:** `app\api\processes\[id]\route.ts`
  - **Lines:** 364-396
  - **Endpoint:** `PUT /api/processes/[id]` (Update)

---

## 3. Process Silme/Güncelleme Sırasında Stok İadesi Mekanizması

### Sorun
Process silinirken veya güncellenirken:
- `Inventory.totalQuantity` restore ediliyordu ✅
- **AMMA** `InventoryOwnership.shareQuantity` restore edilmiyordu ❌

### Impact
- Process güncellendiğinde owner'ın stok payı asla geri dönmüyordu
- Owner'ın stok bakiyesi yanlış kalıyordu
- Multi-owner senaryolarda corruption

### Root Cause
Restore logic'inde only global inventory'ye bakılıyordu:

```typescript
// ESKI KOD - YANLIŞ (DELETE)
for (const usage of existingProcess.inventoryUsages) {
  const quantityToIncrement = Number(usage.usedQuantity);

  await tx.inventory.update({
    where: { id: usage.inventoryId },
    data: {
      totalQuantity: { increment: quantityToIncrement },
    },
  });
  // ❌ InventoryOwnership.shareQuantity restore değil!
}
```

### Çözüm

**DELETE Endpoint (`app\api\processes\[id]\route.ts` line 825-865):**
```typescript
for (const usage of existingProcess.inventoryUsages) {
  const quantityToIncrement = Number(usage.usedQuantity);

  if (!isNaN(quantityToIncrement) && quantityToIncrement > 0) {
    // ✅ Owner'ın share'ini bul
    const ownerShare = await tx.inventoryOwnership.findFirst({
      where: {
        inventoryId: usage.inventoryId,
        userId: usage.usedById,  // Owner bilgisi
      },
      select: { id: true },
    });

    const updateOps: any[] = [
      tx.inventory.update({
        where: { id: usage.inventoryId },
        data: {
          totalQuantity: { increment: quantityToIncrement },
        },
      }),
    ];

    // ✅ YENI: Owner'ın share'i de restore et
    if (ownerShare) {
      updateOps.push(
        tx.inventoryOwnership.update({
          where: { id: ownerShare.id },
          data: {
            shareQuantity: { increment: quantityToIncrement },
          },
        })
      );
    }

    await Promise.all(updateOps);
  }
}
```

**PUT Endpoint - Restore (`app\api\processes\[id]\route.ts` line 319-361):**
```typescript
for (const usage of existingUsages) {
  const quantityToIncrement = Number(usage.usedQuantity);

  if (!isNaN(quantityToIncrement) && quantityToIncrement > 0) {
    // ✅ Owner'ın share'ini bul
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
          totalQuantity: { increment: quantityToIncrement },
        },
      }),
    ];

    if (ownerShare) {
      updateOps.push(
        tx.inventoryOwnership.update({
          where: { id: ownerShare.id },
          data: {
            shareQuantity: { increment: quantityToIncrement },
          },
        })
      );
    }

    await Promise.all(updateOps);
  }
}
```

**PUT Endpoint - Yeni Deduction (`app\api\processes\[id]\route.ts` line 364-421):**
```typescript
for (const usage of inventoryUsages) {
  const usedQuantity = Number.parseFloat(usage.quantityUsed);
  const ownerId = usage.ownerId || userId;

  // ✅ Owner'ın share'ini bul ve validate et
  const ownerShare = await tx.inventoryOwnership.findFirst({
    where: {
      inventoryId: usage.inventoryId,
      userId: ownerId,
    },
    select: { id: true, shareQuantity: true },
  });

  if (!ownerShare || ownerShare.shareQuantity < usedQuantity) {
    throw new Error(
      `Sahip'in envanterinde yeterli miktar bulunmuyor. ` +
      `Gerekli: ${usedQuantity}, Mevcut: ${ownerShare?.shareQuantity}`
    );
  }

  // ✅ Hem total hem owner share decrement et
  await Promise.all([
    tx.inventory.update({
      where: { id: usage.inventoryId },
      data: {
        totalQuantity: { decrement: usedQuantity },
      },
    }),
    tx.inventoryOwnership.update({
      where: { id: ownerShare.id },
      data: {
        shareQuantity: { decrement: usedQuantity },
      },
    }),
  ]);
}
```

### Dosyalar & Satırlar
- **File:** `app\api\processes\[id]\route.ts`
  - DELETE: Line 825-865
  - PUT restore: Line 319-361
  - PUT deduction: Line 364-421

---

## 4. usedById Field'ı Fetch Eksikliği

### Sorun
Benim restore/deduction logic'im `usage.usedById`'yi kullanıyordu ama sistem hiçbir yerde `usedById`'yi fetch etmiyordu!

```typescript
// RESTORE LOGIC
const ownerShare = await tx.inventoryOwnership.findFirst({
  where: {
    inventoryId: usage.inventoryId,
    userId: usage.usedById,  // ❌ usedById undefined!
  },
});
```

### Root Cause
Process'i fetch ederken `inventoryUsages` include'ında `usedById` açıkça belirtilmemiş:

```typescript
// ESKI KOD - YANLIŞ
inventoryUsages: {
  include: {
    inventory: { ... }
  },
  // ❌ usedById field'ı fetch değil
}
```

### Çözüm
Tüm yerlerde `select` ile `usedById`'yi açıkça belirt:

**GET Endpoint (`app\api\processes\[id]\route.ts` line 98-120):**
```typescript
inventoryUsages: {
  select: {
    id: true,
    inventoryId: true,
    usedQuantity: true,
    usedById: true,  // ✅ EKLENDI
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
}
```

**PUT Endpoint (`app\api\processes\[id]\route.ts` line 313-322):**
```typescript
const existingUsages = await tx.inventoryUsage.findMany({
  where: { processId: processId },
  select: {
    id: true,
    inventoryId: true,
    usedQuantity: true,
    usedById: true,  // ✅ EKLENDI
    inventory: { select: { category: true } }
  }
});
```

**DELETE Endpoint (`app\api\processes\[id]\route.ts` line 776-785):**
```typescript
inventoryUsages: {
  select: {
    id: true,
    inventoryId: true,
    usedQuantity: true,
    usedById: true,  // ✅ EKLENDI
  }
},
```

---

## Özetin Özeti

| Sorun | Nedeni | Çözüm | Dosya | Satırlar |
|-------|--------|-------|-------|---------|
| **Yakıt share eksik** | InventoryOwnership decrement yok | Share tracking & decrement ekle | route.ts | 551-602 |
| **Yakıt iki kere** | Manüel + equipment fuel çakışması | Equipment varsa fuel skip | route.ts, [id]/route.ts | 423-443, 364-396 |
| **Stok restore eksik** | InventoryOwnership increment yok | Share increment ekle | [id]/route.ts | 319-361, 825-865 |
| **Deduction yanlış** | Owner tracking yok | usedById ile owner deduction | [id]/route.ts | 364-421 |
| **usedById fetch yok** | Include'da field yok | Select ile usedById ekle | [id]/route.ts | 98-120, 313-322, 776-785 |

---

## Testing & Verification

### Test Case 1: İki Ortaklı Tarla - Yakıt Tüketimi
```
Setup:
- Tarla: 2 ortaklı (Mehmet %60, Ebu Bekir %40)
- Equipment: Yakıt tüketimi 100 L/dekar
- İşlem: 1 dekar

Expected Result:
- Mehmet: 60L yakıt düşülüyor
- Ebu Bekir: 40L yakıt düşülüyor
- InventoryOwnership share'leri de düşülüyor
```

### Test Case 2: Manüel + Equipment Yakıt
```
Setup:
- Manüel yakıt: 50L ekle
- Equipment var + fuel consumption: 100L

Expected Result:
- SADECE equipment fuel consumption (100L) düşülüyor
- Manüel yakıt (50L) skip edilir
- Toplam: 100L düşülür
```

### Test Case 3: Process Silme
```
Setup:
- Process silinecek
- İki ortaklı tarla
- Yakıt kullanıldı

Expected Result:
- Hem Inventory.totalQuantity restore edilir
- Hem InventoryOwnership.shareQuantity restore edilir
- Owner'ın stok bakiyesi geri yüklenir
```

### Test Case 4: Process Güncelleme
```
Setup:
- Process update
- Eski kullanım: Mehmet 60L, Ebu Bekir 40L
- Yeni kullanım: Mehmet 30L, Ebu Bekir 20L

Expected Result:
- Eski: Mehmet +60L, Ebu Bekir +40L (restore)
- Yeni: Mehmet -30L, Ebu Bekir -20L (deduct)
- Net: Mehmet +30L, Ebu Bekir +20L
```

---

## TypeScript & Code Quality
- ✅ Tüm düzeltmelerde TypeScript compile error yok
- ✅ Transaction safety maintained
- ✅ Validation'lar ekli (sufficient balance checks)
- ✅ Error messages Türkçe
- ✅ Console logging eklendi (debugging için)

---

## Deployment Notes
- Prisma schema change yok (sadece logic)
- `npm run build` başarıyla geçiyor
- Database migration gerekmiyor
- Production'a direkt deploy edilebilir

