"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/components/ui/use-toast";
import type { WellBillingPeriod, BillingPeriod } from "@prisma/client";

type WellBill = WellBillingPeriod;

// Kuyu tipi
interface Well {
  id: string;
  name: string;
  depth: number;
  capacity: number;
  status: string;
}

const formSchema = z.object({
  wellId: z.string({
    required_error: "Kuyu seçilmelidir.",
  }),
  billingPeriodId: z.string({
    required_error: "Fatura dönemi seçilmelidir.",
  }),
  totalAmount: z.coerce.number().positive({
    message: "Toplam tutar pozitif bir sayı olmalıdır.",
  }),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.date().optional(),
});

interface WellBillFormProps {
  initialData?: WellBill;
}

export function WellBillForm({ initialData }: WellBillFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wells, setWells] = useState<Well[]>([]);
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriod[]>([]);

  // Form oluştur
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      wellId: initialData?.wellId || "",
      billingPeriodId: initialData?.billingPeriodId || "",
      totalAmount: initialData?.totalAmount || 0,
      invoiceNumber: initialData?.invoiceNumber || "",
      invoiceDate: initialData?.invoiceDate
        ? new Date(initialData.invoiceDate)
        : undefined,
    },
  });

  // Kuyuları getir
  useEffect(() => {
    const fetchWells = async () => {
      try {
        const response = await fetch("/api/wells");
        if (response.ok) {
          const data = await response.json();
          setWells(data);
        } else {
          toast({
            title: "Hata",
            description: "Kuyular yüklenirken bir hata oluştu.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching wells:", error);
        toast({
          title: "Hata",
          description: "Kuyular yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      }
    };

    fetchWells();
  }, [toast]);

  // Fatura dönemlerini getir
  useEffect(() => {
    const fetchBillingPeriods = async () => {
      try {
        const response = await fetch("/api/billing/periods");
        if (response.ok) {
          const data = await response.json();
          setBillingPeriods(data);
        } else {
          toast({
            title: "Hata",
            description: "Fatura dönemleri yüklenirken bir hata oluştu.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching billing periods:", error);
        toast({
          title: "Hata",
          description: "Fatura dönemleri yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      }
    };

    fetchBillingPeriods();
  }, [toast]);

  // Form gönderimi
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const url = initialData
        ? `/api/billing/well-bills/${initialData.id}`
        : "/api/billing/well-bills";
      const method = initialData ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Kuyu faturası kaydedilirken bir hata oluştu"
        );
      }

      toast({
        title: "Başarılı!",
        description: initialData
          ? "Kuyu faturası başarıyla güncellendi."
          : "Kuyu faturası başarıyla oluşturuldu.",
      });

      router.push("/dashboard/owner/billing/well-bills");
      router.refresh();
    } catch (error: any) {
      console.error("Kuyu faturası kaydetme hatası:", error);
      toast({
        title: "Hata!",
        description:
          error.message || "Kuyu faturası kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="wellId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kuyu</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={!!initialData}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Kuyu seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {wells.map((well) => (
                      <SelectItem key={well.id} value={well.id}>
                        {well.name} ({well.depth}m, {well.capacity} lt/sa)
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
            name="billingPeriodId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fatura Dönemi</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={!!initialData}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Fatura dönemi seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {billingPeriods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name} (
                        {format(new Date(period.startDate), "dd.MM.yyyy")} -{" "}
                        {format(new Date(period.endDate), "dd.MM.yyyy")})
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
            name="totalAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Toplam Tutar (TL)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="invoiceNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fatura Numarası</FormLabel>
                <FormControl>
                  <Input placeholder="Örn: F-12345" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="invoiceDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fatura Tarihi</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: tr })
                        ) : (
                          <span>Tarih seçin</span>
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
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/owner/billing/well-bills")}
            disabled={isSubmitting}
          >
            İptal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : initialData ? (
              "Güncelle"
            ) : (
              "Oluştur"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
