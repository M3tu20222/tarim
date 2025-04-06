"use client";

import { useState, useEffect } from "react";
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

// Partner schema for validation
const formSchema = z.object({
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
  equipmentId: z.string().optional(),
  inventoryItems: z
    .array(
      z.object({
        inventoryId: z.string(),
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
  initialData?: any;
}

export function ProcessForm({ initialData }: ProcessFormProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fields, setFields] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [selectedField, setSelectedField] = useState<any>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [fuelAvailabilityError, setFuelAvailabilityError] = useState<
    string | null
  >(null); // Hata mesajı için state
  const [error, setError] = useState<string | null>(null);

  // Form oluştur
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      fieldId: "",
      type: "",
      date: new Date(),
      workerId: user?.id || "",
      processedPercentage: 100,
      description: "",
      equipmentId: "",
      inventoryItems: [],
    },
  });

  // Tarlaları, çalışanları ve ekipmanları getir
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Tarlaları getir
        const fieldsResponse = await fetch("/api/fields");
        if (fieldsResponse.ok) {
          const fieldsData = await fieldsResponse.json();
          setFields(fieldsData);
        }

        // Çalışanları getir
        const workersResponse = await fetch("/api/users?role=WORKER");
        if (workersResponse.ok) {
          const workersData = await workersResponse.json();
          setWorkers(workersData);
        }

        // Sahipleri getir
        const ownersResponse = await fetch("/api/users/owners");
        if (ownersResponse.ok) {
          const ownersData = await ownersResponse.json();
          setOwners(ownersData);
        }

        // Ekipmanları getir
        const equipmentResponse = await fetch("/api/equipment?status=ACTIVE");
        if (equipmentResponse.ok) {
          const equipmentData = await equipmentResponse.json();
          setEquipment(equipmentData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Hata",
          description: "Veriler yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, [toast]);

  // Seçilen tarla değiştiğinde
  useEffect(() => {
    const fieldId = form.watch("fieldId");
    if (fieldId) {
      const field = fields.find((f) => f.id === fieldId);
      setSelectedField(field);
    }
  }, [form.watch("fieldId"), fields]);

  // Seçilen ekipman değiştiğinde
  useEffect(() => {
    const equipmentId = form.watch("equipmentId");
    if (equipmentId) {
      const equip = equipment.find((e) => e.id === equipmentId);
      setSelectedEquipment(equip);
    } else {
      setSelectedEquipment(null);
    }
  }, [form.watch("equipmentId"), equipment]);

  // Envanter öğesi ekle
  const addInventoryItem = () => {
    setInventoryItems([...inventoryItems, { inventoryId: "", quantity: 0 }]);
  };

  // Envanter öğesi sil
  const removeInventoryItem = (index: number) => {
    const newItems = [...inventoryItems];
    newItems.splice(index, 1);
    setInventoryItems(newItems);
  };

  // Envanter öğesi güncelle
  const updateInventoryItem = (index: number, field: string, value: any) => {
    const newItems = [...inventoryItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setInventoryItems(newItems);
  };

  // Form gönderimi
  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Envanter öğelerini ekle
    const formData = {
      ...values,
      inventoryItems: inventoryItems.filter(
        (item) => item.inventoryId && item.quantity > 0
      ),
    };

    // 1. Yakıt kontrolü
    if (selectedEquipment && selectedField) {
      const fuelNeeded =
        (selectedEquipment.fuelConsumptionPerDecare *
          selectedField.size *
          values.processedPercentage) /
        100;

      const fuelCategory = "FUEL"; // Yakıt kategorisini belirle
      const fieldOwners = selectedField.owners;

      let hasEnoughFuel = false;
      let fuelAvailabilityMessage = "";

      for (const owner of fieldOwners) {
        const ownerInventoryResponse = await fetch(
          `/api/inventory?category=${fuelCategory}&userId=${owner.userId}`,
          {
            headers: {
              "x-user-id": user?.id || "",
              "x-user-role": user?.role || "",
            },
          }
        );

        if (!ownerInventoryResponse.ok) {
          console.error("Error fetching owner inventory");
          continue; // Hata durumunda bir sonraki ortağa geç
        }

        const ownerInventory = await ownerInventoryResponse.json();
        const totalFuel = ownerInventory.reduce(
          (sum: number, item: any) => sum + item.totalQuantity,
          0
        );

        if (totalFuel >= fuelNeeded) {
          hasEnoughFuel = true;
          break; // Yeterli yakıt varsa döngüden çık
        } else {
          fuelAvailabilityMessage = `Sahip ${owner.user.name}'in envanterinde yeterli yakıt bulunmuyor.`;
        }
      }

      if (!hasEnoughFuel) {
        setFuelAvailabilityError(
          fuelAvailabilityMessage ||
            "Tarlanın sahiplerinin envanterinde yeterli yakıt bulunmuyor."
        );
        return; // Formu göndermeyi durdur
      }
    }

    setIsSubmitting(true);
    setError(null); // Hata durumunu sıfırla

    try {
      const url = initialData
        ? `/api/processes/${initialData.id}`
        : "/api/processes";
      const method = initialData ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Başarılı!",
          description: initialData
            ? "İşlem başarıyla güncellendi."
            : "İşlem başarıyla eklendi.",
        });
        router.push("/dashboard/owner/processes");
        router.refresh();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Bir hata oluştu");
      }
    } catch (error: any) {
      console.error("İşlem kaydetme hatası:", error);
      toast({
        title: "Hata!",
        description: error.message || "İşlem kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {fuelAvailabilityError && (
          <Alert variant="destructive">
            <AlertTitle>Hata</AlertTitle>
            <AlertDescription>{fuelAvailabilityError}</AlertDescription>
          </Alert>
        )}

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
                    {fields.map((field) => (
                      <SelectItem key={field.id} value={field.id}>
                        {field.name} ({field.size} dekar)
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
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>İşlem Tipi</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="İşlem tipi seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {processTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
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
                      // initialFocus is deprecated
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="workerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>İşlemi Yapan</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="İşlemi yapan kişiyi seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>
                      Kişi seçin
                    </SelectItem>
                    {workers.length > 0 && (
                      <>
                        <SelectItem
                          value="workers-group"
                          disabled
                          className="font-semibold"
                        >
                          Çalışanlar
                        </SelectItem>
                        {workers.map((worker) => (
                          <SelectItem key={worker.id} value={worker.id}>
                            {worker.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {owners.length > 0 && (
                      <>
                        <SelectItem
                          value="owners-group"
                          disabled
                          className="font-semibold"
                        >
                          Sahipler
                        </SelectItem>
                        {owners.map((owner) => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="processedPercentage"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>İşlenen Alan Yüzdesi (%{field.value})</FormLabel>
                <FormControl>
                  <Slider
                    min={1}
                    max={100}
                    step={1}
                    defaultValue={[field.value]}
                    onValueChange={(values) => field.onChange(values[0])}
                  />
                </FormControl>
                <FormDescription>
                  {selectedField && (
                    <>
                      İşlenen Alan:{" "}
                      {((selectedField.size * field.value) / 100).toFixed(2)}{" "}
                      dekar (Toplam: {selectedField.size} dekar)
                    </>
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Açıklama</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="İşlem hakkında ek bilgiler..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="equipmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kullanılan Ekipman</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                {selectedEquipment && selectedField && (
                  <>
                    Tahmini Yakıt Tüketimi:{" "}
                    {(
                      (selectedEquipment.fuelConsumptionPerDecare *
                        selectedField.size *
                        form.watch("processedPercentage")) /
                      100
                    ).toFixed(2)}{" "}
                    litre
                  </>
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Kullanılan Envanter</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addInventoryItem}
              >
                <Plus className="mr-2 h-4 w-4" />
                Envanter Ekle
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inventoryItems.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                  <p className="text-sm text-muted-foreground">
                    Henüz envanter eklenmemiş.
                  </p>
                </div>
              ) : (
                inventoryItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-4 md:grid-cols-3 border p-4 rounded-md"
                  >
                    <div className="md:col-span-2">
                      <InventorySelector
                        onSelect={(id) =>
                          updateInventoryItem(index, "inventoryId", id)
                        }
                        selectedId={item.inventoryId}
                        label="Envanter"
                        required={true}
                        category="FUEL" // Yakıt kategorisini filtrele
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
                          onChange={(e) =>
                            updateInventoryItem(
                              index,
                              "quantity",
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removeInventoryItem(index)}
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

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/owner/processes")}
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
              "Kaydet"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
