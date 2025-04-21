"use client";

import { useState } from "react";
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

// Tarla tipi
interface Field {
  id: string;
  name: string;
  location: string;
  size: number;
  status: string;
}

const formSchema = z.object({
  date: z.date({
    required_error: "Sulama tarihi seçilmelidir.",
  }),
  amount: z.coerce.number().positive({
    message: "Sulama miktarı pozitif bir sayı olmalıdır.",
  }),
  duration: z.coerce.number().positive({
    message: "Sulama süresi pozitif bir sayı olmalıdır.",
  }),
  method: z.string().min(1, {
    message: "Sulama yöntemi seçilmelidir.",
  }),
  fieldId: z.string().min(1, {
    message: "Tarla seçilmelidir.",
  }),
  notes: z.string().optional(),
});

interface IrrigationFormProps {
  initialData?: any;
}

export function IrrigationForm({ initialData }: IrrigationFormProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fields, setFields] = useState<Field[]>([]);

  // Form başlatma
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      amount: initialData?.amount || 0,
      duration: initialData?.duration || 0,
      method: initialData?.method || "",
      fieldId: initialData?.fieldId || "",
      notes: initialData?.notes || "",
    },
  });

  // Tarlaları getir
  useState(() => {
    const fetchFields = async () => {
      try {
        const response = await fetch("/api/fields");
        if (response.ok) {
          const data = await response.json();
          setFields(data);
        }
      } catch (error) {
        console.error("Error fetching fields:", error);
      }
    };

    fetchFields();
  });

  // Form gönderme
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const url = initialData
        ? `/api/irrigation/${initialData.id}`
        : "/api/irrigation";
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
          errorData.error || "Sulama kaydı kaydedilirken bir hata oluştu"
        );
      }

      toast({
        title: "Başarılı!",
        description: initialData
          ? "Sulama kaydı başarıyla güncellendi."
          : "Sulama kaydı başarıyla eklendi.",
      });

      router.push("/dashboard/owner/irrigation");
      router.refresh();
    } catch (error: any) {
      console.error("Sulama kaydı ekleme hatası:", error);
      toast({
        title: "Hata!",
        description:
          error.message || "Sulama kaydı eklenirken bir hata oluştu.",
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
            name="fieldId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tarla</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Tarla seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {fields.length === 0 ? (
                      <SelectItem value="no-field" disabled>
                        Tarla bulunamadı
                      </SelectItem>
                    ) : (
                      fields.map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.name} ({field.location})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Sulama Tarihi</FormLabel>
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

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sulama Miktarı (litre)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sulama Süresi (dakika)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sulama Yöntemi</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sulama yöntemi seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="DRIP">Damla Sulama</SelectItem>
                    <SelectItem value="SPRINKLER">Yağmurlama</SelectItem>
                    <SelectItem value="FLOOD">Salma Sulama</SelectItem>
                    <SelectItem value="CENTER_PIVOT">
                      Merkezi Pivot Sulama
                    </SelectItem>
                    <SelectItem value="MANUAL">Manuel Sulama</SelectItem>
                    <SelectItem value="OTHER">Diğer</SelectItem>
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
                  placeholder="Sulama hakkında ek bilgiler..."
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
            onClick={() => router.push("/dashboard/owner/irrigation")}
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
