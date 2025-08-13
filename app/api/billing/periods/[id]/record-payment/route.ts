import { NextResponse } from 'next/server';
import { PrismaClient, DebtStatus } from '@prisma/client'; // DebtStatus enum'ını import et
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

const paymentSchema = z.object({
  payerId: z.string(),
  amount: z.number(),
  paymentDate: z.string().datetime(),
  paymentMethod: z.string(),
  description: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  const periodId = params.id;
  const body = await request.json();

  const validation = paymentSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Geçersiz veri', details: validation.error.flatten() }, { status: 400 });
  }

  const { payerId, amount, paymentDate, paymentMethod, description } = validation.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fatura dönemini ve ilgili dağıtımları/borçları bul
      const period = await tx.wellBillingPeriod.findUnique({
        where: { id: periodId },
        include: {
          distributions: {
            include: {
              debt: true,
              owner: true,
            },
          },
        },
      });

      if (!period) {
        throw new Error('Fatura dönemi bulunamadı.');
      }

      // 2. Mevcut, ödenmemiş borçları 'PAID' olarak güncelle
      // Bu adım, fatura dönemiyle ilişkili olan ve ödenmemiş olan borçları hedef alır.
      // Bu borçlar, ödeme yapılan kişiye ait olabileceği gibi, başka birine ait de olabilir.
      // Ancak, bu mantık genellikle "birinin borcunu ödeme" senaryosu için değil,
      // "fatura döneminin tamamı ödendi" senaryosu için daha uygundur.
      // Eğer sadece belirli bir kişiye ait borç ödeniyorsa, bu filtreleme daha spesifik olmalı.
      // Kullanım senaryosu "Toplu Ödeme Kaydet" olduğuna göre, tüm dönem ödeniyor kabul ediliyor.
      const debtsToMarkAsPaid = period.distributions
        .filter(dist => dist.debt && dist.debt.status !== 'PAID')
        .map(dist => dist.debt!.id);

      if (debtsToMarkAsPaid.length > 0) {
        await tx.debt.updateMany({
          where: { id: { in: debtsToMarkAsPaid } },
          data: {
            status: 'PAID',
            paymentDate: new Date(paymentDate), // Ödeme tarihi ekleniyor
          },
        });
      }
      
      // 3. Fatura dönemi durumunu 'PAID' olarak güncelle
      await tx.wellBillingPeriod.update({
          where: { id: periodId },
          data: { status: 'PAID' },
      });

      // 4. Ödemeyi yapan kişi (payerId) dışındaki HERKES için,
      //    ödemeyi yapan kişiye YENİ borçlar oluştur.
      //    Yani, Mehmet (payerId) Himmet'in borcunu ödediğinde,
      //    Himmet, Mehmet'e borçlu olur.
      const otherOwners = period.distributions
        .filter(dist => dist.ownerId !== payerId); // Ödemeyi yapan hariç tüm dağıtımlar

      const newDebtsToCreate = otherOwners.map(dist => {
        const payerName = period.distributions.find(d => d.ownerId === payerId)?.owner.name || 'Bilinmeyen Ödeme Yapan';
        const debtorName = dist.owner.name;
        return {
          amount: dist.amount, // Bu kişinin o fatura dönemine olan payı/borcu
          creditorId: payerId, // Alacaklı: Ödemeyi yapan kişi
          debtorId: dist.ownerId, // Borçlu: Ödenen kişi (diğer ortak)
          dueDate: new Date(paymentDate), // Vade tarihi: Ödemenin yapıldığı gün. (İyileştirme: Fatura döneminin kendi vade tarihi olmalı)
          status: DebtStatus.PENDING, // Doğru enum değerini kullan
          description: `${debtorName} adına ${period.startDate.toLocaleDateString('tr-TR')} - ${period.endDate.toLocaleDateString('tr-TR')} tarihli fatura dönemi ödemesi. Ödemeyi yapan: ${payerName}`,
          reason: 'WELL_BILLING_PAYMENT', // Bu alan string olarak tanımlı, bu yüzden sorun yok
        };
      });

      if (newDebtsToCreate.length > 0) {
        await tx.debt.createMany({
          data: newDebtsToCreate,
        });
      }

      // 5. Ödeme geçmişi kaydı oluştur
      await tx.paymentHistory.create({
        data: {
            amount: amount,
            paymentDate: new Date(paymentDate),
            paymentMethod: paymentMethod as any, // Enum tipi için cast
            notes: description || `Fatura dönemi ${periodId} için toplu ödeme.`,
            payerId: payerId,
            receiverId: session.id, // Sisteme ödeme yapıldığı için, işlemi yapan admin/user olabilir. Veya bir sistem kullanıcısı ID'si.
        }
      });

      return { message: 'Ödeme başarıyla kaydedildi ve borçlar güncellendi.' };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Ödeme kaydı işlemi başarısız:', error);
    return NextResponse.json({ error: 'İşlem sırasında bir hata oluştu.', details: error.message }, { status: 500 });
  }
}
