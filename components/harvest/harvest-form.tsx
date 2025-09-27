"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

// Validation schema
const harvestSchema = z.object({
  cropId: z.string().min(1, "Ekin seçimi zorunludur"),
  fieldId: z.string().min(1, "Tarla seçimi zorunludur"),
  harvestDate: z.date({
    required_error: "Hasat tarihi gereklidir",
  }),
  harvestedArea: z.string().min(1, "Hasat edilen alan gereklidir"),
  quantity: z.string().min(1, "Hasat miktarı gereklidir"),
  unit: z.string().default("kg"),
  pricePerUnit: z.string().optional(),
  quality: z.string().optional(),
  moistureContent: z.string().optional(),
  storageLocation: z.string().optional(),
  buyerInfo: z.string().optional(),
  transportCost: z.string().optional(),
  laborCost: z.string().optional(),
  notes: z.string().optional(),
  weatherConditions: z.string().optional(),
});

type HarvestFormData = z.infer<typeof harvestSchema>;

interface Field {
  id: string;
  name: string;
  location: string;
  size: number;
}

interface Crop {
  id: string;
  name: string;
  cropType: string;
  plantedDate: string;
  status: string;
  field: {
    id: string;
    name: string;
  };
}

interface HarvestFormProps {
  initialData?: any;
  mode: "create" | "edit";
  onSuccess?: () => void;
}

export default function HarvestForm({ initialData, mode, onSuccess }: HarvestFormProps) {
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<Field[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [filteredCrops, setFilteredCrops] = useState<Crop[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<HarvestFormData>({
    resolver: zodResolver(harvestSchema),
    defaultValues: {
      cropId: initialData?.cropId || "",
      fieldId: initialData?.fieldId || "",
      harvestDate: initialData?.harvestDate ? new Date(initialData.harvestDate) : new Date(),
      harvestedArea: initialData?.harvestedArea?.toString() || "",
      quantity: initialData?.quantity?.toString() || "",
      unit: initialData?.unit || "kg",
      pricePerUnit: initialData?.pricePerUnit?.toString() || "",
      quality: initialData?.quality || "",
      moistureContent: initialData?.moistureContent?.toString() || "",
      storageLocation: initialData?.storageLocation || "",
      buyerInfo: initialData?.buyerInfo || "",
      transportCost: initialData?.transportCost?.toString() || "",
      laborCost: initialData?.laborCost?.toString() || "",
      notes: initialData?.notes || "",
      weatherConditions: initialData?.weatherConditions || "",
    },
  });

  const selectedFieldId = form.watch("fieldId");

  useEffect(() => {
    fetchFields();
    fetchCrops();
  }, []);

  useEffect(() => {
    if (selectedFieldId) {
      // Eğer crops boşsa ve tarla seçildiyse, crops'u tekrar fetch et
      if (crops.length === 0) {
        fetchCropsForField(selectedFieldId);
      } else {
        const fieldCrops = crops.filter(crop =>
          crop.field.id === selectedFieldId &&
          (mode === "create" ? crop.status === "GROWING" : true)
        );
        setFilteredCrops(fieldCrops);
      }

      // Eğer seçili crop'un field'ı değişmişse, crop seçimini temizle
      const currentCropId = form.getValues("cropId");
      if (currentCropId) {
        const currentCrop = crops.find(c => c.id === currentCropId);
        if (currentCrop && currentCrop.field.id !== selectedFieldId) {
          form.setValue("cropId", "");
        }
      }
    } else {
      setFilteredCrops([]);
    }
  }, [selectedFieldId, crops, mode, form]);

  const fetchCropsForField = async (fieldId: string) => {
    try {
      const response = await fetch(`/api/crops?fieldId=${fieldId}`);
      const data = await response.json();
      const fieldCrops = data.data || [];

      // Mevcut crops'a field crops'u ekle (duplicate'leri önle)
      const newCrops = [...crops];
      fieldCrops.forEach((crop: Crop) => {
        if (!newCrops.find(c => c.id === crop.id)) {
          newCrops.push(crop);
        }
      });
      setCrops(newCrops);

      // Filtered crops'u güncelle
      const filteredFieldCrops = fieldCrops.filter((crop: Crop) =>
        mode === "create" ? crop.status === "GROWING" : true
      );
      setFilteredCrops(filteredFieldCrops);

    } catch (error) {
      console.error("Error fetching crops for field:", error);
      setFilteredCrops([]);
    }
  };

  const fetchFields = async () => {
    try {
      const response = await fetch("/api/fields?includeOwnerships=true&fetchAll=true");
      if (!response.ok) throw new Error("Tarlalar yüklenemedi");

      const data = await response.json();
      setFields(data.data || []);
    } catch (error) {
      console.error("Error fetching fields:", error);
      toast({
        title: "Hata",
        description: "Tarlalar yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const fetchCrops = async () => {
    try {
      const response = await fetch("/api/crops?fetchAll=true");

      const data = await response.json();
      setCrops(data.data || []);

      // Eğer API error döndürse bile çalışmaya devam etsin
      if (!response.ok && data.error) {
        console.warn("Crops API warning:", data.error);
      }
    } catch (error) {
      console.error("Error fetching crops:", error);
      // Hata durumunda boş array ile devam et
      setCrops([]);
      toast({
        title: "Uyarı",
        description: "Ekin listesi yüklenemedi. Tarla seçimi yapıldıktan sonra ekinler görüntülenecek.",
        variant: "default",
      });
    }
  };

  const onSubmit = async (data: HarvestFormData) => {
    setLoading(true);
    try {
      const url = mode === "create" ? "/api/harvests" : `/api/harvests/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          harvestedArea: parseFloat(data.harvestedArea),
          quantity: parseFloat(data.quantity),
          pricePerUnit: data.pricePerUnit ? parseFloat(data.pricePerUnit) : null,
          moistureContent: data.moistureContent ? parseFloat(data.moistureContent) : null,
          transportCost: data.transportCost ? parseFloat(data.transportCost) : null,
          laborCost: data.laborCost ? parseFloat(data.laborCost) : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "İşlem başarısız oldu");
      }

      toast({
        title: "Başarılı",
        description: mode === "create" ? "Hasat kaydı oluşturuldu" : "Hasat kaydı güncellendi",
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard/harvests");
      }
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Birim seçenekleri
  const units = [
    { value: "kg", label: "Kilogram (kg)" },
    { value: "ton", label: "Ton" },
    { value: "çuval", label: "Çuval" },
    { value: "kasa", label: "Kasa" },
    { value: "adet", label: "Adet" },
  ];

  // Kalite seçenekleri
  const qualityOptions = [
    { value: "A", label: "A Kalite" },
    { value: "B", label: "B Kalite" },
    { value: "C", label: "C Kalite" },
    { value: "Extra", label: "Extra Kalite" },
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">
            {mode === "create" ? "Yeni Hasat Kaydı" : "Hasat Kaydını Düzenle"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Tarla ve Ekin Seçimi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fieldId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tarla *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Tarla seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fields.map((field) => (
                            <SelectItem key={field.id} value={field.id}>
                              {field.name} - {field.location} ({field.size} dönüm)
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
                  name="cropId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ekin *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Ekin seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredCrops.map((crop) => (
                            <SelectItem key={crop.id} value={crop.id}>
                              {crop.name} ({crop.cropType})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Hasat Tarihi */}
              <FormField
                control={form.control}
                name="harvestDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Hasat Tarihi *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full pl-3 text-left font-normal"
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

              {/* Hasat Alanı ve Miktarı */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="harvestedArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hasat Edilen Alan (dönüm) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Örn: 5.5"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hasat Miktarı *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Örn: 1500"
                          {...field}
                        />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Fiyat ve Kalite */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pricePerUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Birim Fiyat (TL)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Örn: 3.50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kalite</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Kalite seçin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {qualityOptions.map((quality) => (
                            <SelectItem key={quality.value} value={quality.value}>
                              {quality.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Nem Oranı ve Depolama */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="moistureContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nem Oranı (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="Örn: 14.5"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="storageLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Depolama Yeri</FormLabel>
                      <FormControl>
                        <Input placeholder="Örn: Ana depo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Alıcı Bilgisi */}
              <FormField
                control={form.control}
                name="buyerInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alıcı Bilgisi</FormLabel>
                    <FormControl>
                      <Input placeholder="Örn: ABC Tarım Ltd. Şti." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Maliyetler */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="transportCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nakliye Maliyeti (TL)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Örn: 500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="laborCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>İşçilik Maliyeti (TL)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Örn: 1200"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Hava Durumu */}
              <FormField
                control={form.control}
                name="weatherConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hava Durumu Koşulları</FormLabel>
                    <FormControl>
                      <Input placeholder="Örn: Güneşli, 25°C" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notlar */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notlar</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Hasat hakkında ek bilgiler..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Form Butonları */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  İptal
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "create" ? "Kaydet" : "Güncelle"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}