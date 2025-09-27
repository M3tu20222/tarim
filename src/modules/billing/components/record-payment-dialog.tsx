'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, Users } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const paymentSchema = z.object({
  payerId: z.string().min(1, 'Ödeme yapan kişi seçilmelidir.'),
  amount: z.coerce.number().min(0.01, 'Tutar 0\'dan büyük olmalıdır.'),
  paymentDate: z.date({ required_error: 'Ödeme tarihi zorunludur.' }),
  paymentMethod: z.string().min(1, 'Ödeme yöntemi zorunludur.'),
  description: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

// ownerTotals prop'unun tipini tanımla
type OwnerTotals = Record<string, { name: string; total: number }>;

interface RecordPaymentDialogProps {
  periodId: string;
  owners: { id: string; name: string }[];
  ownerTotals: OwnerTotals;
  wellName: string;
  startDate: Date | string;
  endDate: Date | string;
  totalAmount: number;
  onPaymentRecorded: () => void;
}

export function RecordPaymentDialog({
  periodId,
  owners,
  ownerTotals,
  wellName,
  startDate,
  endDate,
  totalAmount,
  onPaymentRecorded,
}: RecordPaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<PaymentFormValues | null>(null);

  const formatDate = (date: Date | string) => new Date(date).toLocaleDateString('tr-TR');
  const defaultDescription = `${formatDate(startDate)}-${formatDate(endDate)} Tarihli ${wellName} Kuyusu Fatura Ödemesi`;

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: totalAmount,
      paymentDate: new Date(),
      paymentMethod: 'BANK_TRANSFER',
      description: defaultDescription,
    },
  });

  // Formu resetlemek için
  useEffect(() => {
    if (isOpen) {
      form.reset({
        amount: totalAmount,
        paymentDate: new Date(),
        paymentMethod: 'BANK_TRANSFER',
        description: defaultDescription,
        payerId: '',
      });
      setShowSummary(false);
    }
  }, [isOpen, totalAmount, defaultDescription, form]);


  const handleShowSummary = (values: PaymentFormValues) => {
    setSummaryData(values);
    setShowSummary(true);
  };

  const handleGoBack = () => {
    setShowSummary(false);
    setSummaryData(null);
  };

  const handleSubmit = async () => {
    if (!summaryData) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/billing/periods/${periodId}/record-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...summaryData,
          paymentDate: summaryData.paymentDate.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ödeme kaydedilemedi.');
      }

      onPaymentRecorded();
      setIsOpen(false);

    } catch (error: any) {
      console.error('Ödeme işlemi başarısız:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPayerName = summaryData ? owners.find(o => o.id === summaryData.payerId)?.name : '';
  
  const debtDistribution = summaryData ? Object.entries(ownerTotals)
    .filter(([ownerId]) => ownerId !== summaryData.payerId)
    .map(([ownerId, data]) => ({
      name: data.name,
      amount: data.total,
    })) : [];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Toplu Ödeme Kaydet</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-neutral-950 text-neutral-100 border-fuchsia-500/30 top-[10vh] translate-y-0">
        {!showSummary ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-fuchsia-300">Toplu Ödeme Kaydet</DialogTitle>
              <DialogDescription className="text-neutral-400">
                Fatura dönemine ait toplu ödemeyi kaydedin. Bu işlem, seçilen kişi adına ödeme yapacak ve diğer ortakları borçlandıracaktır.
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[60vh] overflow-y-auto p-1 pr-4">
              <Form {...form}>
                <form id="payment-form" onSubmit={form.handleSubmit(handleShowSummary)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="payerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ödemeyi Yapan Kişi</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Bir ortak seçin..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {owners.map(owner => (
                              <SelectItem key={owner.id} value={owner.id}>
                                {owner.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ödenen Tutar</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Ödeme Tarihi</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP', { locale: tr })
                                ) : (
                                  <span>Bir tarih seçin</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ödeme Yöntemi</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Ödeme yöntemi seçin..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="BANK_TRANSFER">Havale/EFT</SelectItem>
                            <SelectItem value="CREDIT_CARD">Kredi Kartı</SelectItem>
                            <SelectItem value="CASH">Nakit</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Açıklama</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ödeme ile ilgili notlar..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button type="submit" form="payment-form">Özeti Gör</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-fuchsia-300">İşlem Özeti ve Onay</DialogTitle>
              <DialogDescription className="text-neutral-400">
                Lütfen aşağıdaki bilgileri kontrol edin ve işlemi onaylayın.
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[60vh] space-y-4 overflow-y-auto p-1 pr-4">
              <div className="space-y-2 rounded-md border border-neutral-800 p-3">
                <p><strong>Ödemeyi Yapan:</strong> {selectedPayerName}</p>
                <p><strong>Tutar:</strong> {summaryData?.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                <p><strong>Tarih:</strong> {summaryData ? format(summaryData.paymentDate, 'PPP', { locale: tr }) : ''}</p>
                {summaryData?.description && <p><strong>Açıklama:</strong> {summaryData.description}</p>}
              </div>

              <div className="space-y-2 rounded-md border border-neutral-800 p-3">
                <h4 className="flex items-center font-semibold text-neutral-300">
                  <Users className="mr-2 h-4 w-4" />
                  Borç Dağılımı
                </h4>
                {debtDistribution.map(debtor => (
                  <div key={debtor.name} className="flex justify-between text-sm">
                    <span>{debtor.name}</span>
                    <span className="font-mono">{debtor.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button variant="outline" onClick={handleGoBack} disabled={isSubmitting} className="border-neutral-700 text-neutral-300">Geri Dön</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="border border-emerald-400/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30">
                {isSubmitting ? 'İşleniyor...' : 'Onayla ve Borçları Oluştur'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
