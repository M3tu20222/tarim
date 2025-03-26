import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApprovalStatus } from "@prisma/client";

// Alış onayı
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

    // Sadece admin ve sahip kullanıcılar onaylayabilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const { status, comment } = await request.json();

    // Veri doğrulama
    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Geçersiz onay durumu" },
        { status: 400 }
      );
    }

    // Alışı kontrol et
    const purchase = await prisma.purchase.findUnique({
      where: { id: params.id },
      include: {
        approvals: {
          where: { approverId: userId },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: "Alış bulunamadı" }, { status: 404 });
    }

    // Zaten onaylanmış mı kontrol et
    if (purchase.approvalStatus !== "PENDING") {
      return NextResponse.json(
        { error: "Bu alış zaten onaylanmış veya reddedilmiş" },
        { status: 400 }
      );
    }

    // Kullanıcı zaten onaylamış mı kontrol et
    if (purchase.approvals.length > 0) {
      // Mevcut onayı güncelle
      await prisma.purchaseApproval.update({
        where: { id: purchase.approvals[0].id },
        data: {
          status: status as ApprovalStatus,
          comment,
          approvedAt: new Date(),
        },
      });
    } else {
      // Yeni onay oluştur
      await prisma.purchaseApproval.create({
        data: {
          purchase: { connect: { id: params.id } },
          approver: { connect: { id: userId } },
          status: status as ApprovalStatus,
          comment,
          approvedAt: new Date(),
        },
      });
    }

    // Tüm onayları kontrol et
    const allApprovals = await prisma.purchaseApproval.findMany({
      where: { purchaseId: params.id },
    });

    // Onay durumunu güncelle
    let finalStatus: ApprovalStatus = "PENDING";

    // Herhangi bir red varsa, alış reddedilir
    if (allApprovals.some((approval) => approval.status === "REJECTED")) {
      finalStatus = ApprovalStatus.REJECTED;
    }
    // Tüm onaylar tamamsa ve en az bir onay varsa, alış onaylanır
    else if (
      allApprovals.every((approval) => approval.status === "APPROVED") &&
      allApprovals.length > 0
    ) {
      finalStatus = ApprovalStatus.APPROVED;
    }

    // Alış durumunu güncelle
    await prisma.purchase.update({
      where: { id: params.id },
      data: { approvalStatus: finalStatus },
    });

    // Bildirim oluştur
    await prisma.notification.create({
      data: {
        title: `Alış ${finalStatus === "APPROVED" ? "Onaylandı" : finalStatus === "REJECTED" ? "Reddedildi" : "Onay Bekliyor"}`,
        message: `${purchase.product} alışı ${finalStatus === "APPROVED" ? "onaylandı" : finalStatus === "REJECTED" ? "reddedildi" : "onay bekliyor"}.`,
        type: "APPROVAL",
        receiver: {
          connect: {
            // Alışı oluşturan kişiye bildirim gönder (burada ilk katkı sahibini alıyoruz)
            id:
              (
                await prisma.purchaseContributor.findFirst({
                  where: { purchaseId: params.id },
                  orderBy: { createdAt: "asc" },
                  select: { userId: true },
                })
              )?.userId || userId,
          },
        },
        sender: {
          connect: { id: userId },
        },
      },
    });

    return NextResponse.json({
      message: `Alış başarıyla ${finalStatus === "APPROVED" ? "onaylandı" : finalStatus === "REJECTED" ? "reddedildi" : "onay bekliyor"}`,
      status: finalStatus,
    });
  } catch (error) {
    console.error("Error approving purchase:", error);
    return NextResponse.json(
      { error: "Alış onaylanırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
