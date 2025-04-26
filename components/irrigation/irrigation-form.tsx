"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
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
}

export function IrrigationForm({ initialData }: IrrigationFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState<Field[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(false);
  // Removed calculatedData state as calculations will happen in onSubmit

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

  // Fetch initial data (fields and inventories)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Start loading
      try {
        const [fieldsRes, inventoriesRes] = await Promise.all([
          fetch("/api/fields?includeOwnerships=true&fetchAll=true"),
          fetch("/api/inventory?category=FERTILIZER,PESTICIDE&fetchAll=true")
        ]);

        if (!fieldsRes.ok) throw new Error('Tarlalar yüklenemedi');
        if (!inventoriesRes.ok) throw new Error('Envanter yüklenemedi');

        const fieldsData = await fieldsRes.json();
        const inventoriesData = await inventoriesRes.json();

        setFields(fieldsData.data || []);
        // Ensure inventoriesData includes unitPrice (mapped from costPrice in API)
        setInventories(inventoriesData || []);

      } catch (error: any) {
        console.error("Veri yükleme hatası:", error);
        toast({
          title: "Hata",
          description: error.message || "Veriler yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      } finally {
        setLoading(false); // End loading
      }
    };

    fetchData();
  }, []); // Fetch only once on mount


  // Form gönderme - Hesaplamalar buraya taşındı
  const onSubmit = async (data: IrrigationFormValues) => {
    setLoading(true);
    try {
      // --- Start Calculations within onSubmit ---

      // 1. Calculate Total Irrigated Area and Field Data
      let totalIrrigatedArea = 0;
      const fieldDataForApi = data.fieldIrrigations
        .map((irrigation): FieldDetailForApi | null => { // Add return type hint
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
            // We need owners here for the next calculation step
            owners: field.owners,
          };
        })
        .filter((item): item is FieldDetailForApi => item !== null); // Use type predicate for filtering

      if (totalIrrigatedArea <= 0) {
        toast({ title: "Hata", description: "Toplam sulanan alan sıfırdan büyük olmalıdır.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // 2. Calculate Owner Durations and Areas
      const ownerDataMap: Record<string, OwnerData> = {};
      // Now fieldDetail is guaranteed to be non-null here
      fieldDataForApi.forEach((fieldDetail) => {
         // Add null/undefined check for owners array itself, just in case
        if (!Array.isArray(fieldDetail.owners)) {
             console.warn(`Owners array is missing or not an array for fieldDetail:`, fieldDetail);
             return; // Skip if owners array is missing
        }
        fieldDetail.owners.forEach((ownership) => {
          if (!ownership.user) return; // Skip if user data is missing
          const ownerIrrigatedArea = (fieldDetail.irrigatedArea * ownership.percentage) / 100;
          const ownerDuration = (data.duration * ownerIrrigatedArea) / totalIrrigatedArea;

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


      // 3. Prepare Inventory Usages with Owner Costs
      const inventoryUsagesForApi = data.inventoryUsages
        ?.map((usage) => {
          if (!usage.inventoryId || !usage.quantity) return null; // Skip incomplete entries
          const inventoryItem = inventories.find((i) => i.id === usage.inventoryId);
          const unitPrice = inventoryItem?.unitPrice ?? 0;

          const ownerUsagesData = Object.values(ownerDataMap).map((owner) => {
            const ownerShareQuantity = (usage.quantity! * owner.irrigatedArea) / totalIrrigatedArea;
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
        .filter((item): item is NonNullable<typeof item> => item !== null); // Filter out nulls and assert non-null


      // --- End Calculations within onSubmit ---


      // Başlangıç tarih ve saatini birleştir
      const startDate = new Date(data.date);
      const [hours, minutes] = data.startTime.split(":").map(Number);
      startDate.setHours(hours, minutes, 0, 0);

      // API'ye gönderilecek veriyi hazırla
      const formData = {
        startDateTime: startDate.toISOString(),
        duration: data.duration,
        notes: data.notes,
        // Remove owners from fieldDataForApi before sending
        fieldIrrigations: fieldDataForApi.map(({ owners, ...rest }) => rest),
        ownerDurations: ownerDurationsForApi,
        inventoryUsages: inventoryUsagesForApi,
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

      router.push("/dashboard/owner/irrigation");
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
                      onValueChange={(value) =>
                        form.setValue(
                          `fieldIrrigations.${index}.fieldId`,
                          value, { shouldValidate: true }
                        )
                      }
                      // Use watch to get the current value for defaultValue
                      defaultValue={form.watch(`fieldIrrigations.${index}.fieldId`)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tarla Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.map((f) => ( // Use a different variable name 'f'
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
                 >
                   <Plus className="h-4 w-4 mr-2" />
                   Envanter Ekle
                 </Button>
               </div>
              {inventoryUsagesArray.length === 0 && (
                <div className="p-4 border rounded-md text-center text-gray-500">
                  <p>
                    Henüz envanter eklenmedi. Sulama sırasında kullanılan
                    envanter varsa ekleyin.
                  </p>
                </div>
              )}
              {inventoryUsagesArray.map((item, index) => ( // Use item and index
                <div
                  key={item.id} // Use item.id provided by useFieldArray
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
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Envanter Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventories.map((inv) => ( // Use inv
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.name} ({inv.totalQuantity}{" "}
                            {inv.unit})
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
              ))}
            </div>

            {/* Calculated Values Preview */}
            {displayTotalIrrigatedArea > 0 && ( // Show only if calculations are valid
              <div className="space-y-4 border p-4 rounded-md bg-gray-50">
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
          </CardContent>
          <CardFooter className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/owner/irrigation")}
              disabled={loading}
            >
              İptal
            </Button>
            <Button type="submit" disabled={loading || !form.formState.isValid}> {/* Disable if form is invalid */}
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
