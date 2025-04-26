import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { Purchase, InventoryTransaction, Debt, PurchaseContributor } from "@prisma/client"; // Gerekli tipleri import et

// Alış detaylarını getir (Opsiyonel, gerekirse eklenebilir)
// export async function GET(request: NextRequest, { params }: { params: { id: string } }) { ... }

// Alış güncelle (Opsiyonel, gerekirse eklenebilir)
// export async function PUT(request: NextRequest, { params }: { params: { id: string } }) { ... }

// Prisma Payload Tipi Tanımı (İlişkileri içerecek şekilde)
type PurchaseWithRelations = Prisma.PurchaseGetPayload<{
  include: {
    inventoryTransactions: { select: { id: true; inventoryId: true } };
    contributors: { select: { id: true } };
    debts: { select: { id: true } };
  };
}>;
// ... mevcut importlar ve tipler ...

// Alış güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } } // params'ı doğrudan al
) {
  // Hata mesajının önerdiği gibi, params'a erişmeden önce mikro görev kuyruğuna bir bekleme ekleyelim.
  // Bu, Next.js'in dahili işlemlerinin tamamlanmasına yardımcı olabilir.
  // await Promise.resolve(); // Şimdilik bunu yorumlayalım, destructuring yeterli olabilir.

  try {
    // params bir Promise olabilir, await ile çözülmeli (Kullanıcı geri bildirimine göre)
    const { id: purchaseId } = await params; 
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Yetkisiz işlem" },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { partners, ...purchaseData } = data; // partners'ı ayır, geri kalanı purchaseData

    // Gerekli Alan Doğrulaması (partners için)
    if (!partners || !Array.isArray(partners) || partners.length === 0) {
      return NextResponse.json(
        { error: "Katılımcı bilgileri eksik veya geçersiz." },
        { status: 400 }
      );
    }

    // Ortaklık Yüzdesi Doğrulaması
    const totalPercentage = partners.reduce(
      (sum: number, partner: any) => sum + (Number(partner.sharePercentage) || 0),
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return NextResponse.json(
        { error: "Ortaklık yüzdelerinin toplamı %100 olmalıdır." },
        { status: 400 }
      );
    }

    // Toplam Maliyeti Hesapla (Güncel verilerden)
    const totalCost = (purchaseData.quantity || 0) * (purchaseData.unitPrice || 0);

    // Transaction ile güncelleme
    const result = await prisma.$transaction(async (tx) => {
      // 1. Eski Katılımcıları ve Borçları Sil
      // Önce borçları sil (katılımcı ilişkisi nedeniyle)
      await tx.debt.deleteMany({
        where: { purchaseId: purchaseId },
      });
      // Sonra katılımcıları sil
      await tx.purchaseContributor.deleteMany({
        where: { purchaseId: purchaseId },
      });

      // 2. Alış Ana Bilgilerini Güncelle
      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          product: purchaseData.product,
          category: purchaseData.category,
          quantity: purchaseData.quantity,
          unit: purchaseData.unit,
          unitPrice: purchaseData.unitPrice,
          totalCost: totalCost, // Hesaplanan yeni toplam maliyet
          paymentMethod: purchaseData.paymentMethod,
          dueDate: purchaseData.dueDate ? new Date(purchaseData.dueDate) : null,
          description: purchaseData.description,
          approvalStatus: purchaseData.approvalStatus,
          approvalRequired: purchaseData.approvalRequired,
          approvalThreshold: purchaseData.approvalThreshold,
          seasonId: purchaseData.seasonId,
        },
      });

      // 3. Yeni Katılımcıları Oluştur (POST'taki mantıkla aynı)
      const contributorPromises = partners.map((partner: any) => {
        const contribution = totalCost * (partner.sharePercentage / 100);
        return tx.purchaseContributor.create({
          data: {
            purchaseId: updatedPurchase.id, // Güncellenen alışın ID'si
            userId: partner.userId,
            sharePercentage: partner.sharePercentage,
            contribution: contribution,
            expectedContribution: contribution,
            hasPaid: partner.hasPaid ?? false,
            paymentDate: partner.hasPaid ? new Date() : undefined,
            isCreditor: partner.isCreditor ?? false,
            remainingAmount: partner.hasPaid ? 0 : contribution,
          },
        });
      });
      const createdContributors = await Promise.all(contributorPromises);

      // 4. Yeni Borçları Oluştur
      // Önce alacaklıyı belirle: Katılımcılardan biri işaretlenmişse o, değilse işlemi yapan kullanıcı
      let creditorId = createdContributors.find(c => c.isCreditor)?.userId;
      if (!creditorId) {
          // Eğer katılımcılardan hiçbiri alacaklı değilse, işlemi yapan kullanıcıyı alacaklı kabul et
          // Ancak işlemi yapan kullanıcı aynı zamanda ödeme yapmayan bir katılımcıysa, bu durumda alacaklı belirsizdir.
          const requestUserIsUnpaidContributor = createdContributors.some(c => c.userId === userId && !c.hasPaid);
          if (!requestUserIsUnpaidContributor) {
              creditorId = userId; // İşlemi yapan kullanıcı alacaklı
              console.log(`Purchase ${updatedPurchase.id} (updated): No explicit creditor found, assuming requesting user (${userId}) is the creditor.`);
          } else {
              console.warn(`Purchase ${updatedPurchase.id} (updated): Cannot determine creditor. Requesting user (${userId}) is also an unpaid contributor.`);
          }
      }

      if (creditorId) { // Alacaklı belirlenebildiyse borçları oluştur
        const debtPromises = createdContributors
          .filter(contributor => !contributor.hasPaid && contributor.userId !== creditorId) // Ödeme yapmamış VE alacaklı olmayanlar
          .map(debtorContributor => {
            // Borçlu ortağın formdan gelen verisini bul (dueDate için)
            const partnerData = partners.find((p: any) => p.userId === debtorContributor.userId);

            // Vade tarihini belirle:
            // 1. Ortağa özel vade tarihi var mı? (Formdan gelen)
            // 2. Alışın genel vade tarihi var mı?
            // 3. Hiçbiri yoksa varsayılan (3 ay sonrası)
            let dueDate;
            if (partnerData?.dueDate) {
              dueDate = new Date(partnerData.dueDate);
            } else if (updatedPurchase.dueDate) {
              dueDate = new Date(updatedPurchase.dueDate);
            } else {
              dueDate = new Date(new Date().setMonth(new Date().getMonth() + 3));
            }

            console.log(`Creating/Updating debt for Purchase ${updatedPurchase.id}: Debtor=${debtorContributor.userId}, Creditor=${creditorId}, Amount=${debtorContributor.contribution}, DueDate=${dueDate}`); // Log güncellendi

            return tx.debt.create({ // create kullanıyoruz çünkü eskileri sildik
              data: {
                amount: debtorContributor.contribution,
                dueDate: dueDate, // Belirlenen vade tarihini kullan
                status: 'PENDING',
                description: `${updatedPurchase.product} alışı için borç (güncellendi)`,
                reason: 'PURCHASE',
                creditorId: creditorId, // Belirlenen alacaklı ID'si
                debtorId: debtorContributor.userId,
                purchaseId: updatedPurchase.id,
              },
            });
          });
        await Promise.all(debtPromises);
      } else if (createdContributors.some(c => !c.hasPaid)) {
          // Alacaklı belirlenemedi ve ödenmemiş pay var
          console.error(`Purchase ${updatedPurchase.id} (updated): Debts could not be created because the creditor could not be determined.`);
      }

      // TODO: Envanter güncelleme mantığı da buraya eklenebilir.
      // Eğer alış miktarı veya ürünü değiştiyse, ilişkili envanter kaydının
      // ve envanter sahipliklerinin de güncellenmesi gerekebilir.
      // Şimdilik bu kısım eklenmedi.

      return updatedPurchase; // Güncellenen alış bilgisini döndür
    }); // Transaction sonu

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("Error updating purchase:", error);
    return NextResponse.json(
      { error: error.message || "Alış güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Alış sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } } // params'ı doğru şekilde al
) {
  try {
    const purchaseId: string = params.id; // purchaseId'yi string olarak belirt
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    // Kimlik doğrulama ve yetkilendirme
    if (!userId) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    // TODO: Daha detaylı yetkilendirme eklenebilir (örn: sadece ADMIN veya oluşturan OWNER silebilir)
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
       return NextResponse.json(
         { error: "Yetkisiz işlem" },
         { status: 403 }
       );
    }

    console.log(`Alış silme isteği alındı: ID=${purchaseId}, Kullanıcı=${userId}, Rol=${userRole}`);

    // Silinecek alış kaydını ve ilişkili verileri bul
    // Not: findUniqueOrThrow kullanmak, bulunamazsa otomatik hata fırlatır.
    const purchaseToDelete: PurchaseWithRelations = await prisma.purchase.findUniqueOrThrow({
      where: { id: purchaseId }, // Prisma unique where tipi {id: string} bekler
      include: {
        inventoryTransactions: {
          select: {
            id: true,
            inventoryId: true, // Silinecek envanterleri bulmak için
          },
        },
        contributors: {
          select: { id: true },
        },
        debts: {
          select: { id: true },
        },
      },
    });

    // İlişkili envanter ID'lerini topla (duplicate'leri kaldır ve tipi string[] yap)
    const inventoryIdsToDelete: string[] = [
      ...new Set(
        purchaseToDelete.inventoryTransactions.map(
          (t) => t.inventoryId // t'nin tipi PurchaseWithRelations sayesinde biliniyor
        )
      ),
    ];
    // İlişkili borç ID'lerini topla
    const debtIdsToDelete: string[] = purchaseToDelete.debts.map((d) => d.id);
    // İlişkili katılımcı ID'lerini topla
    const contributorIdsToDelete: string[] = purchaseToDelete.contributors.map((c) => c.id);


    const result = await prisma.$transaction(async (tx) => {
      console.log(`Transaction başlatıldı: Alış ID=${purchaseId}`);

      // 1. İlişkili Ödeme Geçmişini Sil (Borçlar ve Katılımcılar için)
      if (debtIdsToDelete.length > 0) {
          console.log(`Borçlarla ilişkili ödeme geçmişi siliniyor...`);
          await tx.paymentHistory.deleteMany({
              where: { debtId: { in: debtIdsToDelete } }
          });
          console.log(`Borçlarla ilişkili ödeme geçmişi silindi.`);
      }
      if (contributorIdsToDelete.length > 0) {
          console.log(`Katılımcılarla ilişkili ödeme geçmişi siliniyor...`);
          await tx.paymentHistory.deleteMany({
              where: { contributorId: { in: contributorIdsToDelete } }
          });
          console.log(`Katılımcılarla ilişkili ödeme geçmişi silindi.`);
      }

      // 2. İlişkili Borçları Sil
      if (debtIdsToDelete.length > 0) {
        console.log(`Silinecek Borç ID'leri: ${debtIdsToDelete.join(', ')}`);
        await tx.debt.deleteMany({
          where: { id: { in: debtIdsToDelete } },
        });
        console.log(`${debtIdsToDelete.length} adet borç silindi.`);
      }

      // Envanterle ilgili silme işlemleri (Doğru sıra önemli)
      if (inventoryIdsToDelete.length > 0) {
          console.log(`Envanterle ilişkili veriler siliniyor (ID'ler: ${inventoryIdsToDelete.join(', ')})`);

          // 3. İlişkili Envanter Kullanımlarını Sil
          console.log(`Envanter kullanımları siliniyor...`);
          await tx.inventoryUsage.deleteMany({
              where: { inventoryId: { in: inventoryIdsToDelete } } // inventoryIdsToDelete artık string[]
          });
          console.log(`Envanter kullanımları silindi.`);

          // 4. İlişkili Envanter İşlemlerini Sil (TÜMÜ)
          console.log(`Envanter işlemleri siliniyor...`);
          await tx.inventoryTransaction.deleteMany({
              where: { inventoryId: { in: inventoryIdsToDelete } }, // inventoryIdsToDelete artık string[]
          });
          console.log(`Envanter işlemleri silindi.`);

          // 5. İlişkili Envanter Sahipliklerini Sil
          console.log(`Envanter sahiplikleri siliniyor...`);
          await tx.inventoryOwnership.deleteMany({
            where: { inventoryId: { in: inventoryIdsToDelete } }, // inventoryIdsToDelete artık string[]
          });
          console.log(`Envanter sahiplikleri silindi.`);

          // 6. İlişkili Envanter Kayıtlarını Sil
          console.log(`Envanter kayıtları siliniyor...`);
          await tx.inventory.deleteMany({
            where: { id: { in: inventoryIdsToDelete } }, // inventoryIdsToDelete artık string[]
          });
          console.log(`${inventoryIdsToDelete.length} adet envanter kaydı silindi.`);
      }

      // 7. İlişkili Alış Katılımcılarını Sil
      if (contributorIdsToDelete.length > 0) {
        console.log(`Silinecek Katılımcı ID'leri: ${contributorIdsToDelete.join(', ')}`);
        await tx.purchaseContributor.deleteMany({
          where: { id: { in: contributorIdsToDelete } },
        });
        console.log(`${contributorIdsToDelete.length} adet alış katılımcısı silindi.`);
      }

      // 8. Alış Onaylarını Sil (Varsa)
      console.log(`Alış onayları siliniyor (varsa)...`);
      await tx.purchaseApproval.deleteMany({
        where: { purchaseId: purchaseId }, // Doğru alan: purchaseId
      });
      console.log(`Alış onayları silindi (varsa).`);

      // 9. Son olarak Alış Kaydını Sil
      console.log(`Alış kaydı siliniyor: ID=${purchaseId}`);
      const deletedPurchase = await tx.purchase.delete({
        where: { id: purchaseId }, // Prisma unique where tipi {id: string} bekler
      });
      console.log(`Alış kaydı başarıyla silindi: ID=${purchaseId}`);

      return deletedPurchase; // Silinen alış kaydını döndür
    }, {
        maxWait: 15000, // Gerekirse artırılabilir
        timeout: 45000, // Gerekirse artırılabilir
    });

    // result burada silinen Purchase nesnesini içerir.
    return NextResponse.json({ message: "Alış başarıyla silindi", deletedPurchaseId: result.id }, { status: 200 });

  } catch (error: any) {
    console.error("Error deleting purchase:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Belirli Prisma hatalarını işle
      if (error.code === 'P2025') { // Kayıt bulunamadı hatası (findUniqueOrThrow veya delete'den)
         return NextResponse.json({ error: "Silinecek alış kaydı bulunamadı." }, { status: 404 });
      }
       // İlişki ihlali hatası (P2014) veya diğerleri
       return NextResponse.json({ error: `Veritabanı hatası: ${error.message}`, code: error.code }, { status: 400 });
    } else if (error.message.includes("Transaction already closed")) {
        return NextResponse.json({ error: "İşlem zaman aşımına uğradı. Lütfen tekrar deneyin veya zaman aşımı süresini artırın." }, { status: 504 }); // Gateway Timeout
    }
    // Diğer beklenmedik hatalar
    return NextResponse.json(
      { error: error.message || "Alış silinirken bilinmeyen bir hata oluştu" },
      { status: 500 }
    );
  }
}
