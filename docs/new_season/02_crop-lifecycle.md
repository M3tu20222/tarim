# Crop Lifecycle - Hayat Döngüsü ve Otomatik Geçişler

## 📊 Lifecycle State Machine

```
         ┌────────────────────────────────────┐
         │      CropPeriod Oluştur             │
         │   (PREPARATION, cropId=null)       │
         └───────────────┬────────────────────┘
                         │
                         ▼
         ┌────────────────────────────────────┐
         │      PREPARATION Aşaması            │
         │   - Sürme, Gübre, Fidan Hazırlığı  │
         │   - Crop henüz oluşturulmamış      │
         └───────────────┬────────────────────┘
                         │
                   Crop Oluştur
                    (ekim tarihi)
                         │
                         ▼
         ┌────────────────────────────────────┐
         │      SEEDING Aşaması                │
         │   - Crop.plantedDate set           │
         │   - Ekim işlemleri                 │
         └───────────────┬────────────────────┘
                         │
              İlk Irrigation İşlemi
                         │
                         ▼
         ┌────────────────────────────────────┐
         │      IRRIGATION Aşaması             │
         │   - Sulama başladı                 │
         │   - Dominant activity              │
         └───────────────┬────────────────────┘
                         │
          İlk Fertilizing Process (FertilizerKullanımı)
                         │
                         ▼
         ┌────────────────────────────────────┐
         │      FERTILIZING Aşaması            │
         │   - Gübreleme başladı              │
         │   - Dominant activity              │
         └───────────────┬────────────────────┘
                         │
               Harvest Kaydı Oluştur
                         │
                         ▼
         ┌────────────────────────────────────┐
         │      HARVESTING Aşaması             │
         │   - Hasat başladı                  │
         │   - CropPeriod.endDate set         │
         └───────────────┬────────────────────┘
                         │
            Hasat Tamamlandı
                         │
                         ▼
         ┌────────────────────────────────────┐
         │      CLOSED Aşaması                 │
         │   - Dönem kapandı                  │
         │   - Yeni PREPARATION periyodu      │
         │     oluşturuldu otomatik           │
         └────────────────────────────────────┘
```

---

## 🔄 Otomatik Geçişler (Triggers)

### 1️⃣ PREPARATION → SEEDING

**Tetikleyici**: `Crop.create(fieldId, plantedDate, ...)`

```typescript
// app/api/crops/route.ts (POST)
export async function POST(request: Request) {
  const { fieldId, name, cropType, plantedDate, ...rest } = await request.json();

  const crop = await prisma.$transaction(async (tx) => {
    // 1. Crop oluştur
    const newCrop = await tx.crop.create({
      data: {
        name,
        cropType,
        plantedDate: new Date(plantedDate),
        fieldId,
        status: "GROWING",
        // ... rest
      }
    });

    // 2. 🎯 Aktif CropPeriod'u bul ve güncelle
    const activePeriod = await tx.cropPeriod.findFirst({
      where: {
        fieldId,
        status: "PREPARATION",
        cropId: null,
      },
      orderBy: { startDate: "desc" }
    });

    if (activePeriod) {
      // PREPARATION → SEEDING
      await tx.cropPeriod.update({
        where: { id: activePeriod.id },
        data: {
          cropId: newCrop.id,
          status: "SEEDING",
        }
      });
    } else {
      // Eğer PREPARATION period yoksa oluştur (ilk ekim)
      await tx.cropPeriod.create({
        data: {
          fieldId,
          seasonId: /* mevcut active season */,
          cropId: newCrop.id,
          startDate: new Date(plantedDate),
          status: "SEEDING",
        }
      });
    }

    return newCrop;
  });

  return NextResponse.json(crop);
}
```

### 2️⃣ SEEDING → IRRIGATION

**Tetikleyici**: İlk `IrrigationLog.create()` (bu field + crop için)

```typescript
// app/api/irrigation/route.ts (POST)
export async function POST(request: Request) {
  const { fieldId, ...irrigationData } = await request.json();

  const irrigation = await prisma.$transaction(async (tx) => {
    // 1. Irrigation oluştur
    const newIrrigation = await tx.irrigationLog.create({
      data: {
        ...irrigationData,
        fieldId,
        status: "DRAFT",
      }
    });

    // 2. 🎯 Aktif CropPeriod'u bul
    const activePeriod = await tx.cropPeriod.findFirst({
      where: {
        fieldId,
        status: "SEEDING", // Şu an SEEDING aşamasında
      }
    });

    if (activePeriod) {
      // SEEDING → IRRIGATION
      await tx.cropPeriod.update({
        where: { id: activePeriod.id },
        data: {
          status: "IRRIGATION",
          cropPeriodId: newIrrigation.id, // İlişki kur
        }
      });

      // Irrigation'ı bu period'a bağla
      await tx.irrigationLog.update({
        where: { id: newIrrigation.id },
        data: { cropPeriodId: activePeriod.id }
      });
    }

    return newIrrigation;
  });

  return NextResponse.json(irrigation);
}
```

### 3️⃣ IRRIGATION → FERTILIZING

**Tetikleyici**: İlk `Process` (type: "FERTILIZING" veya "PESTICIDE")

```typescript
// app/api/processes/route.ts (POST)
export async function POST(request: Request) {
  const { fieldId, type, ...processData } = await request.json();

  const process = await prisma.$transaction(async (tx) => {
    // 1. Process oluştur
    const newProcess = await tx.process.create({
      data: {
        ...processData,
        fieldId,
        type,
        status: "DRAFT",
      }
    });

    // 2. 🎯 Aktif CropPeriod'u bul
    const activePeriod = await tx.cropPeriod.findFirst({
      where: {
        fieldId,
        status: { in: ["IRRIGATION", "FERTILIZING"] }, // IRRIGATION veya FERTILIZING
      }
    });

    // 3. Eğer FERTILIZING process ise, geçişi tetikle
    if (
      activePeriod &&
      ["FERTILIZING", "PESTICIDE"].includes(type) &&
      activePeriod.status === "IRRIGATION"
    ) {
      // IRRIGATION → FERTILIZING
      await tx.cropPeriod.update({
        where: { id: activePeriod.id },
        data: {
          status: "FERTILIZING",
        }
      });
    }

    // 4. Process'i period'a bağla
    if (activePeriod) {
      await tx.process.update({
        where: { id: newProcess.id },
        data: { cropPeriodId: activePeriod.id }
      });
    }

    return newProcess;
  });

  return NextResponse.json(process);
}
```

### 4️⃣ FERTILIZING → HARVESTING

**Tetikleyici**: `Harvest.create()`

```typescript
// app/api/harvests/route.ts (POST)
export async function POST(request: Request) {
  const { cropId, fieldId, harvestDate, ...harvestData } = await request.json();

  const harvest = await prisma.$transaction(async (tx) => {
    // 1. Harvest oluştur
    const newHarvest = await tx.harvest.create({
      data: {
        ...harvestData,
        cropId,
        fieldId,
        harvestDate: new Date(harvestDate),
      }
    });

    // 2. Crop'u HARVESTED yap
    await tx.crop.update({
      where: { id: cropId },
      data: {
        status: "HARVESTED",
        harvestDate: new Date(harvestDate),
      }
    });

    // 3. 🎯 Aktif CropPeriod'u bul ve HARVESTING'e geç
    const activePeriod = await tx.cropPeriod.findFirst({
      where: {
        fieldId,
        cropId,
        status: { in: ["SEEDING", "IRRIGATION", "FERTILIZING"] }, // Aktif olan
      }
    });

    if (activePeriod) {
      // → HARVESTING
      await tx.cropPeriod.update({
        where: { id: activePeriod.id },
        data: {
          status: "HARVESTING",
        }
      });
    }

    return newHarvest;
  });

  return NextResponse.json(harvest);
}
```

### 5️⃣ HARVESTING → CLOSED + YENİ PREPARATION

**Tetikleyici**: Hasat tamamlandı (endpoint veya scheduled job)

```typescript
// app/api/crops/[cropId]/finalize-harvest/route.ts (POST)
export async function POST(
  request: Request,
  { params }: { params: { cropId: string } }
) {
  const { cropId } = await params;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Crop'u bul
    const crop = await tx.crop.findUnique({
      where: { id: cropId },
      include: { period: true }
    });

    if (!crop) throw new Error("Crop bulunamadı");

    // 2. Mevcut period'u CLOSED yap
    const currentPeriod = await tx.cropPeriod.findFirst({
      where: {
        cropId,
        status: "HARVESTING",
      }
    });

    if (currentPeriod) {
      await tx.cropPeriod.update({
        where: { id: currentPeriod.id },
        data: {
          status: "CLOSED",
          endDate: new Date(),
        }
      });

      // 3. 🎯 OTOMATIK YENİ PREPARATION PERIOD OLUŞTUR
      const newPeriod = await tx.cropPeriod.create({
        data: {
          fieldId: crop.fieldId,
          seasonId: currentPeriod.seasonId, // Aynı sezon devam
          // cropId: null, // Henüz belirlenmeyecek
          startDate: new Date(), // Yarın başlayacak
          status: "PREPARATION",
          // name: otomatik generate edilebilir
        }
      });

      return {
        closedPeriod: currentPeriod,
        newPeriod: newPeriod,
        message: "Hasat tamamlandı, yeni dönem başladı"
      };
    }

    return null;
  });

  return NextResponse.json(result);
}
```

---

## 🎯 Active CropPeriod Belirleme

### Kullanım
Her operation (Process, Irrigation) oluşturulurken:

```typescript
// lib/crop-period/get-active-period.ts
export async function getActiveCropPeriod(
  fieldId: string,
  tx?: PrismaClient
): Promise<CropPeriod | null> {
  const prismaInstance = tx || prisma;

  // PREPARATION veya SEEDING veya IRRIGATION veya FERTILIZING
  const activePeriod = await prismaInstance.cropPeriod.findFirst({
    where: {
      fieldId,
      status: {
        in: ["PREPARATION", "SEEDING", "IRRIGATION", "FERTILIZING"]
      }
    },
    orderBy: { startDate: "desc" }
  });

  return activePeriod || null;
}
```

### Örnek Kullanım
```typescript
const activePeriod = await getActiveCropPeriod(fieldId, tx);

if (activePeriod) {
  // Operation'ı aktif period'a bağla
  await tx.process.create({
    data: {
      // ...
      cropPeriodId: activePeriod.id,
    }
  });
}
```

---

## 📝 Lifecycle Durum Tablosu

| Aşama | Trigger | cropId | Status | Açıklama |
|-------|---------|--------|--------|----------|
| 0 | CropPeriod oluştur | null | PREPARATION | Hasat sonrası otomatik |
| 1 | Crop oluştur | ✅ Set | SEEDING | Ekim başlandı |
| 2 | İlk IrrigationLog | ✅ Set | IRRIGATION | Sulama başladı |
| 3 | İlk Fertilizing | ✅ Set | FERTILIZING | Gübreleme başladı |
| 4 | Harvest.create | ✅ Set | HARVESTING | Hasat başladı |
| 5 | finalize-harvest | ✅ Set | CLOSED | Dönem kapandı |
| → | Otomatik yeni | null | PREPARATION | Yeni dönem başladı |

---

## ⚡ Edge Cases ve Çözümleri

### Durum 1: Hasat Kaydı Oluşturulmadan Process
```
Seeding → Fertilizing → Irrigating
↓ (Hasat kaydı oluşturulmadı)
CLOSED aşamasına geçmez

Çözüm: Hasat kaydı olmadan period HARVESTING durumuna geçmiyor
```

### Durum 2: Ara Ürün (İntercropping)
```
Tarla A:
├─ Buğday (ana ürün)
└─ Fiğ (ara ürün) - aynı anda

Çözüm: İlişki yapısı bunu desteklemiyor ama future feature olabilir
Şimdilik: Seçenek A veya B (crop türüne göre track)
```

### Durum 3: Mevsim Değişikliği
```
Season 2024 sonlandırılırsa?
↓
CropPeriod.seasonId değişmez (data integrity)
Raporlar season bazında filterlenebilir

Çözüm: Cascade delete yerine no-action kullan
```

### Durum 4: Aynı Anda İki Process
```
Sulama + Gübreleme aynı gün
↓
İlki trigger yapılır, ikincisi status değiştirmez

Çözüm: Order by createdAt veya ilk significant operation wins
```

---

## 📋 Service Katmanı Yapısı

```
lib/crop-period/
├── get-active-period.ts          # Aktif period bulma
├── lifecycle-transitions.ts       # Otomatik geçişler
├── status-determinant.ts         # Durum belirleme logic
└── validators.ts                 # Durum geçişi validasyonu
```

---

## ✅ Implementation Checklist

- [ ] Transition logic service yazıldı
- [ ] getActiveCropPeriod yazıldı
- [ ] Crop.create tetiklemesi eklendi
- [ ] IrrigationLog.create tetiklemesi eklendi
- [ ] Process.create tetiklemesi eklendi
- [ ] Harvest.create tetiklemesi eklendi
- [ ] finalize-harvest endpoint oluşturuldu
- [ ] Edge case'ler test edildi
- [ ] TypeScript types doğru
- [ ] Transactionlar güvenli

