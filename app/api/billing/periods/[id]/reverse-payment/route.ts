import { NextResponse } from 'next/server';
import { PrismaClient, DebtStatus } from '@prisma/client'; // DebtStatus enum'ını import et
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: periodId } = await params;
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fatura dönemini ve ilişkili dağıtımları bul
      const period = await tx.wellBillingPeriod.findUnique({
        where: { id: periodId },
        include: {
          distributions: {
            include: {
              owner: true,
            },
          },
        },
      });

      if (!period) {
        throw new Error('Fatura dönemi bulunamadı.');
      }

      if (period.status !== "PAID") { // String olarak karşılaştır
        throw new Error('Bu fatura dönemi ödenmemiş durumda, geri alınamaz.');
      }

      // 2. Bu ödeme işlemi sonucu oluşturulan YENİ borçları bul ve sil
      // WellBillDistribution üzerinden, bu dönemle ilişkili ve WELL_BILLING_PAYMENT reason'lı borçları bulalım.
      const distributionsOfPaidPeriod = await tx.wellBillDistribution.findMany({
        where: { wellBillingPeriodId: periodId },
        include: { debt: true },
      });

      const debtIdsToDelete = distributionsOfPaidPeriod
        .filter(dist => dist.debt && dist.debt.reason === 'WELL_BILLING_PAYMENT' && dist.debt.status === DebtStatus.PENDING)
        .map(dist => dist.debt!.id);

      if (debtIdsToDelete.length > 0) {
        await tx.debt.deleteMany({
          where: { id: { in: debtIdsToDelete } },
        });
      }

      // 3. Fatura dönemi durumunu 'PENDING' olarak güncelle
      await tx.wellBillingPeriod.update({
        where: { id: periodId },
        data: { status: "PENDING" }, // String olarak karşılaştır
      });

      // 4. İsteğe bağlı: Ödeme geçmişine bir "reverse" notu ekle
      // Bu kısımlar isteğe bağlıdır ve sistem ihtiyacına göre uyarlanabilir.
      // Örneğin, ödeme geçmişi tablosunda bir "reverse" işlemi kaydı tutulabilir.
      // Veya mevcut ödeme geçmişi kaydına bir not eklenir.
      // Şimdilik bu adımı atlıyoruz.

      return { message: 'Ödeme başarıyla geri alındı ve borçlar iptal edildi.' };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Ödeme geri alma işlemi başarısız:', error);
    return NextResponse.json({ error: 'İşlem sırasında bir hata oluştu.', details: error.message }, { status: 500 });
  }
}
