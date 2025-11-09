# İnceleme Notları - Tespit Edilen & Düzeltilen Sorunlar

## 1. ✅ İki Ortaklı Tarlada Yakıt Tüketimi Hesaplama Hatası
**ÇÖZÜLDÜ**

**Sorun:**
- Yakıt deduction yapılırken sadece `Inventory.totalQuantity` decrement ediliyor
- `InventoryOwnership.shareQuantity` (owner'ın kişisel payı) decrement edilmiyordu

**Düzeltme:** `app\api\processes\route.ts` (line 551-602)
- Owner'ın fuel inventory share'ini fetch etme eklendi
- Validation: Owner'ın yeterli fuel share'i var mı kontrol
- Deduction: Hem `Inventory.totalQuantity` hem de `InventoryOwnership.shareQuantity` decrement

---

## 2. ✅ İki Kere Yakıt Düşülmesi (Yeni Sorun!)
**ÇÖZÜLDÜ**

**Sorun:**
- Manüel inventory items'da yakıt eklenmiş + equipment fuel consumption var ise
- Yakıt iki kere düşülüyor!

**Nedeni:**
```
1. inventoryItems loop'unda (regular items) yakıt düşülüyor
2. equipment fuel consumption loop'unda (otomatik) yakıt düşülüyor
→ iki kere!
```

**Düzeltme:**
- `app\api\processes\route.ts` (line 423-443): POST'da fuel items skip
- `app\api\processes\[id]\route.ts` (line 364-396): PUT'da fuel items skip
- Equipment fuel consumption varsa, manüel fuel items ignore edilir

---

## 3. ✅ Process Silme/Güncelleme Sırasında Stok İadesi
**ÇÖZÜLDÜ**

**Sorun:**
- DELETE işleminde: `Inventory.totalQuantity` restore, ama `InventoryOwnership.shareQuantity` restore değil
- PUT işleminde: Aynı sorun + yeni items deduction'da owner tracking yok
- **ROOT CAUSE:** `usedById` field'ı fetch edilmiyordu!

**Düzeltme:**
- `app\api\processes\[id]\route.ts` (line 98-120): GET'de inventoryUsages include'a `usedById` eklendi
- `app\api\processes\[id]\route.ts` (line 313-322): PUT'da existingUsages fetch'ine `usedById` eklendi
- `app\api\processes\[id]\route.ts` (line 776-785): DELETE'de inventoryUsages include'a `usedById` eklendi
- `app\api\processes\[id]\route.ts` (line 825-865): DELETE'de owner share restore logic
- `app\api\processes\[id]\route.ts` (line 319-361): PUT restore'da owner share restore
- `app\api\processes\[id]\route.ts` (line 364-421): PUT yeni items deduction'da owner tracking

---

## Değiştirilmiş Dosyalar
1. ✅ `app\api\processes\route.ts` - Yakıt deduction & duplicate fuel fix
2. ✅ `app\api\processes\[id]\route.ts` - Delete/Update restore & deduction
3. ✅ TypeScript: Error yok

## Kalan Test Notları
```
POST   /api/processes (1814.38ms) ✓
GET    /api/fields?includeOwnerships=true&fetchAll=true (2134.93ms) ✓
GET    /api/inventory?fetchAll=true ✓
```
