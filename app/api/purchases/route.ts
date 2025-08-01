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
      creditorPaymentDueDate, // YENİ: Alacaklının son ödeme tarihi
      notes,
      partners, // [{ userId: string, sharePercentage: number, hasPaid: boolean, isCreditor: boolean, dueDate?: Date }]
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

    // 2. Ortaklık Yüzdesi Doğrulaması (GÜNCELLENMİŞ)
    const totalPercentage = partners.reduce(
      (sum: number, partner: any) => sum + (Number(partner.sharePercentage) || 0),
      0
    );

    // Toplamı en yakın iki ondalık basamağa yuvarla
    const roundedTotal = Math.round(totalPercentage * 100) / 100;

    // Kontrolü yuvarlanmış değere göre yap ve toleransı artır
    if (Math.abs(roundedTotal - 100) > 0.02) { // 99.98 ve 100.02 gibi değerler artık kabul edilecek
      console.error(
        `Validation Error: Total percentage (${roundedTotal}) is not 100%. Original: ${totalPercentage}`
      );
      return NextResponse.json(
        { error: `Ortaklık yüzdelerinin toplamı (${roundedTotal}) %100 olmalıdır.` },
        { status: 400 }
      );
    }

    // 3. Toplam Maliyeti Hesapla (Ondalık sayı sorununu önlemek için yuvarlama)
    const totalCost = Number((quantity * unitPrice).toFixed(2));

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
          totalCost, // Yuvarlanmış toplam maliyet
          paymentMethod: paymentMethod as PaymentMethod,
          creditorPaymentDueDate: creditorPaymentDueDate ? new Date(creditorPaymentDueDate) : null,
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

      // 4.2. Alış Katılımcılarını Oluştur (GÜNCELLENMİŞ)

      const calculatedContributions: { userId: string; contribution: number }[] = [];
      let totalCalculatedCost = 0;

      // Önce tüm payları hesapla
      for (const partner of partners) {
          const contribution = Number((totalCost * (partner.sharePercentage / 100)).toFixed(2));
          calculatedContributions.push({ userId: partner.userId, contribution });
          totalCalculatedCost += contribution;
      }

      // "Kayıp kuruş" farkını bul
      const roundingDifference = Number((totalCost - totalCalculatedCost).toFixed(2));

      // Fark varsa, ilk katılımcının payına ekle
      if (roundingDifference !== 0 && calculatedContributions.length > 0) {
          console.log(`Fark bulundu: ${roundingDifference}. İlk katılımcıya ekleniyor.`);
          calculatedContributions[0].contribution += roundingDifference;
      }

      const contributorPromises = partners.map((partner: any) => {
          // Önceden hesaplanmış ve düzeltilmiş payı bul
          const finalContribution = calculatedContributions.find(c => c.userId === partner.userId)!.contribution;
          
          return tx.purchaseContributor.create({
            data: {
              purchaseId: purchase.id,
              userId: partner.userId,
              sharePercentage: partner.sharePercentage,
              contribution: finalContribution, // Düzeltilmiş katkı payı
              expectedContribution: finalContribution,
              hasPaid: partner.hasPaid ?? false,
              paymentDate: partner.hasPaid ? new Date() : undefined,
              isCreditor: partner.isCreditor ?? false,
              remainingAmount: partner.hasPaid ? 0 : finalContribution,
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
            // totalStock alanı şema varsayılanı (0) nedeniyle burada ayarlanamayabilir.
            unit: unit as Unit,
            purchaseDate: new Date(purchaseDate),
            costPrice: unitPrice, // Birim maliyeti kaydet
            status: InventoryStatus.AVAILABLE,
            notes: `"${purchase.id}" ID'li alış ile eklendi.`,
            // ownerships ilişkisi aşağıda ayrıca oluşturulacak
          },
        });

        // Prisma şemasındaki @default(0) sorununu aşmak için oluşturduktan hemen sonra güncelle
        inventory = await tx.inventory.update({
          where: { id: inventory.id },
          data: { totalStock: quantity },
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
      // Ön yüzden gelen `isCreditor` bayrağına göre alacaklıyı bul.
      const creditor = createdContributors.find(c => c.isCreditor);

      if (!creditor && createdContributors.some(c => !c.hasPaid)) {
          // Ödeme yapmamış ortaklar varken alacaklı belirtilmemişse bu bir hatadır.
          console.error(`Purchase ${purchase.id}: Creditor not specified for a purchase with unpaid partners.`);
          throw new Error("Ödeme yapmamış ortaklar varken, ödemeyi yapan alacaklı belirtilmelidir.");
      }

      if (creditor) {
        const debtPromises = createdContributors
          // Ödeme yapmamış VE alacaklı olmayanlar için borç oluştur
          .filter(contributor => !contributor.hasPaid && contributor.userId !== creditor.userId)
          .map(debtor => {
            // Borçlu ortağın formdan gelen verisini bul (dueDate için)
            const partnerData = partners.find((p: any) => p.userId === debtor.userId);

            // Vade tarihini belirle:
            // 1. Alacaklının genel bir son ödeme tarihi var mı? Varsa 1 gün öncesini al.
            // 2. Ortağa özel vade tarihi var mı? (Formdan gelen)
            // 3. Hiçbiri yoksa varsayılan (3 ay sonrası)
            let dueDate;
            if (purchase.creditorPaymentDueDate) {
              dueDate = new Date(purchase.creditorPaymentDueDate);
              dueDate.setDate(dueDate.getDate() - 1); // 1 gün öncesi
            } else if (partnerData?.dueDate) {
              dueDate = new Date(partnerData.dueDate);
            } else {
              dueDate = new Date(new Date().setMonth(new Date().getMonth() + 3));
            }

            console.log(`Creating debt for Purchase ${purchase.id}: Debtor=${debtor.userId}, Creditor=${creditor.userId}, Amount=${debtor.contribution}, DueDate=${dueDate}`);

            return tx.debt.create({
              data: {
                amount: debtor.contribution, // Bu değer zaten yukarıda yuvarlandı
                dueDate: dueDate,
                status: 'PENDING',
                description: `${purchase.product} alışı için borç`,
                reason: 'PURCHASE',
                creditorId: creditor.userId, // Belirlenen alacaklı ID'si
                debtorId: debtor.userId,
                purchaseId: purchase.id,
              },
            });
          });
        await Promise.all(debtPromises);
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
