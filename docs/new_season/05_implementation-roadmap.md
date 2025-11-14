# Implementation Roadmap - Phase-by-Phase

## 📅 Timeline & Phases

```
Phase 1: Schema & Infrastructure (1-2 days)
   ↓
Phase 2: Lifecycle Services (1 day)
   ↓
Phase 3: API Updates (2 days)
   ↓
Phase 4: Data Migration (1 day)
   ↓
Phase 5: Testing & Fixes (1-2 days)
   ↓
Phase 6: UI Updates (1 day)
   ↓
Phase 7: Deployment (1 day)
```

---

## PHASE 1: Schema & Infrastructure

### Süre: 1-2 Gün

#### 1.1 Prisma Schema Güncellemesi
**Dosya**: `prisma/schema.prisma`

```typescript
// Yapılacaklar:
1. CropPeriodStatus enum ekle
2. CropPeriod model ekle
3. Process'e cropPeriodId ekle
4. IrrigationLog'a cropPeriodId ekle
5. FieldExpense'e cropPeriodId ekle
6. Season'a cropPeriods relation ekle
7. Field'a cropPeriods relation ekle
8. Crop'a periods relation ekle
```

**Checklist**:
- [ ] Schema dosyası güncellendi
- [ ] Syntax hataları kontrol edildi
- [ ] Relations doğru kuruldu
- [ ] Index'ler eklendi

#### 1.2 Prisma Migration
```bash
# Terminal
npx prisma migrate dev --name add_crop_period_system

# Oluşturulan dosya: prisma/migrations/[timestamp]_add_crop_period_system/
```

**Checklist**:
- [ ] Migration başarılı
- [ ] DB'de yeni tablo oluştu
- [ ] Relations doğru kuruldu
- [ ] Mevcut veriler korundu

#### 1.3 Prisma Client Regenerate
```bash
npx prisma generate
```

**Checklist**:
- [ ] Types güncellendi
- [ ] TypeScript hataları yok

#### 1.4 TypeScript Tipleri
**Dosya**: `lib/types/crop-period.ts` (YENİ)

```typescript
import { CropPeriodStatus } from "@prisma/client";

export interface CropPeriodWithRelations {
  id: string;
  cropId: string | null;
  fieldId: string;
  seasonId: string;
  startDate: Date;
  endDate: Date | null;
  status: CropPeriodStatus;
  crop?: Crop | null;
  field?: Field;
  season?: Season;
  processes?: Process[];
  irrigationLogs?: IrrigationLog[];
  createdAt: Date;
  updatedAt: Date;
}

export enum CropPeriodPhase {
  PREPARATION = "PREPARATION",
  SEEDING = "SEEDING",
  IRRIGATION = "IRRIGATION",
  FERTILIZING = "FERTILIZING",
  HARVESTING = "HARVESTING",
  CLOSED = "CLOSED"
}
```

**Checklist**:
- [ ] Types yazıldı
- [ ] Exports doğru

---

## PHASE 2: Lifecycle Services

### Süre: 1 Gün

#### 2.1 Active Period Service
**Dosya**: `lib/crop-period/get-active-period.ts`

```typescript
// Yapılacaklar:
1. getActiveCropPeriod function yazıldı
   - fieldId'ye göre aktif period bul
   - Status: PREPARATION, SEEDING, IRRIGATION, FERTILIZING
   - Ordering: startDate DESC (en yeni)
2. Error handling
3. Tests
```

**Checklist**:
- [ ] Function yazıldı
- [ ] TypeScript types doğru
- [ ] Error cases handle ediliyor
- [ ] Tests yazıldı

#### 2.2 Status Transition Service
**Dosya**: `lib/crop-period/lifecycle-transitions.ts`

```typescript
// Yapılacaklar:
1. updateCropPeriodToSeeding()
   - PREPARATION → SEEDING
2. updateCropPeriodToIrrigation()
   - SEEDING → IRRIGATION
3. updateCropPeriodToFertilizing()
   - IRRIGATION → FERTILIZING
4. updateCropPeriodToHarvesting()
   - * → HARVESTING
5. finalizeCropPeriod()
   - * → CLOSED + yeni PREPARATION oluştur
6. createPreparationPeriod()
   - Hasat sonrası otomatik PREPARATION
```

**Checklist**:
- [ ] Tüm transition functions yazıldı
- [ ] Transaction logic doğru
- [ ] Otomatik PREPARATION oluşturuluyor
- [ ] Tests yazıldı

#### 2.3 Validation Service
**Dosya**: `lib/crop-period/validators.ts`

```typescript
// Yapılacaklar:
1. canTransitionTo()
   - Hangi durumundan nereye geçebilir?
   - PREPARATION → SEEDING ✅
   - SEEDING → IRRIGATION ✅
   - IRRIGATION → FERTILIZING ✅
   - * → HARVESTING ✅
   - HARVESTING → CLOSED ✅
2. isValidTransition()
   - Geçiş valid mi?
```

**Checklist**:
- [ ] Validators yazıldı
- [ ] State machine logic doğru
- [ ] Tests yazıldı

---

## PHASE 3: API Updates

### Süre: 2 Gün

#### 3.1 Crop API
**Dosya**: `app/api/crops/route.ts`

```typescript
// Yapılacaklar:
1. POST /api/crops
   - cropPeriod lifecycle tetikle
   - updateCropPeriodToSeeding() çağır
2. PUT /api/crops/:id (varsa)
   - cropPeriod statüsünü güncellemeleri handle et
3. Error handling
```

**Checklist**:
- [ ] POST /api/crops güncellendi
- [ ] cropPeriod lifecycle tetikleniyor
- [ ] Tests yazıldı
- [ ] Error cases test edildi

#### 3.2 Process API
**Dosya**: `app/api/processes/route.ts` & `app/api/processes/[id]/finalize/route.ts`

```typescript
// Yapılacaklar:
1. POST /api/processes
   - getActiveCropPeriod() çağır
   - cropPeriodId otomatik ata
   - FERTILIZING ise status geçişini tetikle
2. POST /api/processes/:id/finalize
   - FieldExpense'e cropPeriodId ekle
   - ProcessCost'a cropId ekle
3. Error handling
```

**Checklist**:
- [ ] POST /api/processes güncellendi
- [ ] cropPeriodId otomatik atanıyor
- [ ] Finalize cropPeriodId yazıyor
- [ ] Tests yazıldı

#### 3.3 Irrigation API
**Dosya**: `app/api/irrigation/route.ts` & `app/api/irrigation/:id/finalize/route.ts`

```typescript
// Yapılacaklar:
1. POST /api/irrigation
   - getActiveCropPeriod() çağır
   - cropPeriodId otomatik ata
   - SEEDING ise IRRIGATION'a geç
2. POST /api/irrigation/:id/finalize
   - IrrigationFieldExpense'e cropPeriodId ekle
   - IrrigationCost'a cropId ekle
3. Error handling
```

**Checklist**:
- [ ] POST /api/irrigation güncellendi
- [ ] cropPeriodId otomatik atanıyor
- [ ] Status transition çalışıyor
- [ ] Tests yazıldı

#### 3.4 Harvest API
**Dosya**: `app/api/harvests/route.ts` & YENİ `app/api/crops/:id/finalize-harvest/route.ts`

```typescript
// Yapılacaklar:
1. POST /api/harvests
   - Crop.status → HARVESTED
   - CropPeriod.status → HARVESTING
2. POST /api/crops/:id/finalize-harvest (YENİ)
   - CropPeriod.status → CLOSED
   - CropPeriod.endDate ayarla
   - Yeni PREPARATION period oluştur
3. Error handling
```

**Checklist**:
- [ ] POST /api/harvests güncellendi
- [ ] YENİ endpoint oluşturuldu
- [ ] HARVESTING status tetikleniyor
- [ ] CLOSED + yeni PREPARATION tetikleniyor
- [ ] Tests yazıldı

#### 3.5 Profit/Loss Report API
**Dosya**: `app/api/fields/:id/profit-loss/:seasonId/route.ts`

```typescript
// Yapılacaklar:
1. Optional cropPeriodId query param desteği
2. cropPeriodId varsa: cropPeriodId'ye filtrele
3. Yoksa: seasonId'ye filtrele (backward compat)
4. Response'e cropPeriod bilgisi ekle
5. expensesByPeriod gruplandırması
```

**Checklist**:
- [ ] Query param desteği eklendi
- [ ] Filtering logic doğru
- [ ] Response formatı doğru
- [ ] Backward compatible
- [ ] Tests yazıldı

---

## PHASE 4: Data Migration

### Süre: 1 Gün

#### 4.1 Migration Script Yazma
**Dosya**: `scripts/migrate-to-crop-periods.ts`

```typescript
// Yapılacaklar:
1. migrateCropPeriods() - CropPeriod'lar oluştur
2. migrateProcesses() - Process'leri bağla
3. migrateIrrigations() - Irrigation'ları bağla
4. migrateExpenses() - FieldExpense'leri bağla
5. Error handling ve logging
6. Hata raporu
```

**Checklist**:
- [ ] Script yazıldı
- [ ] Test env'de çalıştırıldı
- [ ] Hata handling var
- [ ] Logging var
- [ ] Null değerler handle edildi

#### 4.2 Test Migration (Dev Environment)
```bash
# Test veritabanında çalıştır
npm run db:seed  # Test verisi oluştur
npx ts-node scripts/migrate-to-crop-periods.ts
```

**Checklist**:
- [ ] Dev env'de başarılı
- [ ] Sayılar doğru
- [ ] Hata yok
- [ ] Log incelendi

#### 4.3 Migration Raporu
**Dosya**: `migration-log.txt`

```
Migration Özet:
- CropPeriods: 245/245 ✅
- Processes: 1203/1203 ✅
- Irrigations: 567/567 ✅
- Expenses: 2015/2015 ✅

Sorunlar: Yok ✅
```

**Checklist**:
- [ ] Rapor oluşturuldu
- [ ] İncelendi ve onaylandı

---

## PHASE 5: Testing & Fixes

### Süre: 1-2 Gün

#### 5.1 Unit Tests
**Dosya**: `__tests__/lib/crop-period/*.test.ts`

```typescript
// Test Cases:
1. getActiveCropPeriod()
   - Valid field bulur
   - Yanlış field null döner
2. updateCropPeriodToSeeding()
   - PREPARATION → SEEDING geçer
   - Yeni period oluşturur
3. Lifecycle transitions
   - Tüm geçişler test edilir
4. Edge cases
   - Aynı anda iki status change
   - Hasat kaydı olmadan finalize
```

**Checklist**:
- [ ] Unit tests yazıldı
- [ ] %90+ coverage
- [ ] Tüm tests pass

#### 5.2 Integration Tests
**Dosya**: `__tests__/api/*.integration.test.ts`

```typescript
// Test Cases:
1. Crop oluştur → Period oluştur
2. Process oluştur → Period'a bağla
3. Irrigation oluştur → Status change
4. Harvest oluştur → HARVESTING
5. finalize-harvest → CLOSED + yeni PREPARATION
6. Expense reports cropPeriodId ile
```

**Checklist**:
- [ ] Integration tests yazıldı
- [ ] API çağrıları test edildi
- [ ] Transaction logic test edildi
- [ ] Tüm tests pass

#### 5.3 Manual Testing (Dev Server'da)
```
1. Yeni crop oluştur → CropPeriod'ın status check et
2. Process ekle → cropPeriodId set edildi mi?
3. Irrigation ekle → Status IRRIGATION'a gitti mi?
4. Hasat ekle → Status HARVESTING'e gitti mi?
5. finalize-harvest → Yeni PREPARATION period oluştu mu?
6. Profit/loss raporu → cropPeriodId'ye göre filtrele
```

**Checklist**:
- [ ] Dev server çalışıyor
- [ ] Tüm senaryolar test edildi
- [ ] No console errors
- [ ] No TypeScript errors

#### 5.4 Edge Cases
```
1. Hasat kaydı olmadan process
2. Process olmadan hasat
3. Multi-crop aynı tarla
4. Aynı anda iki operation
5. Season değişimi sırasında
6. Eski veriler (null cropPeriodId)
```

**Checklist**:
- [ ] Tüm edge cases identify edildi
- [ ] Fixes yazıldı
- [ ] Tests yazıldı

---

## PHASE 6: UI Updates

### Süre: 1 Gün

#### 6.1 Process Form
**Dosya**: `components/processes/process-form.tsx`

```typescript
// Yapılacaklar:
1. CropPeriod desteği (opsiyonel göster)
   - Otomatik seçilmiş olacak
   - Kullanıcı değiştirebilir mi?
2. Response'den cropPeriodId göster
```

**Checklist**:
- [ ] Form güncellendi
- [ ] Otomatik period gösteriliyor
- [ ] Tests yazıldı

#### 6.2 Irrigation Form
**Dosya**: `components/irrigation/irrigation-form.tsx`

```typescript
// Yapılacaklar:
1. CropPeriod desteği (opsiyonel göster)
2. Response'den cropPeriodId göster
```

**Checklist**:
- [ ] Form güncellendi
- [ ] Otomatik period gösteriliyor

#### 6.3 Profit/Loss Report
**Dosya**: `components/reports/profit-loss-report.tsx`

```typescript
// Yapılacaklar:
1. CropPeriod filter desteği
2. Dropdown'da periods göster
3. By-period grouping göster
```

**Checklist**:
- [ ] Rapor güncellendi
- [ ] Filter çalışıyor
- [ ] Grouping gösteriliyor

#### 6.4 Dashboard Lists
**Dosya**: Tüm list components

```typescript
// Yapılacaklar:
1. CropPeriod bilgisi göster (opsiyonel)
2. Filter by cropPeriod (opsiyonel)
```

**Checklist**:
- [ ] Lists güncellendi
- [ ] cropPeriod bilgisi gösteriliyor

---

## PHASE 7: Deployment

### Süre: 1 Gün

#### 7.1 Pre-Deployment Checklist
```
☑️ Tüm tests pass
☑️ No TypeScript errors
☑️ No console errors
☑️ Migration script test edildi
☑️ Backup planı var
☑️ Rollback planı var
☑️ Stakeholders onay verdi
```

#### 7.2 Deployment Steps
```bash
# 1. Production backup
pg_dump production_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Deploy code
git push origin main
# Vercel otomatik deploy edecek

# 3. Migration çalıştır (Staging'de test et önce)
# Staging
npx ts-node scripts/migrate-to-crop-periods.ts

# Production (eğer staging OK ise)
npx ts-node scripts/migrate-to-crop-periods.ts

# 4. Verification
# - UI'ı kontrol et
# - Yeni operations test et
# - Reports kontrol et
```

#### 7.3 Monitoring
```
1. Error logs kontrol et
2. Database performance kontrol et
3. API response times kontrol et
4. Kullanıcılar tarafından feedback topla
```

**Checklist**:
- [ ] Code deployed
- [ ] Database migrated
- [ ] Tests passed in production
- [ ] No errors in logs
- [ ] Performance OK

#### 7.4 Dokümantasyon Update
```
- Release notes yazıldı
- User guide updated
- API docs updated
```

**Checklist**:
- [ ] Dokümantasyon updated
- [ ] Release notes yayınlandı

---

## 📊 Risk Management

### High Risk Items
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Migration başarısız | Data loss | Backup + test env'de önce |
| Backward compatibility | API breaks | Keeping seasonId field |
| Performance degrade | Slow queries | Add indexes + monitoring |
| User confusion | Support burden | Good UI feedback |

### Rollback Plan
```
1. Migration başarısız:
   → git revert
   → Backup'dan restore et
   → Issue fix et
   → Tekrar dene

2. Production bug:
   → Hotfix yazıldı ve tested
   → Deploy ediliyor
   → Monitoring artırılıyor
```

---

## ✅ Overall Checklist

- [ ] Phase 1: Schema ✅
- [ ] Phase 2: Services ✅
- [ ] Phase 3: APIs ✅
- [ ] Phase 4: Migration ✅
- [ ] Phase 5: Testing ✅
- [ ] Phase 6: UI ✅
- [ ] Phase 7: Deployment ✅
- [ ] Post-Deployment Monitoring ✅

