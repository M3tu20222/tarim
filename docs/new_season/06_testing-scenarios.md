# Test Senaryoları ve Örnekler

## 🎯 Test Stratejisi

```
Unit Tests (Functions)
   ↓
Integration Tests (APIs)
   ↓
End-to-End Tests (Full Workflows)
   ↓
Manual Tests (UI/UX)
```

---

## 1️⃣ UNIT TESTS - Services

### Test 1.1: getActiveCropPeriod()

```typescript
describe("getActiveCropPeriod", () => {
  it("should return active period for field", async () => {
    // Setup
    const field = await createTestField();
    const period = await createTestCropPeriod({
      fieldId: field.id,
      status: "SEEDING"
    });

    // Act
    const result = await getActiveCropPeriod(field.id);

    // Assert
    expect(result).toBeDefined();
    expect(result.id).toBe(period.id);
    expect(result.status).toBe("SEEDING");
  });

  it("should ignore closed periods", async () => {
    const field = await createTestField();

    // Closed period
    await createTestCropPeriod({
      fieldId: field.id,
      status: "CLOSED"
    });

    // Active period
    const activePeriod = await createTestCropPeriod({
      fieldId: field.id,
      status: "IRRIGATION"
    });

    const result = await getActiveCropPeriod(field.id);
    expect(result.id).toBe(activePeriod.id);
  });

  it("should return null if no active period", async () => {
    const field = await createTestField();

    const result = await getActiveCropPeriod(field.id);
    expect(result).toBeNull();
  });

  it("should return most recent period", async () => {
    const field = await createTestField();

    const period1 = await createTestCropPeriod({
      fieldId: field.id,
      status: "PREPARATION",
      startDate: new Date("2024-01-01")
    });

    const period2 = await createTestCropPeriod({
      fieldId: field.id,
      status: "PREPARATION",
      startDate: new Date("2024-06-01")
    });

    const result = await getActiveCropPeriod(field.id);
    expect(result.id).toBe(period2.id); // Most recent
  });
});
```

### Test 1.2: Status Transitions

```typescript
describe("CropPeriod Status Transitions", () => {
  it("should transition PREPARATION to SEEDING on crop create", async () => {
    const field = await createTestField();
    const period = await createTestCropPeriod({
      fieldId: field.id,
      cropId: null,
      status: "PREPARATION"
    });

    // Create crop
    const crop = await createTestCrop({
      fieldId: field.id,
      plantedDate: new Date()
    });

    // Transition should happen in Crop.create API
    // Verify:
    const updatedPeriod = await prisma.cropPeriod.findUnique({
      where: { id: period.id }
    });

    expect(updatedPeriod.cropId).toBe(crop.id);
    expect(updatedPeriod.status).toBe("SEEDING");
  });

  it("should transition SEEDING to IRRIGATION on first irrigation", async () => {
    const { crop, period } = await createCropWithPeriod({ status: "SEEDING" });

    // Create irrigation
    const irrigation = await createTestIrrigation({
      fieldId: crop.fieldId
    });

    // Verify:
    const updatedPeriod = await prisma.cropPeriod.findUnique({
      where: { id: period.id }
    });

    expect(updatedPeriod.status).toBe("IRRIGATION");
    expect(irrigation.cropPeriodId).toBe(period.id);
  });

  it("should transition IRRIGATION to FERTILIZING on fertilizer process", async () => {
    const { crop, period } = await createCropWithPeriod({ status: "IRRIGATION" });

    // Create fertilizing process
    const process = await createTestProcess({
      fieldId: crop.fieldId,
      type: "FERTILIZING"
    });

    // Verify:
    const updatedPeriod = await prisma.cropPeriod.findUnique({
      where: { id: period.id }
    });

    expect(updatedPeriod.status).toBe("FERTILIZING");
    expect(process.cropPeriodId).toBe(period.id);
  });

  it("should transition to HARVESTING on harvest create", async () => {
    const { crop, period } = await createCropWithPeriod({
      status: "FERTILIZING"
    });

    // Create harvest
    await createTestHarvest({
      cropId: crop.id,
      fieldId: crop.fieldId,
      harvestDate: new Date()
    });

    // Verify:
    const updatedPeriod = await prisma.cropPeriod.findUnique({
      where: { id: period.id }
    });

    expect(updatedPeriod.status).toBe("HARVESTING");
  });

  it("should transition HARVESTING to CLOSED and create new PREPARATION", async () => {
    const { crop, period } = await createCropWithPeriod({
      status: "HARVESTING"
    });

    // Finalize harvest
    const result = await finalizeCropPeriod(period.id);

    // Verify old period
    const closedPeriod = await prisma.cropPeriod.findUnique({
      where: { id: period.id }
    });
    expect(closedPeriod.status).toBe("CLOSED");
    expect(closedPeriod.endDate).toBeDefined();

    // Verify new period
    expect(result.newPeriod).toBeDefined();
    expect(result.newPeriod.status).toBe("PREPARATION");
    expect(result.newPeriod.cropId).toBeNull();
    expect(result.newPeriod.fieldId).toBe(crop.fieldId);
  });
});
```

---

## 2️⃣ INTEGRATION TESTS - APIs

### Senaryo 2.1: Arpa Döngüsü

```typescript
describe("Scenario: Wheat Crop Cycle", () => {
  let fieldId: string;
  let seasonId: string;

  beforeAll(async () => {
    const field = await createTestField();
    fieldId = field.id;

    const season = await createTestSeason({ isActive: true });
    seasonId = season.id;
  });

  it("should create PREPARATION period on harvest", async () => {
    // Önceki hasat
    const { crop: previousCrop } = await createCropWithPeriod({
      fieldId,
      status: "HARVESTING",
      startDate: new Date("2024-01-01")
    });

    // Finalize harvest → Yeni PREPARATION period
    await finalizeCropPeriod(previousCrop.periodId);

    // Verify new PREPARATION period
    const newPeriod = await getActiveCropPeriod(fieldId);
    expect(newPeriod).toBeDefined();
    expect(newPeriod.status).toBe("PREPARATION");
    expect(newPeriod.cropId).toBeNull();
  });

  it("should link plowing process to PREPARATION period", async () => {
    // Sürme işlemi (Hazırlık aşaması)
    const response = await fetch("/api/processes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldId,
        type: "PLOWING",
        date: new Date("2024-07-20"),
        seasonId,
        description: "Toprak hazırlığı"
      })
    });

    const process = await response.json();

    // Verify
    expect(process.cropPeriodId).toBeDefined();

    const period = await prisma.cropPeriod.findUnique({
      where: { id: process.cropPeriodId }
    });
    expect(period.status).toBe("PREPARATION");
    expect(period.cropId).toBeNull();
  });

  it("should transition to SEEDING on crop create", async () => {
    // Arpa ekimi
    const response = await fetch("/api/crops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldId,
        name: "Arpa",
        cropType: "BARLEY",
        plantedDate: new Date("2024-08-15"),
        seasonId
      })
    });

    const crop = await response.json();

    // Verify
    const period = await getActiveCropPeriod(fieldId);
    expect(period.status).toBe("SEEDING");
    expect(period.cropId).toBe(crop.id);
  });

  it("should transition to IRRIGATION on first irrigation", async () => {
    // Sulama
    const response = await fetch("/api/irrigation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wellId: "well-123",
        startDateTime: new Date("2024-09-15"),
        duration: 120,
        seasonId,
        fieldIds: [fieldId]
      })
    });

    const irrigation = await response.json();

    // Verify
    expect(irrigation.cropPeriodId).toBeDefined();

    const period = await prisma.cropPeriod.findUnique({
      where: { id: irrigation.cropPeriodId }
    });
    expect(period.status).toBe("IRRIGATION");
  });

  it("should track expenses correctly for crop period", async () => {
    // Expense report
    const response = await fetch(
      `/api/fields/${fieldId}/profit-loss/${seasonId}?cropPeriodId=${period.id}`,
      { headers: { "Content-Type": "application/json" } }
    );

    const report = await response.json();

    // Verify
    expect(report.data.expensesByPeriod[period.id]).toBeDefined();
    expect(report.data.expensesByPeriod[period.id].expenses.length).toBeGreaterThan(0);
  });

  it("should finalize crop and create new period", async () => {
    // Hasat
    await fetch("/api/harvests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cropId: cropId,
        fieldId: fieldId,
        harvestDate: new Date("2025-06-15"),
        quantity: 5000
      })
    });

    // Finalize harvest
    const response = await fetch(
      `/api/crops/${cropId}/finalize-harvest`,
      { method: "POST" }
    );

    const result = await response.json();

    // Verify old period CLOSED
    expect(result.closedPeriod.status).toBe("CLOSED");
    expect(result.closedPeriod.endDate).toBeDefined();

    // Verify new PREPARATION period
    expect(result.newPeriod.status).toBe("PREPARATION");
    expect(result.newPeriod.cropId).toBeNull();
  });
});
```

### Senaryo 2.2: Multi-Crop Cycle

```typescript
describe("Scenario: Wheat → Beans → Corn (Multi-Crop per Season)", () => {
  let fieldId: string;

  it("should handle three crops in one season", async () => {
    const field = await createTestField();
    fieldId = field.id;

    // 1️⃣ Arpa (Ocak - Haziran)
    const wheat = await createAndCompleteWheat(fieldId);
    expect(wheat.periods[0].status).toBe("CLOSED");

    // 2️⃣ Fasulye (Haziran - Ekim)
    const beans = await createAndCompleteBeansAfterWheat(fieldId);
    expect(beans.periods[0].status).toBe("CLOSED");

    // 3️⃣ Mısır (Ekim - Mayıs)
    const corn = await createAndCompleteCornAfterBeans(fieldId);
    expect(corn.periods[0].status).toBe("CLOSED");

    // Verify all periods exist
    const allPeriods = await prisma.cropPeriod.findMany({
      where: { fieldId }
    });

    expect(allPeriods.length).toBe(3);
    allPeriods.forEach(p => expect(p.status).toBe("CLOSED"));
  });

  it("should attribute costs correctly per crop", async () => {
    // Her crop'ın giderleri ayrı olmalı
    const wheatExpenses = await prisma.fieldExpense.findMany({
      where: {
        fieldId,
        cropPeriodId: wheat.periodId
      }
    });

    const beansExpenses = await prisma.fieldExpense.findMany({
      where: {
        fieldId,
        cropPeriodId: beans.periodId
      }
    });

    const cornExpenses = await prisma.fieldExpense.findMany({
      where: {
        fieldId,
        cropPeriodId: corn.periodId
      }
    });

    expect(wheatExpenses.length).toBeGreaterThan(0);
    expect(beansExpenses.length).toBeGreaterThan(0);
    expect(cornExpenses.length).toBeGreaterThan(0);

    // Verify separation
    const totalCost = wheatExpenses.reduce((s, e) => s + e.totalCost, 0);
    expect(totalCost).toBeGreaterThan(0);
  });
});
```

---

## 3️⃣ EDGE CASE TESTS

### Edge Case 3.1: Hasat Olmadan Finalize

```typescript
describe("Edge Case: Finalize without harvest", () => {
  it("should handle period without harvest record", async () => {
    const { crop, period } = await createCropWithPeriod({
      status: "GROWING"
    });

    // Hasat kaydı oluşturmadan finalize çağırsa?
    const response = await fetch(
      `/api/crops/${crop.id}/finalize-harvest`,
      { method: "POST" }
    );

    // Should handle gracefully
    if (response.ok) {
      const result = await response.json();
      expect(result.closedPeriod).toBeDefined();
    } else {
      // veya error dönmeli
      expect(response.status).toBeGreaterThanOrEqual(400);
    }
  });
});
```

### Edge Case 3.2: Aynı Anda İki Process

```typescript
describe("Edge Case: Simultaneous operations", () => {
  it("should handle plowing + irrigation on same day", async () => {
    const field = await createTestField();

    // Aynı gün hem sürme hem sulama
    const [plowing, irrigation] = await Promise.all([
      fetch("/api/processes", {
        method: "POST",
        body: JSON.stringify({
          fieldId: field.id,
          type: "PLOWING",
          date: new Date("2024-07-20")
        })
      }),
      fetch("/api/irrigation", {
        method: "POST",
        body: JSON.stringify({
          fieldId: field.id,
          startDateTime: new Date("2024-07-20"),
          duration: 120
        })
      })
    ]);

    const pData = await plowing.json();
    const iData = await irrigation.json();

    // Both should be linked to same period
    expect(pData.cropPeriodId).toBe(iData.cropPeriodId);
  });
});
```

### Edge Case 3.3: Season Change During Crop

```typescript
describe("Edge Case: Season change during growing", () => {
  it("should keep same season for crop period", async () => {
    const field = await createTestField();
    const season2024 = await createTestSeason({ name: "2024", isActive: true });

    // Crop oluştur
    const crop = await createTestCrop({
      fieldId: field.id,
      seasonId: season2024.id
    });

    // Season değiştir
    const season2025 = await createTestSeason({
      name: "2025",
      isActive: true
    });

    // Crop'un period'unun seasonId değişmemeli
    const period = await prisma.cropPeriod.findFirst({
      where: { cropId: crop.id }
    });

    expect(period.seasonId).toBe(season2024.id);
  });
});
```

---

## 4️⃣ MANUAL TESTING CHECKLIST

### Checklist 4.1: UI Fonksiyonelliği

```
☑️ Yeni crop oluşturduktan sonra:
  □ Process list'te period bilgisi gösteriliyor
  □ Irrigation list'te period bilgisi gösteriliyor

☑️ Process oluşturduğunda:
  □ Correct period atandı
  □ Status transition tetiklendi
  □ Console errors yok

☑️ Irrigation oluşturduğunda:
  □ Correct period atandı
  □ Status transition tetiklendi
  □ fieldUsages correct period'a bağlı

☑️ Hasat kaydı oluşturduğunda:
  □ Crop.status = HARVESTED
  □ Period.status = HARVESTING

☑️ finalize-harvest çağrıldığında:
  □ Period.status = CLOSED
  □ Yeni PREPARATION period oluştu
  □ UI açılır/closed period'u gösteriyor
```

### Checklist 4.2: Raporlama

```
☑️ Profit/Loss Raporu:
  □ Season bazında filtreleme çalışıyor
  □ CropPeriod dropdown'da tüm periods gösteriliyor
  □ CropPeriod seçince expenses filtreleniyor
  □ By-period grouping gösteriliyor
  □ Toplam maliyetler doğru hesaplanıyor

☑️ Field Detail Page:
  □ Crop bilgisi gösteriliyor (period bazında)
  □ Expenses gösteriliyor
  □ Timeline gösteriliyor (preparation → seeding → ... → closed)
```

### Checklist 4.3: Performance

```
☑️ Database:
  □ Query'ler slow değil
  □ Indexes kullanılıyor
  □ No N+1 queries

☑️ API Response:
  □ < 200ms normal operasyonlar
  □ Bulk operations < 1s

☑️ UI:
  □ Page load < 2s
  □ Form submit < 500ms
  □ No lag on list rendering
```

---

## ✅ Test Execution Plan

```
1. Unit Tests (2 hours)
   npm test -- __tests__/lib/crop-period

2. Integration Tests (2 hours)
   npm test -- __tests__/api

3. E2E Tests (1 hour)
   npm run test:e2e

4. Manual Testing (2 hours)
   Dev server açıp scenario'ları test et

5. Performance Testing (1 hour)
   DevTools → Performance tab
```

**Total Testing Time**: ~8 hours

