# Schema Değişiklikleri Detaylı

## 📝 Prisma Schema Güncellemeleri

### 1. YENİ MODEL: CropPeriod

```prisma
model CropPeriod {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId

  // Temel İlişkiler
  crop        Crop?    @relation("CropToPeriod", fields: [cropId], references: [id], onDelete: SetNull)
  cropId      String?  @db.ObjectId
  // Açıklama: cropId nullable çünkü PREPARATION aşamasında henüz ürün belirlenmemiş

  field       Field    @relation("FieldToCropPeriod", fields: [fieldId], references: [id], onDelete: Cascade)
  fieldId     String   @db.ObjectId

  season      Season   @relation("SeasonToCropPeriod", fields: [seasonId], references: [id], onDelete: Cascade)
  seasonId    String   @db.ObjectId
  // Açıklama: CropPeriod daima bir season'a bağlı (global sezon yapısını korumak için)

  // Tarihler
  startDate   DateTime
  endDate     DateTime?
  // Açıklama:
  // startDate: Hazırlık aşaması başlangıcı (hasat sonrası ertesi gün)
  // endDate: Hasat sonrası alan temizliği tamamlandığında

  // Durum / Lifecycle
  status      CropPeriodStatus @default(PREPARATION)
  // Açıklama: Ürün döneminin hangi aşamasında olduğu

  // Operasyon İlişkileri
  processes           Process[]
  irrigationLogs      IrrigationLog[]
  fieldExpenses       FieldExpense[]
  // Açıklama: Bu dönem içindeki tüm işlemleri track eder

  // Audit
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([fieldId])
  @@index([cropId])
  @@index([seasonId])
  @@index([status])
}

enum CropPeriodStatus {
  PREPARATION   // 0: Toprak hazırlığı, sürme, gübre, fidan hazırlığı
  SEEDING       // 1: Ekim yapılıyor
  IRRIGATION    // 2: Sulama dönemi başladı (dominant activity)
  FERTILIZING   // 3: Gübreleme dönemi (dominant activity)
  HARVESTING    // 4: Hasat başladı
  CLOSED        // 5: Dönem kapandı, yeni dönem başladı
}
```

### 2. Crop Model Güncellemesi

```prisma
// MEVCUT
model Crop {
  id          String     @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  cropType    CropType   @default(OTHER)
  plantedDate DateTime   // ← Zaten var, değişmez
  harvestDate DateTime?  // ← Zaten var, değişmez
  status      CropStatus @default(GROWING)
  notes       String?

  // Mevcut ilişkiler
  season      Season?    @relation(fields: [seasonId], references: [id])
  seasonId    String?    @db.ObjectId
  field       Field      @relation(fields: [fieldId], references: [id])
  fieldId     String     @db.ObjectId

  // ✨ YENİ: CropPeriod ilişkisi
  periods     CropPeriod[]  @relation("CropToPeriod")

  // Diğer mevcut ilişkiler...
  agroDailyFeatures   AgroFeatureDaily[]
  harvests            Harvest[]
  // ... rest unchanged
}
```

**Açıklama**:
- Crop ← → CropPeriod arasında 1:Many ilişki (bir crop'un birden fazla period'u olmayacak ama yapısal olarak açık tutuyoruz)
- Mevcut `seasonId` ve `fieldId` korunuyor (backward compat)

### 3. Process Model Güncellemesi

```prisma
// MEVCUT
model Process {
  id          String        @id @default(auto()) @map("_id") @db.ObjectId
  type        ProcessType   // PLOWING, SEEDING, FERTILIZING, PESTICIDE, HARVESTING, OTHER
  status      ProcessStatus @default(DRAFT)
  date        DateTime
  description String?

  // Mevcut ilişkiler
  field       Field?        @relation(fields: [fieldId], references: [id])
  fieldId     String?       @db.ObjectId
  seasonId    String?       @db.ObjectId // Korunuyor
  season      Season?       @relation(fields: [seasonId], references: [id])
  createdBy   User          @relation("ProcessCreatedBy", fields: [createdById], references: [id])
  createdById String        @db.ObjectId

  // ✨ YENİ: CropPeriod ilişkisi
  cropPeriod    CropPeriod?  @relation(fields: [cropPeriodId], references: [id], onDelete: SetNull)
  cropPeriodId  String?      @db.ObjectId
  // Açıklama: Process hangi ürün dönemine ait

  // Mevcut ilişkiler devam
  inventoryUsages InventoryUsage[]
  equipmentUsages EquipmentUsage[]
  processCosts    ProcessCost[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([cropPeriodId])
  @@index([fieldId])
  @@index([seasonId])
}
```

### 4. IrrigationLog Model Güncellemesi

```prisma
model IrrigationLog {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  startDateTime   DateTime
  duration        Float
  status          String   @default("DRAFT")

  // Mevcut ilişkiler
  well            Well     @relation(fields: [wellId], references: [id])
  wellId          String   @db.ObjectId
  seasonId        String?  @db.ObjectId // Korunuyor
  season          Season?  @relation(fields: [seasonId], references: [id])
  createdBy       User     @relation("IrrigationCreatedBy", fields: [createdById], references: [id])
  createdById     String   @db.ObjectId

  // ✨ YENİ: CropPeriod ilişkisi
  cropPeriod      CropPeriod?  @relation(fields: [cropPeriodId], references: [id], onDelete: SetNull)
  cropPeriodId    String?      @db.ObjectId

  // Mevcut ilişkiler devam
  fieldUsages     IrrigationFieldUsage[]
  inventoryUsages IrrigationInventoryUsage[]
  irrigationCosts IrrigationCost[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([cropPeriodId])
  @@index([wellId])
  @@index([seasonId])
}
```

### 5. FieldExpense Model Güncellemesi

```prisma
model FieldExpense {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId

  // Mevcut ilişkiler
  field       Field    @relation(fields: [fieldId], references: [id])
  fieldId     String   @db.ObjectId
  season      Season   @relation(fields: [seasonId], references: [id])
  seasonId    String   @db.ObjectId // Korunuyor

  // ✨ YENİ: CropPeriod ilişkisi
  cropPeriod  CropPeriod?  @relation(fields: [cropPeriodId], references: [id], onDelete: SetNull)
  cropPeriodId String?     @db.ObjectId

  // Gider bilgileri
  totalCost   Float
  description String?
  expenseDate DateTime?
  sourceType  String?    // "PROCESS", "IRRIGATION", "MANUAL"
  sourceId    String?    // Process ID veya Irrigation ID

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([fieldId])
  @@index([seasonId])
  @@index([cropPeriodId])
}
```

### 6. Season Model Güncellemesi (Minimal)

```prisma
model Season {
  // ... tüm mevcut alanlar ...

  // ✨ YENİ: CropPeriod ilişkisi
  cropPeriods  CropPeriod[]  @relation("SeasonToCropPeriod")

  // ... rest unchanged ...
}
```

### 7. Field Model Güncellemesi (Minimal)

```prisma
model Field {
  // ... tüm mevcut alanlar ...

  // ✨ YENİ: CropPeriod ilişkisi
  cropPeriods  CropPeriod[]  @relation("FieldToCropPeriod")

  // ... rest unchanged ...
}
```

---

## 🔗 İlişki Diyagramı

```
Season (1) ──────── (Many) CropPeriod
  │
  └─ Crops

Field (1) ──────── (Many) CropPeriod
  │
  └─ Crops

Crop (1) ──────── (0 or 1) CropPeriod
           (primary crop for this period)

CropPeriod (1) ──────── (Many) Process
CropPeriod (1) ──────── (Many) IrrigationLog
CropPeriod (1) ──────── (Many) FieldExpense
```

---

## 📋 Migration Command

```bash
# 1. Schema dosyasını güncelle (üstteki değişiklikleri ekle)

# 2. Prisma migration oluştur
npx prisma migrate dev --name add_crop_period_system

# 3. Prisma client regenerate et
npx prisma generate
```

---

## ⚠️ Backward Compatibility

### Korunacak Alanlar
- `Process.seasonId` - Eski sorgular çalışmaya devam etsin
- `IrrigationLog.seasonId` - Eski API'ler çalışmaya devam etsin
- `FieldExpense.seasonId` - Raporlar bozulmasın

### Yeni Alanlar Nullable
- `Process.cropPeriodId` - Nullable (migration sırasında null kalabilir)
- `IrrigationLog.cropPeriodId` - Nullable
- `FieldExpense.cropPeriodId` - Nullable

### Taşıma Stratejisi
Eski veriler:
1. `cropPeriodId = null` olarak kalır
2. Migration script'i sonradan bunları doldurur (bkz. 04_migration-strategy.md)
3. Yeni veriler direkt olarak doğru `cropPeriodId` ile kaydedilir

---

## 🔍 İndeks Stratejisi

```prisma
// CropPeriod üzerinde:
@@index([fieldId])           // Tarla bazlı sorgular
@@index([cropId])            // Ürün bazlı sorgular
@@index([seasonId])          // Sezon bazlı sorgular
@@index([status])            // Durum filtrelemeleri

// Process/IrrigationLog üzerinde:
@@index([cropPeriodId])      // CropPeriod ilişkisi
@@index([fieldId])           // Mevcut
@@index([seasonId])          // Mevcut
```

---

## 📊 Veri Tipleri ve Sınırlamalar

| Alan | Tip | Nullable | Default | Açıklama |
|------|-----|----------|---------|----------|
| `CropPeriod.cropId` | String ObjectId | ✅ | - | Null = PREPARATION aşaması |
| `CropPeriod.fieldId` | String ObjectId | ❌ | - | Zorunlu |
| `CropPeriod.seasonId` | String ObjectId | ❌ | - | Zorunlu |
| `CropPeriod.startDate` | DateTime | ❌ | - | Zorunlu |
| `CropPeriod.endDate` | DateTime | ✅ | null | Hasat sonu belirlendikten sonra |
| `CropPeriod.status` | Enum | ❌ | PREPARATION | Zorunlu |
| `Process.cropPeriodId` | String ObjectId | ✅ | null | Migration sonrası doldurulur |
| `IrrigationLog.cropPeriodId` | String ObjectId | ✅ | null | Migration sonrası doldurulur |
| `FieldExpense.cropPeriodId` | String ObjectId | ✅ | null | Migration sonrası doldurulur |

---

## ✅ Checklist

- [ ] Schema.prisma dosyasını güncelle
- [ ] Prisma migration oluştur (`npx prisma migrate dev`)
- [ ] Prisma client regenerate et (`npx prisma generate`)
- [ ] TypeScript hataları kontrol et
- [ ] Yeni types import et (CropPeriodStatus enum)
- [ ] Eski modeller hala çalışıyor mu test et

