# Tarım Yönetim Sistemi Müşteriye Satış Süreci

## 1. GitHub ve Kaynak Kod Güvenliği
- Proje kaynak kodları özel (private) bir GitHub reposunda saklanır
- Sadece geliştirici (siz) repoya erişebilir
- Müşteriye kod erişimi verilmez

## 2. Vercel'de Yayınlama
1. Vercel hesabınıza giriş yapın: https://vercel.com
2. "Add New Project" seçeneğini tıklayın
3. GitHub'daki özel repoyu seçin
4. Ortam değişkenlerini ayarlayın:
   - `MONGODB_URI`: MongoDB bağlantı stringi
   - `NEXTAUTH_SECRET`: Güvenli bir secret key (üretmek için: `openssl rand -base64 32`)
5. "Deploy" butonuna tıklayarak projeyi yayınlayın

## 3. Müşteri Erişimi
- Müşteriye sadece uygulama URL'si verilir (ör: `https://tarim-yonetim-sistemi.vercel.app`)
- Yönetici paneli erişim bilgileri sadece sizde olacak
- Müşteri isterse kendi domainini bağlayabilir (Vercel'den domain konfigürasyonu)

## 4. MongoDB Yönetimi
1. MongoDB Atlas hesabınıza giriş yapın
2. "Network Access" bölümünden sadece Vercel IP'lerine izin verin
3. "Database Access" bölümünden güçlü bir şifre oluşturun
4. Bağlantı stringini Vercel ortam değişkenlerine ekleyin

## 5. Sürekli Güncellemeler
1. Geliştirmeleri GitHub repo'suna pushlayın
2. Vercel otomatik olarak yeni build alacak ve deploy edecek
3. Müşteri herhangi bir güncelleme yapmak zorunda kalmayacak

## 6. Ücretlendirme
- Vercel ücretsiz tier ile başlayabilir (aylık 100GB bant genişliği)
- MongoDB Atlas ücretsiz M0 tier yeterli olacaktır
- Proje büyüdükçe ölçeklendirilebilir

## Destek ve Bakım
- Müşteri için aylık bakım paketi oluşturabilirsiniz
- Acil sorunlar için destek hattı sağlayın
- Düzenli yedek alın ve güvenlik güncellemelerini takip edin
