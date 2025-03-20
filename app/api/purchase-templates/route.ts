import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Tüm şablonları getir
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

    let templates;

    // Admin tüm şablonları görebilir, diğer kullanıcılar sadece kendi şablonlarını
    if (userRole === "ADMIN") {
      templates = await prisma.purchase.findMany({
        where: {
          isTemplate: true,
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
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      // Kullanıcının kendi şablonlarını getir
      templates = await prisma.purchase.findMany({
        where: {
          isTemplate: true,
          contributors: {
            some: {
              userId: userId,
              isCreditor: true, // Sadece kredi veren (oluşturan) kişinin şablonları
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
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Şablonlar getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Şablonu alış olarak kullan
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
      templateId,
      purchaseDate,
      quantity,
      unitPrice,
      totalCost,
      paymentMethod,
      notes,
    } = await request.json();

    if (!templateId) {
      return NextResponse.json(
        { error: "Şablon ID'si gerekli" },
        { status: 400 }
      );
    }

    // Şablonu bul
    const template = await prisma.purchase.findUnique({
      where: {
        id: templateId,
        isTemplate: true,
      },
      include: {
        contributors: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Şablon bulunamadı" }, { status: 404 });
    }

    // Şablondan yeni alış oluştur
    const result = await prisma.$transaction(async (tx) => {
      // 1. Alış kaydı oluştur
      const purchase = await tx.purchase.create({
        data: {
          product: template.product,
          quantity: quantity || template.quantity,
          unit: template.unit,
          unitPrice: unitPrice || template.unitPrice,
          totalCost:
            totalCost ||
            (quantity && unitPrice ? quantity * unitPrice : template.totalCost),
          paymentMethod: paymentMethod || template.paymentMethod,
          description: notes || template.description,
          createdAt: purchaseDate ? new Date(purchaseDate) : new Date(),
          isTemplate: false,
        },
      });

      // 2. Ortakları kopyala
      const contributors = [];
      const debts = [];
      const inventoryAllocations = [];

      for (const templateContributor of template.contributors) {
        const contributionAmount =
          (purchase.totalCost * templateContributor.sharePercentage) / 100;
        const allocatedQuantity =
          (purchase.quantity * templateContributor.sharePercentage) / 100;

        // Ortağı kaydet
        const contributor = await tx.purchaseContributor.create({
          data: {
            purchaseId: purchase.id,
            userId: templateContributor.userId,
            contribution: contributionAmount,
            expectedContribution: contributionAmount,
            actualContribution: 0,
            remainingAmount: contributionAmount,
            sharePercentage: templateContributor.sharePercentage,
            isCreditor: templateContributor.userId === userId,
            hasPaid: false,
          },
        });

        contributors.push(contributor);

        // Borç oluştur (kendisi hariç)
        if (templateContributor.userId !== userId) {
          const debt = await tx.debt.create({
            data: {
              amount: contributionAmount,
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Varsayılan 30 gün
              status: "PENDING",
              description: `${template.product} alışı için borç`,
              creditorId: userId,
              debtorId: templateContributor.userId,
              purchaseId: purchase.id,
            },
          });

          debts.push(debt);

          // Borç bildirimi oluştur
          await tx.notification.create({
            data: {
              title: "Yeni Borç",
              message: `${template.product} alışı için ${contributionAmount} TL tutarında borcunuz bulunmaktadır.`,
              type: "DEBT",
              receiverId: templateContributor.userId,
              senderId: userId,
            },
          });
        }

        // Envanter oluştur
        const inventory = await tx.inventory.create({
          data: {
            name: template.product,
            category: "OTHER",
            totalQuantity: allocatedQuantity,
            unit: template.unit,
            purchaseDate: new Date(),
            status: "AVAILABLE",
            notes: `${purchase.id} numaralı alıştan tahsis edildi`,
          },
        });

        // Envanter sahipliği oluştur
        const ownership = await tx.inventoryOwnership.create({
          data: {
            inventoryId: inventory.id,
            userId: templateContributor.userId,
            shareQuantity: allocatedQuantity,
          },
        });

        // Envanter işlemi oluştur
        await tx.inventoryTransaction.create({
          data: {
            type: "PURCHASE",
            quantity: allocatedQuantity,
            date: new Date(),
            notes: `${template.product} alışı`,
            inventoryId: inventory.id,
            purchaseId: purchase.id,
            userId: templateContributor.userId,
          },
        });

        inventoryAllocations.push({ inventory, ownership });
      }

      return { purchase, contributors, debts, inventoryAllocations };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating purchase from template:", error);
    return NextResponse.json(
      { error: "Şablondan alış oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
