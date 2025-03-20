import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Tüm alışları getir
export async function GET(request: Request) {
  try {
    // Yetkilendirme kontrolü
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    let purchases;

    // Admin tüm alışları görebilir, diğer kullanıcılar sadece kendi katıldıkları alışları
    if (userRole === "ADMIN") {
      purchases = await prisma.purchase.findMany({
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
            },
          },
          invoices: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      // Kullanıcının katıldığı alışları getir
      purchases = await prisma.purchase.findMany({
        where: {
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
            },
          },
          invoices: true,
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
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    const {
      product,
      quantity,
      unit, // Yeni eklenen birim alanı
      unitPrice,
      totalCost,
      paymentMethod,
      dueDate,
      description,
      contributors,
      debts,
      createInventory,
    } = await request.json();

    // Veri doğrulama
    if (
      !product ||
      !quantity ||
      !unit || // Birim kontrolü
      !unitPrice ||
      !totalCost ||
      !paymentMethod ||
      !contributors ||
      contributors.length === 0
    ) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik" },
        { status: 400 }
      );
    }

    // İşlem başlat
    const result = await prisma.$transaction(async (tx) => {
      // Alış oluştur
      const purchase = await tx.purchase.create({
        data: {
          product,
          quantity,
          unit, // Birim alanını ekleyelim
          unitPrice,
          totalCost,
          paymentMethod,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          description,
          contributors: {
            create: contributors.map((contributor: any) => ({
              userId: contributor.userId,
              contribution: contributor.contribution,
              isCreditor: contributor.isCreditor,
            })),
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
            },
          },
        },
      });

      // Borçlar oluştur
      const createdDebts = [];
      if (debts && debts.length > 0) {
        for (const debt of debts) {
          const createdDebt = await tx.debt.create({
            data: {
              amount: debt.amount,
              dueDate: debt.dueDate
                ? new Date(debt.dueDate)
                : dueDate
                  ? new Date(dueDate)
                  : new Date(),
              status: "PENDING",
              description: debt.description || `${product} alışı için borç`,
              creditorId: debt.creditorId,
              debtorId: debt.debtorId,
              purchaseId: purchase.id,
            },
          });
          createdDebts.push(createdDebt);

          // Borç bildirimi oluştur
          await tx.notification.create({
            data: {
              title: "Yeni Borç",
              message: `${product} alışı için ${debt.amount} TL tutarında borcunuz bulunmaktadır.`,
              type: "DEBT",
              receiverId: debt.debtorId,
              senderId: debt.creditorId,
            },
          });
        }
      }

      // Envanter oluştur
      let createdInventory = null;
      if (createInventory) {
        const {
          name,
          category,
          unit: inventoryUnit,
          ownerships,
        } = createInventory;

        createdInventory = await tx.inventory.create({
          data: {
            name: name || product,
            category,
            totalQuantity: quantity,
            unit: inventoryUnit || unit, // Envanter birimi veya alış birimi
            purchaseDate: new Date(),
            status: "AVAILABLE",
            ownerships: {
              create: ownerships.map((ownership: any) => ({
                userId: ownership.userId,
                shareQuantity: ownership.shareQuantity,
              })),
            },
          },
        });
      }

      return { purchase, debts: createdDebts, inventory: createdInventory };
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
