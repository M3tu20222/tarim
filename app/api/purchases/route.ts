import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { Unit, InventoryCategory } from "@prisma/client";

// Tüm alışları getir
export async function GET(request: Request) {
  try {
    // Yetkilendirme kontrolü
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    const userId = session.id;
    const userRole = session.role;

    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const isTemplate = searchParams.get("isTemplate") === "true";

    let purchases;

    // Admin tüm alışları görebilir, diğer kullanıcılar sadece kendi katıldıkları alışları
    if (userRole === "ADMIN") {
      purchases = await prisma.purchase.findMany({
        where: {
          isTemplate: isTemplate || undefined, // Şablon filtresi
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
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      // Kullanıcının katıldığı alışları getir
      purchases = await prisma.purchase.findMany({
        where: {
          isTemplate: isTemplate || undefined, // Şablon filtresi
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
export async function POST(request: Request) {
  try {
    // Yetkilendirme kontrolü
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    const userId = session.id;
    const userRole = session.role;

    const {
      product,
      category, // Kategori alanı
      quantity,
      unit,
      unitPrice,
      totalCost,
      paymentMethod,
      purchaseDate,
      notes,
      partners,
      saveAsTemplate, // Şablon olarak kaydet
      templateName,
    } = await request.json();

    // Veri doğrulama
    if (
      !product ||
      !quantity ||
      !unit ||
      !unitPrice ||
      !totalCost ||
      !paymentMethod ||
      !partners ||
      partners.length === 0
    ) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik" },
        { status: 400 }
      );
    }

    // Ortaklık yüzdelerinin toplamı 100 olmalı
    const totalPercentage = partners.reduce(
      (sum: number, partner: any) => sum + (partner.sharePercentage || 0),
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return NextResponse.json(
        { error: "Ortaklık yüzdelerinin toplamı %100 olmalıdır" },
        { status: 400 }
      );
    }

    // İşlem başlat
    const result = await prisma.$transaction(async (tx) => {
      // 1. Alış kaydı oluştur
      const purchase = await tx.purchase.create({
        data: {
          product,
          quantity: Number.parseFloat(quantity),
          unit: unit as Unit,
          unitPrice: Number.parseFloat(unitPrice),
          totalCost: Number.parseFloat(totalCost),
          paymentMethod,
          dueDate: partners.some((p: any) => !p.hasPaid)
            ? partners.find((p: any) => !p.hasPaid)?.dueDate
            : undefined,
          description: notes,
          createdAt: purchaseDate ? new Date(purchaseDate) : new Date(),
          isTemplate: saveAsTemplate || false,
          templateName: saveAsTemplate ? templateName || product : null,
        },
      });

      // 2. Ortakları kaydet ve borçları oluştur
      const contributors = [];
      const debts = [];
      const inventoryAllocations = [];
      const paymentHistories = [];
      const inventoryTransactions = [];

      for (const partner of partners) {
        // Ortaklık payını hesapla
        const contributionAmount = (totalCost * partner.sharePercentage) / 100;
        const allocatedQuantity = (quantity * partner.sharePercentage) / 100;

        // Ortağı kaydet
        const contributor = await tx.purchaseContributor.create({
          data: {
            purchaseId: purchase.id,
            userId: partner.userId,
            contribution: contributionAmount,
            expectedContribution: contributionAmount, // Yeni alan
            actualContribution: partner.hasPaid ? contributionAmount : 0, // Yeni alan
            remainingAmount: partner.hasPaid ? 0 : contributionAmount, // Yeni alan
            sharePercentage: partner.sharePercentage,
            isCreditor: partner.userId === userId, // Alışı yapan kişi kredi veren
            hasPaid: partner.hasPaid,
            paymentDate: partner.hasPaid ? new Date() : null,
          },
        });

        contributors.push(contributor);

        // Ödeme yaptıysa ödeme geçmişi oluştur
        if (partner.hasPaid) {
          const payment = await tx.paymentHistory.create({
            data: {
              amount: contributionAmount,
              paymentDate: new Date(),
              paymentMethod,
              notes: `${product} alışı için ödeme`,
              contributorId: contributor.id,
              payerId: partner.userId,
              receiverId: userId, // Alışı yapan kişi alacaklı
            },
          });
          paymentHistories.push(payment);
        }
        // Ödeme yapmadıysa borç oluştur
        else if (!partner.hasPaid && partner.userId !== userId) {
          const debt = await tx.debt.create({
            data: {
              amount: contributionAmount,
              dueDate:
                partner.dueDate ||
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Varsayılan 30 gün
              status: "PENDING",
              description: `${product} alışı için borç`,
              creditorId: userId, // Alışı yapan kişi alacaklı
              debtorId: partner.userId, // Ortak borçlu
              purchaseId: purchase.id,
            },
          });

          debts.push(debt);

          // Borç bildirimi oluştur
          await tx.notification.create({
            data: {
              title: "Yeni Borç",
              message: `${product} alışı için ${contributionAmount} TL tutarında borcunuz bulunmaktadır.`,
              type: "DEBT",
              receiverId: partner.userId,
              senderId: userId,
            },
          });
        }

        // Envanter oluştur
        const inventory = await tx.inventory.create({
          data: {
            name: product,
            category: (category || "OTHER") as InventoryCategory,
            totalQuantity: allocatedQuantity,
            unit: unit as Unit,
            purchaseDate: new Date(),
            status: "AVAILABLE",
            notes: `${purchase.id} numaralı alıştan tahsis edildi`,
          },
        });

        // Envanter sahipliği oluştur
        const ownership = await tx.inventoryOwnership.create({
          data: {
            inventoryId: inventory.id,
            userId: partner.userId,
            shareQuantity: allocatedQuantity,
          },
        });

        // Envanter işlemi oluştur
        const transaction = await tx.inventoryTransaction.create({
          data: {
            type: "PURCHASE",
            quantity: allocatedQuantity,
            date: new Date(),
            notes: `${product} alışı`,
            inventoryId: inventory.id,
            purchaseId: purchase.id,
            userId: partner.userId,
          },
        });

        inventoryTransactions.push(transaction);
        inventoryAllocations.push({ inventory, ownership });
      }

      return {
        purchase,
        contributors,
        debts,
        inventoryAllocations,
        paymentHistories,
        inventoryTransactions,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating purchase:", error);
    return NextResponse.json(
      { error: "Alış oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
