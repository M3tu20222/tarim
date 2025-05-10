"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";

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
import { useToast } from "@/components/ui/use-toast";
// import { MultiSelect } from "@/components/ui/multi-select"; // Kaldırıldı
import { Checkbox } from "@/components/ui/checkbox"; // Tekrar eklendi
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Kaldırıldı
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose, // Eklendi
  SheetFooter, // Eklendi
} from "@/components/ui/sheet"; // Eklendi
import { Badge } from "@/components/ui/badge"; // Eklendi
import { ScrollArea } from "@/components/ui/scroll-area"; // Eklendi

// Form şeması
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Kuyu adı en az 2 karakter olmalıdır.",
  }),
  depth: z.coerce.number().positive({
    message: "Derinlik pozitif bir sayı olmalıdır.",
  }),
  capacity: z.coerce.number().positive({
    message: "Kapasite pozitif bir sayı olmalıdır.",
  }),
  status: z.string().min(1, {
    message: "Durum seçilmelidir.",
  }),
  // Geri Alındı: fieldId -> fieldIds (dizi)
  fieldIds: z.array(z.string()).optional(),
});

// Props tipi
interface WellFormProps {
  wellId?: string;
  defaultValues?: z.infer<typeof formSchema>;
}

export function WellForm({ wellId, defaultValues }: WellFormProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fields, setFields] = useState<any[]>([]);

  // Form oluştur
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      name: "",
      depth: 0,
      capacity: 0,
      status: "ACTIVE",
      // Geri Alındı: fieldId -> fieldIds
      fieldIds: [],
    },
  });

  // Tarlaları getir
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await fetch("/api/fields?fetchAll=true"); // fetchAll=true eklendi
        if (response.ok) {
          const data = await response.json();
          setFields(data.data);
        } else {
          toast({
            title: "Hata",
            description: "Tarlalar yüklenirken bir hata oluştu.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching fields:", error);
        toast({
          title: "Hata",
          description: "Tarlalar yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      }
    };

    fetchFields();
  }, [toast]);

  // Form gönderimi
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const url = wellId ? `/api/wells/${wellId}` : "/api/wells";
      const method = wellId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        toast({
          title: "Başarılı!",
          description: wellId
            ? "Kuyu başarıyla güncellendi."
            : "Kuyu başarıyla eklendi.",
        });
        router.push("/dashboard/owner/wells");
        router.refresh();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Bir hata oluştu");
      }
    } catch (error: any) {
      console.error("Kuyu kaydetme hatası:", error);
      toast({
        title: "Hata!",
        description: error.message || "Kuyu kaydedilirken bir hata oluştu.",
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kuyu Adı</FormLabel>
                <FormControl>
                  <Input placeholder="Örn: Merkez Kuyu" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="depth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Derinlik (metre)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kapasite (litre/saat)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Durum</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Durum seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Aktif</SelectItem>
                    <SelectItem value="INACTIVE">Pasif</SelectItem>
                    <SelectItem value="MAINTENANCE">Bakımda</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* fieldIds FormField - Çoklu Seçim (Checkbox + Sheet) */}
        <FormField
          control={form.control}
          name="fieldIds" // fieldIds (dizi) kullanılıyor
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Tarlalar</FormLabel> {/* Çoğul etiket */}
              <Sheet>
                <SheetTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {/* Seçili tarlaları Badge olarak göster */}
                      {field.value && field.value.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {field.value.map((fieldId) => {
                            const selectedField = fields.find(
                              (f) => f.id === fieldId
                            );
                            return selectedField ? (
                              <Badge key={fieldId} variant="secondary">
                                {selectedField.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <span>Tarlaları Seç</span> // Varsayılan metin
                      )}
                    </Button>
                  </FormControl>
                </SheetTrigger>
                <SheetContent className="flex flex-col">
                  <SheetHeader>
                    <SheetTitle>Tarlaları Seç</SheetTitle>
                    <SheetDescription>
                      Bu kuyuya bağlamak istediğiniz tarlaları seçin.
                    </SheetDescription>
                  </SheetHeader>
                  <ScrollArea className="flex-grow">
                    {/* Çoklu seçim için Checkbox kullan */}
                    <div className="space-y-2 p-4">
                      {fields.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="fieldIds" // fieldIds dizisini hedefle
                          render={({ field: fieldControl }) => { // Çakışmayı önlemek için farklı isim
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={fieldControl.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = fieldControl.value || [];
                                      return checked
                                        ? fieldControl.onChange([...currentValue, item.id])
                                        : fieldControl.onChange(
                                            currentValue.filter(
                                              (value) => value !== item.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {item.name}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                  <SheetFooter>
                    <SheetClose asChild>
                      <Button type="button">Kapat</Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* /fieldIds FormField */}

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/owner/wells")}
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
            ) : (
              "Kaydet"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
