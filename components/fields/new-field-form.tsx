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

// Sezon tipi
interface Season {
  id: string;
  name: string;
  isActive: boolean;
}

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Tarla adı en az 2 karakter olmalıdır.",
  }),
  location: z.string().min(2, {
    message: "Konum en az 2 karakter olmalıdır.",
  }),
  size: z.coerce.number().positive({
    message: "Alan pozitif bir sayı olmalıdır.",
  }),
  crop: z.string().min(1, {
    message: "Ekin türü seçilmelidir.",
  }),
  plantingDate: z.date({
    required_error: "Ekim tarihi seçilmelidir.",
  }),
  expectedHarvestDate: z.date({
    required_error: "Tahmini hasat tarihi seçilmelidir.",
  }),
  soilType: z.string().min(1, {
    message: "Toprak türü seçilmelidir.",
  }),
  notes: z.string().optional(),
  seasonId: z.string().optional(), // YENİ: Sezon ID'si
});

export function NewFieldForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      location: "",
      size: 0,
      crop: "",
      soilType: "",
      notes: "",
      seasonId: "", // Boş başlat
    },
  });

  // Sezonları getir
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await fetch("/api/seasons");
        if (response.ok) {
          const data = await response.json();
          setSeasons(data);

          // Aktif sezonu bul ve form değerini güncelle
          const activeSeason = data.find((season: Season) => season.isActive);
          if (activeSeason) {
            setActiveSeasonId(activeSeason.id);
            form.setValue("seasonId", activeSeason.id);
          } else if (data.length > 0) {
            // Aktif sezon yoksa ilk sezonu seç
            setActiveSeasonId(data[0].id);
            form.setValue("seasonId", data[0].id);
          } else {
            // Hiç sezon yoksa "no-season" değerini kullan
            form.setValue("seasonId", "no-season");
          }
        }
      } catch (error) {
        console.error("Error fetching seasons:", error);
      }
    };

    fetchSeasons();
  }, [form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      // "no-season" değerini null olarak işle
      const formData = {
        ...values,
        seasonId: values.seasonId === "no-season" ? null : values.seasonId,
      };

      // Normalde burada API'ye istek atılır
      // Şimdilik simüle ediyoruz
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Başarılı!",
        description: "Tarla başarıyla eklendi.",
      });

      router.push("/dashboard/owner/fields");
      router.refresh();
    } catch (error) {
      console.error("Tarla ekleme hatası:", error);
      toast({
        title: "Hata!",
        description: "Tarla eklenirken bir hata oluştu.",
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
                <FormLabel>Tarla Adı</FormLabel>
                <FormControl>
                  <Input placeholder="Örn: Merkez Tarla" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Konum</FormLabel>
                <FormControl>
                  <Input placeholder="Örn: Merkez Köyü" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alan (dönüm)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="crop"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ekin Türü</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Ekin türü seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="wheat">Buğday</SelectItem>
                    <SelectItem value="barley">Arpa</SelectItem>
                    <SelectItem value="corn">Mısır</SelectItem>
                    <SelectItem value="sunflower">Ayçiçeği</SelectItem>
                    <SelectItem value="cotton">Pamuk</SelectItem>
                    <SelectItem value="potato">Patates</SelectItem>
                    <SelectItem value="tomato">Domates</SelectItem>
                    <SelectItem value="other">Diğer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="plantingDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Ekim Tarihi</FormLabel>
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
            name="expectedHarvestDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Tahmini Hasat Tarihi</FormLabel>
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
            name="soilType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Toprak Türü</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Toprak türü seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="clay">Killi</SelectItem>
                    <SelectItem value="sandy">Kumlu</SelectItem>
                    <SelectItem value="loamy">Tınlı</SelectItem>
                    <SelectItem value="silty">Siltli</SelectItem>
                    <SelectItem value="peaty">Turbalı</SelectItem>
                    <SelectItem value="chalky">Kireçli</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* YENİ: Sezon seçimi */}
          <FormField
            control={form.control}
            name="seasonId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sezon</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sezon seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {seasons.length === 0 ? (
                      <SelectItem value="no-season" disabled>
                        Sezon bulunamadı
                      </SelectItem>
                    ) : (
                      seasons.map((season) => (
                        <SelectItem key={season.id} value={season.id}>
                          {season.name} {season.isActive && "(Aktif)"}
                        </SelectItem>
                      ))
                    )}
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
                  placeholder="Tarla hakkında ek bilgiler..."
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
            onClick={() => router.push("/dashboard/owner/fields")}
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
