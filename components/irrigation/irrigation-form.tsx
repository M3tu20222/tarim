"use client";

import { useState, useEffect, useMemo } from "react"; // Import useMemo
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form"; // Import useWatch
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, Info, Clock } from "lucide-react";

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

// Form şeması
const irrigationFormSchema = z.object({
  date: z.date({
    required_error: "Sulama tarihi gereklidir.",
  }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Geçerli bir saat girin (Örn: 14:30).",
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
        inventoryId: z.string().optional(), // Allow optional for initial state
        quantity: z.coerce.number().min(0.01, {
          message: "Miktar en az 0.01 olmalıdır.",
        }).optional(), // Allow optional for initial state
      })
    )
    .optional(),
});

type IrrigationFormValues = z.infer<typeof irrigationFormSchema>;

// Varsayılan değerler
const defaultValues: Partial<IrrigationFormValues> = {
  date: new Date(),
  startTime: format(new Date(), "HH:mm"),
  duration: 60,
  fieldIrrigations: [{ fieldId: "", percentage: 50 }],
  inventoryUsages: [],
};

// Helper function to round numbers
const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;


interface Field {
  id: string;
  name: string;
  size: number;
  seasonId: string;
  owners: {
    user: {
      id: string;
      name: string;
      email: string;
    };
    userId: string;
    percentage: number;
  }[];
  fieldWells: {
    well: {
      id: string;
      name: string;
    };
  }[];
}

interface Inventory {
  id: string;
  name: string;
  unit: string;
  totalQuantity: number;
  unitPrice: number;
}

interface OwnerData {
    userId: string;
    userName: string;
    irrigatedArea: number;
    duration: number;
}

// Define a type for the elements within fieldDataForApi after filtering
type FieldDetailForApi = {
    fieldId: string;
    percentage: number;
    irrigatedArea: number;
    wellId: string | null;
    seasonId: string;
    owners: Field['owners']; // Explicitly include owners here
};


interface IrrigationFormProps {
  initialData?: Partial<IrrigationFormValues>;
  irrigationId?: string; // Add irrigationId for edit mode identification
}

export function IrrigationForm({ initialData, irrigationId }: IrrigationFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState<Field[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]); // State for inventory list
  const [loadingFields, setLoadingFields] = useState(false); // Loading state for fields
  const [loadingInventories, setLoadingInventories] = useState(false); // Loading state for inventories
  const [loadingSubmit, setLoadingSubmit] = useState(false); // Loading state for form submission

  const form = useForm<IrrigationFormValues>({
    resolver: zodResolver(irrigationFormSchema),
    defaultValues: initialData || defaultValues,
    mode: "onChange", // Trigger validation on change
  });

  const {
    fields: fieldIrrigations,
    append: appendField,
    remove: removeField,
  } = useFieldArray({
    control: form.control,
    name: "fieldIrrigations",
  });

  const {
    fields: inventoryUsagesArray, // Renamed to avoid conflict
    append: appendInventory,
    remove: removeInventory,
  } = useFieldArray({
    control: form.control,
    name: "inventoryUsages",
  });

  // Watch selected fields to trigger inventory fetching
  const watchedFieldIrrigations = useWatch({
    control: form.control,
    name: "fieldIrrigations",
  });

  // Fetch initial fields data
  useEffect(() => {
    const fetchFields = async () => {
      setLoadingFields(true);
      try {
        const fieldsRes = await fetch("/api/fields?includeOwnerships=true&fetchAll=true");
        if (!fieldsRes.ok) throw new Error('Tarlalar yüklenemedi');
        const fieldsData = await fieldsRes.json();
        setFields(fieldsData.data || []);
      } catch (error: any) {
        console.error("Tarla yükleme hatası:", error);
        toast({
          title: "Hata",
          description: error.message || "Tarlalar yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      } finally {
        setLoadingFields(false);
      }
    };
    fetchFields();
  }, []);

  // Calculate selected owner IDs based on watched fields
  const selectedOwnerIds = useMemo(() => {
    const ownerIdSet = new Set<string>();
    if (watchedFieldIrrigations && fields.length > 0) {
      watchedFieldIrrigations.forEach(irrigation => {
        if (irrigation.fieldId) {
          const field = fields.find(f => f.id === irrigation.fieldId);
          if (field && field.owners) {
            field.owners.forEach(owner => ownerIdSet.add(owner.userId));
          }
        }
      });
    }
    return Array.from(ownerIdSet);
  }, [watchedFieldIrrigations, fields]);

  // Fetch inventories based on selected owner IDs and initial data (if editing)
  useEffect(() => {
    const fetchInventories = async () => {
      setLoadingInventories(true);
      setInventories([]); // Clear previous inventories

      const isEditMode = !!initialData;
      const initialInventoryIds = isEditMode
        ? initialData.inventoryUsages
            ?.map(usage => usage.inventoryId)
            .filter((id): id is string => !!id) ?? []
        : [];

      let finalInventories: Inventory[] = [];
      const fetchedInventoryMap = new Map<string, Inventory>();

      try {
        // 1. Fetch inventories based on selected owners
        if (selectedOwnerIds.length > 0) {
          const ownerIdsParam = selectedOwnerIds.join(',');
          const ownerInventoriesRes = await fetch(`/api/inventory?category=FERTILIZER,PESTICIDE&userIds=${ownerIdsParam}`);
          if (ownerInventoriesRes.ok) {
            const ownerInventoriesData = await ownerInventoriesRes.json();
            (ownerInventoriesData || []).forEach((inv: Inventory) => {
              if (!fetchedInventoryMap.has(inv.id)) {
                fetchedInventoryMap.set(inv.id, inv);
              }
            });
          } else {
            console.error("Sahip bazlı envanter yüklenemedi:", ownerInventoriesRes.statusText);
            // Optionally show a less critical toast here
          }
        }

        // 2. Fetch all inventories in category if in edit mode to ensure initial selections are available
        //    (Alternative: Fetch only specific initialInventoryIds if API supported it)
        if (isEditMode && initialInventoryIds.length > 0) {
           // Check if initial IDs are already fetched via owner filter
           const missingInitialIds = initialInventoryIds.filter(id => !fetchedInventoryMap.has(id));

           if (missingInitialIds.length > 0) {
             // Fetch all relevant inventories and filter client-side
             // Consider adding an API parameter like &ids=... in the future for efficiency
             const allInventoriesRes = await fetch(`/api/inventory?category=FERTILIZER,PESTICIDE&fetchAll=true`);
             if (allInventoriesRes.ok) {
               const allInventoriesData = await allInventoriesRes.json();
               (allInventoriesData || []).forEach((inv: Inventory) => {
                 // Add if it's one of the initially used ones and not already added
                 if (initialInventoryIds.includes(inv.id) && !fetchedInventoryMap.has(inv.id)) {
                   fetchedInventoryMap.set(inv.id, inv);
                 }
               });
             } else {
               console.error("Tüm kategori envanterleri yüklenemedi:", allInventoriesRes.statusText);
               toast({
                 title: "Uyarı",
                 description: "Başlangıçta kullanılan bazı envanterler yüklenememiş olabilir.",
                 variant: "destructive",
               });
             }
           }
        }

        finalInventories = Array.from(fetchedInventoryMap.values());
        setInventories(finalInventories);

      } catch (error: any) {
        console.error("Envanter yükleme sırasında genel hata:", error);
        toast({
          title: "Hata",
          description: error.message || "Envanter listesi güncellenirken bir hata oluştu.",
          variant: "destructive",
        });
        setInventories([]); // Clear inventories on error
      } finally {
        setLoadingInventories(false);
      }
    };

    fetchInventories();
  // Depend on selectedOwnerIds AND initialData to refetch when mode changes or owners change
  }, [selectedOwnerIds, initialData]);


  const onSubmit = async (data: IrrigationFormValues) => {
    const isEditMode = !!irrigationId;
    setLoadingSubmit(true);

    try {
      // --- Start Calculations (Moved from previous version, needed for API) ---
      let totalIrrigatedArea = 0;
      const fieldDataForApi = data.fieldIrrigations
        .map((irrigation): FieldDetailForApi | null => {
          const field = fields.find((f) => f.id === irrigation.fieldId);
          if (!field) return null;
          const irrigatedArea = (field.size * irrigation.percentage) / 100;
          totalIrrigatedArea += irrigatedArea;
          return {
            fieldId: field.id,
            percentage: irrigation.percentage,
            irrigatedArea: round(irrigatedArea),
            wellId: field.fieldWells?.[0]?.well?.id || null,
            seasonId: field.seasonId,
            owners: field.owners, // Keep owners for next calculation
          };
        })
        .filter((item): item is FieldDetailForApi => item !== null);

      if (totalIrrigatedArea <= 0 && data.fieldIrrigations.length > 0) { // Allow submission if no fields yet
        toast({ title: "Hata", description: "Toplam sulanan alan sıfırdan büyük olmalıdır.", variant: "destructive" });
        setLoadingSubmit(false);
        return;
      }

      const ownerDataMap: Record<string, OwnerData> = {};
      fieldDataForApi.forEach((fieldDetail) => {
        if (!Array.isArray(fieldDetail.owners)) return;
        fieldDetail.owners.forEach((ownership) => {
          if (!ownership.user) return;
          const ownerIrrigatedArea = (fieldDetail.irrigatedArea * ownership.percentage) / 100;
          // Avoid division by zero if totalIrrigatedArea is 0 (e.g., initial state)
          const ownerDuration = totalIrrigatedArea > 0 ? (data.duration * ownerIrrigatedArea) / totalIrrigatedArea : 0;

          if (ownerDataMap[ownership.userId]) {
            ownerDataMap[ownership.userId].duration += ownerDuration;
            ownerDataMap[ownership.userId].irrigatedArea += ownerIrrigatedArea;
          } else {
            ownerDataMap[ownership.userId] = {
              userId: ownership.userId,
              userName: ownership.user.name || `User (${ownership.userId})`,
              duration: ownerDuration,
              irrigatedArea: ownerIrrigatedArea,
            };
          }
        });
      });

      const ownerDurationsForApi = Object.values(ownerDataMap).map(owner => ({
          userId: owner.userId,
          duration: round(owner.duration),
          irrigatedArea: round(owner.irrigatedArea),
      }));

      const inventoryUsagesForApi = data.inventoryUsages
        ?.map((usage) => {
          if (!usage.inventoryId || !usage.quantity) return null;
          const inventoryItem = inventories.find((i) => i.id === usage.inventoryId);
          const unitPrice = inventoryItem?.unitPrice ?? 0;

          const ownerUsagesData = Object.values(ownerDataMap).map((owner) => {
             // Avoid division by zero
            const ownerShareQuantity = totalIrrigatedArea > 0 ? (usage.quantity! * owner.irrigatedArea) / totalIrrigatedArea : 0;
            const ownerCost = ownerShareQuantity * unitPrice;
            return {
              userId: owner.userId,
              quantity: round(ownerShareQuantity),
              cost: round(ownerCost),
            };
          });

          return {
            inventoryId: usage.inventoryId,
            quantity: usage.quantity,
            unitPrice: unitPrice,
            ownerUsages: ownerUsagesData,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
      // --- End Calculations ---


      // Başlangıç tarih ve saatini birleştir
      const startDate = new Date(data.date);
      const [hours, minutes] = data.startTime.split(":").map(Number);
      startDate.setHours(hours, minutes, 0, 0);

      // API'ye gönderilecek veriyi hazırla (backend'in beklediği yapı)
      const formData = {
        startDateTime: startDate.toISOString(),
        duration: data.duration,
        notes: data.notes,
        // fieldIrrigations: data.fieldIrrigations.map(({ fieldId, percentage }) => ({ // Simplified version from feedback - Reverting to calculated
        //   fieldId,
        //   percentage,
        // })),
        // inventoryUsages: data.inventoryUsages?.map(({ inventoryId, quantity }) => ({ // Simplified version from feedback - Reverting to calculated
        //   inventoryId,
        //   quantity,
        // })),
        fieldIrrigations: fieldDataForApi.map(({ owners, ...rest }) => rest), // Send calculated data without owners
        ownerDurations: ownerDurationsForApi, // Send calculated owner durations
        inventoryUsages: inventoryUsagesForApi, // Send calculated inventory usages with owner costs
      };

      // API isteği - Düzenleme veya Yeni Kayıt
      const apiUrl = isEditMode ? `/api/irrigation/${irrigationId}` : "/api/irrigation";
      const apiMethod = isEditMode ? "PUT" : "POST";

      const response = await fetch(apiUrl, {
        method: apiMethod,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData), // Send the full calculated data
      });

      if (!response.ok) {
        // Try to parse error message from backend
        let errorMessage = `Sulama kaydı ${isEditMode ? 'güncellenirken' : 'oluşturulurken'} bir hata oluştu.`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
            // Ignore if response is not JSON or empty
            console.error("Could not parse error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Başarılı",
        description: `Sulama kaydı başarıyla ${isEditMode ? 'güncellendi' : 'oluşturuldu'}.`,
      });

      router.push("/dashboard/owner/irrigation");
      router.refresh();

    } catch (error: any) { // Catch block expects 'any' or 'unknown'
      console.error(`Form gönderme hatası (${isEditMode ? 'PUT' : 'POST'}):`, error);
      toast({
        title: "Hata",
        description: error.message || `Sulama kaydı ${isEditMode ? 'güncellenirken' : 'oluşturulurken'} bilinmeyen bir hata oluştu.`, // Provide a fallback message
        variant: "destructive",
      });
    } finally {
      setLoadingSubmit(false);
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

  // --- Render Logic ---
  // Calculate display values based on current form state for preview
  // This part is optional but good for UX
  const currentValues = form.watch();
  let displayTotalIrrigatedArea = 0;
  const displayOwnerDurations: Record<string, OwnerData> = {};
  const displayInventoryDistribution: Record<string, any> = {}; // Simplified for display

  if (currentValues.fieldIrrigations && currentValues.duration) {
      const tempFieldData = currentValues.fieldIrrigations.map(irrigation => {
          const field = fields.find(f => f.id === irrigation.fieldId);
          if (!field) return null;
          const irrigatedArea = (field.size * (irrigation.percentage || 0)) / 100;
          displayTotalIrrigatedArea += irrigatedArea;
          return { irrigatedArea, owners: field.owners };
      }).filter(Boolean);

      if (displayTotalIrrigatedArea > 0) {
          tempFieldData.forEach(fieldDetail => {
              if (!fieldDetail || !Array.isArray(fieldDetail.owners)) return;
              fieldDetail.owners.forEach(ownership => {
                  if (!ownership.user) return;
                  const ownerIrrigatedArea = (fieldDetail.irrigatedArea * ownership.percentage) / 100;
                  const ownerDuration = (currentValues.duration! * ownerIrrigatedArea) / displayTotalIrrigatedArea;
                  if (displayOwnerDurations[ownership.userId]) {
                      displayOwnerDurations[ownership.userId].duration += ownerDuration;
                      displayOwnerDurations[ownership.userId].irrigatedArea += ownerIrrigatedArea;
                  } else {
                      displayOwnerDurations[ownership.userId] = { userId: ownership.userId, userName: ownership.user.name, duration: ownerDuration, irrigatedArea: ownerIrrigatedArea };
                  }
              });
          });
      }

      if (currentValues.inventoryUsages && displayTotalIrrigatedArea > 0) {
          currentValues.inventoryUsages.forEach(usage => {
              if (!usage.inventoryId || !usage.quantity) return;
              const inventoryItem = inventories.find(i => i.id === usage.inventoryId);
              if (!inventoryItem) return;
              const ownerUsages: Record<string, number> = {};
              Object.values(displayOwnerDurations).forEach(owner => {
                  const ownerShare = (usage.quantity! * owner.irrigatedArea) / displayTotalIrrigatedArea;
                  ownerUsages[owner.userId] = ownerShare;
              });
              displayInventoryDistribution[inventoryItem.id] = { inventoryId: inventoryItem.id, inventoryName: inventoryItem.name, unit: inventoryItem.unit, ownerUsages };
          });
      }
  }
  // --- End Display Calculation ---


  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Sulama Kaydı Oluştur</CardTitle>
            <CardDescription>
              Sulama bilgilerini girerek yeni bir sulama kaydı oluşturun.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Form Fields */}
            <div className="grid grid-cols-3 gap-4">
              {/* Date */}
              <div className="space-y-2 col-span-1">
                <Label htmlFor="date">Sulama Tarihi</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch("date") && "text-muted-foreground" // Use watch here
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("date") ? (
                        format(form.watch("date"), "PPP", { locale: tr })
                      ) : (
                        <span>Tarih Seçin</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.watch("date")}
                      onSelect={(date) =>
                        form.setValue("date", date || new Date(), { shouldValidate: true }) // Trigger validation
                      }
                      initialFocus
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
              {/* Start Time */}
              <div className="space-y-2 col-span-1">
                <Label htmlFor="startTime">Başlangıç Saati</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="startTime"
                    type="time"
                    className="pl-10"
                    {...form.register("startTime")}
                  />
                </div>
                {form.formState.errors.startTime && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.startTime.message}
                  </p>
                )}
              </div>
              {/* Duration */}
              <div className="space-y-2 col-span-1">
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
            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder="Sulama hakkında notlar..."
              />
            </div>

            {/* Field Selection */}
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
                 >
                   <Plus className="h-4 w-4 mr-2" />
                   Tarla Ekle
                 </Button>
               </div>
              {fieldIrrigations.map((field, index) => (
                <div
                  key={field.id} // Use field.id provided by useFieldArray
                  className="grid grid-cols-12 gap-4 items-end border p-4 rounded-md"
                >
                  <div className="col-span-7 space-y-2">
                    <Label htmlFor={`fieldIrrigations.${index}.fieldId`}>
                      Tarla
                    </Label>
                    <Select
                      onValueChange={(value) => {
                        // Reset inventory selection when field changes? Optional.
                        // form.setValue(`inventoryUsages`, []); // Example reset
                        form.setValue(
                          `fieldIrrigations.${index}.fieldId`,
                          value, { shouldValidate: true }
                        );
                      }}
                      defaultValue={form.watch(`fieldIrrigations.${index}.fieldId`)}
                      disabled={loadingFields} // Disable while loading fields
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingFields ? "Tarlalar yükleniyor..." : "Tarla Seçin"} />
                      </SelectTrigger>
                      <SelectContent>
                        {!loadingFields && fields.length === 0 && <p className="p-4 text-sm text-muted-foreground">Uygun tarla bulunamadı.</p>}
                        {fields.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name} ({f.size} dekar)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.fieldIrrigations?.[index]
                      ?.fieldId && (
                      <p className="text-sm text-red-500">
                        {
                          form.formState.errors.fieldIrrigations[index]
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
                          form.formState.errors.fieldIrrigations[index]
                            ?.percentage?.message
                        }
                      </p>
                    )}
                  </div>
                  <div className="col-span-1">
                    {index > 0 && ( // Allow removing only if more than one field
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
              ))}
               {form.formState.errors.fieldIrrigations?.root && (
                 <p className="text-sm text-red-500">
                   {form.formState.errors.fieldIrrigations.root.message}
                 </p>
               )}
            </div>

            {/* Inventory Usage */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Envanter Kullanımı</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddInventory}
                  disabled={!watchedFieldIrrigations || watchedFieldIrrigations.length === 0 || watchedFieldIrrigations.every(f => !f.fieldId)} // Disable if no field selected
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Envanter Ekle
                </Button>
              </div>
              {/* Conditional rendering based on field selection and loading state */}
              {!watchedFieldIrrigations || watchedFieldIrrigations.length === 0 || watchedFieldIrrigations.every(f => !f.fieldId) ? (
                 <div className="p-4 border rounded-md text-center text-gray-500">
                   <p>Lütfen önce envanterleri görmek için bir veya daha fazla tarla seçin.</p>
                 </div>
              ) : loadingInventories ? (
                 <div className="p-4 border rounded-md text-center text-gray-500">
                   <p>Seçili tarlaların sahiplerine ait envanterler yükleniyor...</p>
                 </div>
              ) : inventories.length === 0 ? (
                 <div className="p-4 border rounded-md text-center text-gray-500">
                   <p>Seçili tarlaların sahiplerine ait uygun (Gübre/Pestisit) envanter bulunamadı.</p>
                 </div>
              ) : (
                inventoryUsagesArray.map((item, index) => (
                  <div
                    key={item.id}
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
                            value, { shouldValidate: true }
                          )
                        }
                        defaultValue={form.watch(`inventoryUsages.${index}.inventoryId`)}
                        disabled={loadingInventories || inventories.length === 0} // Disable if loading or no inventory
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingInventories ? "Yükleniyor..." : "Envanter Seçin"} />
                        </SelectTrigger>
                        <SelectContent>
                          {inventories.map((inv) => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.name} (Stok: {inv.totalQuantity} {inv.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.inventoryUsages?.[index]
                        ?.inventoryId && (
                        <p className="text-sm text-red-500">
                          {
                            form.formState.errors.inventoryUsages[index]
                              ?.inventoryId?.message
                          }
                        </p>
                      )}
                    </div>
                    <div className="col-span-4 space-y-2">
                      <Label htmlFor={`inventoryUsages.${index}.quantity`}>
                        Miktar ({inventories.find(inv => inv.id === form.watch(`inventoryUsages.${index}.inventoryId`))?.unit || 'Birim'})
                      </Label>
                      <Input
                        id={`inventoryUsages.${index}.quantity`}
                        type="number"
                        step="0.01"
                        {...form.register(
                          `inventoryUsages.${index}.quantity` as const,
                          { valueAsNumber: true }
                        )}
                        disabled={!form.watch(`inventoryUsages.${index}.inventoryId`)} // Disable if no inventory selected
                      />
                      {form.formState.errors.inventoryUsages?.[index]
                        ?.quantity && (
                        <p className="text-sm text-red-500">
                          {
                            form.formState.errors.inventoryUsages[index]
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
                ))
              )}
              {inventoryUsagesArray.length > 0 && inventories.length === 0 && !loadingInventories && (
                 <div className="p-4 border rounded-md text-center text-red-500">
                   <p>Uyarı: Seçili tarlaların sahiplerine ait envanter bulunamadığı için eklenen envanter satırları geçersiz olabilir.</p>
                 </div>
              )}
            </div> {/* End of Inventory Usage Section */}

            {/* Calculated Values Preview */}
            {displayTotalIrrigatedArea > 0 && ( // Show only if calculations are valid
              <div className="space-y-4 border p-4 rounded-md bg-gray-50 mt-6"> {/* Added mt-6 for spacing */}
                <h3 className="text-lg font-medium">Hesaplanan Değerler (Önizleme)</h3>
                <div className="space-y-2">
                  <h4 className="font-medium">Toplam Sulanan Alan</h4>
                  <p>{displayTotalIrrigatedArea.toFixed(2)} dekar</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Sahip Bazında Sulama Süreleri</h4>
                  <div className="border rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sahip</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sulanan Alan (dekar)</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Süre (dakika)</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.values(displayOwnerDurations).map((owner) => (
                            <tr key={owner.userId}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{owner.userName}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{round(owner.irrigatedArea).toFixed(2)}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{round(owner.duration).toFixed(2)}</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                {Object.keys(displayInventoryDistribution).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Envanter Dağılımı</h4>
                    <div className="border rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Envanter</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sahip</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Miktar</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {Object.values(displayInventoryDistribution).flatMap((dist: any) =>
                            Object.entries(dist.ownerUsages).map(([userId, quantity]) => {
                                const owner = displayOwnerDurations[userId];
                                return (
                                  <tr key={`${dist.inventoryId}-${userId}`}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{dist.inventoryName}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{owner?.userName || userId}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {round(quantity as number).toFixed(2)} {dist.unit}
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
          </CardContent> {/* Ensure CardContent closes correctly */}
          <CardFooter className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/owner/irrigation")}
              disabled={loadingSubmit} // Use specific loading state
            >
              İptal
            </Button>
            <Button type="submit" disabled={loadingSubmit || loadingFields || loadingInventories || !form.formState.isValid}> {/* Disable if loading anything or form invalid */}
              {loadingSubmit ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
