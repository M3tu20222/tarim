import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  ProductCategory,
  Unit,
  PaymentMethod,
  InventoryCategory,
  TransactionType,
} from "@prisma/client";

// Tüm alışları getir
export async function GET(request: NextRequest) {
  try {
    // Middleware'den gelen kullanıcı bilgilerini al
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    // Kimlik doğrulama kontrolü
    if (!userId) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const isTemplate = searchParams.get("isTemplate") === "true";
    const seasonId = searchParams.get("seasonId");

    // Filtre oluştur
    const filter: any = {};

    // Şablon filtresi ekle
    if (isTemplate !== null) {
      filter.isTemplate = isTemplate;
    }

    // Sezon filtresi ekle
    if (seasonId) {
      filter.seasonId = seasonId;
    }

    let purchases;

    // Admin tüm alışları görebilir, diğer kullanıcılar sadece kendi katıldıkları alışları
    if (userRole === "ADMIN") {
      purchases = await prisma.purchase.findMany({
        where: filter,
        include: {
          contributors: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              paymentHistory: true,
            },
          },
          debts: {
            include: {
              creditor: {
                select: {
                  id: true,
                  name: true,
                },
              },
              debtor: {
                select: {
                  id: true,
                  name: true,
                },
              },
              paymentHistory: true,
            },
          },
          invoices: true,
          inventoryTransactions: {
            include: {
              inventory: true,
            },
          },
          season: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      // Kullanıcının katıldığı alışları getir
      purchases = await prisma.purchase.findMany({
        where: {
          ...filter,
          contributors: {
            some: {
              userId: userId,
            },
          },
        },
        include: {
          contributors: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              paymentHistory: true,
            },
          },
          debts: {
            include: {
              creditor: {
                select: {
                  id: true,
                  name: true,
                },
              },
              debtor: {
                select: {
                  id: true,
                  name: true,
                },
              },
              paymentHistory: true,
            },
          },
          invoices: true,
          inventoryTransactions: {
            include: {
              inventory: true,
            },
          },
          season: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    return NextResponse.json(purchases);
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return NextResponse.json(
      { error: "Alışlar getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Yeni alış oluştur
export async function POST(request: NextRequest) {
  try {
    // Middleware'den gelen kullanıcı bilgilerini al
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    // Kimlik doğrulama kontrolü
    if (!userId) {
      console.log("Kullanıcı kimliği bulunamadı");
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    // Debug için
    console.log("API isteği işleniyor, kullanıcı:", userId, "rol:", userRole);

    const data = await request.json();

    // İstek verilerini kontrol et
    console.log("Alınan veri:", JSON.stringify(data, null, 2));

    // Veri doğrulama
    if (
      !data.product ||
      !data.quantity ||
      !data.unit ||
      !data.unitPrice ||
      !data.totalCost ||
      !data.paymentMethod ||
      !data.partners ||
      data.partners.length === 0
    ) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik" },
        { status: 400 }
      );
    }

    // Ortaklık yüzdelerinin toplamı 100 olmalı
    const totalPercentage = data.partners.reduce(
      (sum: number, partner: any) =>
        sum + (Number.parseFloat(partner.sharePercentage) || 0),
      0
    );

    if (Math.abs(totalPercentage - 100) > 0.01) {
      return NextResponse.json(
        { error: "Ortaklık yüzdelerinin toplamı %100 olmalıdır" },
        { status: 400 }
      );
    }

    // Transaction kullanarak tüm işlemleri atomik olarak gerçekleştir
    const result = await prisma.$transaction(async (tx) => {
      // 1. Alış kaydını oluştur
      const purchase = await tx.purchase.create({
        data: {
          product: data.product,
          category: (data.category || "FERTILIZER") as ProductCategory,
          quantity: Number.parseFloat(data.quantity),
          unit: data.unit as Unit,
          unitPrice: Number.parseFloat(data.unitPrice),
          totalCost: Number.parseFloat(data.totalCost),
          paymentMethod: data.paymentMethod as PaymentMethod,
          description: data.notes || "",
          isTemplate: data.isTemplate || false,
          templateName: data.templateName || null,
          seasonId: data.seasonId === "no-season" ? null : data.seasonId,
          approvalRequired: data.approvalRequired || false,
          approvalThreshold: data.approvalThreshold
            ? Number.parseFloat(data.approvalThreshold)
            : 1000,
        },
      });

      // 2. Katılımcıları ve envanter kayıtlarını oluştur
      const contributors = [];
      const inventories = [];
      const inventoryOwnerships = [];
      const inventoryTransactions = [];
      const debts = [];

      for (const partner of data.partners) {
        // Ortaklık payını hesapla
        const sharePercentage = Number.parseFloat(partner.sharePercentage);
        const contribution =
          (Number.parseFloat(data.totalCost) * sharePercentage) / 100;
        const allocatedQuantity =
          (Number.parseFloat(data.quantity) * sharePercentage) / 100;

        // Katılımcı kaydını oluştur
        const contributor = await tx.purchaseContributor.create({
          data: {
            purchaseId: purchase.id,
            userId: partner.userId,
            sharePercentage: sharePercentage,
            contribution: contribution,
            expectedContribution: contribution,
            actualContribution: partner.hasPaid ? contribution : 0,
            remainingAmount: partner.hasPaid ? 0 : contribution,
            hasPaid: partner.hasPaid || false,
            paymentDate: partner.hasPaid
              ? new Date()
              : partner.dueDate
                ? new Date(partner.dueDate)
                : null,
            isCreditor: partner.userId === userId, // Alışı yapan kişi kredi veren
          },
        });

        contributors.push(contributor);

        // Envanter kaydını oluştur
        const inventory = await tx.inventory.create({
          data: {
            name: data.product,
            category: (data.category || "FERTILIZER") as InventoryCategory,
            totalQuantity: allocatedQuantity,
            unit: data.unit as Unit,
            purchaseDate: new Date(),
            status: "AVAILABLE",
            notes: `${purchase.id} numaralı alıştan tahsis edildi`,
          },
        });

        inventories.push(inventory);

        // Envanter sahipliği kaydını oluştur
        const ownership = await tx.inventoryOwnership.create({
          data: {
            inventoryId: inventory.id,
            userId: partner.userId,
            shareQuantity: allocatedQuantity,
          },
        });

        inventoryOwnerships.push(ownership);

        // Envanter işlemi kaydını oluştur
        const transaction = await tx.inventoryTransaction.create({
          data: {
            type: "PURCHASE" as TransactionType,
            quantity: allocatedQuantity,
            date: new Date(),
            notes: `${data.product} alışı`,
            inventoryId: inventory.id,
            purchaseId: purchase.id,
            userId: partner.userId,
            seasonId: data.seasonId === "no-season" ? null : data.seasonId,
          },
        });

        inventoryTransactions.push(transaction);

        // Ödeme yapmadıysa ve kredi veren değilse borç oluştur
        if (!partner.hasPaid && partner.userId !== userId) {
          const debt = await tx.debt.create({
            data: {
              amount: contribution,
              dueDate: partner.dueDate
                ? new Date(partner.dueDate)
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              status: "PENDING",
              description: `${data.product} alışı için borç`,
              creditorId: userId,
              debtorId: partner.userId,
              purchaseId: purchase.id,
            },
          });

          debts.push(debt);

          // Borç bildirimi oluştur
          await tx.notification.create({
            data: {
              title: "Yeni Borç",
              message: `${data.product} alışı için ${contribution.toFixed(2)} TL tutarında borcunuz bulunmaktadır.`,
              type: "DEBT",
              receiverId: partner.userId,
              senderId: userId,
            },
          });
        }
      }

      return {
        purchase,
        contributors,
        inventories,
        inventoryOwnerships,
        inventoryTransactions,
        debts,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Error creating purchase:", error);
    return NextResponse.json(
      { error: error.message || "Alış oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
