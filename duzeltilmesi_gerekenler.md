Yapması gereken ama yapmadığı şey:
               1. Sulamaya eklenen tarlaların (fieldUsages) sahiplerini (FieldOwnership) ve onların hisse oranlarını bulmalı.
               2. Kullanılan envanterin (inventoryUsages) maliyetini ve miktarını, tarla sahiplerinin hisselerine göre orantılı bir şekilde
                  dağıtmalı.
               3. Her bir sahibin kendi envanter payından (InventoryOwnership) düşüş yapmalı veya onlar adına borç (Debt) oluşturmalı.
           * Mevcut kod, envanterin kime ait olduğunu dikkate almadan, onu "ortak bir havuzdan" düşüyor ki bu iş mantığınıza aykırı.
**burada aslında şu da önemli: Eklenen tarlaların dekarsal bazda sulanması söz konusu: Yani A tarlası 30 dekar ama 5 dekarı, B tarlası 20 dekar ama 10 dekarı sulandıysa, sulama süresi, envanter düşüş miktarı ve maliyeti dekarsal bazda hesaplanmalı.**

