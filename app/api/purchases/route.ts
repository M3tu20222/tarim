import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  Unit,
  PaymentMethod,
  InventoryCategory,
  ProductCategory, // Prisma şemasından ProductCategory'yi import et
  InventoryStatus, // 'type' kaldırıldı
  ApprovalStatus, // 'type' kaldırıldı
  type Purchase, // Purchase tipini import et
  type Inventory, // Inventory tipini import et
} from "@prisma/client"; // 'type' kaldırıldı
import { getServerSideSession } from "@/lib/session"; // getAuth yerine getServerSideSession

// Tüm ALIŞLARI getir (Bu GET isteği aslında PROCESS'leri getiriyordu, şimdilik dokunmuyoruz ama idealde bu da düzeltilmeli)
export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // TODO: Bu kısım aslında Process'leri getiriyor, Purchase'ları getirecek şekilde güncellenmeli.
    // Şimdilik mevcut haliyle bırakıyoruz.
    const purchases = await prisma.purchase.findMany({
      include: {
        contributors: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        season: true,
        approvals: {
          include: {
            approver: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(purchases);
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return NextResponse.json(
      { error: "Alışlar getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Yeni ALIŞ oluştur
export async function POST(request: Request) {
  const session = await getServerSideSession(); // getAuth yerine getServerSideSession

  if (!session?.id) { // session.user.id yerine session.id
    return NextResponse.json({ error: "Yetkisiz istek" }, { status: 401 });
  }
  const userId = session.id; // session.user.id yerine session.id

  try {
    const body = await request.json();
    console.log("Received purchase data:", JSON.stringify(body, null, 2)); // Gelen veriyi logla

    const {
      productName,
      category, // Bu InventoryCategory olmalı
      purchaseDate,
      quantity,
      unit,
      unitPrice,
      paymentMethod,
      notes,
      partners, // [{ userId: string, sharePercentage: number, hasPaid: boolean, dueDate?: Date }]
      isTemplate,
      templateName,
      seasonId, // Opsiyonel
      approvalRequired,
      approvalThreshold,
    } = body;

    // 1. Gerekli Alan Doğrulaması
    if (
      !productName ||
      !category ||
      !purchaseDate ||
      quantity === undefined ||
      quantity <= 0 ||
      !unit ||
      unitPrice === undefined ||
      unitPrice <= 0 ||
      !paymentMethod ||
      !partners ||
      !Array.isArray(partners) ||
      partners.length === 0
    ) {
      console.error("Validation Error: Missing required fields", { productName, category, purchaseDate, quantity, unit, unitPrice, paymentMethod, partners });
      return NextResponse.json(
        { error: "Gerekli alanlar eksik veya geçersiz." },
        { status: 400 }
      );
    }

    // 2. Ortaklık Yüzdesi Doğrulaması
    const totalPercentage = partners.reduce(
      (sum: number, partner: any) => sum + (Number(partner.sharePercentage) || 0),
      0
    );

    if (Math.abs(totalPercentage - 100) > 0.01) {
      console.error("Validation Error: Total percentage is not 100%", totalPercentage);
      return NextResponse.json(
        { error: "Ortaklık yüzdelerinin toplamı %100 olmalıdır." },
        { status: 400 }
      );
    }

    // 3. Toplam Maliyeti Hesapla
    const totalCost = quantity * unitPrice;

    // 4. Prisma Transaction ile Veritabanı İşlemleri
    const result = await prisma.$transaction(async (tx) => {
      // 4.1. Alış Kaydı Oluştur
      const purchase = await tx.purchase.create({
        data: {
          product: productName,
          category: category as ProductCategory, // Gelen category'yi ProductCategory'ye cast et
          quantity,
          unit: unit as Unit,
          unitPrice,
          totalCost,
          paymentMethod: paymentMethod as PaymentMethod,
          // purchaseDate alanı Purchase modelinde yok, kaldırıldı.
          description: notes,
          seasonId: seasonId || undefined, // Eğer sezon ID yoksa undefined ata
          isTemplate,
          templateName: isTemplate ? templateName : undefined,
          approvalRequired: approvalRequired ?? false, // Varsayılan değer ata
          approvalThreshold: approvalRequired ? approvalThreshold : undefined, // Onay gerekliyse eşiği ata
          approvalStatus: approvalRequired ? ApprovalStatus.PENDING : ApprovalStatus.APPROVED, // Onay gerekmiyorsa direkt onaylı
          // contributors ilişkisi aşağıda ayrıca oluşturulacak
        },
      });

      // 4.2. Alış Katılımcılarını Oluştur
      const contributorPromises = partners.map((partner: any) => {
        const contribution = totalCost * (partner.sharePercentage / 100);
        return tx.purchaseContributor.create({
          data: {
            purchaseId: purchase.id,
            userId: partner.userId,
            sharePercentage: partner.sharePercentage,
            contribution: contribution,
            expectedContribution: contribution, // Başlangıçta beklenen ve katkı aynı
            hasPaid: partner.hasPaid ?? false,
            paymentDate: partner.hasPaid ? new Date() : undefined,
            isCreditor: partner.isCreditor ?? false, // Frontend'den gelen isCreditor bilgisini kullan
            remainingAmount: partner.hasPaid ? 0 : contribution, // Kalan miktar hesaplaması eklendi
          },
        });
      });
      const createdContributors = await Promise.all(contributorPromises);

      // 4.3. Envanter Kaydı Oluştur (Eğer şablon değilse)
      let inventory: Inventory | null = null; // inventory değişkenini Inventory tipiyle tiple
      if (!isTemplate) {
        inventory = await tx.inventory.create({
          data: {
            name: productName,
            category: category as InventoryCategory, // Gelen category'yi InventoryCategory'ye cast et
            totalQuantity: quantity,
            unit: unit as Unit,
            purchaseDate: new Date(purchaseDate),
            costPrice: unitPrice, // Birim maliyeti kaydet
            status: InventoryStatus.AVAILABLE,
            notes: `"${purchase.id}" ID'li alış ile eklendi.`,
            // ownerships ilişkisi aşağıda ayrıca oluşturulacak
          },
        });

        // 4.4. Envanter Sahipliklerini Oluştur (inventory null kontrolü eklendi)
        if (inventory) {
           const ownershipPromises = partners.map((partner: any) => {
             const shareQuantity = quantity * (partner.sharePercentage / 100);
             return tx.inventoryOwnership.create({
               data: {
                 inventoryId: inventory!.id, // Non-null assertion eklendi
                 userId: partner.userId,
                 shareQuantity: shareQuantity,
               },
            });
          });
          await Promise.all(ownershipPromises);
        } else {
           // Bu durumun oluşmaması gerekir ama hata yönetimi için eklendi
           console.error("Inventory could not be created, cannot assign ownership."); // Log eklendi
           throw new Error("Envanter oluşturulamadı ancak sahiplik atanmaya çalışıldı.");
        }

         // 4.5. Envanter İşlemi Kaydı Oluştur (Alış tipi) (inventory null kontrolü eklendi)
         if (inventory) {
             await tx.inventoryTransaction.create({
                 data: {
                     inventoryId: inventory!.id, // Non-null assertion eklendi
                     type: 'PURCHASE',
                     quantity: quantity,
                     date: new Date(purchaseDate),
                    userId: userId, // İşlemi yapan kullanıcı
                    purchaseId: purchase.id,
                    seasonId: seasonId || undefined,
                    notes: `"${purchase.id}" ID'li alış kaydı.`
                }
            });
        } else {
            // Bu durumun oluşmaması gerekir ama hata yönetimi için eklendi
            console.error("Inventory could not be created, cannot create transaction log."); // Log eklendi
            throw new Error("Envanter oluşturulamadı ancak işlem kaydı oluşturulmaya çalışıldı.");
        }

      } // !isTemplate bloğu sonu

      // 4.6. (Opsiyonel) Bildirim Oluşturma
      // TODO: İlgili kullanıcılara (ortaklar, adminler vb.) bildirim gönderilebilir.

      // 4.7. Borç Kaydı Oluşturma
      // Önce alacaklıyı belirle: Katılımcılardan biri işaretlenmişse o, değilse işlemi yapan kullanıcı
      let creditorId = createdContributors.find(c => c.isCreditor)?.userId;
      if (!creditorId) {
          // Eğer katılımcılardan hiçbiri alacaklı değilse, işlemi yapan kullanıcıyı alacaklı kabul et
          // Ancak işlemi yapan kullanıcı aynı zamanda ödeme yapmayan bir katılımcıysa, bu durumda alacaklı belirsizdir.
          const requestUserIsUnpaidContributor = createdContributors.some(c => c.userId === userId && !c.hasPaid);
          if (!requestUserIsUnpaidContributor) {
              creditorId = userId; // İşlemi yapan kullanıcı alacaklı
              console.log(`Purchase ${purchase.id}: No explicit creditor found, assuming requesting user (${userId}) is the creditor.`);
          } else {
              console.warn(`Purchase ${purchase.id}: Cannot determine creditor. Requesting user (${userId}) is also an unpaid contributor.`);
          }
      }

      if (creditorId) { // Alacaklı belirlenebildiyse borçları oluştur
        const debtPromises = createdContributors
          .filter(contributor => !contributor.hasPaid && contributor.userId !== creditorId) // Ödeme yapmamış VE alacaklı olmayanlar
          .map(debtor => {
            // Borçlu ortağın formdan gelen verisini bul (dueDate için)
            const partnerData = partners.find((p: any) => p.userId === debtor.userId);

            // Vade tarihini belirle:
            // 1. Ortağa özel vade tarihi var mı? (Formdan gelen)
            // 2. Alışın genel vade tarihi var mı?
            // 3. Hiçbiri yoksa varsayılan (3 ay sonrası)
            let dueDate;
            if (partnerData?.dueDate) {
              dueDate = new Date(partnerData.dueDate);
            } else if (purchase.dueDate) { // purchase (yeni oluşturulan alış) nesnesini kullan
              dueDate = new Date(purchase.dueDate);
            } else {
              dueDate = new Date(new Date().setMonth(new Date().getMonth() + 3));
            }

            console.log(`Creating debt for Purchase ${purchase.id}: Debtor=${debtor.userId}, Creditor=${creditorId}, Amount=${debtor.contribution}, DueDate=${dueDate}`); // Log güncellendi

            return tx.debt.create({
              data: {
                amount: debtor.contribution, // Borç miktarı, katkı payı kadar
                dueDate: dueDate,
                status: 'PENDING',
                description: `${purchase.product} alışı için borç`,
                reason: 'PURCHASE', // Borç nedeni: Alış
                creditorId: creditorId, // Belirlenen alacaklı ID'si
                debtorId: debtor.userId, // Borçlu ID'si
                purchaseId: purchase.id, // İlişkili alış ID'si
              },
            });
          });
        await Promise.all(debtPromises);
      } else if (createdContributors.some(c => !c.hasPaid)) {
          // Alacaklı belirlenemedi ve ödenmemiş pay var
          console.error(`Purchase ${purchase.id}: Debts could not be created because the creditor could not be determined.`);
      }

      // Bildirimleri Oluştur
      const senderUser = await tx.user.findUnique({ where: { id: userId } }); // İşlemi başlatan kullanıcı

      // 1. Alış Ortaklarına Bildirim
      for (const contributor of createdContributors) {
        if (contributor.userId !== userId) { // Alışı oluşturan kişiye tekrar bildirim gitmesin
          await tx.notification.create({
            data: {
              title: "Yeni Alıma Dahil Edildiniz",
              message: `${purchase.product} alımına %${contributor.sharePercentage} pay ile dahil edildiniz. Katkı payınız: ${contributor.contribution.toFixed(2)} TL.`,
              type: "SYSTEM", // Veya daha spesifik bir tip e.g., PURCHASE_PARTICIPATION
              receiverId: contributor.userId,
              senderId: userId,
              purchaseId: purchase.id,
              link: `/dashboard/owner/purchases/${purchase.id}`,
              priority: "NORMAL",
            },
          });
        }
      }

      // 2. Yöneticilere (ADMIN) Genel Bilgilendirme ve Onay Bildirimi
      const admins = await tx.user.findMany({ where: { role: "ADMIN" } });
      for (const admin of admins) {
        if (admin.id !== userId) { // Alışı oluşturan admin ise tekrar bildirim gitmesin
          if (purchase.approvalStatus === ApprovalStatus.PENDING && purchase.approvalRequired) {
            await tx.notification.create({
              data: {
                title: "Onay Bekleyen Yeni Alış",
                message: `${purchase.product} için ${purchase.totalCost.toFixed(2)} TL değerinde bir alış (${senderUser?.name || 'bir kullanıcı'} tarafından oluşturuldu) onayınızı bekliyor.`,
                type: "APPROVAL",
                receiverId: admin.id,
                senderId: userId,
                purchaseId: purchase.id,
                link: `/dashboard/admin/purchases/${purchase.id}/approve`, // Örnek onay linki
                priority: "HIGH",
              },
            });
          } else {
            await tx.notification.create({
              data: {
                title: "Yeni Alış Kaydı Oluşturuldu",
                message: `${purchase.product} için ${purchase.totalCost.toFixed(2)} TL değerinde yeni bir alış kaydı (${senderUser?.name || 'bir kullanıcı'} tarafından) oluşturuldu.`,
                type: "SYSTEM", // Veya daha spesifik bir tip e.g., NEW_PURCHASE
                receiverId: admin.id,
                senderId: userId,
                purchaseId: purchase.id,
                link: `/dashboard/owner/purchases/${purchase.id}`,
                priority: "NORMAL",
              },
            });
          }
        }
      }

      return { purchase, contributors: createdContributors, inventory };
    }); // Transaction sonu

    return NextResponse.json(result.purchase); // Sadece oluşturulan alış bilgisini döndür
  } catch (error: any) {
    console.error("Error creating purchase:", error);
    // Prisma veya diğer hataları daha detaylı loglama
    if (error.code) { // Prisma hatası olabilir
        console.error("Prisma Error Code:", error.code);
        console.error("Prisma Error Meta:", error.meta);
    }
    return NextResponse.json(
      {
        error:
          "Alış oluşturulurken bir hata oluştu: " + error.message,
      },
      { status: 500 }
    );
  }
}
