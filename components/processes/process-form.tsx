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
  // inventoryItems state'ini initialData.inventoryUsages ile başlat (API'den gelen isim)
  // Gelen verinin formatını { inventoryId: string, quantity: number } varsayıyoruz.
  // Form state'i { inventoryId: string, quantity: string } beklediği için quantity'yi string'e çevirebiliriz.
  const [inventoryItems, setInventoryItems] = useState<any[]>(
    initialData?.inventoryUsages?.map((usage: any) => ({
      inventoryId: usage.inventoryId || usage.inventory?.id, // API'den gelen olası farklı isimler
      quantity: String(usage.quantity || 0) // State için string'e çevir
    })) || []
  );
  const [fuelAvailabilityError, setFuelAvailabilityError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); // Genel form hataları için

  // Form oluştur
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    // defaultValues initialData'dan türetilmeli, useEffect içinde reset ile yönetilecek
  });

  // İşlem tipini izle ve ilgili envanter kategorisini belirle
  const currentProcessType = form.watch("type");
  const inventoryCategory = getCategoryForProcess(currentProcessType);

  // Tarlaları, çalışanları, sahipleri, ekipmanları ve sezonları getir
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fieldsRes, workersRes, ownersRes, equipmentRes, seasonsRes] = await Promise.all([
          // Tarla verisini çekerken sahip bilgilerini de iste (InventorySelector için gerekli)
          fetch("/api/fields?includeOwnerships=true"),
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

      // Sadece mevcut işlem tipiyle ilgili envanter kategorisini filtrele
      // Not: Bu, yakıt gibi diğer kategorilerin başlangıçta gösterilmemesine neden olur.
      // Daha iyi bir çözüm, API'nin her usage için kategori döndürmesi olabilir.
      const currentCategory = getCategoryForProcess(initialData?.type); // initialData'dan tipi al
      setInventoryItems(
        initialData.inventoryUsages
          ?.filter((usage: any) => {
            // API'den kategori gelmiyorsa, bu filtreleme tam doğru olmayabilir.
            // Şimdilik, sadece mevcut kategoriye ait olanları göstermeyi deneyelim.
            // Eğer usage.inventory.category varsa onu kullanmak daha iyi olurdu.
            // Geçici olarak, sadece mevcut kategori varsa filtrelemeyi aktif edelim.
            // Bu, yakıt gibi diğer girdilerin görünmemesini sağlar.
            // TODO: API'yi güncelleyerek usage.inventory.category bilgisini ekle.
            // Şimdilik, eğer bir kategori belirlenmişse (örn. PESTICIDE),
            // ve usage'ın inventoryId'si varsa devam et. Bu dolaylı bir kontrol.
            return currentCategory ? usage.inventoryId : true; // Kategori yoksa hepsini al, varsa sadece ID'si olanları (dolaylı filtre)
          })
          .map((usage: any) => ({
            inventoryId: usage.inventoryId || usage.inventory?.id,
            quantity: String(usage.usedQuantity || 0)
          })) || []
      );
    } else {
      // Yeni form için varsayılan değerler
      form.reset({
        seasonId: seasons.length === 1 ? seasons[0].id : "", // Tek sezon varsa seçili gelsin
        fieldId: "",
        type: "",
        date: new Date(),
        workerId: user?.id || "", // Giriş yapan kullanıcı varsayılan çalışan olsun
        processedPercentage: 100,
        description: "",
        equipmentId: null, // Varsayılan olarak ekipman yok
        inventoryItems: [],
      });
      setInventoryItems([]); // Yeni formda envanter listesini sıfırla
    }
  }, [initialData, form, user?.id, seasons]); // seasons dependency eklendi

  // Seçilen tarla değiştiğinde state'i güncelle
  useEffect(() => {
    const fieldId = form.watch("fieldId");
    const field = fields.find((f) => f.id === fieldId);
    setSelectedField(field || null);
  }, [form.watch("fieldId"), fields]);

  // Seçilen ekipman değiştiğinde state'i güncelle
  useEffect(() => {
    const equipmentId = form.watch("equipmentId");
    // 'none' veya null/undefined kontrolü
    if (equipmentId && equipmentId !== 'none') {
      const equip = equipment.find((e) => e.id === equipmentId);
      setSelectedEquipment(equip || null);
    } else {
      setSelectedEquipment(null);
    }
  }, [form.watch("equipmentId"), equipment]);

   // İşlem tipi değiştiğinde, eğer yeni tip envanter gerektirmiyorsa listeyi temizle
   useEffect(() => {
    if (!inventoryCategory) {
      setInventoryItems([]);
      // Formdaki inventoryItems alanını da temizle (opsiyonel, validasyon için gerekebilir)
   // form.setValue('inventoryItems', []);
    }
  }, [inventoryCategory]);

  // InventorySelector'a gönderilecek ownerIds dizisini memoize et
  const selectedFieldOwnerIds = useMemo(() => {
    // selectedField null veya undefined ise veya owners yoksa boş dizi döndür
    if (!selectedField || !selectedField.owners) {
      return [];
    }
    return selectedField.owners.map((o: any) => o.userId);
  }, [selectedField]); // Sadece selectedField değiştiğinde yeniden hesapla


  // Envanter öğesi ekle
  const addInventoryItem = () => {
    // Sadece ilgili kategori varsa eklemeye izin ver
    if (inventoryCategory) {
        setInventoryItems([...inventoryItems, { inventoryId: "", quantity: "" }]); // Miktarı başlangıçta boş string yap
    }
  };

  // Envanter öğesi sil
  const removeInventoryItem = (index: number) => {
    const newItems = inventoryItems.filter((_, i) => i !== index);
    setInventoryItems(newItems);
  };

  // Envanter öğesi güncelle
  const updateInventoryItem = (index: number, field: 'inventoryId' | 'quantity', value: string) => {
    const newItems = [...inventoryItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setInventoryItems(newItems);

    // Form state'ini de güncellemek validasyon için önemli olabilir
    // Özellikle quantity'yi number'a çevirip form state'ine öyle yazmak gerekebilir
    // form.setValue(`inventoryItems.${index}.${field}`, field === 'quantity' ? Number(value) || 0 : value, { shouldValidate: true });
  };

  // Form gönderimi
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setError(null);
    setFuelAvailabilityError(null);

    // 1. Kullanılacak Envanterleri Hazırla (Sadece ilgili kategori varsa)
    const finalInventoryItems = inventoryCategory
      ? inventoryItems
          .filter((item) => item.inventoryId && Number(item.quantity) > 0)
          .map((item) => ({
            inventoryId: item.inventoryId,
            quantity: Number(item.quantity), // API'ye number olarak gönder
          }))
      : []; // Kategori yoksa boş dizi gönder

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

        {/* Kullanılan Envanter (Sadece ilgili işlem tiplerinde göster) */}
        {inventoryCategory && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Kullanılan {inventoryCategory === 'PESTICIDE' ? 'İlaç' : inventoryCategory === 'FERTILIZER' ? 'Gübre' : 'Tohum'}</span>
                <Button type="button" variant="outline" size="sm" onClick={addInventoryItem}>
                  <Plus className="mr-2 h-4 w-4" /> Envanter Ekle
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inventoryItems.length === 0 ? (
                  <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                    <p className="text-sm text-muted-foreground">Henüz envanter eklenmemiş.</p>
                  </div>
                ) : (
                  inventoryItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 gap-4 md:grid-cols-3 border p-4 rounded-md items-end">
                      {/* Envanter Seçici */}
                      <div className="md:col-span-2">
                         {/* inventoryId için FormField sarmalayıcı eklemek validasyon için daha iyi olabilir */}
                        <FormLabel>Envanter</FormLabel>
                        <InventorySelector
                          onSelect={(id) => updateInventoryItem(index, "inventoryId", id)}
                          selectedId={item.inventoryId}
                          category={inventoryCategory} // Dinamik kategori
                          // Memoize edilmiş sahip ID'lerini gönder
                          ownerIds={selectedFieldOwnerIds}
                          required={true} // Bu alan zorunlu
                        />
                         {/* Eğer FormField kullanırsak FormMessage buraya gelir */}
                      </div>
                      {/* Miktar Girişi */}
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          {/* quantity için FormField sarmalayıcı */}
                          <FormLabel>Miktar</FormLabel>
                          <Input
                            type="number"
                            min="0.01" step="0.01"
                            value={item.quantity} // State'den al
                            onChange={(e) => updateInventoryItem(index, "quantity", e.target.value)}
                            placeholder="0.00"
                          />
                           {/* Eğer FormField kullanırsak FormMessage buraya gelir */}
                        </div>
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeInventoryItem(index)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
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
