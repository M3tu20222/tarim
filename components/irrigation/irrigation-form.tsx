"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, Info, Clock, User as UserIcon } from "lucide-react";

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

// Adım 0: Temel Bilgiler Şeması
const Step0Schema = z.object({
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
  wellId: z.string({
    required_error: "Kuyu seçimi gereklidir.",
  }),
});

// Adım 1: Tarla Seçimi Şeması
const Step1Schema = z.object({
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
});

// Adım 2: Envanter Kullanımları Şeması
const Step2Schema = z.object({
  inventoryUsages: z
    .array(
      z.object({
        ownerId: z.string({
          required_error: "Envanterin sahibi seçilmelidir.",
        }),
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

// Tüm form değerleri için birleştirilmiş tip
type IrrigationFormValues = z.infer<typeof Step0Schema> & z.infer<typeof Step1Schema> & z.infer<typeof Step2Schema>;

const defaultValues: Partial<IrrigationFormValues> = {
  date: new Date(),
  startTime: format(new Date(), "HH:mm"),
  duration: 60,
  wellId: "",
  fieldIrrigations: [{ fieldId: "", percentage: 50 }],
  inventoryUsages: [],
};

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
  ownerships?: {
    userId: string;
    shareQuantity: number;
  }[];
}

interface InvolvedOwner {
  id: string;
  name: string;
}

interface OwnerData {
  userId: string;
  userName: string;
  irrigatedArea: number;
  duration: number;
}

type FieldDetailForApi = {
  fieldId: string;
  percentage: number;
  irrigatedArea: number;
  wellId: string | null;
  seasonId: string;
  owners: Field['owners'];
};

interface Well {
  id: string;
  name: string;
}

interface IrrigationFormProps {
  initialData?: Partial<IrrigationFormValues>;
  irrigationLogId?: string;
}

export function IrrigationForm({ initialData, irrigationLogId: propIrrigationLogId }: IrrigationFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [irrigationLogId, setIrrigationLogId] = useState<string | null>(propIrrigationLogId || null);
  const [fields, setFields] = useState<Field[]>([]);
  const [wells, setWells] = useState<Well[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [involvedOwners, setInvolvedOwners] = useState<InvolvedOwner[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [loadingWells, setLoadingWells] = useState(false);
  const [loadingInventories, setLoadingInventories] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const isEditMode = !!propIrrigationLogId;

  const form = useForm<IrrigationFormValues>({
    resolver: zodResolver(
      currentStep === 0 ? Step0Schema :
      currentStep === 1 ? Step1Schema :
      currentStep === 2 ? Step2Schema :
      z.any()
    ),
    defaultValues: initialData || defaultValues,
    mode: "onChange",
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
    fields: usedInventories,
    append: appendUsedInventory,
    remove: removeUsedInventory,
  } = useFieldArray({
    control: form.control,
    name: "inventoryUsages",
  });

  const watchedFieldIrrigations = useWatch({ control: form.control, name: "fieldIrrigations" });

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
        toast({ title: "Hata", description: error.message || "Tarlalar yüklenirken bir hata oluştu.", variant: "destructive" });
      } finally {
        setLoadingFields(false);
      }
    };
    fetchFields();

    const fetchWells = async () => {
      setLoadingWells(true);
      try {
        const wellsRes = await fetch("/api/wells");
        if (!wellsRes.ok) throw new Error('Kuyular yüklenemedi');
        const wellsData = await wellsRes.json();
        setWells(wellsData.data || []);
      } catch (error: any) {
        console.error("Kuyu yükleme hatası:", error);
        toast({ title: "Hata", description: error.message || "Kuyular yüklenirken bir hata oluştu.", variant: "destructive" });
      } finally {
        setLoadingWells(false);
      }
    };
    fetchWells();
  }, []);

  useEffect(() => {
    const ownerMap = new Map<string, InvolvedOwner>();
    if (watchedFieldIrrigations && fields.length > 0) {
      watchedFieldIrrigations.forEach(irrigation => {
        if (irrigation.fieldId) {
          const field = fields.find(f => f.id === irrigation.fieldId);
          if (field && field.owners) {
            field.owners.forEach(owner => {
              if (owner.user && !ownerMap.has(owner.userId)) {
                ownerMap.set(owner.userId, { id: owner.userId, name: owner.user.name });
              }
            });
          }
        }
      });
    }
    setInvolvedOwners(Array.from(ownerMap.values()));
  }, [watchedFieldIrrigations, fields]);

  const selectedOwnerIds = useMemo(() => involvedOwners.map(o => o.id), [involvedOwners]);

  useEffect(() => {
    const fetchInventoriesForOwners = async () => {
      setLoadingInventories(true);
      setInventories([]);

      if (selectedOwnerIds.length === 0) {
        setLoadingInventories(false);
        return;
      }

      try {
        const ownerIdsParam = selectedOwnerIds.join(',');
        const inventoriesRes = await fetch(`/api/inventory?category=FERTILIZER,PESTICIDE&userIds=${ownerIdsParam}&includeOwnershipDetails=true`);

        if (inventoriesRes.ok) {
          const inventoriesData = await inventoriesRes.json();
          setInventories(inventoriesData.data || inventoriesData || []);
        } else {
          console.error("Sahip envanterleri yüklenemedi:", inventoriesRes.statusText);
          toast({ title: "Hata", description: "Sahiplere ait envanterler yüklenemedi.", variant: "destructive" });
        }
      } catch (error: any) {
        console.error("Envanter yükleme hatası:", error);
        toast({ title: "Hata", description: error.message || "Envanterler yüklenirken bir hata oluştu.", variant: "destructive" });
      } finally {
        setLoadingInventories(false);
      }
    };

    fetchInventoriesForOwners();
  }, [selectedOwnerIds]);

  const handleNext = async () => {
    let isValid = false;
    let formData: any = {};

    if (currentStep === 0) {
      isValid = await form.trigger(["date", "startTime", "duration", "wellId"]);
      if (isValid) {
        const { date, startTime, duration, notes, wellId } = form.getValues();
        const startDate = new Date(date);
        const [hours, minutes] = startTime.split(":").map(Number);
        startDate.setHours(hours, minutes, 0, 0);

        formData = {
          startDateTime: startDate.toISOString(),
          duration,
          notes,
          wellId,
        };

        setLoadingSubmit(true);
        try {
          const response = await fetch("/api/irrigation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Sulama kaydı başlatılırken bir hata oluştu.");
          }
          const result = await response.json();
          setIrrigationLogId(result.data.id);
          setCurrentStep(currentStep + 1);
          toast({ title: "Başarılı", description: "Temel sulama bilgileri kaydedildi.", variant: "default" });
        } catch (error: any) {
          console.error("Adım 0 gönderme hatası:", error);
          toast({ title: "Hata", description: error.message, variant: "destructive" });
        } finally {
          setLoadingSubmit(false);
        }
      }
    } else if (currentStep === 1) {
      isValid = await form.trigger("fieldIrrigations");
      if (isValid) {
        const { fieldIrrigations } = form.getValues();
        let totalIrrigatedArea = 0;
        let foundWellId: string | null = null; // Sadece kontrol amaçlı, API'ye wellId göndermiyoruz

        const fieldDataForApi = fieldIrrigations
          .map((irrigation): FieldDetailForApi | null => {
            const field = fields.find((f) => f.id === irrigation.fieldId);
            if (!field) return null;
            const irrigatedArea = (field.size * irrigation.percentage) / 100;
            totalIrrigatedArea += irrigatedArea;

            if (!foundWellId && field.fieldWells?.[0]?.well?.id) {
              foundWellId = field.fieldWells[0].well.id;
            }

            return {
              fieldId: field.id,
              percentage: irrigation.percentage,
              irrigatedArea: round(irrigatedArea),
              wellId: field.fieldWells?.[0]?.well?.id || null,
              seasonId: field.seasonId,
              owners: field.owners,
            };
          })
          .filter((item): item is FieldDetailForApi => item !== null);

        if (!foundWellId) {
          const fieldNames = fieldIrrigations
            .map(irrigation => {
              const field = fields.find(f => f.id === irrigation.fieldId);
              return field ? field.name : 'Bilinmeyen tarla';
            })
            .join(', ');

          toast({
            title: "Kuyu Bağlantısı Eksik",
            description: `Seçilen tarlalar (${fieldNames}) hiçbiri bir kuyuya bağlı değil. Lütfen önce tarlaları düzenleyerek kuyulara bağlayın veya kuyuya bağlı tarlalar seçin.`,
            variant: "destructive",
            duration: 8000
          });
          return;
        }

        if (totalIrrigatedArea <= 0 && fieldIrrigations.length > 0) {
          toast({ title: "Hata", description: "Toplam sulanan alan sıfırdan büyük olmalıdır.", variant: "destructive" });
          return;
        }

        const ownerDataMap: Record<string, OwnerData> = {};
        fieldDataForApi.forEach((fieldDetail) => {
          if (!Array.isArray(fieldDetail.owners)) return;
          fieldDetail.owners.forEach((ownership) => {
            if (!ownership.user) return;
            const ownerIrrigatedArea = (fieldDetail.irrigatedArea * ownership.percentage) / 100;
            const ownerDuration = totalIrrigatedArea > 0 ? (form.getValues("duration") * ownerIrrigatedArea) / totalIrrigatedArea : 0;

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
          userName: owner.userName,
          duration: round(owner.duration),
          irrigatedArea: round(owner.irrigatedArea),
        }));

        formData = {
          fieldIrrigations: fieldDataForApi.map(({ owners, ...rest }) => rest),
          ownerDurations: ownerDurationsForApi.map(({ userName, ...rest }) => rest),
        };

        setLoadingSubmit(true);
        try {
          const response = await fetch(`/api/irrigation/${irrigationLogId}/details`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Tarla bilgileri güncellenirken bir hata oluştu.");
          }
          setCurrentStep(currentStep + 1);
          toast({ title: "Başarılı", description: "Tarla bilgileri kaydedildi.", variant: "default" });
        } catch (error: any) {
          console.error("Adım 1 gönderme hatası:", error);
          toast({ title: "Hata", description: error.message, variant: "destructive" });
        } finally {
          setLoadingSubmit(false);
        }
      }
    } else if (currentStep === 2) {
      isValid = await form.trigger("inventoryUsages");
      if (isValid) {
        const { inventoryUsages } = form.getValues();
        let formHasStockError = false;
        const inventoryDeductionsForApi: {
          inventoryId: string;
          quantityUsed: number;
          unitPrice: number;
          ownerId: string;
        }[] = [];

        inventoryUsages?.forEach((usage) => {
          if (formHasStockError) return;

          if (!usage.inventoryId || !usage.ownerId || usage.quantity == null || usage.quantity <= 0) {
            console.warn("Invalid inventory usage entry:", usage);
            toast({ title: "Hata", description: `Geçersiz envanter girişi. Lütfen tüm alanları doldurun.`, variant: "destructive" });
            formHasStockError = true;
            return;
          }

          const inventoryItem = inventories.find((i) => i.id === usage.inventoryId);
          if (!inventoryItem) {
            toast({ title: "Hata", description: `Envanter detayı bulunamadı: ID ${usage.inventoryId}.`, variant: "destructive" });
            formHasStockError = true;
            return;
          }

          const ownerStock = inventoryItem.ownerships?.find(own => own.userId === usage.ownerId);
          const ownerName = involvedOwners.find(o => o.id === usage.ownerId)?.name || `Sahip (ID: ${usage.ownerId})`;

          if (!ownerStock || ownerStock.shareQuantity < usage.quantity) {
            toast({
              title: "Yetersiz Stok",
              description: `${ownerName} adlı sahip için ${inventoryItem.name} stoğu yetersiz. İstenen: ${usage.quantity.toFixed(2)} ${inventoryItem.unit}, Mevcut: ${round(ownerStock?.shareQuantity ?? 0).toFixed(2)} ${inventoryItem.unit}`,
              variant: "destructive",
              duration: 7000,
            });
            formHasStockError = true;
            return;
          }

          inventoryDeductionsForApi.push({
            inventoryId: usage.inventoryId,
            quantityUsed: round(usage.quantity),
            unitPrice: inventoryItem.unitPrice ?? 0,
            ownerId: usage.ownerId,
          });
        });

        if (formHasStockError) {
          setLoadingSubmit(false);
          toast({ title: "İşlem Durduruldu", description: "Formda belirtilen yetersiz stok hatalarını düzeltin.", variant: "destructive" });
          return;
        }

        formData = {
          inventoryDeductions: inventoryDeductionsForApi,
        };

        setLoadingSubmit(true);
        try {
          const response = await fetch(`/api/irrigation/${irrigationLogId}/details`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Envanter bilgileri güncellenirken bir hata oluştu.");
          }
          setCurrentStep(currentStep + 1);
          toast({ title: "Başarılı", description: "Envanter bilgileri kaydedildi.", variant: "default" });
        } catch (error: any) {
          console.error("Adım 2 gönderme hatası:", error);
          toast({ title: "Hata", description: error.message, variant: "destructive" });
        } finally {
          setLoadingSubmit(false);
        }
      }
    }
  };

  const handleSubmitForm = async () => {
    setLoadingSubmit(true);
    try {
      const { duration, fieldIrrigations, inventoryUsages } = form.getValues();

      // ownerDurationsForApi'yi yeniden hesapla (Finalize API'si için)
      let totalIrrigatedArea = 0;
      const fieldDataForApi = fieldIrrigations
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
            owners: field.owners,
          };
        })
        .filter((item): item is FieldDetailForApi => item !== null);

      const ownerDataMap: Record<string, OwnerData> = {};
      fieldDataForApi.forEach((fieldDetail) => {
        if (!Array.isArray(fieldDetail.owners)) return;
        fieldDetail.owners.forEach((ownership) => {
          if (!ownership.user) return;
          const ownerIrrigatedArea = (fieldDetail.irrigatedArea * ownership.percentage) / 100;
          const ownerDuration = totalIrrigatedArea > 0 ? (duration * ownerIrrigatedArea) / totalIrrigatedArea : 0;

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
        userName: owner.userName,
        duration: round(owner.duration),
        irrigatedArea: round(owner.irrigatedArea),
      }));

      // Maliyet/Bilgi Amaçlı Dağıtım İçin Envanterleri Türe Göre Gruplama (Finalize için)
      interface AggregatedInventoryTypeUsage {
        inventoryTypeName: string;
        unit: string;
        totalQuantityUsedThisType: number;
        totalCostThisType: number;
        contributingStocks: { inventoryId: string; ownerId: string; quantity: number; unitPrice: number; cost: number }[];
      }
      const aggregatedInventoryUsagesByType = new Map<string, AggregatedInventoryTypeUsage>();

      inventoryUsages?.forEach(usage => {
        const inventoryItem = inventories.find(inv => inv.id === usage.inventoryId);
        if (!inventoryItem) return;

        const typeNameKey = inventoryItem.name;
        const costOfThisDeduction = round(usage.quantity * (inventoryItem.unitPrice ?? 0));

        if (!aggregatedInventoryUsagesByType.has(typeNameKey)) {
          aggregatedInventoryUsagesByType.set(typeNameKey, {
            inventoryTypeName: inventoryItem.name,
            unit: inventoryItem.unit,
            totalQuantityUsedThisType: 0,
            totalCostThisType: 0,
            contributingStocks: [],
          });
        }

        const currentTypeUsage = aggregatedInventoryUsagesByType.get(typeNameKey)!;
        currentTypeUsage.totalQuantityUsedThisType = round(currentTypeUsage.totalQuantityUsedThisType + usage.quantity);
        currentTypeUsage.totalCostThisType = round(currentTypeUsage.totalCostThisType + costOfThisDeduction);
        currentTypeUsage.contributingStocks.push({
          inventoryId: usage.inventoryId,
          ownerId: usage.ownerId,
          quantity: usage.quantity,
          unitPrice: inventoryItem.unitPrice ?? 0,
          cost: costOfThisDeduction,
        });
      });

      const costAllocationBreakdownForApi: {
        ownerId: string;
        inventoryTypeName: string;
        quantityAllocated: number;
        costAllocated: number;
        unit: string;
      }[] = [];

      for (const [, typeUsage] of aggregatedInventoryUsagesByType.entries()) {
        if (typeUsage.totalQuantityUsedThisType <= 0) continue;

        const involvedOwnersForDistribution = ownerDurationsForApi.filter(owner => owner.irrigatedArea > 0);
        if (involvedOwnersForDistribution.length === 0) continue;

        const relevantTotalIrrigatedArea = involvedOwnersForDistribution.reduce((sum, o) => sum + o.irrigatedArea, 0);
        if (relevantTotalIrrigatedArea <= 0) continue;

        let sumOfDistributedQuantities = 0;
        let sumOfDistributedCosts = 0;

        for (let i = 0; i < involvedOwnersForDistribution.length; i++) {
          const owner = involvedOwnersForDistribution[i];
          const ownerSharePercent = (owner.irrigatedArea / relevantTotalIrrigatedArea);

          let quantityShare = typeUsage.totalQuantityUsedThisType * ownerSharePercent;
          let costShare = typeUsage.totalCostThisType * ownerSharePercent;

          if (i === involvedOwnersForDistribution.length - 1) {
            quantityShare = round(typeUsage.totalQuantityUsedThisType - sumOfDistributedQuantities);
            costShare = round(typeUsage.totalCostThisType - sumOfDistributedCosts);
          }

          const roundedQuantityShare = round(quantityShare);
          const roundedCostShare = round(costShare);

          if (roundedQuantityShare > 0 || roundedCostShare > 0) {
            sumOfDistributedQuantities = round(sumOfDistributedQuantities + roundedQuantityShare);
            sumOfDistributedCosts = round(sumOfDistributedCosts + roundedCostShare);

            costAllocationBreakdownForApi.push({
              ownerId: owner.userId,
              inventoryTypeName: typeUsage.inventoryTypeName,
              quantityAllocated: roundedQuantityShare,
              costAllocated: roundedCostShare,
              unit: typeUsage.unit,
            });
          }
        }
      }

      const formData = {
        ownerDurations: ownerDurationsForApi.map(({ userName, ...rest }) => rest),
        costAllocations: costAllocationBreakdownForApi,
      };

      const response = await fetch(`/api/irrigation/${irrigationLogId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Sulama kaydı sonlandırılırken bir hata oluştu.");
      }

      toast({ title: "Başarılı", description: "Sulama kaydı başarıyla oluşturuldu.", variant: "default" });
      router.push("/dashboard/owner/irrigation");
      router.refresh();
    } catch (error: any) {
      console.error("Form sonlandırma hatası:", error);
      toast({ title: "Hata", description: error.message || "Sulama kaydı sonlandırılırken bilinmeyen bir hata oluştu.", variant: "destructive" });
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleAddField = () => {
    appendField({ fieldId: "", percentage: 50 });
  };

  const handleAddUsedInventory = () => {
    const defaultOwnerId = involvedOwners.length > 0 ? involvedOwners[0].id : "";
    appendUsedInventory({ ownerId: defaultOwnerId, inventoryId: "", quantity: 0 });
  };

  const currentValues = form.watch();

  // Önizleme Hesaplamaları (Yeni Dağıtım Mantığı ile)
  const { displayTotalIrrigatedArea, displayOwnerDurations, displayInventoryDistribution } = useMemo(() => {
    let calculatedTotalIrrigatedArea = 0;
    const calculatedOwnerDurationsMap: Record<string, OwnerData> = {};
    const calculatedInventoryDistribution: {
        inventoryName: string;
        unit: string;
        totalUsed: number;
        distribution: { ownerName: string; quantityShare: number }[];
    }[] = [];

    if (currentValues.fieldIrrigations && currentValues.duration) {
      const tempFieldData = currentValues.fieldIrrigations.map(irrigation => {
        const field = fields.find(f => f.id === irrigation.fieldId);
        if (!field) return null;
        const irrigatedArea = (field.size * (irrigation.percentage || 0)) / 100;
        calculatedTotalIrrigatedArea += irrigatedArea;
        return { irrigatedArea, owners: field.owners };
      }).filter((item): item is NonNullable<typeof item> => item !== null);

      if (calculatedTotalIrrigatedArea > 0) {
        tempFieldData.forEach(fieldDetail => {
          if (!fieldDetail || !Array.isArray(fieldDetail.owners)) return;
          fieldDetail.owners.forEach(ownership => {
            if (!ownership.user) return;
            const ownerIrrigatedArea = (fieldDetail.irrigatedArea * ownership.percentage) / 100;
            const ownerDuration = (currentValues.duration! * ownerIrrigatedArea) / calculatedTotalIrrigatedArea;
            if (calculatedOwnerDurationsMap[ownership.userId]) {
              calculatedOwnerDurationsMap[ownership.userId].duration += ownerDuration;
              calculatedOwnerDurationsMap[ownership.userId].irrigatedArea += ownerIrrigatedArea;
            } else {
              calculatedOwnerDurationsMap[ownership.userId] = { userId: ownership.userId, userName: ownership.user.name || `User (${ownership.userId})`, duration: ownerDuration, irrigatedArea: ownerIrrigatedArea };
            }
          });
        });
      }

      if (currentValues.inventoryUsages && inventories.length > 0 && Object.keys(calculatedOwnerDurationsMap).length > 0) {
        const previewAggregatedInventoryUsagesByType = new Map<string, {
          inventoryTypeName: string;
          unit: string;
          totalQuantityUsedThisType: number;
        }>();

        currentValues.inventoryUsages.forEach((usage) => {
          if (!usage.inventoryId || !usage.ownerId || usage.quantity == null || usage.quantity <= 0) return;

          const inventoryItem = inventories.find((i) => i.id === usage.inventoryId);
          if (!inventoryItem) return;

          const typeNameKey = inventoryItem.name;

          if (!previewAggregatedInventoryUsagesByType.has(typeNameKey)) {
            previewAggregatedInventoryUsagesByType.set(typeNameKey, {
              inventoryTypeName: inventoryItem.name,
              unit: inventoryItem.unit,
              totalQuantityUsedThisType: 0,
            });
          }
          const currentTypeUsage = previewAggregatedInventoryUsagesByType.get(typeNameKey)!;
          currentTypeUsage.totalQuantityUsedThisType = round(currentTypeUsage.totalQuantityUsedThisType + usage.quantity);
        });

        const currentOwnerDurationsArray = Object.values(calculatedOwnerDurationsMap);

        for (const [, typeUsage] of previewAggregatedInventoryUsagesByType.entries()) {
          if (typeUsage.totalQuantityUsedThisType <= 0) continue;

          const distribution: { ownerName: string; quantityShare: number }[] = [];
          let sumOfDistributedQuantities = 0;
          const involvedOwnersForPreview = currentOwnerDurationsArray.filter(owner => owner.irrigatedArea > 0);
          const relevantTotalIrrigatedArea = involvedOwnersForPreview.reduce((sum, o) => sum + o.irrigatedArea, 0);

          if (involvedOwnersForPreview.length === 0 || relevantTotalIrrigatedArea <= 0) continue;

          for (let i = 0; i < involvedOwnersForPreview.length; i++) {
            const owner = involvedOwnersForPreview[i];
            const ownerSharePercent = (owner.irrigatedArea / relevantTotalIrrigatedArea);
            let quantityShare = typeUsage.totalQuantityUsedThisType * ownerSharePercent;

            if (i === involvedOwnersForPreview.length - 1) {
              quantityShare = round(typeUsage.totalQuantityUsedThisType - sumOfDistributedQuantities);
            }

            const roundedQuantityShare = round(quantityShare);
            if (roundedQuantityShare > 0) {
              sumOfDistributedQuantities = round(sumOfDistributedQuantities + roundedQuantityShare);
              distribution.push({
                ownerName: owner.userName,
                quantityShare: roundedQuantityShare,
              });
            }
          }

          const finalTotalDistributed = round(distribution.reduce((sum, item) => sum + item.quantityShare, 0));
          if (finalTotalDistributed !== round(typeUsage.totalQuantityUsedThisType) && distribution.length > 0) {
            const diff = round(typeUsage.totalQuantityUsedThisType - finalTotalDistributed);
            const lastDistItem = distribution[distribution.length - 1];
            const adjustedShare = round(lastDistItem.quantityShare + diff);
            if (adjustedShare >= 0) {
              lastDistItem.quantityShare = adjustedShare;
            }
          }

          if (distribution.length > 0) {
            calculatedInventoryDistribution.push({
              inventoryName: typeUsage.inventoryTypeName,
              unit: typeUsage.unit,
              totalUsed: typeUsage.totalQuantityUsedThisType,
              distribution: distribution.filter(d => d.quantityShare > 0),
            });
          }
        }
      }
    }

    return {
      displayTotalIrrigatedArea: calculatedTotalIrrigatedArea,
      displayOwnerDurations: calculatedOwnerDurationsMap,
      displayInventoryDistribution: calculatedInventoryDistribution,
    };
  }, [currentValues.fieldIrrigations, currentValues.duration, currentValues.inventoryUsages, fields, inventories]);

  const getCardTitle = () => {
    switch (currentStep) {
      case 0: return isEditMode ? "Sulama Kaydını Düzenle (Adım 1/3)" : "Sulama Kaydı Oluştur (Adım 1/3)";
      case 1: return isEditMode ? "Tarla Bilgilerini Güncelle (Adım 2/3)" : "Tarla Bilgilerini Girin (Adım 2/3)";
      case 2: return isEditMode ? "Envanter Kullanımlarını Güncelle (Adım 3/3)" : "Envanter Kullanımlarını Girin (Adım 3/3)";
      case 3: return isEditMode ? "Sulama Kaydını Onayla ve Bitir" : "Sulama Kaydını Onayla ve Bitir";
      default: return "Sulama Kaydı";
    }
  };

  const getCardDescription = () => {
    switch (currentStep) {
      case 0: return isEditMode ? "Sulama kaydının temel bilgilerini güncelleyin." : "Sulama işleminin temel bilgilerini girin.";
      case 1: return isEditMode ? "Sulama yapılan tarlaları ve sulama yüzdelerini güncelleyin." : "Sulama yapılan tarlaları ve sulama yüzdelerini belirtin.";
      case 2: return isEditMode ? "Sulama sırasında kullanılan envanterleri güncelleyin." : "Sulama sırasında kullanılan envanterleri ve miktarlarını girin.";
      case 3: return "Girilen tüm bilgileri gözden geçirin ve sulama kaydını tamamlayın.";
      default: return "";
    }
  };

  return (
    <div className="max-w-4xl mx-auto cyberpunk-grid">
      {isEditMode && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-700 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Düzenleme modundasınız. Değişikliklerinizi kaydetmek için formu doldurun ve "Değişiklikleri Kaydet" düğmesine tıklayın.
          </p>
        </div>
      )}
      <form onSubmit={(e) => e.preventDefault()}> {/* Form submit'ini manuel yöneteceğiz */}
        <Card className="card-cyberpunk">
          <CardHeader>
            <CardTitle>{getCardTitle()}</CardTitle>
            <CardDescription>{getCardDescription()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 0 && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="date">Sulama Tarihi</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal", !form.watch("date") && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.watch("date") ? format(form.watch("date"), "PPP", { locale: tr }) : <span>Tarih Seçin</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={form.watch("date")} onSelect={(date) => form.setValue("date", date || new Date(), { shouldValidate: true })} initialFocus locale={tr} />
                      </PopoverContent>
                    </Popover>
                    {form.formState.errors.date && <p className="text-sm text-red-500">{form.formState.errors.date.message}</p>}
                  </div>
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="startTime">Başlangıç Saati</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="startTime" type="time" className="pl-10 neon-border neon-glow" {...form.register("startTime")} />
                    </div>
                    {form.formState.errors.startTime && <p className="text-sm text-red-500">{form.formState.errors.startTime.message}</p>}
                  </div>
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="duration">Toplam Sulama Süresi (Dakika)</Label>
                    <Input id="duration" type="number" {...form.register("duration")} className="neon-border neon-glow" />
                    {form.formState.errors.duration && <p className="text-sm text-red-500">{form.formState.errors.duration.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notlar</Label>
                  <Textarea id="notes" {...form.register("notes")} placeholder="Sulama hakkında notlar..." className="neon-border neon-glow" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wellId">Kuyu Seçimi</Label>
                  <Select
                    onValueChange={(value) => form.setValue("wellId", value, { shouldValidate: true })}
                    defaultValue={form.watch("wellId")}
                    disabled={loadingWells}
                  >
                    <SelectTrigger className="neon-border neon-glow"><SelectValue placeholder={loadingWells ? "Kuyular yükleniyor..." : "Kuyu Seçin"} /></SelectTrigger>
                    <SelectContent>
                      {!loadingWells && wells.length === 0 && <p className="p-4 text-sm text-muted-foreground">Uygun kuyu bulunamadı.</p>}
                      {wells.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.wellId && <p className="text-sm text-red-500">{form.formState.errors.wellId.message}</p>}
                </div>
              </>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">Tarla Seçimi</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger>
                        <TooltipContent className="max-w-sm">Her tarla için, o tarlanın ne kadarının sulandığını yüzde olarak belirtin.</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddField} className="btn-cyberpunk"><Plus className="h-4 w-4 mr-2" />Tarla Ekle</Button>
                </div>
                {fieldIrrigations.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-4 items-end border p-4 rounded-md">
                    <div className="col-span-7 space-y-2">
                      <Label htmlFor={`fieldIrrigations.${index}.fieldId`}>Tarla</Label>
                      <Select
                        onValueChange={(value) => form.setValue(`fieldIrrigations.${index}.fieldId`, value, { shouldValidate: true })}
                        defaultValue={form.watch(`fieldIrrigations.${index}.fieldId`)}
                        disabled={loadingFields}
                      >
                        <SelectTrigger className="neon-border neon-glow"><SelectValue placeholder={loadingFields ? "Tarlalar yükleniyor..." : "Tarla Seçin"} /></SelectTrigger>
                        <SelectContent>
                          {!loadingFields && fields.length === 0 && <p className="p-4 text-sm text-muted-foreground">Uygun tarla bulunamadı.</p>}
                          {fields.map((f) => (<SelectItem key={f.id} value={f.id}>{f.name} ({f.size} dekar)</SelectItem>))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.fieldIrrigations?.[index]?.fieldId && <p className="text-sm text-red-500">{form.formState.errors.fieldIrrigations[index]?.fieldId?.message}</p>}
                    </div>
                    <div className="col-span-4 space-y-2">
                      <Label htmlFor={`fieldIrrigations.${index}.percentage`}>Sulanan Alan (%)</Label>
                      <Input id={`fieldIrrigations.${index}.percentage`} type="number" min="1" max="100" {...form.register(`fieldIrrigations.${index}.percentage` as const, { valueAsNumber: true })} className="neon-border neon-glow" />
                      {form.formState.errors.fieldIrrigations?.[index]?.percentage && <p className="text-sm text-red-500">{form.formState.errors.fieldIrrigations[index]?.percentage?.message}</p>}
                    </div>
                    <div className="col-span-1">{index > 0 && <Button type="button" variant="ghost" size="icon" onClick={() => removeField(index)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>}</div>
                  </div>
                ))}
                {form.formState.errors.fieldIrrigations?.root && <p className="text-sm text-red-500">{form.formState.errors.fieldIrrigations.root.message}</p>}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Kullanılan Envanterler</h3>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddUsedInventory} disabled={involvedOwners.length === 0 || loadingInventories} className="btn-cyberpunk">
                    <Plus className="h-4 w-4 mr-2" />Kullanılan Envanteri Ekle
                  </Button>
                </div>
                {involvedOwners.length === 0 && !loadingFields && <div className="p-4 border rounded-md text-center text-gray-500"><p>Lütfen önce envanter eklemek için sulama yapılacak tarlaları seçin.</p></div>}
                {involvedOwners.length > 0 && loadingInventories && <div className="p-4 border rounded-md text-center text-gray-500"><p>İlgili sahiplerin envanterleri yükleniyor...</p></div>}
                {involvedOwners.length > 0 && !loadingInventories && inventories.length === 0 && <div className="p-4 border rounded-md text-center text-gray-500"><p>Seçili tarlaların sahiplerine ait uygun (Gübre/Pestisit) envanter bulunamadı.</p></div>}

                {usedInventories.map((item, index) => {
                  const currentOwnerId = form.watch(`inventoryUsages.${index}.ownerId`);
                  const availableInventoriesForOwner = inventories.filter(inv => {
                    if (!currentOwnerId) return false;
                    return inv.ownerships?.some(own => own.userId === currentOwnerId && own.shareQuantity > 0);
                  });

                  const selectedInventoryDetails = availableInventoriesForOwner.find(inv => inv.id === form.watch(`inventoryUsages.${index}.inventoryId`));
                  const unit = selectedInventoryDetails?.unit || 'Birim';

                  return (
                    <div key={item.id} className="grid grid-cols-12 gap-4 items-start border p-4 rounded-md">
                      <div className="col-span-3 space-y-2">
                        <Label htmlFor={`inventoryUsages.${index}.ownerId`}>Sahip</Label>
                        <Select
                          onValueChange={(value) => {
                            form.setValue(`inventoryUsages.${index}.ownerId`, value, { shouldValidate: true });
                            form.setValue(`inventoryUsages.${index}.inventoryId`, "", { shouldValidate: false });
                            form.setValue(`inventoryUsages.${index}.quantity`, 0, { shouldValidate: false });
                          }}
                          defaultValue={form.watch(`inventoryUsages.${index}.ownerId`)}
                          disabled={involvedOwners.length === 0}
                      >
                        <SelectTrigger className="neon-border neon-glow"><SelectValue placeholder="Sahip Seçin" /></SelectTrigger>
                        <SelectContent>
                          {involvedOwners.map((owner) => (<SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.inventoryUsages?.[index]?.ownerId && <p className="text-sm text-red-500">{form.formState.errors.inventoryUsages[index]?.ownerId?.message}</p>}
                      </div>
                      <div className="col-span-5 space-y-2">
                        <Label htmlFor={`inventoryUsages.${index}.inventoryId`}>Envanter Türü</Label>
                        <Select
                          onValueChange={(value) => form.setValue(`inventoryUsages.${index}.inventoryId`, value, { shouldValidate: true })}
                          defaultValue={form.watch(`inventoryUsages.${index}.inventoryId`)}
                          disabled={!currentOwnerId || loadingInventories || availableInventoriesForOwner.length === 0}
                        >
                          <SelectTrigger className="neon-border neon-glow"><SelectValue placeholder={!currentOwnerId ? "Önce Sahip Seçin" : (loadingInventories ? "Yükleniyor..." : (availableInventoriesForOwner.length === 0 ? "Uygun Envanter Yok" : "Envanter Seçin"))} /></SelectTrigger>
                          <SelectContent>
                            {availableInventoriesForOwner.map((inv) => (
                              <SelectItem key={inv.id} value={inv.id}>
                                {inv.name} (Stok: {inv.ownerships?.find(o => o.userId === currentOwnerId)?.shareQuantity ?? 0} {inv.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.inventoryUsages?.[index]?.inventoryId && <p className="text-sm text-red-500">{form.formState.errors.inventoryUsages[index]?.inventoryId?.message}</p>}
                      </div>
                      <div className="col-span-3 space-y-2">
                        <Label htmlFor={`inventoryUsages.${index}.quantity`}>Bu Stoktan Kullanılacak Miktar ({unit})</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help inline-block ml-1" /></TooltipTrigger>
                            <TooltipContent className="max-w-xs">Seçilen bu spesifik stoktan ne kadar kullanılacağını girin. Bu miktar doğrudan bu sahibin stoğundan düşülecektir.</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Input
                          id={`inventoryUsages.${index}.quantity`}
                          type="number" step="0.01" min="0.01"
                          {...form.register(`inventoryUsages.${index}.quantity` as const, { valueAsNumber: true })}
                          disabled={!form.watch(`inventoryUsages.${index}.inventoryId`)}
                          className="neon-border neon-glow"
                        />
                        {form.formState.errors.inventoryUsages?.[index]?.quantity && <p className="text-sm text-red-500">{form.formState.errors.inventoryUsages[index]?.quantity?.message}</p>}
                      </div>
                      <div className="col-span-1 flex items-end pb-2">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeUsedInventory(index)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {currentStep === 3 && (
              <>
                {displayTotalIrrigatedArea > 0 && (
                  <div className="space-y-4 border p-4 rounded-md bg-gray-50 mt-6">
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
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {displayInventoryDistribution.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium">Hesaplanan Envanter Dağılımı</h4>
                        {displayInventoryDistribution.map((inventoryGroup, groupIndex) => (
                          <div key={groupIndex} className="border rounded-md overflow-hidden mb-4">
                            <div className="bg-gray-100 px-4 py-2">
                              <span className="font-semibold">{inventoryGroup.inventoryName}</span> - Toplam Kullanılan: {inventoryGroup.totalUsed.toFixed(2)} {inventoryGroup.unit}
                            </div>
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sahip</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hesaplanan Pay ({inventoryGroup.unit})</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {inventoryGroup.distribution.map((dist, distIndex) => (
                                  <tr key={distIndex}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{dist.ownerName}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{dist.quantityShare.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between gap-4">
            {currentStep > 0 && (
              <Button type="button" variant="outline" onClick={handleBack} disabled={loadingSubmit} className="btn-cyberpunk">Geri</Button>
            )}
            <div className="flex-grow"></div> {/* Boşluk bırakmak için */}
            {currentStep < 3 && (
              <Button type="button" onClick={handleNext} disabled={loadingSubmit || loadingFields || loadingInventories || loadingWells} className="btn-cyberpunk">İleri</Button>
            )}
            {currentStep === 3 && (
              <Button
                type="button"
                onClick={handleSubmitForm}
                className="btn-cyberpunk"
                disabled={loadingSubmit || loadingFields || loadingInventories || loadingWells}
              >
                {loadingSubmit ? "Kaydediliyor..." : (isEditMode ? "Değişiklikleri Kaydet" : "Kaydet")}
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
