"use client";

import { useState, useEffect, useMemo } from "react"; // useMemo import edildi
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { CalendarIcon, Loader2, Plus, Trash } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { InventorySelector } from "@/components/inventory/inventory-selector";
import { useAuth } from "@/components/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Sezon tipi tanımı
interface Season {
  id: string;
  name: string;
  isActive: boolean;
}

// Envanter Kategorisi Tipleri (Prisma Enum ile eşleşmeli)
type InventoryCategory = "SEED" | "FERTILIZER" | "PESTICIDE" | "FUEL" | "OTHER";

// Kategori adlarını Türkçeye çevirmek için bir yardımcı obje
const categoryTranslations: Record<InventoryCategory, string> = {
  SEED: "Tohum",
  FERTILIZER: "Gübre",
  PESTICIDE: "İlaç",
  FUEL: "Yakıt", // Bu manuel eklenmeyecek ama çevirisi bulunsun
  OTHER: "Diğer"
};


// Partner schema for validation
const formSchema = z.object({
  seasonId: z.string({
    required_error: "Sezon seçilmelidir.",
  }),
  fieldId: z.string({
    required_error: "Tarla seçilmelidir.",
  }),
  type: z.string({
    required_error: "İşlem tipi seçilmelidir.",
  }),
  date: z.date({
    required_error: "İşlem tarihi seçilmelidir.",
  }),
  workerId: z.string({
    required_error: "İşlemi yapan kişi seçilmelidir.",
  }),
  processedPercentage: z
    .number()
    .min(1, {
      message: "İşlenen alan yüzdesi en az %1 olmalıdır.",
    })
    .max(100, {
      message: "İşlenen alan yüzdesi en fazla %100 olabilir.",
    }),
  description: z.string().optional(),
  // equipmentId boş olabilir, bu yüzden optional ve string olmalı
  equipmentId: z.string().optional().nullable(),
  inventoryItems: z
    .array(
      z.object({
        inventoryId: z.string().min(1, "Envanter seçilmelidir."), // inventoryId boş olamaz
        quantity: z.number().positive({
          message: "Miktar pozitif bir sayı olmalıdır.",
        }),
      })
    )
    .optional(),
});

// İşlem tipleri
const processTypes = [
  { value: "PLOWING", label: "Sürme" },
  { value: "SEEDING", label: "Ekim" },
  { value: "FERTILIZING", label: "Gübreleme" },
  { value: "PESTICIDE", label: "İlaçlama" },
  { value: "HARVESTING", label: "Hasat" },
  { value: "OTHER", label: "Diğer" },
];

interface ProcessFormProps {
  initialData?: any; // Daha spesifik bir tip kullanmak daha iyi olabilir
}

// Helper function to get inventory category based on process type
const getCategoryForProcess = (processType: string): InventoryCategory | undefined => {
  switch (processType) {
    case "PESTICIDE":
      return "PESTICIDE";
    case "FERTILIZING":
      return "FERTILIZER";
    case "SEEDING":
      return "SEED";
    // Yakıt direkt olarak işlemle değil, ekipmanla ilişkili
    // case "FUEL": // Eğer yakıtı da işlemle ilişkilendirmek isterseniz
    //   return "FUEL";
    default:
      return undefined; // Diğer işlem tipleri için belirli bir envanter kategorisi yok
  }
};


export function ProcessForm({ initialData }: ProcessFormProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fields, setFields] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedField, setSelectedField] = useState<any>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [activeEquipmentCategories, setActiveEquipmentCategories] = useState<InventoryCategory[]>([]);
  const [inventoryUsages, setInventoryUsages] = useState<Record<string, Array<{ inventoryId: string; quantity: string }>>>({});
  const [fuelAvailabilityError, setFuelAvailabilityError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); // Genel form hataları için

  // Form oluştur
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    // defaultValues initialData'dan türetilmeli, useEffect içinde reset ile yönetilecek
  });

  // İşlem tipini izle (belki ileride farklı mantıklar için gerekebilir)
  const currentProcessType = form.watch("type");
  // const inventoryCategory = getCategoryForProcess(currentProcessType); // Bu artık UI'da doğrudan kart oluşturmayacak

  // Tarlaları, çalışanları, sahipleri, ekipmanları ve sezonları getir
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fieldsRes, workersRes, ownersRes, equipmentRes, seasonsRes] = await Promise.all([
          // bilgi: fieldOwnerShip - Tüm tarlaları getirmek için fetchAll=true eklendi.
          // Tarla verisini çekerken sahip bilgilerini de iste (InventorySelector için gerekli)
          fetch("/api/fields?includeOwnerships=true&fetchAll=true"),
          fetch("/api/users?role=WORKER"),
          fetch("/api/users/owners"),
          fetch("/api/equipment?status=ACTIVE"),
          fetch("/api/seasons?active=true")
        ]);

        if (fieldsRes.ok) {
            const responseData = await fieldsRes.json();
            setFields(responseData.data || []); // Extract the 'data' array
        }
        if (workersRes.ok) setWorkers(await workersRes.json());
        if (ownersRes.ok) setOwners(await ownersRes.json());
        if (equipmentRes.ok) setEquipment(await equipmentRes.json());
        if (seasonsRes.ok) {
            const seasonsData = await seasonsRes.json();
            setSeasons(seasonsData);
             // Yeni formda ve tek aktif sezon varsa varsayılan yap
            if (seasonsData.length === 1 && !initialData) {
                form.setValue("seasonId", seasonsData[0].id, { shouldValidate: true });
            }
        }

      } catch (err) {
        console.error("Error fetching initial data:", err);
        toast({
          title: "Hata",
          description: "Gerekli veriler yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, [toast, initialData, form]); // form'u dependency ekle

  // Formu initialData ile doldur (Edit modu) veya varsayılan değerleri ayarla (New modu)
  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        date: initialData.date ? new Date(initialData.date) : new Date(),
        // equipmentId null ise 'none' veya boş string olarak ayarla
        equipmentId: initialData.equipmentId || null,
        // inventoryItems form state'ine doğrudan eklenmiyor, ayrı yönetiliyor.
      });
      // inventoryItems state'ini initialData.inventoryUsages ile güncelle
      // console.log("[ProcessForm] Initial Inventory Usages:", initialData?.inventoryUsages); // Log kaldırıldı

      // initialData ve selectedEquipment yüklendiğinde inventoryUsages'ı ayarla
      // Bu useEffect, selectedEquipment değiştiğinde de çalışacak (aşağıda ayrı bir tane var)
      // Şimdilik bu kısmı selectedEquipment useEffect'ine taşıyalım.
    } else {
      // Yeni form için varsayılan değerler
      form.reset({
        seasonId: seasons.length === 1 ? seasons[0].id : "",
        fieldId: "",
        type: "",
        date: new Date(),
        workerId: user?.id || "",
        processedPercentage: 100,
        description: "",
        equipmentId: null,
        inventoryItems: [], // Bu schema'da kalabilir ama UI'da kullanılmayacak
      });
      setInventoryUsages({});
      setActiveEquipmentCategories([]);
    }
  }, [initialData, form, user?.id, seasons]);

  // Seçilen tarla değiştiğinde state'i güncelle
  useEffect(() => {
    const fieldId = form.watch("fieldId");
    const field = fields.find((f) => f.id === fieldId);
    setSelectedField(field || null);
  }, [form.watch("fieldId"), fields]);

  // Seçilen ekipman değiştiğinde state'i ve envanter kullanımlarını güncelle
  useEffect(() => {
    const equipmentId = form.watch("equipmentId");
    const currentSelectedEquipment = equipment.find((e) => e.id === equipmentId);
    setSelectedEquipment(currentSelectedEquipment || null);

    if (currentSelectedEquipment && currentSelectedEquipment.capabilities) {
      const capabilities: InventoryCategory[] = currentSelectedEquipment.capabilities
        .map((cap: any) => cap.inventoryCategory)
        .filter((category: InventoryCategory) => category !== "FUEL"); // Yakıtı hariç tut
      setActiveEquipmentCategories(capabilities);

      // InitialData'dan gelen veya mevcut envanter kullanımlarını ayarla/filtrele
      const newUsages: Record<string, Array<{ inventoryId: string; quantity: string }>> = {};
      if (initialData?.inventoryUsages) {
        initialData.inventoryUsages.forEach((usage: any) => {
          const category = usage.inventory?.category;
          // Sadece aktif ve yakıt olmayan kategoriler için
          if (category && capabilities.includes(category)) {
            if (!newUsages[category]) {
              newUsages[category] = [];
            }
            newUsages[category].push({
              inventoryId: usage.inventoryId || usage.inventory?.id,
              quantity: String(usage.usedQuantity || usage.quantity || 0),
            });
          }
        });
      }
      // Eğer initialData yoksa veya equipment değişmişse,
      // sadece yeni aktif kategoriler için boş diziler oluştur
      capabilities.forEach(cat => {
        if (!newUsages[cat]) {
          newUsages[cat] = [];
        }
      });
      setInventoryUsages(newUsages);

    } else {
      setActiveEquipmentCategories([]);
      setInventoryUsages({}); // Ekipman yoksa veya yeteneği yoksa envanterleri temizle
    }
  }, [form.watch("equipmentId"), equipment, initialData]);

  // InventorySelector'a gönderilecek ownerIds dizisini memoize et
  const selectedFieldOwnerIds = useMemo(() => {
    // selectedField null veya undefined ise veya owners yoksa boş dizi döndür
    if (!selectedField || !selectedField.owners) {
      return [];
    }
    return selectedField.owners.map((o: any) => o.userId);
  }, [selectedField]); // Sadece selectedField değiştiğinde yeniden hesapla


  // Dinamik envanter kullanımı için fonksiyonlar
  const addUsageItem = (category: InventoryCategory) => {
    setInventoryUsages((prevUsages) => ({
      ...prevUsages,
      [category]: [...(prevUsages[category] || []), { inventoryId: "", quantity: "" }],
    }));
  };

  const removeUsageItem = (category: InventoryCategory, index: number) => {
    setInventoryUsages((prevUsages) => ({
      ...prevUsages,
      [category]: (prevUsages[category] || []).filter((_, i) => i !== index),
    }));
  };

  const updateUsageItem = (
    category: InventoryCategory,
    index: number,
    field: "inventoryId" | "quantity",
    value: string
  ) => {
    setInventoryUsages((prevUsages) => {
      const newItems = [...(prevUsages[category] || [])];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prevUsages, [category]: newItems };
    });

    // Form state'ini de güncellemek validasyon için önemli olabilir
    // Özellikle quantity'yi number'a çevirip form state'ine öyle yazmak gerekebilir
    // form.setValue(`inventoryItems.${index}.${field}`, field === 'quantity' ? Number(value) || 0 : value, { shouldValidate: true });
  };

  // Form gönderimi
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setError(null);
    setFuelAvailabilityError(null);

    // 1. Kullanılacak Envanterleri Hazırla
    const finalInventoryItems: { inventoryId: string; quantity: number }[] = [];
    activeEquipmentCategories.forEach((category) => {
      if (inventoryUsages[category]) {
        inventoryUsages[category].forEach((item) => {
          if (item.inventoryId && Number(item.quantity) > 0) {
            finalInventoryItems.push({
              inventoryId: item.inventoryId,
              quantity: Number(item.quantity),
              // API'niz her bir usage için kategori bilgisi bekliyorsa:
              // category: category,
            });
          }
        });
      }
    });

    // 2. Yakıt Kontrolü (Ekipman seçiliyse ve yakıt tüketimi varsa)
    if (selectedEquipment && selectedField && selectedEquipment.fuelConsumptionPerDecare > 0) {
      const fuelNeeded =
        (selectedEquipment.fuelConsumptionPerDecare *
          selectedField.size *
          values.processedPercentage) /
        100;
      const fuelCategory = "FUEL";
      const fieldOwners = selectedField.owners;

      let totalAvailableFuel = 0;
      try {
        // Tüm sahiplerin yakıtını tek seferde kontrol et (API destekliyorsa daha iyi olur)
        for (const owner of fieldOwners) {
          const ownerInventoryResponse = await fetch(
            `/api/inventory?category=${fuelCategory}&userId=${owner.userId}`,
            { headers: { "x-user-id": user?.id || "", "x-user-role": user?.role || "" } }
          );
          if (ownerInventoryResponse.ok) {
            const ownerInventory = await ownerInventoryResponse.json();
            totalAvailableFuel += ownerInventory.reduce(
              (sum: number, item: any) => sum + item.totalQuantity, 0
            );
          } else {
             console.warn(`Yakıt envanteri alınamadı: Sahip ${owner.user.name}`);
          }
        }

        if (totalAvailableFuel < fuelNeeded) {
          setFuelAvailabilityError(
            `Tarlanın sahiplerinin toplam envanterinde yeterli yakıt bulunmuyor. Gereken: ${fuelNeeded.toFixed(2)} lt, Mevcut: ${totalAvailableFuel.toFixed(2)} lt.`
          );
          setIsSubmitting(false);
          return;
        }
      } catch (fetchError) {
         console.error("Yakıt kontrolü sırasında hata:", fetchError);
         setError("Yakıt durumu kontrol edilirken bir hata oluştu.");
         setIsSubmitting(false);
         return;
      }
    }

    // 3. API İsteği için Veriyi Hazırla
    const formData = {
      ...values,
      // equipmentId 'none' veya null ise API'ye null gönder
      equipmentId: values.equipmentId === 'none' ? null : values.equipmentId,
      inventoryItems: finalInventoryItems, // Hazırlanan envanter listesi
    };

    // 4. API İsteği
    try {
      const url = initialData ? `/api/processes/${initialData.id}` : "/api/processes";
      const method = initialData ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Başarılı!",
          description: `İşlem başarıyla ${initialData ? 'güncellendi' : 'eklendi'}.`,
        });
        router.push("/dashboard/owner/processes");
        router.refresh(); // Sayfayı yenilemek yerine datayı yeniden fetch etmek daha iyi olabilir
      } else {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        setError(errorData.error || `Sunucu hatası: ${response.status}`);
        toast({
          title: "Hata!",
          description: errorData.error || "İşlem kaydedilirken bir sunucu hatası oluştu.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("İşlem kaydetme hatası:", err);
      setError("İstemci tarafında bir hata oluştu.");
      toast({
        title: "Hata!",
        description: err.message || "İşlem kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Hata Mesajları */}
        {fuelAvailabilityError && (
          <Alert variant="destructive">
            <AlertTitle>Yakıt Hatası</AlertTitle>
            <AlertDescription>{fuelAvailabilityError}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Form Hatası</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form Alanları */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Sezon */}
          <FormField
            control={form.control}
            name="seasonId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sezon</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""} // Kontrollü bileşen
                  disabled={seasons.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sezon seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {seasons.length === 0 ? (
                      <SelectItem value="no-season" disabled>Aktif sezon bulunamadı</SelectItem>
                    ) : (
                      seasons.map((season) => (
                        <SelectItem key={season.id} value={season.id}>{season.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tarla */}
          <FormField
            control={form.control}
            name="fieldId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tarla</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Tarla seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {fields.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name} ({f.size} dekar)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* İşlem Tipi */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>İşlem Tipi</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="İşlem tipi seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {processTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* İşlem Tarihi */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>İşlem Tarihi</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                      >
                        {field.value ? format(field.value, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* İşlemi Yapan */}
          <FormField
            control={form.control}
            name="workerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>İşlemi Yapan</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="İşlemi yapan kişiyi seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[...owners, ...workers]
                      .sort((a, b) => a.name.localeCompare(b.name)) // İsim sırasına göre sırala
                      .map((person) => (
                       <SelectItem key={person.id} value={person.id}>
                         {person.name} {owners.some(o => o.id === person.id) ? '(Sahip)' : '(Çalışan)'}
                       </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* İşlenen Alan Yüzdesi */}
          <FormField
            control={form.control}
            name="processedPercentage"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>İşlenen Alan Yüzdesi (%{Number(field.value || 0)})</FormLabel>
                <FormControl>
                  <Slider
                    min={1} max={100} step={1}
                    value={[Number(field.value || 0)]} // Slider'a number[] tipinde değer ver
                    onValueChange={(values) => field.onChange(values[0])} // Gelen değeri number olarak al
                  />
                </FormControl>
                <FormDescription>
                  {selectedField && `İşlenen Alan: ${((selectedField.size * Number(field.value || 0)) / 100).toFixed(2)} dekar (Toplam: ${selectedField.size} dekar)`}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Açıklama */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Açıklama</FormLabel>
              <FormControl>
                <Textarea placeholder="İşlem hakkında ek bilgiler..." className="resize-none" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Kullanılan Ekipman */}
        <FormField
          control={form.control}
          name="equipmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kullanılan Ekipman</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || "none"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Ekipman seçin (opsiyonel)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Ekipman Yok</SelectItem>
                  {equipment.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.fuelConsumptionPerDecare} lt/dekar)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {selectedEquipment && selectedField && selectedEquipment.fuelConsumptionPerDecare > 0 &&
                  `Tahmini Yakıt Tüketimi: ${((selectedEquipment.fuelConsumptionPerDecare * selectedField.size * form.watch("processedPercentage")) / 100).toFixed(2)} litre`}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dinamik Envanter Kullanım Kartları */}
        {selectedEquipment && activeEquipmentCategories.length > 0 && (
          activeEquipmentCategories.map((category) => (
            <Card key={category} className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Kullanılan {categoryTranslations[category] || category}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => addUsageItem(category)}>
                    <Plus className="mr-2 h-4 w-4" /> {categoryTranslations[category] || category} Ekle
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(inventoryUsages[category]?.length || 0) === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                      <p className="text-sm text-muted-foreground">
                        Henüz {categoryTranslations[category]?.toLowerCase() || category.toLowerCase()} eklenmemiş.
                      </p>
                    </div>
                  ) : (
                    inventoryUsages[category]?.map((item, index) => (
                      <div key={`${category}-${index}`} className="grid grid-cols-1 gap-4 md:grid-cols-3 border p-4 rounded-md items-end">
                        <div className="md:col-span-2">
                          <FormLabel>{categoryTranslations[category] || category} Envanteri</FormLabel>
                          <InventorySelector
                            onSelect={(id) => updateUsageItem(category, index, "inventoryId", id)}
                            selectedId={item.inventoryId}
                            category={category} // Dinamik kategori
                            ownerIds={selectedFieldOwnerIds}
                            required={true}
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <FormLabel>Miktar</FormLabel>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateUsageItem(category, index, "quantity", e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeUsageItem(category, index)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
        {selectedEquipment && activeEquipmentCategories.length === 0 && (
            <Alert variant="default" className="mt-6">
                <AlertTitle>Bilgi</AlertTitle>
                <AlertDescription>
                    Seçilen ekipmanın yakıt dışında manuel olarak eklenebilecek bir envanter yeteneği bulunmamaktadır.
                    Yakıt tüketimi otomatik olarak hesaplanacaktır.
                </AlertDescription>
            </Alert>
        )}


        {/* Butonlar */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/owner/processes")} disabled={isSubmitting}>
            İptal
          </Button>
          <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Kaydediliyor...</>
            ) : (initialData ? "Güncelle" : "Kaydet")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
