"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

// Form şeması
const formSchema = z.object({
  amount: z.coerce.number().positive({
    message: "Ödeme tutarı pozitif bir sayı olmalıdır.",
  }),
  paymentMethod: z.enum(["CASH", "CREDIT_CARD", "CREDIT", "BANK_TRANSFER"], {
    required_error: "Lütfen bir ödeme yöntemi seçin.",
  }),
  notes: z.string().optional(),
});

interface DebtPaymentFormProps {
  debtId: string;
  remainingAmount: number;
}

export function DebtPaymentForm({
  debtId,
  remainingAmount,
}: DebtPaymentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form tanımı
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: remainingAmount,
      paymentMethod: "CASH",
      notes: "",
    },
  });

  // Form gönderme
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.amount > remainingAmount) {
      toast({
        title: "Hata",
        description: `Ödeme tutarı kalan borç tutarından (${formatCurrency(remainingAmount)}) büyük olamaz.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/debts/${debtId}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          paymentDate: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Ödeme kaydedilirken bir hata oluştu"
        );
      }

      toast({
        title: "Başarılı",
        description: "Ödeme başarıyla kaydedildi.",
      });

      router.refresh();
    } catch (error: any) {
      console.error("Error recording payment:", error);
      toast({
        title: "Hata",
        description: error.message || "Ödeme kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium mb-4">Ödeme Yap</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ödeme Tutarı (₺)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0.01"
                    max={remainingAmount}
                    step="0.01"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Kalan borç tutarı: {formatCurrency(remainingAmount)}
                </FormDescription>
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
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Ödeme yöntemi seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="CASH">Nakit</SelectItem>
                    <SelectItem value="CREDIT_CARD">Kredi Kartı</SelectItem>
                    <SelectItem value="CREDIT">Kredi</SelectItem>
                    <SelectItem value="BANK_TRANSFER">
                      Banka Transferi
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Not</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ödeme hakkında ek bilgiler..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              "Ödeme Yap"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
