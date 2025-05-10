"use client";

import type React from "react";

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

// Kuyu tipi
interface Well {
  id: string;
  name: string;
  depth: number;
  capacity: number;
  status: string;
}

// Sahiplik tipi
interface Ownership {
  userId: string;
  percentage: number;
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
  // soilType kaldırıldı
  notes: z.string().optional(),
  seasonId: z.string().optional(),
  wellId: z.string().optional(), // Bu formda tek kuyu seçimi varsayılıyor
});

import { FieldOwnershipForm } from "./field-ownership-form"; // Gerçek bileşeni import et

// Add initialData prop to the component
interface NewFieldFormProps {
  initialData?: any;
}

// Yer tutucu FieldOwnershipFormProps ve FieldOwnershipForm tanımı kaldırıldı.

export function NewFieldForm({ initialData }: NewFieldFormProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [wells, setWells] = useState<Well[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [ownerships, setOwnerships] = useState<Ownership[]>([]);
  const [currentCropId, setCurrentCropId] = useState<string | null>(null); // Mevcut ürün ID'si için state

  // Update the form initialization to use initialData if provided
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      location: initialData?.location || "",
      size: initialData?.size || 0,
      crop: initialData?.crops?.[0]?.name || "",
      // soilType kaldırıldı
      notes: initialData?.notes || "",
      seasonId: initialData?.seasonId || "",
      // initialData.fieldWells bir dizi, form tek kuyu destekliyorsa ilkini alalım
      wellId: initialData?.fieldWells?.[0]?.wellId || "",
      plantingDate: initialData?.crops?.[0]?.plantedDate
        ? new Date(initialData.crops[0].plantedDate)
        : new Date(),
      expectedHarvestDate: initialData?.crops?.[0]?.harvestDate
        ? new Date(initialData.crops[0].harvestDate)
        : new Date(),
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

  // Kuyuları getir
  useEffect(() => {
    const fetchWells = async () => {
      try {
        const response = await fetch("/api/wells");
        if (response.ok) {
          const data = await response.json();
          setWells(data);
        }
      } catch (error) {
        console.error("Error fetching wells:", error);
      }
    };

    fetchWells();
  }, []);

  // initialData'dan sahiplikleri ve mevcut ürün ID'sini yükle
  useEffect(() => {
    if (initialData) {
      if (initialData.owners) {
        const initialOwnerships = initialData.owners.map((ownerRelation: any) => ({
          userId: ownerRelation.userId || ownerRelation.user?.id, // Hem direkt userId hem de user.id kontrolü
          percentage: ownerRelation.percentage || 0,
        }));
        setOwnerships(initialOwnerships);
      }
      if (initialData.crops && initialData.crops.length > 0) {
        setCurrentCropId(initialData.crops[0].id);
        // Formdaki ekin türü, ekim tarihi ve hasat tarihi de initialData.crops[0]'dan alınmalı
        // Bu zaten defaultValues içinde yapılıyor.
      }
    }
  }, [initialData]);


  // Sahiplik değişikliği
  const handleOwnershipChange = (newOwnerships: Ownership[]) => {
    setOwnerships(newOwnerships);
  };

  // Update the onSubmit function to handle both create and update
  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Sahiplik toplamı kontrolü (eğer sahiplik formu aktifse)
    // Mevcut FieldOwnershipForm placeholder olduğu için bu kontrol şimdilik devredışı bırakılabilir
    // veya gerçek forma göre güncellenmeli.
    // const totalPercentage = ownerships.reduce(
    //   (sum, o) => sum + o.percentage,
    //   0
    // );
    // if (ownerships.length > 0 && totalPercentage !== 100) {
    //   toast({
    //     title: "Hata!",
    //     description: "Sahiplik yüzdeleri toplamı %100 olmalıdır.",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    setIsSubmitting(true);
    try {
      const url = initialData ? `/api/fields/${initialData.id}` : "/api/fields";
      const method = initialData ? "PUT" : "POST";

      const payload: any = {
        name: values.name,
        location: values.location,
        size: values.size,
        status: initialData?.status || "Aktif", // Durum alanı formda yok, initialData'dan al veya varsayılan ata
        // soilType kaldırıldı
        notes: values.notes,
        seasonId: values.seasonId === "no-season" ? null : values.seasonId,
        // wellId alanı API'de wellIds olarak bekleniyor ve bir dizi olmalı.
        // Şimdilik formda tek bir wellId var, bunu API'ye uygun hale getirmek için
        // wellIds: values.wellId && values.wellId !== "no-well" ? [values.wellId] : [],
        // Ancak API'deki PUT /api/fields/[id] wellIds'i direkt alıyor, FieldWell için.
        // Bu kısım kuyu yönetimine göre tekrar değerlendirilmeli. Şimdilik formdaki wellId'yi gönderelim.
        // Eğer API'de wellIds bekleniyorsa ve formda tekil wellId varsa, bu bir uyumsuzluk.
        // API'deki PUT /api/fields/[id] `wellIds` bekliyor.
        // Formda ise tek bir `wellId` var. Bu bir sorun teşkil edebilir.
        // Şimdilik, eğer `values.wellId` varsa bunu tek elemanlı bir dizi olarak gönderelim.
        // API'deki PUT /api/fields/[id] `wellIds` bekliyor.
        wellIds: values.wellId && values.wellId !== "no-well" ? [values.wellId] : [], 
      };
      
      // seasonId'yi payload'a ekle (eğer "no-season" değilse)
      if (values.seasonId && values.seasonId !== "no-season") {
        payload.seasonId = values.seasonId;
      } else {
        payload.seasonId = null; // veya API'de undefined olarak bırakılabilir
      }

      // Sahiplikleri API'nin beklediği fieldOwnershipsData formatına çevir
      if (ownerships && ownerships.length > 0) {
        payload.fieldOwnershipsData = ownerships.map(o => ({
          userId: o.userId,
          percentage: o.percentage,
        })).filter(o => o.userId); // Kullanıcı ID'si olmayanları filtrele
      } else if (initialData && initialData.owners && initialData.owners.length === 0 && ownerships.length === 0) {
        // Eğer initialData'da sahip yoksa ve formdan da sahip gelmediyse boş fieldOwnershipsData gönder
        payload.fieldOwnershipsData = [];
      }


      // Ürün bilgilerini cropData olarak hazırla
      payload.cropData = {
        name: values.crop,
        plantedDate: values.plantingDate.toISOString(), // Tarihleri ISO string formatına çevir
        harvestDate: values.expectedHarvestDate.toISOString(),
        // status ve notes alanları formda yok, initialData'dan veya varsayılanlardan alınabilir.
        // Şimdilik sadece formdan gelenleri gönderiyoruz.
      };

      if (initialData && currentCropId) {
        payload.cropData.cropId = currentCropId;
      }
      // Eğer initialData.crops[0].status ve notes varsa onları da ekleyebiliriz.
      if (initialData?.crops?.[0]?.status) {
        payload.cropData.status = initialData.crops[0].status;
      }
      if (initialData?.crops?.[0]?.notes) {
        payload.cropData.notes = initialData.crops[0].notes;
      }


      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload), // formData -> payload olarak düzeltildi
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Tarla kaydedilirken bir hata oluştu"
        );
      }

      toast({
        title: "Başarılı!",
        description: initialData
          ? "Tarla başarıyla güncellendi."
          : "Tarla başarıyla eklendi.",
      });

      router.push("/dashboard/owner/fields");
      router.refresh();
    } catch (error: any) {
      console.error("Tarla ekleme hatası:", error);
      toast({
        title: "Hata!",
        description: error.message || "Tarla eklenirken bir hata oluştu.",
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

          {/* soilType FormField kaldırıldı */}

          {/* Sezon seçimi */}
          <FormField
            control={form.control}
            name="seasonId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sezon</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
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
                    <SelectItem value="no-season">Sezon Yok</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Kuyu seçimi */}
          <FormField
            control={form.control}
            name="wellId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kuyu</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value || ""} // Kontrollü bileşen için value prop'u
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Kuyu seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="no-well">Kuyu Yok</SelectItem>
                    {wells.map((well) => (
                      <SelectItem key={well.id} value={well.id}>
                        {well.name}
                      </SelectItem>
                    ))}
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

        {/* Tarla sahiplikleri */}
        <FieldOwnershipForm
          ownerships={ownerships}
          onChange={handleOwnershipChange}
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
          {/* Update the submit button text based on whether we're editing or creating */}
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
