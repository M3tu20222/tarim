**Başlık**: Envanter Detay Sayfasında İşlem Geçmişi Gösterimi
**Durum**: Çözüldü

### Sorun
Envanter detay sayfasındaki (`../dashboard/owner/inventory/[id]`) işlem geçmişi bölümünde, sulama kaynaklı kullanımlar doğru bilgiyi yansıtmıyordu.
1.  **Veritabanı Hatası**: "Sulama kaydı #..." ile başlayan notlar, notun tamamını ID olarak algıladığı için "Malformed ObjectID" hatasına neden oluyordu.
2.  **Yanlış Bilgi Gösterimi**: İlk düzeltmeden sonra, notta "Kullanan" olarak işlemi sisteme giren kişi (`transaction.user`) gösteriliyordu. Ancak asıl istenen, envanterin **kimin payından düşüldüğü** bilgisinin (`IrrigationInventoryOwnerUsage`) gösterilmesiydi. Bu durum, stok takibinde ciddi tutarsızlıklara yol açıyordu.

### Çözüm
Sorun, `app/dashboard/owner/inventory/[id]/page.tsx` dosyasında yapılan çok adımlı bir düzeltme ile tamamen giderildi:

1.  **ID Ayrıştırma Düzeltmesi**: Veritabanı hatasını gidermek için, not içerisindeki 24 karakterlik sulama kaydı ID'sini `transactionNote.match(/([a-f0-9]{24})/)` regex ifadesi ile ayıklamak sağlandı.

2.  **Derinlemesine Veri Sorgulama**: Sadece sulama kaydının temel bilgilerini çekmek yerine, Prisma sorgusu genişletildi. `prisma.irrigationLog.findUnique` sorgusuna, o sulamaya ait envanter kullanımlarını (`inventoryUsages`), bu kullanımların hangi sahiplere ait olduğunu (`ownerUsages`) ve sahip isimlerini (`owner`) içerecek şekilde `include` zinciri eklendi.

3.  **Doğru Bilginin Gösterimi**:
    *   Genişletilmiş sorgudan gelen `ownerUsages` verisi işlenerek, o kullanımda envanteri eksilen tüm ortakların isimleri bir liste haline getirildi.
    *   İşlem notu, bu veriyi kullanarak dinamik olarak oluşturuldu. Örneğin: `[Tarla Adı] - [Tarih] sulama işlemi (Kullanan: [Ortak A], [Ortak B])`.
    *   Ayrıca, ilgili sulama kaydına gidilmesini sağlayan tıklanabilir link korundu.

Bu kapsamlı çözüm sayesinde, envanter işlem geçmişi artık hem hatasız çalışmakta hem de stok hareketlerinin kimin payından kaynaklandığını doğru ve şeffaf bir şekilde göstererek veri tutarlılığını sağlamaktadır.