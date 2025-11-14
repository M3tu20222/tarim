# API Route Değişiklikleri

## 📌 Özet

| Endpoint | Değişiklik | Priority | Breaking |
|----------|-----------|----------|----------|
| POST `/api/crops` | cropPeriod lifecycle trigger | 🔴 HIGH | Hayır |
| POST `/api/processes` | cropPeriodId otomatik ata | 🔴 HIGH | Hayır |
| POST `/api/processes/:id/finalize` | Expense'i cropPeriodId ile yaz | 🔴 HIGH | Hayır |
| POST `/api/irrigation` | cropPeriodId otomatik ata | 🔴 HIGH | Hayır |
| POST `/api/irrigation/:id/finalize` | Expense'i cropPeriodId ile yaz | 🔴 HIGH | Hayır |
| POST `/api/harvests` | Lifecycle trigger | 🔴 HIGH | Hayır |
| POST `/api/crops/:id/finalize-harvest` | YENİ endpoint | 🟡 MEDIUM | N/A |
| GET `/api/fields/:id/profit-loss/:seasonId` | cropPeriod filter desteği | 🟡 MEDIUM | Hayır |

---

## 🔄 CHANGES - Detaylı

### 1. POST `/api/crops` - Crop Oluştur

#### Şu An (Mevcut)
```typescript
// app/api/crops/route.ts
export async function POST(request: Request) {
  const { fieldId, name, cropType, plantedDate, seasonId } = await request.json();

  const crop = await prisma.crop.create({
    data: {
      fieldId,
      name,
      cropType,
      plantedDate,
      seasonId,
      status: "GROWING"
    }
  });

  return NextResponse.json(crop);
}
```

#### Yeni (Değişmiş)
```typescript
// app/api/crops/route.ts
import { getActiveCropPeriod } from "@/lib/crop-period/get-active-period";

export async function POST(request: Request) {
  const { fieldId, name, cropType, plantedDate, seasonId } = await request.json();

  const crop = await prisma.$transaction(async (tx) => {
    // 1. Crop oluştur
    const newCrop = await tx.crop.create({
      data: {
        fieldId,
        name,
        cropType,
        plantedDate: new Date(plantedDate),
        seasonId,
        status: "GROWING"
      }
    });

    // 2. 🎯 YENİ: CropPeriod lifecycle'ı tetikle
    // PREPARATION → SEEDING geçişi yap
    await updateCropPeriodToSeeding(tx, fieldId, newCrop.id);

    return newCrop;
  });

  return NextResponse.json(crop);
}

// Helper function
async function updateCropPeriodToSeeding(
  tx: PrismaClient,
  fieldId: string,
  cropId: string
) {
  const activePeriod = await tx.cropPeriod.findFirst({
    where: {
      fieldId,
      status: "PREPARATION",
      cropId: null
    },
    orderBy: { startDate: "desc" }
  });

  if (activePeriod) {
    // Var olanı güncelle
    await tx.cropPeriod.update({
      where: { id: activePeriod.id },
      data: {
        cropId,
        status: "SEEDING"
      }
    });
  } else {
    // Yeni oluştur (ilk ekim)
    const season = await tx.season.findFirst({
      where: { isActive: true }
    });

    if (season) {
      await tx.cropPeriod.create({
        data: {
          fieldId,
          seasonId: season.id,
          cropId,
          startDate: new Date(),
          status: "SEEDING"
        }
      });
    }
  }
}
```

**Değişiklikler**:
- ✅ cropPeriod lifecycle tetiklendi
- ✅ PREPARATION → SEEDING
- ✅ Request şeması değişmedi (backward compatible)
- ✅ Response şeması değişmedi

---

### 2. POST `/api/processes` - Process Oluştur

#### Şu An (Mevcut)
```typescript
// app/api/processes/route.ts
export async function POST(request: Request) {
  const { fieldId, type, date, seasonId, ...rest } = await request.json();

  const process = await prisma.process.create({
    data: {
      fieldId,
      type,
      date,
      seasonId,
      status: "DRAFT",
      ...rest
    }
  });

  return NextResponse.json(process);
}
```

#### Yeni (Değişmiş)
```typescript
// app/api/processes/route.ts
import { getActiveCropPeriod } from "@/lib/crop-period/get-active-period";

export async function POST(request: Request) {
  const { fieldId, type, date, seasonId, ...rest } = await request.json();

  const process = await prisma.$transaction(async (tx) => {
    // 1. Process oluştur
    const newProcess = await tx.process.create({
      data: {
        fieldId,
        type,
        date: new Date(date),
        seasonId,
        status: "DRAFT",
        ...rest
      }
    });

    // 2. 🎯 YENİ: Active CropPeriod'u bul ve bağla
    const activePeriod = await getActiveCropPeriod(fieldId, tx);

    if (activePeriod) {
      // Process'i period'a bağla
      await tx.process.update({
        where: { id: newProcess.id },
        data: { cropPeriodId: activePeriod.id }
      });

      // 3. Eğer FERTILIZING process ise, status geçişini tetikle
      if (["FERTILIZING", "PESTICIDE"].includes(type)) {
        if (activePeriod.status === "IRRIGATION") {
          await tx.cropPeriod.update({
            where: { id: activePeriod.id },
            data: { status: "FERTILIZING" }
          });
        }
      }
    }

    return newProcess;
  });

  return NextResponse.json(process);
}
```

**Değişiklikler**:
- ✅ cropPeriodId otomatik atandı
- ✅ Durum geçişleri tetiklendi
- ✅ Request şeması değişmedi
- ✅ Response'e cropPeriodId eklendi (backward compatible)

---

### 3. POST `/api/processes/:id/finalize` - Process Sonlandır

#### Şu An (Mevcut)
```typescript
// app/api/processes/[processId]/finalize/route.ts

// ... transaction içinde ...

// FieldExpense oluştur
await tx.fieldExpense.create({
  data: {
    fieldId: process.fieldId,
    seasonId: process.seasonId,  // ← Problem: Global season
    sourceType: "PROCESS",
    sourceId: process.id,
    totalCost,
    expenseDate: process.date
  }
});
```

#### Yeni (Düzeltmiş)
```typescript
// app/api/processes/[processId]/finalize/route.ts

// ... transaction içinde ...

// FieldExpense oluştur - YENİ: cropPeriodId ekle
await tx.fieldExpense.create({
  data: {
    fieldId: process.fieldId,
    seasonId: process.seasonId,  // Koru (backward compat)
    cropPeriodId: process.cropPeriodId,  // 🎯 YENİ
    sourceType: "PROCESS",
    sourceId: process.id,
    totalCost,
    expenseDate: process.date
  }
});

// ProcessCost'a da ekle
await tx.processCost.create({
  data: {
    processId: process.id,
    fieldId: process.fieldId,
    cropId: process.cropPeriod?.cropId, // 🎯 YENİ (optional)
    laborCost,
    equipmentCost,
    inventoryCost,
    totalCost
  }
});
```

**Değişiklikler**:
- ✅ FieldExpense'e cropPeriodId eklendi
- ✅ seasonId korundu (backward compat)
- ✅ Request şeması değişmedi
- ✅ Response şeması değişmedi

---

### 4. POST `/api/irrigation` - Sulama Kaydı Oluştur

#### Şu An (Mevcut)
```typescript
// app/api/irrigation/route.ts
export async function POST(request: Request) {
  const { wellId, fieldIds, seasonId, ...rest } = await request.json();

  const irrigation = await prisma.irrigationLog.create({
    data: {
      wellId,
      seasonId,
      status: "DRAFT",
      ...rest
    }
  });

  // fieldUsages ayrı oluşturulur
  // ...

  return NextResponse.json(irrigation);
}
```

#### Yeni (Değişmiş)
```typescript
// app/api/irrigation/route.ts
import { getActiveCropPeriod } from "@/lib/crop-period/get-active-period";

export async function POST(request: Request) {
  const { wellId, fieldIds, seasonId, ...rest } = await request.json();

  const irrigation = await prisma.$transaction(async (tx) => {
    // 1. IrrigationLog oluştur
    const newIrrigation = await tx.irrigationLog.create({
      data: {
        wellId,
        seasonId,
        status: "DRAFT",
        ...rest
      }
    });

    // 2. 🎯 YENİ: İlk fieldId'ye göre aktif CropPeriod'u bul
    if (fieldIds && fieldIds.length > 0) {
      const activePeriod = await getActiveCropPeriod(fieldIds[0], tx);

      if (activePeriod) {
        // Irrigation'ı period'a bağla
        await tx.irrigationLog.update({
          where: { id: newIrrigation.id },
          data: { cropPeriodId: activePeriod.id }
        });

        // Eğer SEEDING aşamasında ise, IRRIGATION'a geç
        if (activePeriod.status === "SEEDING") {
          await tx.cropPeriod.update({
            where: { id: activePeriod.id },
            data: { status: "IRRIGATION" }
          });
        }
      }
    }

    // fieldUsages ayrı oluşturulur (değişmez)
    // ...

    return newIrrigation;
  });

  return NextResponse.json(irrigation);
}
```

**Değişiklikler**:
- ✅ cropPeriodId otomatik atandı (ilk field'a göre)
- ✅ SEEDING → IRRIGATION tetiklendi
- ✅ Request şeması değişmedi
- ✅ Response'e cropPeriodId eklendi

---

### 5. POST `/api/irrigation/:id/finalize` - Sulama Sonlandır

#### Şu An (Mevcut)
```typescript
// app/api/irrigation/[irrigationId]/finalize/route.ts

// ... transaction içinde ...

// IrrigationFieldExpense oluştur
await tx.irrigationFieldExpense.create({
  data: {
    fieldId: fieldUsage.fieldId,
    seasonId: irrigationLogWithDetails.seasonId,  // ← Problem
    irrigationLogId: irrigationId,
    sourceType: "IRRIGATION",
    sourceId: irrigationId,
    totalCost,
    expenseDate: irrigationLogWithDetails.startDateTime
  }
});
```

#### Yeni (Düzeltmiş)
```typescript
// app/api/irrigation/[irrigationId]/finalize/route.ts

// ... transaction içinde ...

// IrrigationFieldExpense oluştur - YENİ: cropPeriodId ekle
await tx.irrigationFieldExpense.create({
  data: {
    fieldId: fieldUsage.fieldId,
    seasonId: irrigationLogWithDetails.seasonId,  // Koru
    cropPeriodId: irrigationLogWithDetails.cropPeriodId,  // 🎯 YENİ
    irrigationLogId: irrigationId,
    sourceType: "IRRIGATION",
    sourceId: irrigationId,
    totalCost,
    expenseDate: irrigationLogWithDetails.startDateTime
  }
});

// IrrigationCost'a da ekle
await tx.irrigationCost.create({
  data: {
    irrigationLogId: irrigationId,
    fieldId: fieldUsage.fieldId,
    cropId: irrigationLogWithDetails.cropPeriod?.cropId,  // 🎯 YENİ (optional)
    laborCost,
    equipmentCost,
    inventoryCost,
    electricityCost,
    waterFee,
    totalCost
  }
});
```

**Değişiklikler**:
- ✅ IrrigationFieldExpense'e cropPeriodId eklendi
- ✅ seasonId korundu
- ✅ Request şeması değişmedi
- ✅ Response şeması değişmedi

---

### 6. POST `/api/harvests` - Hasat Kaydı Oluştur

#### Şu An (Mevcut)
```typescript
// app/api/harvests/route.ts
export async function POST(request: Request) {
  const { cropId, fieldId, harvestDate, ...rest } = await request.json();

  const harvest = await prisma.harvest.create({
    data: {
      cropId,
      fieldId,
      harvestDate: new Date(harvestDate),
      ...rest
    }
  });

  return NextResponse.json(harvest);
}
```

#### Yeni (Değişmiş)
```typescript
// app/api/harvests/route.ts
import { getActiveCropPeriod } from "@/lib/crop-period/get-active-period";

export async function POST(request: Request) {
  const { cropId, fieldId, harvestDate, ...rest } = await request.json();

  const harvest = await prisma.$transaction(async (tx) => {
    // 1. Harvest oluştur
    const newHarvest = await tx.harvest.create({
      data: {
        cropId,
        fieldId,
        harvestDate: new Date(harvestDate),
        ...rest
      }
    });

    // 2. Crop'u HARVESTED yap
    await tx.crop.update({
      where: { id: cropId },
      data: {
        status: "HARVESTED",
        harvestDate: new Date(harvestDate)
      }
    });

    // 3. 🎯 YENİ: CropPeriod HARVESTING'e geç
    const activePeriod = await getActiveCropPeriod(fieldId, tx);

    if (activePeriod && activePeriod.cropId === cropId) {
      await tx.cropPeriod.update({
        where: { id: activePeriod.id },
        data: { status: "HARVESTING" }
      });
    }

    return newHarvest;
  });

  return NextResponse.json(harvest);
}
```

**Değişiklikler**:
- ✅ Crop.status → HARVESTED
- ✅ CropPeriod.status → HARVESTING
- ✅ Request şeması değişmedi
- ✅ Response şeması değişmedi

---

### 7. POST `/api/crops/:id/finalize-harvest` - YENİ Endpoint

#### Yeni Endpoint
```typescript
// app/api/crops/[cropId]/finalize-harvest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { cropId: string } }
) {
  try {
    const { cropId } = await params;
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Crop ve Period'u bul
      const crop = await tx.crop.findUnique({
        where: { id: cropId },
        include: {
          periods: {
            where: { status: "HARVESTING" }
          }
        }
      });

      if (!crop) {
        throw new Error("Crop bulunamadı");
      }

      const currentPeriod = crop.periods[0];
      if (!currentPeriod) {
        throw new Error("Aktif CropPeriod bulunamadı");
      }

      // 2. Period'u CLOSED yap
      const closedPeriod = await tx.cropPeriod.update({
        where: { id: currentPeriod.id },
        data: {
          status: "CLOSED",
          endDate: new Date()
        }
      });

      // 3. 🎯 OTOMATIK: Yeni PREPARATION period oluştur
      const newPeriod = await tx.cropPeriod.create({
        data: {
          fieldId: crop.fieldId,
          seasonId: currentPeriod.seasonId,
          // cropId: null, // Henüz belirlenmeyecek
          startDate: new Date(),
          status: "PREPARATION"
        }
      });

      return {
        closedPeriod,
        newPeriod,
        message: "Hasat tamamlandı, yeni dönem başladı"
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Hasat sonlandırma hatası:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bilinmeyen hata" },
      { status: 400 }
    );
  }
}
```

**Detaylar**:
- ✨ YENİ endpoint
- ✅ CropPeriod: HARVESTING → CLOSED
- ✅ Otomatik yeni PREPARATION period oluştur
- ✅ Harvest kaydından sonra çağrılır

---

### 8. GET `/api/fields/:id/profit-loss/:seasonId` - Kâr/Zarar Raporu

#### Şu An (Mevcut)
```typescript
// app/api/fields/[fieldId]/profit-loss/[seasonId]/route.ts

const fieldExpenses = await prisma.fieldExpense.findMany({
  where: {
    fieldId,
    seasonId  // ← Global season filter
  }
});

const totalCost = fieldExpenses.reduce((sum, e) => sum + e.totalCost, 0);
```

#### Yeni (İyileştirilmiş)
```typescript
// app/api/fields/[fieldId]/profit-loss/[seasonId]/route.ts

const { searchParams } = new URL(request.url);
const cropPeriodId = searchParams.get("cropPeriodId");

// 1. Season veyaCropPeriod'a göre filtrele
let whereClause: any = {
  fieldId
};

if (cropPeriodId) {
  // Eğer crop period belirtilmişse (daha kesin)
  whereClause.cropPeriodId = cropPeriodId;
} else {
  // Değilse season'a göre filtrele (backward compat)
  whereClause.seasonId = seasonId;
}

const fieldExpenses = await prisma.fieldExpense.findMany({
  where: whereClause,
  include: {
    cropPeriod: {
      include: {
        crop: true
      }
    }
  }
});

// 2. CropPeriod bazlı grupla (opsiyonel)
const expensesByPeriod = fieldExpenses.reduce((acc, expense) => {
  const periodId = expense.cropPeriodId || "unknown";
  if (!acc[periodId]) {
    acc[periodId] = {
      period: expense.cropPeriod,
      expenses: []
    };
  }
  acc[periodId].expenses.push(expense);
  return acc;
}, {} as Record<string, any>);

const totalCost = fieldExpenses.reduce((sum, e) => sum + e.totalCost, 0);

return NextResponse.json({
  data: {
    fieldId,
    seasonId,
    totalExpenses: totalCost,
    expenses: fieldExpenses,
    expensesByPeriod: expensesByPeriod,  // 🎯 YENİ
    count: fieldExpenses.length
  }
});
```

**Değişiklikler**:
- ✅ Optional `cropPeriodId` query param desteği
- ✅ expensesByPeriod gruplandırması
- ✅ Response'e cropPeriod bilgisi eklendi
- ✅ Backward compatible (seasonId'ye de filtrele)

---

## 📋 Request/Response Örnekleri

### POST `/api/processes`
```json
{
  "fieldId": "field-123",
  "type": "PLOWING",
  "date": "2024-08-24",
  "seasonId": "season-2024",
  "description": "Sürme işlemi"
}
```

**Response (Yeni)**:
```json
{
  "id": "proc-789",
  "fieldId": "field-123",
  "type": "PLOWING",
  "date": "2024-08-24",
  "seasonId": "season-2024",
  "cropPeriodId": "period-456",  // 🎯 YENİ
  "status": "DRAFT"
}
```

---

## ✅ Testing Checklist

- [ ] POST /api/crops - cropPeriod lifecycle test
- [ ] POST /api/processes - cropPeriodId otomatik ata test
- [ ] POST /api/irrigation - cropPeriodId otomatik ata test
- [ ] POST /api/harvests - HARVESTING status test
- [ ] POST /api/crops/:id/finalize-harvest - CLOSED + yeni PREPARATION test
- [ ] GET /api/fields/:id/profit-loss/:seasonId - cropPeriodId filter test
- [ ] Backward compatibility test (eski API çağrıları)
- [ ] Transaction rollback test
- [ ] Edge case'ler test (hasat kaydı olmadan finalize vb)

---

## 🚨 Breaking Changes

**ŞU AN YOKTUR!**

Tüm değişiklikler backward compatible:
- Request şemaları değişmedi
- Response'lere sadece yeni field eklendi (ignore edilebilir)
- seasonId field'ı korundu

