# Sahiplik Bazlı Maliyet Dağıtım Sistemi

## 1. Mevcut Kuyu Faturası Dağıtım Mantığı

Sistemde kuyu faturaları şu mantıkla dağıtılıyor:
- Her tarlanın farklı sahiplik oranları var (`FieldOwnership.percentage`)
- Sulama süresine ve alan büyüklüğüne göre maliyet hesaplanıyor
- Sahip bazında toplu borç kaydı oluşturuluyor

### A. Dağıtım Algoritması (Mevcut)
```typescript
// 1. Her log için tarla-sahip ikilisine pay hesapla
const durationForFieldOwner = (areaOfField / totalAreaInLog) * logDuration * ownerPercentage

// 2. Toplam süreye göre maliyet dağıt
const shareAmount = (ownerTotalDuration / totalCalculatedDuration) * totalAmount
```

## 2. Hasat Maliyet Dağıtımı İçin Genişletilmiş Sistem

### A. Yeni Model: ProcessOwnerExpense

```typescript
ProcessOwnerExpense {
  id: String pk
  processId: String fk -> Process.id
  fieldId: String fk -> Field.id
  ownerId: String fk -> User.id
  ownershipPercentage: Float    // Sahibin tarladaki payı
  
  // Maliyet Kalemleri (sahip payı)
  laborCostShare: Float         // İşçilik maliyeti payı
  equipmentCostShare: Float     // Ekipman maliyeti payı
  fuelCostShare: Float         // Yakıt maliyeti payı
  inventoryCostShare: Float    // Envanter maliyeti payı
  otherCostShare: Float        // Diğer maliyetler payı
  totalCostShare: Float        // Toplam maliyet payı
  
  // Hasat Özel Alanları
  harvestQuantityShare: Float?  // Hasat miktarı payı (kg/ton)
  harvestQualityGrade: String? // Kalite sınıfı
  
  // Otomatik Hesaplanan Alanlar
  costPerDecare: Float         // Bu sahip için dekar başına maliyet
  costPerKg: Float?           // Bu sahip için kg başına maliyet
  
  createdAt: DateTime
  updatedAt: DateTime
}
```

### B. Yeni Model: FieldOwnerRevenue

```typescript
FieldOwnerRevenue {
  id: String pk
  fieldId: String fk -> Field.id
  seasonId: String fk -> Season.id
  ownerId: String fk -> User.id
  ownershipPercentage: Float
  
  // Satış Gelirleri
  totalSalesRevenue: Float     // Toplam satış geliri payı
  avgSalePrice: Float         // Ortalama satış fiyatı
  totalQuantitySold: Float    // Toplam satılan miktar payı
  
  // Destek Gelirleri
  governmentSupport: Float    // Devlet desteği payı
  otherRevenue: Float        // Diğer gelirler payı
  
  totalRevenue: Float        // Toplam gelir payı
  revenuePerDecare: Float    // Dekar başına gelir
  revenuePerKg: Float       // Kg başına gelir
  
  createdAt: DateTime
  updatedAt: DateTime
}
```

## 3. Maliyet Dağıtım Algoritması

### A. Process Maliyet Dağıtımı

```typescript
async function distributeProcessCosts(processId: string) {
  // 1. Process ve alan bilgisini al
  const process = await getProcessWithField(processId)
  const fieldOwners = await getFieldOwners(process.fieldId)
  const processCost = await getProcessCost(processId)
  
  // 2. Her sahip için maliyet payı hesapla
  for (const owner of fieldOwners) {
    const ownerPercentage = owner.percentage / 100
    
    const processOwnerExpense = {
      processId,
      fieldId: process.fieldId,
      ownerId: owner.userId,
      ownershipPercentage: owner.percentage,
      
      laborCostShare: processCost.laborCost * ownerPercentage,
      equipmentCostShare: processCost.equipmentCost * ownerPercentage,
      fuelCostShare: processCost.fuelCost * ownerPercentage,
      inventoryCostShare: processCost.inventoryCost * ownerPercentage,
      otherCostShare: processCost.otherCost * ownerPercentage,
      totalCostShare: processCost.totalCost * ownerPercentage,
      
      costPerDecare: (processCost.totalCost * ownerPercentage) / (process.field.size * ownerPercentage)
    }
    
    await createProcessOwnerExpense(processOwnerExpense)
  }
}
```

### B. Hasat Gelir Dağıtımı

```typescript
async function distributeSaleRevenue(saleId: string) {
  const sale = await getSaleWithField(saleId)
  const fieldOwners = await getFieldOwners(sale.fieldId)
  
  for (const owner of fieldOwners) {
    const ownerPercentage = owner.percentage / 100
    
    const ownerRevenue = {
      fieldId: sale.fieldId,
      seasonId: sale.seasonId,
      ownerId: owner.userId,
      ownershipPercentage: owner.percentage,
      
      totalSalesRevenue: sale.totalAmount * ownerPercentage,
      avgSalePrice: sale.unitPrice, // Aynı kalır
      totalQuantitySold: sale.quantity * ownerPercentage,
      
      totalRevenue: sale.totalAmount * ownerPercentage,
      revenuePerDecare: (sale.totalAmount * ownerPercentage) / (sale.field.size * ownerPercentage),
      revenuePerKg: sale.unitPrice // Aynı kalır
    }
    
    await createOrUpdateFieldOwnerRevenue(ownerRevenue)
  }
}
```

## 4. Sahip Bazlı Kar/Zarar Hesaplama

### A. API: `/api/owners/{ownerId}/fields/{fieldId}/profit-loss/{seasonId}`

```typescript
interface OwnerProfitLossReport {
  ownerInfo: {
    id: string
    name: string
    email: string
  }
  
  fieldInfo: {
    id: string
    name: string
    totalSize: number // dekar
    ownershipPercentage: number
    ownedSize: number // dekar (totalSize * ownershipPercentage)
  }
  
  costs: {
    processCosts: Array<{
      processType: string
      processDate: string
      laborCost: number
      equipmentCost: number
      fuelCost: number
      inventoryCost: number
      totalCost: number
      costPerDecare: number
    }>
    
    irrigationCosts: {
      totalElectricityCost: number
      totalDuration: number // dakika
      costPerHour: number
      costPerDecare: number
    }
    
    totalCosts: {
      totalProcessCosts: number
      totalIrrigationCosts: number
      totalAllCosts: number
      totalCostPerDecare: number
    }
  }
  
  revenues: {
    sales: Array<{
      saleDate: string
      buyerName: string
      quantity: number
      unitPrice: number
      totalAmount: number
      ownerShare: number
    }>
    
    supports: Array<{
      supportType: string
      amount: number
      ownerShare: number
    }>
    
    totalRevenues: {
      totalSalesRevenue: number
      totalSupports: number
      totalAllRevenues: number
      totalRevenuePerDecare: number
    }
  }
  
  profitLoss: {
    grossProfit: number
    grossProfitPerDecare: number
    profitMargin: number
    
    // Verimlilik Metrikleri
    yieldPerDecare: number
    costPerKg: number
    revenuePerKg: number
    profitPerKg: number
    
    // ROI Analizi
    returnOnInvestment: number
    paybackPeriod: number // ay
  }
  
  // Diğer sahiplerle karşılaştırma
  benchmarkData: {
    averageProfitPerDecare: number
    bestPerformingOwner: {
      name: string
      profitPerDecare: number
    }
    ownerRanking: number // Kaçıncı sırada
    totalOwnerCount: number
  }
}
```

## 5. Toplu Hesaplama API'leri

### A. Tüm Sahipler İçin Kar/Zarar Özeti
```typescript
// GET /api/fields/{fieldId}/owners-summary/{seasonId}
{
  fieldInfo: FieldInfo,
  ownersSummary: Array<{
    ownerId: string
    ownerName: string
    ownershipPercentage: number
    totalCosts: number
    totalRevenues: number
    netProfit: number
    profitPerDecare: number
    profitMargin: number
    performanceRating: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR'
  }>
  
  fieldTotals: {
    totalCosts: number
    totalRevenues: number
    netProfit: number
    avgProfitPerDecare: number
  }
}
```

### B. Sahip Bazlı Çoklu Tarla Analizi
```typescript
// GET /api/owners/{ownerId}/fields-summary/{seasonId}
{
  ownerInfo: OwnerInfo,
  fieldsSummary: Array<{
    fieldId: string
    fieldName: string
    ownershipPercentage: number
    ownedSize: number
    totalCosts: number
    totalRevenues: number
    netProfit: number
    profitPerDecare: number
    yieldPerDecare: number
  }>
  
  ownerTotals: {
    totalOwnedArea: number
    totalInvestment: number
    totalRevenue: number
    totalProfit: number
    avgProfitPerDecare: number
    totalROI: number
  }
}
```

## 6. Otomatik Dağıtım Tetikleyicileri

### A. Process Tamamlandığında
```typescript
// Process COMPLETED olduğunda otomatik çalışır
export async function onProcessCompleted(processId: string) {
  await distributeProcessCosts(processId)
  await updateFieldOwnerExpenses(processId)
}
```

### B. Satış Kaydedildiğinde
```typescript
// Sale kaydedildiğinde otomatik çalışır
export async function onSaleCreated(saleId: string) {
  await distributeSaleRevenue(saleId)
  await updateOwnerProfitLoss(saleId)
}
```

## 7. Dashboard Özellikleri

### A. Sahip Dashboard'u
- Sahip olduğu tüm tarlalardaki kar/zarar durumu
- Sezonluk performans karşılaştırması
- En karlı/zararlı tarlaları
- Maliyet optimizasyon önerileri

### B. Admin Dashboard'u
- Tüm sahiplerin performans karşılaştırması
- Tarla bazında kar/zarar dağılımı
- En verimli sahipler analizi
- Genel finansal sağlık raporu

Bu sistem kuyu faturalarındaki sahiplik bazlı dağıtım mantığını tüm maliyet ve gelir kalemlerine genişleterek, her sahibin gerçek kar/zarar durumunu şeffaf şekilde gösterir.