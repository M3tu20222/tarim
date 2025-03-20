"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/components/ui/use-toast";
// import kısmına Unit enum'unu ekleyelim
import { Unit } from "@prisma/client";

// formSchema'ya unit alanını ekleyelim
const formSchema = z.object({
  product: z.string().min(2, {
    message: "Ürün adı en az 2 karakter olmalıdır.",
  }),
  quantity: z.coerce.number().positive({
    message: "Miktar pozitif bir sayı olmalıdır.",
  }),
  unit: z.nativeEnum(Unit, {
    required_error: "Lütfen bir birim seçin.",
  }),
  unitPrice: z.coerce.number().positive({
    message: "Birim fiyat pozitif bir sayı olmalıdır.",
  }),
  totalCost: z.coerce.number().positive({
    message: "Toplam maliyet pozitif bir sayı olmalıdır.",
  }),
  paymentMethod: z.enum(["CASH", "CREDIT_CARD", "CREDIT"], {
    required_error: "Lütfen bir ödeme yöntemi seçin.",
  }),
  purchaseDate: z.date({
    required_error: "Lütfen bir tarih seçin.",
  }),
  notes: z.string().optional(),
});

// defaultValues'a unit ekleyelim
export function NewPurchaseForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product: "",
      quantity: 0,
      unit: Unit.KG,
      unitPrice: 0,
      totalCost: 0,
      paymentMethod: "CASH",
      purchaseDate: new Date(),
      notes: "",
    },
  });

  // Miktar veya birim fiyat değiştiğinde toplam maliyeti hesapla
  const quantity = form.watch("quantity");
  const unitPrice = form.watch("unitPrice");

  // useEffect kullanarak render sonrası state güncellemesi yapıyoruz
  useEffect(() => {
    if (quantity && unitPrice) {
      const totalCost = quantity * unitPrice;
      form.setValue("totalCost", totalCost);
    }
  }, [quantity, unitPrice, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Alış kaydı oluşturulurken bir hata oluştu.");
      }

      toast({
        title: "Başarılı!",
        description: "Alış kaydı başarıyla oluşturuldu.",
      });

      router.push("/dashboard/owner/purchases");
      router.refresh();
    } catch (error) {
      console.error("Alış oluşturma hatası:", error);
      toast({
        title: "Hata!",
        description: "Alış kaydı oluşturulurken bir hata oluştu.",
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
            name="product"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ürün Adı</FormLabel>
                <FormControl>
                  <Input placeholder="Örn: Gübre, Tohum, vb." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="purchaseDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Alış Tarihi</FormLabel>
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
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Miktar</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Birim</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Birim seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="KG">Kilogram (kg)</SelectItem>
                    <SelectItem value="TON">Ton</SelectItem>
                    <SelectItem value="LITRE">Litre (L)</SelectItem>
                    <SelectItem value="ADET">Adet</SelectItem>
                    <SelectItem value="CUVAL">Çuval</SelectItem>
                    <SelectItem value="BIDON">Bidon</SelectItem>
                    <SelectItem value="PAKET">Paket</SelectItem>
                    <SelectItem value="METRE">Metre (m)</SelectItem>
                    <SelectItem value="METREKARE">Metrekare (m²)</SelectItem>
                    <SelectItem value="DIGER">Diğer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unitPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Birim Fiyat (₺)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="totalCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Toplam Maliyet (₺)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    {...field}
                    readOnly
                    className="bg-muted/50"
                  />
                </FormControl>
                <FormDescription>
                  Miktar × Birim Fiyat otomatik hesaplanır
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
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notlar</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Alış hakkında ek bilgiler..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/owner/purchases")}
            disabled={isSubmitting}
          >
            İptal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
