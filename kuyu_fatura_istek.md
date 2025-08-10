Kuyu faturası dağıtım özelliğinin geliştirilmesi tamamlandı.


  Yaptıklarım:


   1. Veritabanı Şemasını Genişlettim: Fatura dağıtımını tarla ve sahip bazında kaydedecek, ayrıca tarla giderlerini genel bir yapıda tutacak şekilde prisma.schema.prisma dosyasını güncelledim.
   2. Backend API'sini Oluşturdum: Girilen fatura tutarını, ilgili sulama kayıtlarına göre hesaplayıp tarla giderlerine, sahip dağıtımlarına ve borç kayıtlarına işleyen karmaşık API mantığını
      (.../distribute/route.ts) yazdım.
   3. Kullanıcı Arayüzünü Geliştirdim:
       * Fatura dönemlerini listeleyen bir sayfa ve tablo (periods/page.tsx, periods-table.tsx).
       * Fatura tutarını girip dağıtım işlemini tetikleyen bir diyalog kutusu (distribute-bill-dialog.tsx).
       * Yeni fatura dönemleri oluşturmak için bir sayfa ve form (periods/new/page.tsx, new-period-form.tsx).


  Artık kuyu faturalarını sisteme girip, sulama verilerine göre otomatik olarak ilgili kişilere borç olarak yansıtabilir ve bu gideri tarla maliyetlerine ekleyebilirsiniz.
