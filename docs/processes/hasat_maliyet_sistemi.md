# Hasat Maliyet Takip Sistemi Planı

## 1. Mevcut Sistem Analizi

Sistemde mevcut olan modeller:
- **Process**: İşlem takibi (ekim, gübre, ilaç, hasat)
- **ProcessCost**: İşlem maliyetleri (işçilik, ekipman, envanter, yakıt)
- **Purchase**: Satın alma kayıtları
- **InventoryUsage**: Envanter kullanımı
- **EquipmentUsage**: Ekipman kullanımı
- **IrrigationLog**: Sulama kayıtları
- **FieldExpense**: Tarla giderleri

## 2. Hasat Sonrası Kayıt Sistemi

### A. Hasat İşlemi Kayıtları (Mevcut Process modeli genişletilecek)

```typescript
// Process tablosuna ek alanlar gerekli:
harvestQuantity: Float      // Hasat edilen miktar (ton/kg)
harvestQuality: String?     // Ürün kalitesi (A, B, C sınıfı)
moistureContent: Float?     // Nem oranı
harvesterType: String       // Biçerdöver türü (kendi/kiralık)
harvesterOperator: String?  // Operatör bilgisi
```

### B. Hasat Maliyetleri

#### 2.1 Biçerdöver Ücretleri
```typescript
// ProcessCost tablosuna yeni alanlar:
harvesterRentalCost: Float     // Biçerdöver kiralama ücreti
harvesterFuelCost: Float       // Biçerdöver yakıt gideri
harvesterOperatorCost: Float   // Operatör ücreti
harvesterMaintenanceCost: Float // Bakım giderleri
```

#### 2.2 Nakliye ve Depolama
```typescript
transportationCost: Float      // Nakliye ücreti
storageCost: Float            // Depolama ücreti
loadingUnloadingCost: Float   // Yükleme/boşaltma ücreti
```

#### 2.3 Vergi ve Kesintiler
```typescript
// Yeni tablo: HarvestTaxes
{
  id: String pk
  processId: String fk -> Process.id
  taxType: String           // KDV, Gelir Vergisi, Bağkur vs.
  taxRate: Float           // Vergi oranı (%)
  taxAmount: Float         // Kesilen vergi tutarı
  taxDescription: String?   // Açıklama
  createdAt: DateTime
}
```

## 3. Satış ve Gelir Takibi

### A. Yeni Satış Modeli
```typescript
Sale {
  id: String pk
  fieldId: String fk
  seasonId: String fk
  processId: String? fk     // Hangi hasat işleminden
  buyerName: String         // Alıcı adı
  buyerContact: String?     // İletişim
  saleDate: DateTime        // Satış tarihi
  quantity: Float           // Satılan miktar
  unitPrice: Float          // Birim fiyat
  totalAmount: Float        // Toplam tutar
  paymentStatus: String     // Ödeme durumu
  paymentDate: DateTime?    // Ödeme tarihi
  qualityGrade: String?     // Kalite sınıfı
  moistureAtSale: Float?    // Satıştaki nem
  notes: String?
  createdAt: DateTime
  updatedAt: DateTime
}
```

### B. Devlet Destekleri
```typescript
GovernmentSupport {
  id: String pk
  fieldId: String fk
  seasonId: String fk
  supportType: String       // Mazot, Gübre, Tohum desteği vs.
  supportAmount: Float      // Destek tutarı
  applicationDate: DateTime // Başvuru tarihi
  approvalDate: DateTime?   // Onay tarihi
  paymentDate: DateTime?    // Ödeme tarihi
  status: String           // Beklemede, Onaylandı, Ödendi
  documentNumber: String?   // Belge numarası
  createdAt: DateTime
}
```

## 4. Kar/Zarar Hesaplama Sistemi

### A. API Endpoint: `/api/fields/[fieldId]/profit-loss`

```typescript
interface ProfitLossReport {
  field: FieldInfo
  season: SeasonInfo
  costs: {
    seedCost: Float
    fertiliserCost: Float
    pesticideCost: Float
    irrigationCost: Float
    laborCost: Float
    equipmentCost: Float
    fuelCost: Float
    harvestCost: Float
    transportationCost: Float
    taxesCost: Float
    otherCosts: Float
    totalCost: Float
  }
  revenues: {
    salesRevenue: Float
    governmentSupports: Float
    totalRevenue: Float
  }
  summary: {
    grossProfit: Float        // Toplam gelir - toplam gider
    profitPerDecare: Float    // Dekar başına kar
    costPerDecare: Float      // Dekar başına maliyet
    revenuePerDecare: Float   // Dekar başına gelir
    profitMargin: Float       // Kar marjı (%)
    yieldPerDecare: Float     // Dekar başına verim
  }
}
```

### B. Hesaplama Algoritması

1. **Toplam Maliyetler**:
   - ProcessCost kayıtlarından tüm maliyet türleri
   - HarvestTaxes kayıtlarından vergi kesintileri
   - IrrigationLog'dan sulama maliyetleri

2. **Toplam Gelirler**:
   - Sale kayıtlarından satış gelirleri
   - GovernmentSupport kayıtlarından destekler

3. **Dekar Bazında Hesaplamalar**:
   - Her maliyet/gelir kalemi tarla büyüklüğüne bölünecek

## 5. Uygulama Adımları

### Adım 1: Veritabanı Değişiklikleri
1. Process tablosuna hasat alanları eklenmesi
2. ProcessCost tablosuna hasat maliyet alanları
3. HarvestTaxes tablosu oluşturulması
4. Sale tablosu oluşturulması
5. GovernmentSupport tablosu oluşturulması

### Adım 2: API Geliştirme
1. Hasat işlemi kayıt API'si
2. Satış kayıt API'si
3. Destek kayıt API'si
4. Kar/Zarar rapor API'si

### Adım 3: Frontend Geliştirme
1. Hasat kayıt formu
2. Satış kayıt formu
3. Kar/Zarar rapor sayfası
4. Dekar bazında analiz dashboard'u

### Adım 4: Raporlama
1. Sezonluk kar/zarar raporu
2. Tarla bazında maliyet analizi
3. Ürün bazında kârlılık analizi
4. Excel export özelliği

## 6. Öncelik Sırası

1. **Yüksek Öncelik**: Hasat maliyet kayıt sistemi
2. **Orta Öncelik**: Satış takip sistemi
3. **Orta Öncelik**: Kar/zarar hesaplama API'si
4. **Düşük Öncelik**: Gelişmiş raporlama ve analiz

Bu sistem sayesinde her tarlada sezon sonunda:
- Toplam ne kadar harcandığı
- Ne kadar gelir elde edildiği
- Dekar başına kar/zarar
- En maliyetli süreçlerin neler olduğu

detaylı olarak takip edilebilecek.