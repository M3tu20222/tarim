import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Kuyu faturası paylarını hesapla
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // Sadece admin ve sahip kullanıcılar fatura paylarını hesaplayabilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const id = params.id;

    // Kuyu faturasını getir
    const wellBill = await prisma.wellBill.findUnique({
      where: { id },
      include: {
        well: true,
        billingPeriod: true,
      },
    });

    if (!wellBill) {
      return NextResponse.json(
        { error: "Kuyu faturası bulunamadı" },
        { status: 404 }
      );
    }

    // Mevcut hesaplamaları kontrol et
    const existingOwnerBills = await prisma.ownerBill.findMany({
      where: { wellBillId: id },
    });

    if (existingOwnerBills.length > 0) {
      return NextResponse.json(
        {
          error:
            "Bu fatura için zaten hesaplama yapılmış. Önce mevcut hesaplamaları silin.",
        },
        { status: 400 }
      );
    }

    // Bu dönemdeki bu kuyunun tüm sulama kayıtlarını getir
    const irrigationLogs = await prisma.irrigationLog.findMany({
      where: {
        date: {
          gte: wellBill.billingPeriod.startDate,
          lte: wellBill.billingPeriod.endDate,
        },
        wellUsages: {
          some: {
            wellId: wellBill.wellId,
          },
        },
      },
      include: {
        field: {
          include: {
            owners: true, // Tarla sahipleri
          },
        },
        wellUsages: {
          where: {
            wellId: wellBill.wellId,
          },
        },
      },
    });

    // Sulama kaydı yoksa hata döndür
    if (irrigationLogs.length === 0) {
      return NextResponse.json(
        { error: "Bu dönemde bu kuyu için sulama kaydı bulunamadı" },
        { status: 400 }
      );
    }

    // Tarla bazında kullanım sürelerini hesapla
    const fieldUsages: Record<string, { hours: number; field: any }> = {};

    irrigationLogs.forEach((log) => {
      const wellUsage = log.wellUsages[0]; // Bu kuyunun kullanımı
      const fieldId = log.fieldId;

      if (!fieldUsages[fieldId]) {
        fieldUsages[fieldId] = { hours: 0, field: log.field };
      }

      fieldUsages[fieldId].hours += wellUsage.duration;
    });

    // Tarla sahibi bazında kullanım sürelerini hesapla
    const ownerUsages: Record<
      string,
      {
        hours: number;
        user: any;
        fields: Record<
          string,
          { hours: number; percentage: number; field: any }
        >;
      }
    > = {};

    Object.entries(fieldUsages).forEach(([fieldId, { hours, field }]) => {
      field.owners.forEach((owner: any) => {
        const userId = owner.userId;
        const percentage = owner.percentage / 100; // Yüzde olarak

        if (!ownerUsages[userId]) {
          ownerUsages[userId] = {
            hours: 0,
            user: { id: owner.userId },
            fields: {},
          };
        }

        ownerUsages[userId].hours += hours * percentage;

        if (!ownerUsages[userId].fields[fieldId]) {
          ownerUsages[userId].fields[fieldId] = {
            hours: 0,
            percentage,
            field,
          };
        }

        ownerUsages[userId].fields[fieldId].hours += hours * percentage;
      });
    });

    // Her tarla sahibi için fatura payını hesapla
    const totalHours = Object.values(ownerUsages).reduce(
      (sum, { hours }) => sum + hours,
      0
    );
    const billAmount = wellBill.totalAmount;

    // Transaction başlat
    const ownerBills = await prisma.$transaction(async (tx) => {
      // Kuyu faturasını güncelle
      await tx.wellBill.update({
        where: { id: wellBill.id },
        data: {
          totalHours,
        },
      });

      // Tarla sahibi faturalarını oluştur
      const bills = [];

      for (const [userId, { hours, fields }] of Object.entries(ownerUsages)) {
        // Tarla sahibinin payını hesapla
        const amount = (hours / totalHours) * billAmount;

        // Tarla sahibi faturasını oluştur
        const ownerBill = await tx.ownerBill.create({
          data: {
            userId,
            wellBillId: wellBill.id,
            billingPeriodId: wellBill.billingPeriodId,
            amount,
            totalHours: hours,
            status: "PENDING",
          },
        });

        // Tarla kullanım kayıtlarını oluştur
        for (const [
          fieldId,
          { hours: fieldHours, percentage },
        ] of Object.entries(fields)) {
          const fieldAmount = (fieldHours / hours) * amount;

          await tx.fieldBillUsage.create({
            data: {
              ownerBillId: ownerBill.id,
              fieldId,
              hours: fieldHours,
              amount: fieldAmount,
              percentage,
            },
          });
        }

        bills.push(ownerBill);
      }

      return bills;
    });

    return NextResponse.json(ownerBills);
  } catch (error) {
    console.error("Error calculating well bill shares:", error);
    return NextResponse.json(
      { error: "Fatura payları hesaplanırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
