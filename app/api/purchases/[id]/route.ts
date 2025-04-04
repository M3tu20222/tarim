import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    // Destructure id directly from params to potentially resolve sync access warning
    const { id: purchaseId } = params;

    if (!purchaseId) {
      return NextResponse.json(
        { error: "Alış ID'si gerekli" },
        { status: 400 }
      );
    }

    // Alış kaydını tüm ilişkili verilerle birlikte al
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        contributors: {
          include: {
            user: true,
          },
        },
        season: true,
        debts: true,
        inventoryTransactions: true,
        approvals: {
          include: {
            approver: true,
          },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "Alış kaydı bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json(purchase);
  } catch (error) {
    console.error("Alış detayları alınırken hata:", error);
    return NextResponse.json(
      { error: "Alış detayları alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Alış kaydını güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kimlik doğrulama gerekli" },
        { status: 401 }
      );
    }

    const purchaseId = params.id;

    if (!purchaseId) {
      return NextResponse.json(
        { error: "Alış ID'si gerekli" },
        { status: 400 }
      );
    }

    const data = await request.json();

    // Alış kaydını kontrol et
    const existingPurchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        contributors: true,
      },
    });

    if (!existingPurchase) {
      return NextResponse.json(
        { error: "Alış kaydı bulunamadı" },
        { status: 404 }
      );
    }

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

    // Transaction ile güncelleme işlemlerini gerçekleştir
    const result = await prisma.$transaction(async (tx) => {
      // 1. Alış kaydını güncelle
      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          product: data.product,
          quantity: Number.parseFloat(data.quantity),
          unit: data.unit,
          unitPrice: Number.parseFloat(data.unitPrice),
          totalCost: Number.parseFloat(data.totalCost),
          paymentMethod: data.paymentMethod,
          description: data.notes || "",
          seasonId: data.seasonId === "no-season" ? null : data.seasonId,
          approvalRequired: data.approvalRequired || false,
          approvalThreshold: data.approvalThreshold
            ? Number.parseFloat(data.approvalThreshold)
            : 1000,
        },
      });

      // 2. Mevcut katılımcıları güncelle veya yenilerini ekle
      const existingContributorIds = existingPurchase.contributors.map(
        (c) => c.id
      );
      const updatedContributorIds: string[] = [];

      for (const partner of data.partners) {
        // Katılımcı payını hesapla
        const contributionAmount =
          (Number.parseFloat(data.totalCost) *
            Number.parseFloat(partner.sharePercentage)) /
          100;

        if (partner.id) {
          // Mevcut katılımcıyı güncelle
          const updatedContributor = await tx.purchaseContributor.update({
            where: { id: partner.id },
            data: {
              userId: partner.userId,
              sharePercentage: Number.parseFloat(partner.sharePercentage),
              contribution: contributionAmount,
              expectedContribution: contributionAmount,
              actualContribution: partner.hasPaid ? contributionAmount : 0,
              remainingAmount: partner.hasPaid ? 0 : contributionAmount,
              hasPaid: partner.hasPaid,
              paymentDate: partner.hasPaid
                ? new Date()
                : partner.dueDate
                  ? new Date(partner.dueDate)
                  : null,
            },
          });
          updatedContributorIds.push(updatedContributor.id);
        } else {
          // Yeni katılımcı ekle
          const newContributor = await tx.purchaseContributor.create({
            data: {
              purchaseId,
              userId: partner.userId,
              sharePercentage: Number.parseFloat(partner.sharePercentage),
              contribution: contributionAmount,
              expectedContribution: contributionAmount,
              actualContribution: partner.hasPaid ? contributionAmount : 0,
              remainingAmount: partner.hasPaid ? 0 : contributionAmount,
              hasPaid: partner.hasPaid,
              paymentDate: partner.hasPaid
                ? new Date()
                : partner.dueDate
                  ? new Date(partner.dueDate)
                  : null,
              isCreditor: partner.userId === userId,
            },
          });
          updatedContributorIds.push(newContributor.id);
        }
      }

      // 3. Artık kullanılmayan katılımcıları sil
      const contributorsToDelete = existingContributorIds.filter(
        (id) => !updatedContributorIds.includes(id)
      );
      if (contributorsToDelete.length > 0) {
        await tx.purchaseContributor.deleteMany({
          where: {
            id: { in: contributorsToDelete },
          },
        });
      }

      return updatedPurchase;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Alış güncellenirken hata:", error);
    return NextResponse.json(
      { error: "Alış güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
