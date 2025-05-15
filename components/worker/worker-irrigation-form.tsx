"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Form şeması
const irrigationFormSchema = z.object({
  date: z.date({
    required_error: "Sulama tarihi gereklidir.",
  }),
  startTime: z.string({
    required_error: "Başlangıç saati gereklidir.",
  }),
  duration: z.coerce.number().min(1, {
    message: "Süre en az 1 dakika olmalıdır.",
  }),
  notes: z.string().optional(),
  fieldIrrigations: z
    .array(
      z.object({
        fieldId: z.string({
          required_error: "Tarla seçimi gereklidir.",
        }),
        percentage: z.coerce
          .number()
          .min(1, {
            message: "Yüzde en az 1 olmalıdır.",
          })
          .max(100, {
            message: "Yüzde en fazla 100 olabilir.",
          }),
      })
    )
    .min(1, {
      message: "En az bir tarla seçilmelidir.",
    }),
  inventoryUsages: z
    .array(
      z.object({
        inventoryId: z.string({
          required_error: "Envanter seçimi gereklidir.",
        }),
        quantity: z.coerce.number().min(0.01, {
          message: "Miktar en az 0.01 olmalıdır.",
        }),
      })
    )
    .optional(),
});

type IrrigationFormValues = z.infer<typeof irrigationFormSchema>;

// Varsayılan değerler
const defaultValues: Partial<IrrigationFormValues> = {
  date: new Date(),
  startTime: "08:00", // Varsayılan başlangıç saati
  duration: 60,
  notes: "Sulama hakkında notlar...",
  fieldIrrigations: [], // Varsayılan tarla eklemeyi kaldırdık
  inventoryUsages: [],
};

interface Field {
  id: string;
  name: string;
  size: number;
  wellId: string;
  seasonId: string;
  ownerships: {
    userId: string;
    userName: string;
    percentage: number;
  }[];
}

interface Inventory {
  id: string;
  name: string;
  unit: string;
  totalQuantity: number;
  unitPrice: number;
  ownerships?: {
    userId: string;
    userName?: string;
    shareQuantity?: number;
    user?: {
      id: string;
      name: string;
    };
  }[];
}

interface Well {
  id: string;
  name: string;
  depth: number;
  capacity: number;
  status: string;
}

interface WorkerIrrigationFormProps {
  userId: string;
  initialData?: any;
}

export function WorkerIrrigationForm({
  userId,
  initialData,
}: WorkerIrrigationFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState<Field[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [assignedWell, setAssignedWell] = useState<Well | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculatedData, setCalculatedData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Form tanımlama
  const form = useForm<IrrigationFormValues>({
    resolver: zodResolver(irrigationFormSchema),
    defaultValues: initialData || defaultValues,
  });

  // Field array tanımlama
  const {
    fields: fieldIrrigations,
    append: appendField,
    remove: removeField,
  } = useFieldArray({
    control: form.control,
    name: "fieldIrrigations",
  });

  const {
    fields: inventoryUsages,
    append: appendInventory,
    remove: removeInventory,
  } = useFieldArray({
    control: form.control,
    name: "inventoryUsages",
  });

  // URL'den fieldId parametresini al
  const searchParams = useSearchParams();
  const fieldIdParam = searchParams.get("fieldId");

  // Verileri yükle
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);

        // İşçinin atanmış kuyusunu getir
        const wellAssignmentResponse = await fetch(
          `/api/worker/well-assignment?workerId=${userId}`
        );
        const wellAssignmentData = await wellAssignmentResponse.json();

        if (!wellAssignmentData.data) {
          setLoadingData(false);
          return;
        }

        setAssignedWell(wellAssignmentData.data.well);

        // Kuyuya bağlı tarlaları getir
        const fieldsResponse = await fetch(
          `/api/fields?wellId=${wellAssignmentData.data.wellId}&includeOwnerships=true`
        );
        const fieldsData = await fieldsResponse.json();
        console.log("Fields API response:", fieldsData); // Debug için log ekleyelim

        let fieldsList = [];
        if (Array.isArray(fieldsData)) {
          fieldsList = fieldsData;
        } else if (fieldsData.data && Array.isArray(fieldsData.data)) {
          fieldsList = fieldsData.data;
        } else {
          console.error("Unexpected fields data format:", fieldsData);
          fieldsList = [];
        }

        setFields(fieldsList);

        // URL'den gelen fieldId parametresi varsa, otomatik olarak o tarlayı ekle
        if (fieldIdParam && fieldsList.length > 0) {
          const selectedField = fieldsList.find((f: any) => f.id === fieldIdParam);
          if (selectedField) {
            console.log("URL'den gelen tarla bulundu:", selectedField);

            // Önce mevcut fieldIrrigations'ı temizle
            const currentFields = form.getValues().fieldIrrigations || [];
            currentFields.forEach((_, index) => {
              removeField(index);
            });

            // Form'a tarla ekle
            appendField({ fieldId: fieldIdParam, percentage: 50 });
          } else {
            console.log("URL'den gelen tarla bulunamadı:", fieldIdParam);
          }
        }

        // Seçilen tarlanın sahiplerinin ID'lerini al
        let selectedFieldOwnerIds: string[] = [];

        if (fieldIdParam) {
          const selectedField = fieldsList.find((f: any) => f.id === fieldIdParam);
          if (selectedField) {
            // API yanıtında owners veya ownerships olabilir
            const owners = selectedField.owners || selectedField.ownerships || [];
            console.log("Selected field owners:", owners);

            if (Array.isArray(owners)) {
              selectedFieldOwnerIds = owners
                .map((owner: any) => {
                  console.log("Owner:", owner);
                  // owner.user.id veya owner.userId olabilir
                  return owner.user?.id || owner.userId;
                })
                .filter(id => id); // null/undefined değerleri filtrele
            }
          }
        }

        console.log("Seçilen tarlanın sahiplerinin ID'leri:", selectedFieldOwnerIds);

        // Envanter API URL'sini oluştur - her zaman tüm envanterleri getir
        // Böylece sahiplik bilgilerini de görebiliriz
        let inventoryApiUrl = "/api/inventory?category=FERTILIZER,PESTICIDE&fetchAll=true";

        // Sahiplik bilgilerini de almak için showAll parametresini ekle
        inventoryApiUrl += "&showAll=true";

        console.log("Inventory API URL:", inventoryApiUrl);

        // Envanterleri getir
        const inventoriesResponse = await fetch(inventoryApiUrl);
        const inventoriesData = await inventoriesResponse.json();
        console.log("Inventories API response:", inventoriesData); // Debug için log ekleyelim

        if (Array.isArray(inventoriesData)) {
          setInventories(inventoriesData);
        } else if (inventoriesData.data && Array.isArray(inventoriesData.data)) {
          setInventories(inventoriesData.data);
        } else {
          console.error("Unexpected inventories data format:", inventoriesData);
          setInventories([]);
        }

        setLoadingData(false);
      } catch (error) {
        console.error("Veri yükleme hatası:", error);
        toast({
          title: "Hata",
          description: "Veriler yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
        setLoadingData(false);
      }
    };

    fetchData();
  }, [userId]);

  // Hesaplamaları yap
  useEffect(() => {
    const values = form.getValues();
    if (
      !values.fieldIrrigations ||
      values.fieldIrrigations.length === 0 ||
      !values.duration
    ) {
      setCalculatedData(null);
      return;
    }

    // Toplam sulanan alanı hesapla
    let totalIrrigatedArea = 0;
    const fieldData = values.fieldIrrigations
      .map((irrigation) => {
        const field = fields.find((f) => f.id === irrigation.fieldId);
        if (!field) return null;

        const irrigatedArea = (field.size * irrigation.percentage) / 100;
        totalIrrigatedArea += irrigatedArea;

        // Eğer field.ownerships yoksa, varsayılan bir sahiplik oluştur
        const ownerships = field.ownerships && Array.isArray(field.ownerships)
          ? field.ownerships
          : [{
              userId: userId, // İşçinin kendisini sahip olarak ekle
              userName: "İşçi",
              percentage: 100
            }];

        return {
          fieldId: field.id,
          fieldName: field.name,
          fieldSize: field.size,
          irrigationPercentage: irrigation.percentage,
          irrigatedArea,
          wellId: field.wellId,
          seasonId: field.seasonId,
          ownerships: ownerships,
        };
      })
      .filter(Boolean);

    if (totalIrrigatedArea === 0) {
      setCalculatedData(null);
      return;
    }

    // Sahip bazında sulama sürelerini hesapla
    const ownerDurations: Record<
      string,
      {
        userId: string;
        userName: string;
        duration: number;
        irrigatedArea: number;
      }
    > = {};

    fieldData.forEach((field) => {
      if (!field || !field.ownerships || !Array.isArray(field.ownerships)) return;

      field.ownerships.forEach((ownership) => {
        if (!ownership || !ownership.percentage) return;

        // userId ve userName kontrolü
        const userId = ownership.userId || "unknown";
        const userName = ownership.userName || "Bilinmeyen Kullanıcı";

        const ownerIrrigatedArea =
          (field.irrigatedArea * ownership.percentage) / 100;
        const ownerDuration =
          (values.duration * ownerIrrigatedArea) / totalIrrigatedArea;

        if (ownerDurations[userId]) {
          ownerDurations[userId].duration += ownerDuration;
          ownerDurations[userId].irrigatedArea += ownerIrrigatedArea;
        } else {
          ownerDurations[userId] = {
            userId: userId,
            userName: userName,
            duration: ownerDuration,
            irrigatedArea: ownerIrrigatedArea,
          };
        }
      });
    });

    // Envanter kullanımlarını hesapla
    const inventoryDistribution: Record<
      string,
      {
        inventoryId: string;
        inventoryName: string;
        unit: string;
        ownerUsages: Record<string, number>;
      }
    > = {};

    if (values.inventoryUsages && values.inventoryUsages.length > 0) {
      values.inventoryUsages.forEach((usage) => {
        const inventory = inventories.find((i) => i.id === usage.inventoryId);
        if (!inventory) return;

        const ownerUsages: Record<string, number> = {};

        // Sahiplere envanter dağılımını hesapla
        Object.values(ownerDurations).forEach((owner) => {
          const ownerShare =
            (usage.quantity * owner.irrigatedArea) / totalIrrigatedArea;
          ownerUsages[owner.userId] = ownerShare;
        });

        inventoryDistribution[inventory.id] = {
          inventoryId: inventory.id,
          inventoryName: inventory.name,
          unit: inventory.unit,
          ownerUsages,
        };
      });
    }

    setCalculatedData({
      totalIrrigatedArea,
      fieldData,
      ownerDurations,
      inventoryDistribution,
    });
  }, [
    form.watch("fieldIrrigations"),
    form.watch("duration"),
    form.watch("inventoryUsages"),
    fields,
    inventories,
  ]);

  // Form gönderme
  const onSubmit = async (data: IrrigationFormValues) => {
    if (!calculatedData) {
      toast({
        title: "Hata",
        description:
          "Hesaplama yapılamadı. Lütfen form alanlarını kontrol edin.",
        variant: "destructive",
      });
      return;
    }

    if (!assignedWell) {
      toast({
        title: "Hata",
        description:
          "Atanmış kuyu bulunamadı. Lütfen ayarlardan bir kuyu seçin.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // API'ye gönderilecek veriyi hazırla
      // Tarih ve saati birleştirerek startDateTime oluştur
      const dateObj = new Date(data.date);
      const [hours, minutes] = data.startTime.split(':').map(Number);
      dateObj.setHours(hours, minutes, 0, 0);

      const formData = {
        startDateTime: dateObj.toISOString(), // Tarih ve saati birleştir
        duration: data.duration,
        notes: data.notes,
        wellId: assignedWell.id,
        createdBy: userId,
        fieldIrrigations: calculatedData.fieldData.map((field: any) => ({
          fieldId: field.fieldId,
          percentage: field.irrigationPercentage,
          irrigatedArea: field.irrigatedArea,
          wellId: field.wellId,
          seasonId: field.seasonId,
        })),
        ownerDurations: Object.values(calculatedData.ownerDurations).map(
          (owner: any) => ({
            userId: owner.userId,
            duration: Math.round(owner.duration * 100) / 100,
            irrigatedArea: Math.round(owner.irrigatedArea * 100) / 100,
          })
        ),
        inventoryDeductions: data.inventoryUsages?.map((usage) => {
          const inventory = inventories.find((i) => i.id === usage.inventoryId);

          // Tarla sahiplerini al - bunlar öncelikli olmalı
          const fieldOwners = Object.keys(calculatedData.ownerDurations);

          // Eğer tarla sahibi yoksa, işçinin kendisini kullan
          if (fieldOwners.length === 0) {
            console.log(`Envanter: ${inventory?.name}, Tarla sahibi bulunamadı, işçi ID'si kullanılıyor: ${userId}`);
            return {
              inventoryId: usage.inventoryId,
              quantityUsed: usage.quantity,
              unitPrice: inventory?.unitPrice || 0,
              ownerId: userId,
            };
          }

          // Tarla sahibini kullan - ilk tarla sahibini al
          // Birden fazla tarla sahibi varsa, en büyük paya sahip olanı seçebiliriz
          // Şimdilik basitlik için ilk tarla sahibini kullanıyoruz
          const fieldOwnerId = fieldOwners[0];

          console.log(`Envanter: ${inventory?.name}, Tarla sahibi kullanılıyor: ${fieldOwnerId}`);

          return {
            inventoryId: usage.inventoryId,
            quantityUsed: usage.quantity,
            unitPrice: inventory?.unitPrice || 0,
            ownerId: fieldOwnerId,
          };
        }),
      };

      // API isteği
      const response = await fetch("/api/irrigation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || "Sulama kaydı oluşturulurken bir hata oluştu."
        );
      }

      toast({
        title: "Başarılı",
        description: "Sulama kaydı başarıyla oluşturuldu.",
      });

      router.push("/dashboard/worker");
      router.refresh();
    } catch (error: any) {
      console.error("Form gönderme hatası:", error);
      toast({
        title: "Hata",
        description:
          error.message || "Sulama kaydı oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Tarla ekle
  const handleAddField = () => {
    appendField({ fieldId: "", percentage: 50 });
  };

  // Envanter ekle
  const handleAddInventory = () => {
    appendInventory({ inventoryId: "", quantity: 0 });
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!assignedWell) {
    return (
      <Alert className="mb-6">
        <AlertTitle>Atanmış kuyu bulunamadı</AlertTitle>
        <AlertDescription>
          Sulama kaydı oluşturabilmek için önce bir kuyuya atanmanız
          gerekmektedir. Lütfen ayarlar sayfasından bir kuyu seçin.
          <div className="mt-4">
            <Button onClick={() => router.push("/dashboard/worker/settings")}>
              Ayarlara Git
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Sulama Kaydı Oluştur</CardTitle>
            <CardDescription>
              <span className="font-medium">{assignedWell.name}</span> kuyusu
              için sulama bilgilerini girerek yeni bir sulama kaydı oluşturun.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Sulama Tarihi</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.getValues().date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.getValues().date ? (
                        format(form.getValues().date, "PPP", { locale: tr })
                      ) : (
                        <span>Tarih Seçin</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.getValues().date}
                      onSelect={(date) =>
                        form.setValue("date", date || new Date())
                      }
                      locale={tr}
                    />
                  </PopoverContent>
                </Popover>
                {form.formState.errors.date && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.date.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Başlangıç Saati</Label>
                <Input
                  id="startTime"
                  type="time"
                  {...form.register("startTime")}
                />
                {form.formState.errors.startTime && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.startTime.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Toplam Sulama Süresi (Dakika)</Label>
                <Input
                  id="duration"
                  type="number"
                  {...form.register("duration")}
                />
                {form.formState.errors.duration && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.duration.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder="Sulama hakkında notlar..."
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium">Tarla Seçimi</h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        Her tarla için, o tarlanın ne kadarının sulandığını
                        yüzde olarak belirtin. Örneğin, %50 girdiğinizde
                        tarlanın yarısının sulandığını belirtmiş olursunuz.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddField}
                  disabled={fields.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tarla Ekle
                </Button>
              </div>

              {fields.length === 0 ? (
                <Alert>
                  <AlertTitle>Tarla bulunamadı</AlertTitle>
                  <AlertDescription>
                    Seçtiğiniz kuyuya bağlı tarla bulunmamaktadır. Lütfen yöneticinizden
                    tarla eklemesini isteyin veya başka bir kuyu seçin.
                  </AlertDescription>
                </Alert>
              ) : (
                fieldIrrigations.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-12 gap-4 items-end border p-4 rounded-md"
                  >
                    <div className="col-span-7 space-y-2">
                      <Label htmlFor={`fieldIrrigations.${index}.fieldId`}>
                        Tarla
                      </Label>
                      <Select
                        onValueChange={(value) =>
                          form.setValue(
                            `fieldIrrigations.${index}.fieldId`,
                            value
                          )
                        }
                        defaultValue={
                          form.getValues().fieldIrrigations?.[index]?.fieldId
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tarla Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {fields.map((field) => (
                            <SelectItem key={field.id} value={field.id}>
                              {field.name} ({field.size} dekar)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.fieldIrrigations?.[index]
                        ?.fieldId && (
                        <p className="text-sm text-red-500">
                          {
                            form.formState.errors.fieldIrrigations?.[index]
                              ?.fieldId?.message
                          }
                        </p>
                      )}
                    </div>

                    <div className="col-span-4 space-y-2">
                      <Label htmlFor={`fieldIrrigations.${index}.percentage`}>
                        Sulanan Alan (%)
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help ml-1 inline" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Tarlanın ne kadarının sulandığını belirtin
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        id={`fieldIrrigations.${index}.percentage`}
                        type="number"
                        min="1"
                        max="100"
                        {...form.register(
                          `fieldIrrigations.${index}.percentage` as const,
                          { valueAsNumber: true }
                        )}
                      />
                      {form.formState.errors.fieldIrrigations?.[index]
                        ?.percentage && (
                        <p className="text-sm text-red-500">
                          {
                            form.formState.errors.fieldIrrigations?.[index]
                              ?.percentage?.message
                          }
                        </p>
                      )}
                    </div>

                    <div className="col-span-1">
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeField(index)}
                          className="text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Envanter Kullanımı</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddInventory}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Envanter Ekle
                </Button>
              </div>

              {inventoryUsages.length === 0 && (
                <div className="p-4 border rounded-md text-center text-gray-500">
                  <p>
                    Henüz envanter eklenmedi. Sulama sırasında kullanılan
                    envanter varsa ekleyin.
                  </p>
                </div>
              )}

              {inventoryUsages.map((inventory, index) => (
                <div
                  key={inventory.id}
                  className="grid grid-cols-12 gap-4 items-end border p-4 rounded-md"
                >
                  <div className="col-span-7 space-y-2">
                    <Label htmlFor={`inventoryUsages.${index}.inventoryId`}>
                      Envanter
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        form.setValue(
                          `inventoryUsages.${index}.inventoryId`,
                          value
                        )
                      }
                      defaultValue={
                        form.getValues().inventoryUsages?.[index]?.inventoryId
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Envanter Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventories.map((inventory) => (
                          <SelectItem key={inventory.id} value={inventory.id}>
                            {inventory.name} ({inventory.totalQuantity}{" "}
                            {inventory.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.inventoryUsages?.[index]
                      ?.inventoryId && (
                      <p className="text-sm text-red-500">
                        {
                          form.formState.errors.inventoryUsages?.[index]
                            ?.inventoryId?.message
                        }
                      </p>
                    )}
                  </div>

                  <div className="col-span-4 space-y-2">
                    <Label htmlFor={`inventoryUsages.${index}.quantity`}>
                      Miktar
                    </Label>
                    <Input
                      id={`inventoryUsages.${index}.quantity`}
                      type="number"
                      step="0.01"
                      {...form.register(
                        `inventoryUsages.${index}.quantity` as const,
                        { valueAsNumber: true }
                      )}
                    />
                    {form.formState.errors.inventoryUsages?.[index]
                      ?.quantity && (
                      <p className="text-sm text-red-500">
                        {
                          form.formState.errors.inventoryUsages?.[index]
                            ?.quantity?.message
                        }
                      </p>
                    )}
                  </div>

                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInventory(index)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {calculatedData && (
              <div className="space-y-4 border p-4 rounded-md bg-gray-50">
                <h3 className="text-lg font-medium">Hesaplanan Değerler</h3>

                <div className="space-y-2">
                  <h4 className="font-medium">Toplam Sulanan Alan</h4>
                  <p>{calculatedData.totalIrrigatedArea.toFixed(2)} dekar</p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Sahip Bazında Sulama Süreleri</h4>
                  <div className="border rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sahip
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sulanan Alan (dekar)
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Süre (dakika)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.values(calculatedData.ownerDurations).map(
                          (owner: any) => (
                            <tr key={owner.userId}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {owner.userName}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {owner.irrigatedArea.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {owner.duration.toFixed(2)}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {Object.keys(calculatedData.inventoryDistribution).length >
                  0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Envanter Dağılımı</h4>
                    <div className="border rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Envanter
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Sahip
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Miktar
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {Object.values(
                            calculatedData.inventoryDistribution
                          ).flatMap((inventory: any) =>
                            Object.entries(inventory.ownerUsages).map(
                              ([userId, quantity]) => {
                                const owner: any = Object.values(
                                  calculatedData.ownerDurations
                                ).find((o: any) => o.userId === userId);
                                return (
                                  <tr
                                    key={`${inventory.inventoryId}-${userId}`}
                                  >
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {inventory.inventoryName}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {owner?.userName || userId}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {(quantity as number).toFixed(2)}{" "}
                                      {inventory.unit}
                                    </td>
                                  </tr>
                                );
                              }
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/worker")}
              disabled={loading}
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={loading || !calculatedData || fields.length === 0}
            >
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
