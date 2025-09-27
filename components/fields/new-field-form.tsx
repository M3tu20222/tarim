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
import { Checkbox } from "@/components/ui/checkbox";
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
import { FieldOwnershipForm } from "./field-ownership-form";
import { MultiSelect } from "@/components/ui/multi-select"; // MultiSelect import edildi

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
  coordinates: z.string().optional(),
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
  isRental: z.boolean().optional(),
  seasonId: z.string().optional(),
  // wellId: z.string().optional(), // Kaldırıldı
  wellIds: z.array(z.string()).optional(), // Dizi olarak eklendi
});

// Add initialData prop to the component
interface NewFieldFormProps {
  initialData?: any;
}

export function NewFieldForm({ initialData }: NewFieldFormProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [wells, setWells] = useState<Well[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [ownerships, setOwnerships] = useState<Ownership[]>([]);

  // Update the form initialization to use initialData if provided
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      location: initialData?.location || "",
      size: initialData?.size || 0,
      coordinates: initialData?.coordinates || "",
      crop: initialData?.crops?.[0]?.name || "",
      soilType: initialData?.soilType || "",
      notes: initialData?.notes || "",
      isRental: initialData?.isRental || false,
      seasonId: initialData?.seasonId || "",
      // wellId: initialData?.wellId || "", // Kaldırıldı
      wellIds: initialData?.wellIds || [], // Dizi olarak eklendi
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
          const responseData = await response.json();
          const seasonsData = responseData.data || [];
          setSeasons(seasonsData);

          // Aktif sezonu bul ve form değerini güncelle
          const activeSeason = seasonsData.find((season: Season) => season.isActive);
          if (activeSeason) {
            setActiveSeasonId(activeSeason.id);
            form.setValue("seasonId", activeSeason.id);
          } else if (seasonsData.length > 0) {
            // Aktif sezon yoksa ilk sezonu seç
            setActiveSeasonId(seasonsData[0].id);
            form.setValue("seasonId", seasonsData[0].id);
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
          const responseData = await response.json();
          // API'den gelen yanıtın 'data' özelliğini kullan
          const wellsData = responseData.data || []; // Eğer data yoksa boş dizi ata
          setWells(wellsData);
        }
      } catch (error) {
        console.error("Error fetching wells:", error);
      }
    };

    fetchWells();
  }, []);

  // Sahiplik değişikliği
  const handleOwnershipChange = (newOwnerships: Ownership[]) => {
    setOwnerships(newOwnerships);
  };

  // Update the onSubmit function to handle both create and update
  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Sahiplik toplamı kontrolü
    const totalPercentage = ownerships.reduce(
      (sum, o) => sum + o.percentage,
      0
    );
    // Kayan nokta hatalarını tolere etmek için küçük bir epsilon değeri
    const epsilon = 0.01;
    if (Math.abs(totalPercentage - 100) > epsilon) {
      toast({
        title: "Hata!",
        description: "Sahiplik yüzdeleri toplamı %100 olmalıdır.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const url = initialData ? `/api/fields/${initialData.id}` : "/api/fields";
      const method = initialData ? "PUT" : "POST";

      // Sahiplik yüzdesi 0 olan sahipleri filtrele
      const filteredOwnerships = ownerships.filter(ownership => ownership.percentage > 0);

      // Toplam yüzde kontrolü - yuvarlama hatalarını önlemek için epsilon değerini artır
      const totalPercentage = filteredOwnerships.reduce((sum, o) => sum + o.percentage, 0);
      const epsilon = 0.1; // Yuvarlama hatası toleransı

      if (Math.abs(totalPercentage - 100) > epsilon) {
        throw new Error(`Sahiplik yüzdeleri toplamı %100 olmalıdır (Şu anki toplam: %${totalPercentage.toFixed(1)})`);
      }

      // "no-season" değerini null olarak işle
      const formData = {
        ...values,
        seasonId: values.seasonId === "no-season" ? null : values.seasonId,
        // wellId: values.wellId === "no-well" ? null : values.wellId, // Kaldırıldı
        wellIds: values.wellIds, // Dizi olarak gönder
        ownerships: filteredOwnerships, // Filtrelenmiş sahiplikleri gönder
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
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

  // Başlangıç değerlerini ayarla - initialData varsa
  useEffect(() => {
    if (initialData) {
      // Tarih alanlarını ayarla
      if (initialData.crops && initialData.crops.length > 0) {
        const crop = initialData.crops[0];
        form.setValue("crop", crop.name);
        form.setValue("plantingDate", new Date(crop.plantedDate));
        form.setValue(
          "expectedHarvestDate",
          new Date(crop.harvestDate || Date.now())
        );
      }

      // Sahiplik bilgilerini ayarla
      if (initialData.ownerships && initialData.ownerships.length > 0) {
        setOwnerships(initialData.ownerships);
      }

      // Diğer alanları ayarla
      form.setValue("name", initialData.name);
      form.setValue("location", initialData.location);
      form.setValue("size", initialData.size);
      form.setValue("coordinates", initialData.coordinates || "");
      form.setValue("soilType", initialData.soilType || "");
      form.setValue("notes", initialData.notes || "");
      form.setValue("isRental", initialData.isRental || false);
      form.setValue("seasonId", initialData.seasonId || "");
      // form.setValue("wellId", initialData.wellId || ""); // Kaldırıldı
      form.setValue("wellIds", initialData.wellIds || []); // Dizi olarak ayarla
    }
  }, [initialData, form]);

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
            name="coordinates"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Koordinatlar</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Örn: 38.5694,31.8372 (Enlem,Boylam)"
                    {...field}
                  />
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
                    <SelectItem value="bean">Fasulye</SelectItem>
                    <SelectItem value="chickpea">Nohut</SelectItem>
                    <SelectItem value="cumin">Kimyon</SelectItem>
                    <SelectItem value="canola">Kanola</SelectItem>
                    <SelectItem value="oats">Yulaf</SelectItem>
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

          <FormField
            control={form.control}
            name="isRental"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Kiralık Tarla
                  </FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Bu tarla kiralık mı?
                  </p>
                </div>
              </FormItem>
            )}
          />

          {/* Sezon seçimi */}
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

          {/* Kuyu seçimi (MultiSelect) */}
          <FormField
            control={form.control}
            name="wellIds" // name="wellIds" olarak güncellendi
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bağlı Kuyular</FormLabel>
                <FormControl>
                   <MultiSelect
                      options={(Array.isArray(wells) ? wells : []).map((well) => ({ // Dizi kontrolü eklendi
                        value: well.id,
                        label: `${well.name} (${well.depth || 'Bilinmiyor'}m, ${well.capacity || 'Bilinmiyor'} lt/sa)`,
                      }))}
                      value={field.value || []} // selected -> value olarak değiştirildi
                      onChange={field.onChange} // onChange handler'ı bağlandı
                      // placeholder="Kuyu seçin..." // Placeholder kaldırıldı
                      className="w-full" // Gerekirse stil ayarları
                    />
                </FormControl>
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
