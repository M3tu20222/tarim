# Data Migration Stratejisi

## 📊 Durum Analizi

### Eski Veriler
```
Tarla A Aralık 2023 - Haziran 2024:
├─ Crop (Buğday)
│  ├─ id: crop-001
│  ├─ plantedDate: 2023-12-28
│  ├─ harvestDate: 2024-06-19
│  └─ status: HARVESTED
│
├─ Process 1 (Sürme - Ekim öncesi)
│  ├─ date: 2023-12-20
│  ├─ seasonId: season-2024
│  └─ cropPeriodId: null ← PROBLEM
│
├─ Process 2 (Gübreleme - Bahar)
│  ├─ date: 2024-03-15
│  ├─ seasonId: season-2024
│  └─ cropPeriodId: null ← PROBLEM
│
└─ Harvest
   ├─ cropId: crop-001
   ├─ harvestDate: 2024-06-19
   └─ seasonId: season-2024
```

### Hedef Durum
```
CropPeriod (Buğday 2023-2024)
├─ id: period-001
├─ cropId: crop-001
├─ fieldId: field-a
├─ seasonId: season-2024
├─ startDate: 2023-12-20 (ilk process tarihi)
├─ endDate: 2024-06-19 (hasat tarihi)
├─ status: CLOSED
└─
    Process 1 (Sürme)
    ├─ date: 2023-12-20
    ├─ seasonId: season-2024
    └─ cropPeriodId: period-001 ✅

    Process 2 (Gübreleme)
    ├─ date: 2024-03-15
    ├─ seasonId: season-2024
    └─ cropPeriodId: period-001 ✅

    FieldExpense 1
    ├─ sourceId: process-1
    ├─ seasonId: season-2024
    └─ cropPeriodId: period-001 ✅

    FieldExpense 2
    ├─ sourceId: process-2
    ├─ seasonId: season-2024
    └─ cropPeriodId: period-001 ✅

    Harvest
    ├─ cropId: crop-001
    ├─ seasonId: season-2024
    └─ cropPeriodId: period-001 ✅ (opsiyonel)
```

---

## 🔄 Migration Stratejisi

### Phase 1: Tespit Et

#### 1.1 Tüm Crop'ları ve Process'leri Tespit Et
```typescript
// Eski veriler
const allCrops = await prisma.crop.findMany({
  include: {
    field: true,
    harvests: {
      orderBy: { harvestDate: "asc" }
    }
  },
  orderBy: { plantedDate: "asc" }
});

const allProcesses = await prisma.process.findMany({
  include: { field: true },
  orderBy: { date: "asc" }
});

const allIrrigations = await prisma.irrigationLog.findMany({
  include: { fieldUsages: true },
  orderBy: { startDateTime: "asc" }
});
```

#### 1.2 Mapping Oluştur: Crop → Tarih Aralığı
```typescript
interface CropTimeline {
  cropId: string;
  fieldId: string;
  cropName: string;
  plantedDate: Date;
  harvestDate?: Date;
  startDate: Date;  // İlk process tarihi
  endDate?: Date;   // Hasat tarihi
  seasonId: string;
  status: "PREPARATION" | "SEEDING" | "HARVESTING" | "CLOSED";
}

// Mapping tablosu oluştur
const cropTimelines: CropTimeline[] = allCrops.map(crop => ({
  cropId: crop.id,
  fieldId: crop.fieldId,
  cropName: crop.name,
  plantedDate: crop.plantedDate,
  harvestDate: crop.harvestDate,
  startDate: crop.plantedDate, // İlk process tarihi bulmak lazım
  endDate: crop.harvestDate,
  seasonId: crop.seasonId,
  status: crop.status === "HARVESTED" ? "CLOSED" : "SEEDING"
}));
```

### Phase 2: CropPeriod'lar Oluştur

#### 2.1 Her Crop için CropPeriod Oluştur
```typescript
export async function migrateCropPeriods() {
  const failedCrops: any[] = [];

  for (const timeline of cropTimelines) {
    try {
      // CropPeriod oluştur
      const period = await prisma.cropPeriod.create({
        data: {
          cropId: timeline.cropId,
          fieldId: timeline.fieldId,
          seasonId: timeline.seasonId,
          startDate: timeline.startDate,
          endDate: timeline.endDate,
          status: timeline.status,
          name: `${timeline.cropName} (${timeline.plantedDate.getFullYear()})`
        }
      });

      console.log(`✅ CropPeriod oluşturuldu: ${period.id}`);

      // Mapping'e period ID'sini ekle (sonraki step'te kullanacağız)
      timeline.periodId = period.id;
    } catch (error) {
      console.error(`❌ ${timeline.cropName} migrat edilemedi:`, error);
      failedCrops.push(timeline);
    }
  }

  return {
    total: cropTimelines.length,
    success: cropTimelines.length - failedCrops.length,
    failed: failedCrops
  };
}
```

### Phase 3: Process'leri Güncelle

#### 3.1 Her Process'i İlgili CropPeriod'a Bağla
```typescript
export async function migrateProcesses() {
  const failedProcesses: any[] = [];

  for (const process of allProcesses) {
    try {
      // Bu process hangi crop dönemiyle eşleşir?
      const matchingTimeline = cropTimelines.find(tl => {
        // Aynı field ve
        // Ekim tarihinden sonra ve
        // Hasat tarihinden önce (veya hasat yok)
        return (
          tl.fieldId === process.fieldId &&
          process.date >= tl.startDate &&
          (!tl.endDate || process.date <= tl.endDate)
        );
      });

      if (matchingTimeline) {
        // Process'i CropPeriod'a bağla
        await prisma.process.update({
          where: { id: process.id },
          data: { cropPeriodId: matchingTimeline.periodId }
        });

        console.log(`✅ Process ${process.id} → Period ${matchingTimeline.periodId}`);
      } else {
        // Eşleşen crop yoksa, yeni CropPeriod'a bağla (hazırlık aşaması)
        const orphanPeriod = await createOrphanCropPeriod(
          process.fieldId,
          process.date,
          process.seasonId
        );

        await prisma.process.update({
          where: { id: process.id },
          data: { cropPeriodId: orphanPeriod.id }
        });

        console.log(`⚠️  Process ${process.id} → Yeni PREPARATION Period`);
      }
    } catch (error) {
      console.error(`❌ Process ${process.id} migrat edilemedi:`, error);
      failedProcesses.push(process);
    }
  }

  return {
    total: allProcesses.length,
    success: allProcesses.length - failedProcesses.length,
    failed: failedProcesses
  };
}

async function createOrphanCropPeriod(fieldId: string, date: Date, seasonId: string) {
  return prisma.cropPeriod.create({
    data: {
      fieldId,
      seasonId,
      // cropId: null,
      startDate: date,
      status: "PREPARATION",
      name: `Hazırlık Dönemi (${date.toLocaleDateString('tr-TR')})`
    }
  });
}
```

### Phase 4: Irrigation'ları Güncelle

#### 4.1 Her Irrigation'ı İlgili CropPeriod'a Bağla
```typescript
export async function migrateIrrigations() {
  const failedIrrigations: any[] = [];

  for (const irrigation of allIrrigations) {
    try {
      // Bu irrigation'ın fieldlerini bul
      const irrigatedFieldIds = irrigation.fieldUsages.map(fu => fu.fieldId);

      if (irrigatedFieldIds.length === 0) continue;

      // İlk field'a göre period'u bul (ve diğerleri aynı olmalı)
      const matchingTimeline = cropTimelines.find(tl => {
        return (
          irrigatedFieldIds.includes(tl.fieldId) &&
          irrigation.startDateTime >= tl.startDate &&
          (!tl.endDate || irrigation.startDateTime <= tl.endDate)
        );
      });

      if (matchingTimeline) {
        await prisma.irrigationLog.update({
          where: { id: irrigation.id },
          data: { cropPeriodId: matchingTimeline.periodId }
        });

        console.log(`✅ Irrigation ${irrigation.id} → Period ${matchingTimeline.periodId}`);
      } else {
        // Hazırlık aşaması
        const orphanPeriod = await createOrphanCropPeriod(
          irrigatedFieldIds[0],
          irrigation.startDateTime,
          irrigation.seasonId || "season-unknown"
        );

        await prisma.irrigationLog.update({
          where: { id: irrigation.id },
          data: { cropPeriodId: orphanPeriod.id }
        });

        console.log(`⚠️  Irrigation ${irrigation.id} → Yeni PREPARATION Period`);
      }
    } catch (error) {
      console.error(`❌ Irrigation ${irrigation.id} migrat edilemedi:`, error);
      failedIrrigations.push(irrigation);
    }
  }

  return {
    total: allIrrigations.length,
    success: allIrrigations.length - failedIrrigations.length,
    failed: failedIrrigations
  };
}
```

### Phase 5: Gider Kayıtlarını Güncelle

#### 5.1 FieldExpense'leri Güncelle
```typescript
export async function migrateExpenses() {
  const failedExpenses: any[] = [];

  const allExpenses = await prisma.fieldExpense.findMany({
    include: { field: true }
  });

  for (const expense of allExpenses) {
    try {
      // Source'u bul (Process veya Irrigation)
      let sourceCropPeriodId: string | null = null;

      if (expense.sourceType === "PROCESS" && expense.sourceId) {
        const process = await prisma.process.findUnique({
          where: { id: expense.sourceId }
        });
        sourceCropPeriodId = process?.cropPeriodId || null;
      } else if (expense.sourceType === "IRRIGATION" && expense.sourceId) {
        const irrigation = await prisma.irrigationLog.findUnique({
          where: { id: expense.sourceId }
        });
        sourceCropPeriodId = irrigation?.cropPeriodId || null;
      }

      // FieldExpense'i güncelle
      if (sourceCropPeriodId) {
        await prisma.fieldExpense.update({
          where: { id: expense.id },
          data: { cropPeriodId: sourceCropPeriodId }
        });

        console.log(`✅ Expense ${expense.id} → Period ${sourceCropPeriodId}`);
      } else {
        console.log(`⚠️  Expense ${expense.id} → cropPeriodId kalacak null`);
      }
    } catch (error) {
      console.error(`❌ Expense ${expense.id} migrat edilemedi:`, error);
      failedExpenses.push(expense);
    }
  }

  return {
    total: allExpenses.length,
    success: allExpenses.length - failedExpenses.length,
    failed: failedExpenses
  };
}
```

---

## 🚀 Migration Script Çalıştırma

### Dosya Oluştur

`scripts/migrate-to-crop-periods.ts`:
```typescript
import { prisma } from "@/lib/prisma";

async function main() {
  console.log("🚀 CropPeriod Migration Başlıyor...\n");

  try {
    // Phase 1: Tespit
    console.log("📊 Phase 1: Crop'lar Tespit Ediliyor...");
    const analysis = await analyzeCrops();
    console.log(`  ✅ ${analysis.totalCrops} crop bulundu\n`);

    // Phase 2: CropPeriod'lar oluştur
    console.log("📝 Phase 2: CropPeriod'lar Oluşturuluyor...");
    const periodResult = await migrateCropPeriods();
    console.log(`  ✅ ${periodResult.success}/${periodResult.total} başarılı\n`);

    // Phase 3: Process'ler güncelle
    console.log("🔗 Phase 3: Process'ler Güncelleniyor...");
    const processResult = await migrateProcesses();
    console.log(`  ✅ ${processResult.success}/${processResult.total} başarılı\n`);

    // Phase 4: Irrigation'lar güncelle
    console.log("💧 Phase 4: Irrigation'lar Güncelleniyor...");
    const irrigationResult = await migrateIrrigations();
    console.log(`  ✅ ${irrigationResult.success}/${irrigationResult.total} başarılı\n`);

    // Phase 5: Gider kayıtları güncelle
    console.log("💰 Phase 5: Gider Kayıtları Güncelleniyor...");
    const expenseResult = await migrateExpenses();
    console.log(`  ✅ ${expenseResult.success}/${expenseResult.total} başarılı\n`);

    // Özet
    console.log("=====================================");
    console.log("📋 MIGRATION ÖZET");
    console.log("=====================================");
    console.log(`CropPeriods: ${periodResult.success}/${periodResult.total}`);
    console.log(`Processes: ${processResult.success}/${processResult.total}`);
    console.log(`Irrigations: ${irrigationResult.success}/${irrigationResult.total}`);
    console.log(`Expenses: ${expenseResult.success}/${expenseResult.total}`);
    console.log("=====================================\n");

    // Hata raporu
    if (periodResult.failed.length > 0 || processResult.failed.length > 0) {
      console.log("⚠️  BAŞARISIZ İŞLEMLER:");
      console.log("CropPeriod Hataları:", periodResult.failed.length);
      console.log("Process Hataları:", processResult.failed.length);
      console.log("Irrigation Hataları:", irrigationResult.failed.length);
      console.log("Expense Hataları:", expenseResult.failed.length);
    } else {
      console.log("✅ TÜM MIGRATION'LAR BAŞARILI!");
    }
  } catch (error) {
    console.error("❌ Migration başarısız:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

### Çalıştırma
```bash
# Development
npx ts-node scripts/migrate-to-crop-periods.ts

# Sonuç dosyasına kaydet (opsiyonel)
npx ts-node scripts/migrate-to-crop-periods.ts > migration-log.txt 2>&1
```

---

## ⚠️ Dikkat Edilecekler

### Geri Alma Stratejisi
```bash
# Eğer migration başarısız olursa:
# 1. Veritabanı backup'ından restore et
# 2. Hataları logdan oku
# 3. Script'i düzelt
# 4. Yeniden çalıştır
```

### Null CropPeriodId
- Bazı eski veriler null cropPeriodId ile kalabilir
- Bu normal, gelmişken oluşturulan işlemleri temsil eder
- Raporlama için bunu ignore et veya "Unknown Period" olarak göster

### Consistency Kontrol
```typescript
// Migration sonrası doğrulama
const nullCropPeriods = await prisma.process.count({
  where: { cropPeriodId: null }
});

if (nullCropPeriods > 0) {
  console.log(`⚠️  ${nullCropPeriods} process hala cropPeriodId: null`);
}
```

---

## ✅ Checklist

- [ ] Backup alındı (prod'da mutlaka!)
- [ ] Script yazıldı ve test edildi (dev/test env'de)
- [ ] Tüm phase'ler başarılı
- [ ] Hata logları kontrol edildi
- [ ] Consistency kontrol edildi
- [ ] UI'ı null cropPeriodId'yi handle ediyor
- [ ] Raporlar doğru çalışıyor

