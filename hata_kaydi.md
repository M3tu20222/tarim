https://tarim-dun.vercel.app/dashboard/owner/purchases
sayfasında az önce eklediğim kayıtta himmet tunçez e ait amonyum sülfat gübresini https://tarim-dun.vercel.app/dashboard/owner/irrigation/new
sayfasında envanter eklerken envanter listesinde göremiyorum. 
Envanter Kullanımlarını Girin (Adım 3/3)
Sulama sırasında kullanılan envanterleri ve miktarlarını girin.
Kullanılan Envanterler
Kullanılan Envanteri Ekle
Sahip
Himmet TUNÇEZ

Envanter Türü
Fasulye için amino asit H_M_B (Stok: 6.68 LITRE)

Bu Stoktan Kullanılacak Miktar (LITRE)
yani yeni oluşturduğumuz alış kaydı envantere galiba kaydedilmemiş, inceleyip çözer misin
purchases koleksiyonu ilgili kayıt:

_id
686bfc2669bf291d398e3b6d
product
"Amonyum Sülfat_Him_Denge"
category
"FERTILIZER"
quantity
50
unit
"CUVAL"
unitPrice
1000
totalCost
50000
paymentMethod
"CASH"
description
""
createdAt
2025-07-07T16:56:06.956+00:00
isTemplate
false
approvalStatus
"APPROVED"
approvalRequired
false
approvalThreshold
1000
seasonId
67e9b34b43c314cb7472a33f

PurchaseContributor koleksiyonu
_id
686bfc2769bf291d398e3b6e
purchaseId
686bfc2669bf291d398e3b6d
userId
67e6fcc2c5ca6634a4456843
sharePercentage
100
contribution
50000
expectedContribution
50000
actualContribution
0
remainingAmount
0
hasPaid
true
paymentDate
2025-07-07T16:56:07.285+00:00
isCreditor
false
createdAt
2025-07-07T16:56:07.286+00:00
updatedAt
2025-07-07T16:56:07.286+00:00

inventory koleksiyonu 
_id
686bfc2769bf291d398e3b6f
name
"Amonyum Sülfat_Him_Denge"
category
"FERTILIZER"
totalQuantity
50
unit
"CUVAL"
totalStock
0
purchaseDate
2025-07-07T16:54:05.394+00:00
status
"AVAILABLE"
costPrice
1000
notes
""686bfc2669bf291d398e3b6d" ID'li alış ile eklendi."
createdAt
2025-07-07T16:56:07.608+00:00
updatedAt
2025-07-07T16:56:07.608+00:00

inventoryOwnership koleksiyonu

_id
686bfc2769bf291d398e3b70
inventoryId
686bfc2769bf291d398e3b6f
userId
67e6fcc2c5ca6634a4456843
shareQuantity
50
createdAt
2025-07-07T16:56:07.930+00:00
updatedAt
2025-07-07T16:56:07.930+00:00

inventoryTransaction
_id
686bfc2869bf291d398e3b71
type
"PURCHASE"
quantity
50
date
2025-07-07T16:54:05.394+00:00
notes
""686bfc2669bf291d398e3b6d" ID'li alış kaydı."
createdAt
2025-07-07T16:56:08.252+00:00
seasonId
67e9b34b43c314cb7472a33f
inventoryId
686bfc2769bf291d398e3b6f
purchaseId
686bfc2669bf291d398e3b6d
userId
67e5b093c8fccd39d1444093


database (mongodb) de çok fazla irrigation koleksiyonları var
• Inventory
• Inventoryownership
• InventoryTransaction
• Inventory Usage	
• Invoice
• IrrigationFieldUsage
•	Irrigation InventoryOwnerUsage
•	Irrigation InventoryUsage
•	Irrigation Log
• IrrigationOwnerSummary
•	IrrigationOwnerUsage 

kafanı karıştırmayacak şekilde alış kaydında ve envanter'de görünen bu kaydı sulama kaydında kullanabilmeliyim. 

