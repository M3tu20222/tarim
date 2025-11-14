# CropPeriod System - Genel Bakış (Overview)

## 🎯 Problem Statement

### Mevcut Durum
Sistem her şeyi **global statik Season'a** bağlıyor. Örneğin:
- **28 Ekim**: Arpa ekilir → Process.seasonId = "2024 Sezonu"
- **19 Haziran**: Arpa hasat edilir → Harvest.seasonId = "2024 Sezonu"
- **24 Ağustos**: Toprak hazırlığı (sürme, gübre) → Process.seasonId = "2024 Sezonu"
- **25 Haziran**: Fasulye ekilir → Crop.seasonId = "2024 Sezonu"

### Sorun
```
Arpa Hasat: 19 Haziran
    ↓
24 Ağustos: Sürme işlemi (Fasulye için hazırlık!)
    ├─ Mevcut sistem: FieldExpense.seasonId = "2024" (Arpa'ya yazılır) ❌
    └─ İstenen: Fasulye'nin giderlerine yazılması ✅
```

Arpa döneminin bitişinden sonra yapılan tüm işler (sürme, gübre vs.) otomatik olarak **bir sonraki ürün**e atanmalı, ama mevcut sistemde statik global season kullanılıyor.

---

## ✅ Çözüm: CropPeriod System

### Temel Konsept
Her ürünün (crop) için **bağımsız bir dönem (CropPeriod)** oluşturmak:

```
Tarla A Ürün Dönemleri:
├─ CropPeriod 1: Arpa
│  ├─ startDate: 28 Ekim (ekim hazırlığı)
│  ├─ plantDate: 28 Ekim (ekim)
│  ├─ harvestDate: 19 Haziran
│  └─ endDate: 19 Haziran (dönem kapandı)
│
├─ CropPeriod 2: Fasulye (OTOMATIK OLUŞTUR!)
│  ├─ startDate: 20 Haziran (hasat sonrası hazırlık)
│  ├─ plantDate: 25 Haziran
│  ├─ harvestDate: 27 Ekim
│  └─ endDate: 27 Ekim
│
└─ CropPeriod 3: Mısır (OTOMATIK OLUŞTUR!)
   ├─ startDate: 28 Ekim
   ├─ plantDate: 2 Kasım
   └─ ...
```

### Otomatik Lifecycle
```
1. Arba Hasat Kaydı
   ↓
   ✅ CropPeriod (Arpa).status = CLOSED
   ✅ Yeni CropPeriod (PREPARATION) oluştur (fasulye için)

2. Toprak Hazırlığı (Sürme, Gübre)
   ↓
   ✅ Otomatik aktif CropPeriod'a bağlan (PREPARATION)

3. Fasulye Ekimi
   ↓
   ✅ CropPeriod.status = SEEDING
   ✅ Crop oluştur, CropPeriod'a bağla
```

---

## 📊 Temel Değişiklikler

### 1. Yeni Model: CropPeriod

```prisma
model CropPeriod {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId

  // İlişkiler
  crop        Crop?    @relation(fields: [cropId], references: [id])
  cropId      String?  @db.ObjectId    // Null = PREPARATION aşaması

  field       Field    @relation(fields: [fieldId], references: [id])
  fieldId     String   @db.ObjectId

  season      Season   @relation(fields: [seasonId], references: [id])
  seasonId    String   @db.ObjectId

  // Tarihler
  startDate   DateTime  // Hazırlık başlangıcı
  endDate     DateTime? // Dönem bitiş (hasat sonu)

  // Durum
  status      CropPeriodStatus @default(PREPARATION)

  // İşletme kayıtları
  processes           Process[]
  irrigationLogs      IrrigationLog[]
  fieldExpenses       FieldExpense[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum CropPeriodStatus {
  PREPARATION   // Toprak hazırlığı, sürme, gübre
  SEEDING       // Ekim aşaması
  IRRIGATION    // Sulama dönemi
  FERTILIZING   // Gübreleme aşaması
  HARVESTING    // Hasat aşaması
  CLOSED        // Dönem kapandı
}
```

### 2. Mevcut Modellere Eklenecekler

```prisma
model Process {
  cropPeriodId  String?  @db.ObjectId
  cropPeriod    CropPeriod?  @relation(...)
}

model IrrigationLog {
  cropPeriodId  String?  @db.ObjectId
  cropPeriod    CropPeriod?  @relation(...)
}

model FieldExpense {
  cropPeriodId  String?  @db.ObjectId
  cropPeriod    CropPeriod?  @relation(...)
}
```

---

## 🔄 Hayat Döngüsü (Lifecycle)

### PREPARATION Aşaması
**Tetikleyici**: CropPeriod oluştur (hasat sonrası otomatik)
- Toprak hazırlığı başlar (sürme, gübre)
- Tüm işlemler bu CropPeriod'a bağlanır
- Crop henüz oluşturulmamış (cropId = null)

### SEEDING Aşaması
**Tetikleyici**: Crop oluştur
- Ekim başlanmış
- CropPeriod.cropId = YeniCrop.id
- CropPeriod.status = SEEDING

### IRRIGATION Aşaması
**Tetikleyici**: İlk sulama kaydı
- Ekim tamamlandı, sulama başladı
- CropPeriod.status = IRRIGATION

### FERTILIZING Aşaması
**Tetikleyici**: İlk gübreleme işlemi
- Gübreleme başladı
- CropPeriod.status = FERTILIZING

### HARVESTING Aşaması
**Tetikleyici**: Hasat kaydı oluştur
- Hasat başladı
- CropPeriod.status = HARVESTING

### CLOSED Aşaması
**Tetikleyici**: Hasat tamamlandı
- CropPeriod.endDate = harvestDate
- CropPeriod.status = CLOSED
- 🎯 **OTOMATIK**: Yeni CropPeriod (PREPARATION) oluştur

---

## 💰 Gider Atama Mantığı (Expense Attribution)

### Mevcut (Yanlış)
```
Process.seasonId → FieldExpense.seasonId
Sonuç: Tüm işler global season'a yazılır
```

### Yeni (Doğru)
```
Process.cropPeriodId → FieldExpense.cropPeriodId
Sonuç: Her işlem doğru ürünün dönemine yazılır
```

### Örnek
```typescript
// Arpa sonrası sürme işlemi (24 Ağustos)
const process = await createProcess({
  type: "PLOWING",
  date: "2024-08-24",
  fieldId: "field-a"
});

// Sistem otomatik olarak:
// 1. getActiveCropPeriod("field-a") çağrır
// 2. Fasulye PREPARATION dönemini bulur
// 3. process.cropPeriodId = "fasulye-preparation-period"
// 4. FieldExpense bu period'a yazılır ✅
```

---

## 📈 Beklenen Sonuçlar

### Seçenek 1: Tek Ürün / Sezon
```
Buğday Hasat (15 Temmuz)
  ↓
Aynı tarlaya sürme işlemi (24 Ağustos)
  ↓
SONUÇ: Sürme işi başka bir dönemin giderine yazılır (null/hazırlık)
```

### Seçenek 2: Multi Crop / Sezon
```
Arpa (28 Ekim - 19 Haziran)
  ↓
Fasulye (25 Haziran - 27 Ekim)
  ↓
Mısır (2 Kasım - sonraki Haziran)
  ↓
SONUÇ: Her ürünün kendi dönemindeki giderleri ayrı tutuluyor
```

---

## 📋 Dosya Yapısı (Bu Klasörde)

| Dosya | İçerik | Okuma Sırasıyla |
|-------|--------|-----------------|
| `00_overview.md` | Genel bakış ve problem statement | 1️⃣ |
| `01_schema-changes.md` | Prisma schema değişiklikleri detaylı | 2️⃣ |
| `02_crop-lifecycle.md` | Lifecycle servisleri ve otomatik geçişler | 3️⃣ |
| `03_api-changes.md` | API route değişiklikleri | 4️⃣ |
| `04_migration-strategy.md` | Eski veri migration | 5️⃣ |
| `05_implementation-roadmap.md` | Phase-by-phase plan | 6️⃣ |
| `06_testing-scenarios.md` | Test senaryoları | 7️⃣ |

---

## ✨ Özet

| Aspekt | Eski Sistem | Yeni Sistem |
|--------|------------|-----------|
| **Gider Atama** | Global Season | CropPeriod (ürün bazlı) |
| **Hasat Sonrası İşler** | Eski ürüne yazılır ❌ | Yeni ürüne yazılır ✅ |
| **Ara Ürün Desteği** | Sınırlı | Tam destek |
| **Lifecycle Tracking** | Season level | Crop level |
| **Komplekslik** | Basit | Orta |
| **Doğruluk** | Düşük | Yüksek |

