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
  seasonId: z.string({
    required_error: "Sezon seçimi gereklidir.",
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
          })
          .optional(), // Make percentage optional
        actualIrrigatedArea: z.coerce
          .number()
          .min(0.01, {
            message: "Sulanan alan en az 0.01 dekar olmalıdır.",
          })
          .optional(), // Make actualIrrigatedArea optional
      })
      .refine(
        (data) => data.percentage !== undefined || data.actualIrrigatedArea !== undefined,
        {
          message: "Yüzde veya sulanan alan belirtilmelidir.",
          path: ["percentage"], // Or actualIrrigatedArea, or both
        }
      )
    )
    .min(1, {
      message: "En az bir tarla seçilmelidir.",
    }),
});

/**
 * Adım 2: Envanter Kullanımları Şeması
 * GÜNCEL: owner bazında çoklu stok seçimi ve miktar desteği (fulfillments)
 * allocations: ownerId -> [{ inventoryId, amount }]
 */
const Step2Schema = z.object({
  inventoryGroups: z
    .array(
      z.object({
        inventoryTypeId: z.string({ required_error: "Envanter türü seçilmelidir." }),
        totalQuantity: z.coerce.number().min(0.01, { message: "Miktar en az 0.01 olmalıdır." }),
        allocations: z.record(
          z.array(
            z.object({
              inventoryId: z.string({ required_error: "Stok seçilmelidir." }),
              amount: z.coerce.number().min(0.01, { message: "Miktar en az 0.01 olmalıdır." }),
            })
          ).min(1, { message: "En az bir stok seçilmelidir." })
        ) // ownerId -> [{inventoryId, amount}]
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
  seasonId: "",
  fieldIrrigations: [{ fieldId: "", percentage: 50 }],
  inventoryGroups: [],
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
  category: string; // Eklendi
  totalQuantity: number;
  unitPrice: number;
  ownerships?: {
    userId: string;
    shareQuantity: number;
  }[];
}
type OwnerAllocationItem = { inventoryId: string; amount: number };

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
  percentage?: number;
  irrigatedArea: number;
  actualIrrigatedArea?: number;
  wellId: string | null;
  seasonId: string;
  owners: Field['owners'];
};

interface Well {
  id: string;
  name: string;
}

interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
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
  const [seasons, setSeasons] = useState<Season[]>([]); // Yeni eklenen state
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [involvedOwners, setInvolvedOwners] = useState<InvolvedOwner[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [loadingWells, setLoadingWells] = useState(false);
  const [loadingSeasons, setLoadingSeasons] = useState(false); // Yeni eklenen loading state
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

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form.reset]);

  const {
    fields: fieldIrrigations,
    append: appendField,
    remove: removeField,
  } = useFieldArray({
    control: form.control,
    name: "fieldIrrigations",
  });

  const {
    fields: inventoryGroups,
    append: appendInventoryGroup,
    remove: removeInventoryGroup,
  } = useFieldArray({
    control: form.control,
    name: "inventoryGroups",
  });

  const watchedFieldIrrigations = useWatch({ control: form.control, name: "fieldIrrigations" });

  useEffect(() => {
const fetchFields = async () => {
  setLoadingFields(true);
  try {
    const fieldsRes = await fetch("/api/fields?includeOwnerships=true&fetchAll=true", { credentials: "include" });
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
    const wellsRes = await fetch("/api/wells", { credentials: "include" });
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

const fetchSeasons = async () => { // Yeni sezonları çekme fonksiyonu
  setLoadingSeasons(true);
  try {
    const url = isEditMode ? "/api/seasons?fetchAll=true" : "/api/seasons";
    const seasonsRes = await fetch(url, { credentials: "include" });
        if (!seasonsRes.ok) throw new Error('Sezonlar yüklenemedi');
        const seasonsData = await seasonsRes.json();
        setSeasons(seasonsData.data || []);
      } catch (error: any) {
        console.error("Sezon yükleme hatası:", error);
        toast({ title: "Hata", description: error.message || "Sezonlar yüklenirken bir hata oluştu.", variant: "destructive" });
      } finally {
        setLoadingSeasons(false);
      }
    };
    fetchSeasons();
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
        const inventoriesRes = await fetch(`/api/inventory?category=FERTILIZER,PESTICIDE&includeOwnershipDetails=true&userIds=${ownerIdsParam}`, { credentials: "include" });

        if (inventoriesRes.ok) {
          const inventoriesData = await inventoriesRes.json();
          setInventories(inventoriesData.data || inventoriesData || []);
        } else {
          console.error("Envanterler yüklenemedi:", inventoriesRes.statusText);
          toast({ title: "Hata", description: "Envanterler yüklenirken bir hata oluştu.", variant: "destructive" });
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
      isValid = await form.trigger(["date", "startTime", "duration", "wellId", "seasonId"]); // seasonId eklendi
      if (isValid) {
        const { date, startTime, duration, notes, wellId, seasonId } = form.getValues(); // seasonId eklendi
        const startDate = new Date(date);
        const [hours, minutes] = startTime.split(":").map(Number);
        startDate.setHours(hours, minutes, 0, 0);

        formData = {
          startDateTime: startDate.toISOString(),
          duration,
          notes,
          wellId,
          seasonId, // seasonId eklendi
        };

        setLoadingSubmit(true);
        try {
const response = await fetch("/api/irrigation", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
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

            let irrigatedArea: number;
            if (irrigation.actualIrrigatedArea !== undefined && irrigation.actualIrrigatedArea !== null) {
              irrigatedArea = irrigation.actualIrrigatedArea;
            } else if (irrigation.percentage !== undefined && irrigation.percentage !== null) {
              irrigatedArea = round((field.size * (irrigation.percentage || 0)) / 100);
            } else {
              // This case should ideally be caught by Zod validation, but as a fallback
              return null;
            }

            totalIrrigatedArea += irrigatedArea;

            if (!foundWellId && field.fieldWells?.[0]?.well?.id) {
              foundWellId = field.fieldWells[0].well.id;
            }

            return {
              fieldId: field.id,
              percentage: irrigation.percentage,
              irrigatedArea: round(irrigatedArea),
              actualIrrigatedArea: irrigation.actualIrrigatedArea, // Pass actualIrrigatedArea to API
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
        const formDuration = form.getValues("duration") || 0;
        fieldDataForApi.forEach((fieldDetail) => {
          if (!Array.isArray(fieldDetail.owners)) return;
          fieldDetail.owners.forEach((ownership) => {
            if (!ownership.user) return;
            const ownerIrrigatedArea = (fieldDetail.irrigatedArea * (ownership.percentage || 0)) / 100;
            const ownerDuration = totalIrrigatedArea > 0 ? (formDuration * ownerIrrigatedArea) / totalIrrigatedArea : 0;

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
  credentials: "include",
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
      isValid = await form.trigger("inventoryGroups");
      if (isValid) {
        const { inventoryGroups } = form.getValues();
        const { displayOwnerDurations } = calculatedData;
        let formHasStockError = false;

        type Deduction = { inventoryId: string; quantityUsed: number; unitPrice: number; ownerId: string };
        const inventoryDeductionsForApi: Deduction[] = [];

        // Sahip paylarını önce hesaplayalım (yuvarlama ile)
        const ownersForDistribution = Object.values(displayOwnerDurations).filter(o => o.irrigatedArea > 0);
        const totalArea = ownersForDistribution.reduce((s, o) => s + o.irrigatedArea, 0);

        inventoryGroups?.forEach((group) => {
          if (formHasStockError) return;

          const groupTotal = Number(group.totalQuantity);
          if (isNaN(groupTotal) || groupTotal <= 0) return;

          // Owner'a düşen hedef miktarı
          const ownerTargetMap: Record<string, number> = {};
          let sumDistributed = 0;
          ownersForDistribution.forEach((owner, i) => {
            const share = totalArea > 0 ? groupTotal * (owner.irrigatedArea / totalArea) : 0;
            const finalShare = i === ownersForDistribution.length - 1 ? round(groupTotal - sumDistributed) : round(share);
            sumDistributed += finalShare;
            ownerTargetMap[owner.userId] = finalShare;
          });

          // owner allocations: ownerId -> [{inventoryId, amount}]
          const allocationsRecord = group.allocations || {};
          for (const owner of ownersForDistribution) {
            const target = round(ownerTargetMap[owner.userId] || 0);
            if (target <= 0) continue;

            const items: OwnerAllocationItem[] = (allocationsRecord[owner.userId] as OwnerAllocationItem[]) || [];
            const sumItems = round(items.reduce((s, it) => s + (Number(it.amount) || 0), 0));

            // Doğrulama: toplam eşit olmalı
            if (sumItems !== target) {
              toast({
                title: "Dağıtım Hatası",
                description: `${owner.userName} için girilen stok miktarları (${sumItems}) hedef miktarla (${target}) eşleşmiyor.`,
                variant: "destructive",
              });
              formHasStockError = true;
              break;
            }

            // Her item için stok ve fiyat kontrolü ile deduction'a ekle
            for (const it of items) {
              const inv = inventories.find(v => v.id === it.inventoryId);
              if (!inv) {
                toast({ title: "Hata", description: `Envanter bulunamadı: ${it.inventoryId}`, variant: "destructive" });
                formHasStockError = true;
                break;
              }
              const ownerShare = inv.ownerships?.find(o => o.userId === owner.userId)?.shareQuantity ?? 0;
              if (ownerShare < it.amount) {
                toast({
                  title: "Yetersiz Stok",
                  description: `${owner.userName} için ${inv.name} stoğu yetersiz. (Gereken: ${it.amount}, Mevcut: ${ownerShare})`,
                  variant: "destructive",
                });
                formHasStockError = true;
                break;
              }

              const unitPrice = inv.unitPrice ?? 0;
              inventoryDeductionsForApi.push({
                inventoryId: it.inventoryId,
                quantityUsed: round(it.amount),
                unitPrice: unitPrice,
                ownerId: owner.userId,
              });
            }

            if (formHasStockError) break;
          }
        });

        if (formHasStockError) {
          setLoadingSubmit(false);
          return;
        }

        const formData = { inventoryDeductions: inventoryDeductionsForApi };

        setLoadingSubmit(true);
        try {
          const response = await fetch(`/api/irrigation/${irrigationLogId}/details`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
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
      const { duration, fieldIrrigations, inventoryGroups } = form.getValues();
      const currentDuration = duration || 0;

      // ownerDurationsForApi'yi yeniden hesapla (Finalize API'si için)
      let totalIrrigatedArea = 0;
      const fieldDataForApi = fieldIrrigations
        .map((irrigation): FieldDetailForApi | null => {
          const field = fields.find((f) => f.id === irrigation.fieldId);
          if (!field) return null;
          const percentage = irrigation.percentage || 0;
          const irrigatedArea = (field.size * percentage) / 100;
          totalIrrigatedArea += irrigatedArea;
          return {
            fieldId: field.id,
            percentage: percentage,
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
          const ownerIrrigatedArea = (fieldDetail.irrigatedArea * (ownership.percentage || 0)) / 100;
          const ownerDuration = totalIrrigatedArea > 0 ? (currentDuration * ownerIrrigatedArea) / totalIrrigatedArea : 0;

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

      // Yeni mantık: inventoryGroups'tan veri al
      inventoryGroups?.forEach(group => {
        const inventoryType = inventories.find(inv => inv.id === group.inventoryTypeId);
        if (!inventoryType) return;

        const typeNameKey = inventoryType.name;
        
        if (!aggregatedInventoryUsagesByType.has(typeNameKey)) {
          aggregatedInventoryUsagesByType.set(typeNameKey, {
            inventoryTypeName: inventoryType.name,
            unit: inventoryType.unit,
            totalQuantityUsedThisType: 0,
            totalCostThisType: 0,
            contributingStocks: [],
          });
        }
        
        const currentTypeUsage = aggregatedInventoryUsagesByType.get(typeNameKey)!;
        const groupTotalQuantity = Number(group.totalQuantity) || 0;
        currentTypeUsage.totalQuantityUsedThisType = round(currentTypeUsage.totalQuantityUsedThisType + groupTotalQuantity);

        // Dağıtımı hesapla ve maliyetleri ekle
        const involvedOwnersForDistribution = ownerDurationsForApi.filter(owner => owner.irrigatedArea > 0);
        const relevantTotalIrrigatedArea = involvedOwnersForDistribution.reduce((sum, o) => sum + o.irrigatedArea, 0);
        if(relevantTotalIrrigatedArea <= 0) return;

        let sumOfDistributedQuantities = 0;
        for (let i = 0; i < involvedOwnersForDistribution.length; i++) {
            const owner = involvedOwnersForDistribution[i];
            const ownerSharePercent = owner.irrigatedArea / relevantTotalIrrigatedArea;
            const groupTotalQuantity = Number(group.totalQuantity) || 0;
            let quantityShare = groupTotalQuantity * ownerSharePercent;

            if (i === involvedOwnersForDistribution.length - 1) {
              quantityShare = round(groupTotalQuantity - sumOfDistributedQuantities);
            }
            const roundedQuantityShare = round(quantityShare);
            sumOfDistributedQuantities += roundedQuantityShare;

            // NOT: Finalize önizlemesi için tek stok seçimi varsa onun birim fiyatını kullan
            const allocPrev = Array.isArray(group.allocations?.[owner.userId]) ? (group.allocations?.[owner.userId] as OwnerAllocationItem[]) : [];
            const previewInventoryIdPrev = allocPrev.length === 1 ? allocPrev[0].inventoryId : undefined;
            const inventoryItem = previewInventoryIdPrev ? inventories.find(inv => inv.id === previewInventoryIdPrev) : undefined;
            const unitPrice = inventoryItem?.unitPrice ?? 0;
            const cost = round(roundedQuantityShare * unitPrice);
            
            currentTypeUsage.totalCostThisType += cost;
            // NOT: Finalize önizlemesinde allocations artık dizi. Burada sadece önizleme için,
            // eğer owner için tek stok seçimi varsa onu kullan; yoksa maliyeti 0 kabul et.
            const allocList = Array.isArray(group.allocations?.[owner.userId]) ? (group.allocations?.[owner.userId] as OwnerAllocationItem[]) : [];
            const previewInventoryId2 = allocList.length === 1 ? allocList[0].inventoryId : undefined;
            currentTypeUsage.contributingStocks.push({
              inventoryId: previewInventoryId2 || "N/A",
              ownerId: owner.userId,
              quantity: roundedQuantityShare,
              unitPrice: unitPrice,
              cost: cost,
            });
        }
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

        // Her bir contributingStock için ayrı ayrı maliyet dağılımı yap
        for (const stock of typeUsage.contributingStocks) {
          costAllocationBreakdownForApi.push({
            ownerId: stock.ownerId,
            inventoryTypeName: typeUsage.inventoryTypeName,
            quantityAllocated: stock.quantity,
            costAllocated: stock.cost,
            unit: typeUsage.unit,
          });
        }
      }

      const formData = {
        ownerDurations: ownerDurationsForApi.map(({ userName, ...rest }) => rest),
        costAllocations: costAllocationBreakdownForApi,
      };

const response = await fetch(`/api/irrigation/${irrigationLogId}/finalize`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
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

  const handleAddInventoryGroup = () => {
    appendInventoryGroup({
      inventoryTypeId: "",
      totalQuantity: 0,
      allocations: {},
    });
  };

  // Yardımcı: owner için mevcut payı hesapla (önizlemeye göre)
  const getOwnerShareForGroup = (ownerId: string, groupTotal: number) => {
    const { displayOwnerDurations } = calculatedData;
    const owners = Object.values(displayOwnerDurations).filter(o => o.irrigatedArea > 0);
    const totalArea = owners.reduce((s, o) => s + o.irrigatedArea, 0);
    if (groupTotal <= 0 || totalArea <= 0) return 0;
    const owner = owners.find(o => o.userId === ownerId);
    if (!owner) return 0;
    return round((owner.irrigatedArea / totalArea) * groupTotal);
  };

  const currentValues = form.watch();

  // Önizleme Hesaplamaları (Yeni Dağıtım Mantığı ile)
  const calculatedData = useMemo(() => {
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

        let irrigatedArea: number;
        if (irrigation.actualIrrigatedArea !== undefined && irrigation.actualIrrigatedArea !== null) {
          irrigatedArea = irrigation.actualIrrigatedArea;
        } else if (irrigation.percentage !== undefined && irrigation.percentage !== null) {
          irrigatedArea = round((field.size * (irrigation.percentage || 0)) / 100);
        } else {
          return null; // Should not happen with Zod validation
        }

        calculatedTotalIrrigatedArea += irrigatedArea;
        return { irrigatedArea, owners: field.owners };
      }).filter((item): item is NonNullable<typeof item> => item !== null);

      if (calculatedTotalIrrigatedArea > 0) {
        tempFieldData.forEach(fieldDetail => {
          if (!fieldDetail || !Array.isArray(fieldDetail.owners)) return;
          fieldDetail.owners.forEach(ownership => {
            if (!ownership.user) return;
            const ownerIrrigatedArea = (fieldDetail.irrigatedArea * (ownership.percentage || 0)) / 100;
            const ownerDuration = ((currentValues.duration || 0) * ownerIrrigatedArea) / calculatedTotalIrrigatedArea;
            if (calculatedOwnerDurationsMap[ownership.userId]) {
              calculatedOwnerDurationsMap[ownership.userId].duration += ownerDuration;
              calculatedOwnerDurationsMap[ownership.userId].irrigatedArea += ownerIrrigatedArea;
            } else {
              calculatedOwnerDurationsMap[ownership.userId] = { userId: ownership.userId, userName: ownership.user.name || `User (${ownership.userId})`, duration: ownerDuration, irrigatedArea: ownerIrrigatedArea };
            }
          });
        });
      }

      // Yeni envanter dağıtım mantığı
      if (currentValues.inventoryGroups && inventories.length > 0 && Object.keys(calculatedOwnerDurationsMap).length > 0) {
        const involvedOwnersForDistribution = Object.values(calculatedOwnerDurationsMap).filter(owner => owner.irrigatedArea > 0);
        const relevantTotalIrrigatedArea = involvedOwnersForDistribution.reduce((sum, o) => sum + o.irrigatedArea, 0);

        currentValues.inventoryGroups.forEach(group => {
          const inventoryType = inventories.find(inv => inv.id === group.inventoryTypeId);
          const currentGroupTotalQuantity = Number(group.totalQuantity) || 0; // Ensure it's a number, default to 0

          if (!inventoryType || currentGroupTotalQuantity <= 0 || relevantTotalIrrigatedArea <= 0) return;

          const distribution: { ownerName: string; quantityShare: number }[] = [];
          let sumOfDistributedQuantities = 0;

          for (let i = 0; i < involvedOwnersForDistribution.length; i++) {
            const owner = involvedOwnersForDistribution[i];
            const ownerSharePercent = owner.irrigatedArea / relevantTotalIrrigatedArea;
            let quantityShare = currentGroupTotalQuantity * ownerSharePercent;

            // Son sahip için yuvarlama hatalarını düzelt
            if (i === involvedOwnersForDistribution.length - 1) {
              quantityShare = round(currentGroupTotalQuantity - sumOfDistributedQuantities);
            }

            const roundedQuantityShare = round(quantityShare);
            if (roundedQuantityShare > 0) {
              sumOfDistributedQuantities += roundedQuantityShare;
              distribution.push({
                ownerName: owner.userName,
                quantityShare: roundedQuantityShare,
              });
            }
          }
          
          calculatedInventoryDistribution.push({
            inventoryName: inventoryType.name,
            unit: inventoryType.unit,
            totalUsed: currentGroupTotalQuantity, // Use the already validated number
            distribution: distribution,
          });
        });
      }
    }

    return {
      displayTotalIrrigatedArea: calculatedTotalIrrigatedArea,
      displayOwnerDurations: calculatedOwnerDurationsMap,
      displayInventoryDistribution: calculatedInventoryDistribution,
    };
  }, [currentValues.fieldIrrigations, currentValues.duration, currentValues.inventoryGroups, fields, inventories]);

  const { displayTotalIrrigatedArea, displayOwnerDurations, displayInventoryDistribution } = calculatedData;
  
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
                    <Input id="duration" type="number" {...form.register("duration", { valueAsNumber: true })} className="neon-border neon-glow" />
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
                <div className="space-y-2">
                  <Label htmlFor="seasonId">Sezon Seçimi</Label>
                  <Select
                    onValueChange={(value) => form.setValue("seasonId", value, { shouldValidate: true })}
                    defaultValue={form.watch("seasonId")}
                    disabled={loadingSeasons}
                  >
                    <SelectTrigger className="neon-border neon-glow"><SelectValue placeholder={loadingSeasons ? "Sezonlar yükleniyor..." : "Sezon Seçin"} /></SelectTrigger>
                    <SelectContent>
                      {!loadingSeasons && seasons.length === 0 && <p className="p-4 text-sm text-muted-foreground">Uygun sezon bulunamadı.</p>}
                      {seasons.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name} ({format(new Date(s.startDate), 'dd.MM.yyyy')} - {format(new Date(s.endDate), 'dd.MM.yyyy')})</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.seasonId && <p className="text-sm text-red-500">{form.formState.errors.seasonId.message}</p>}
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
                    <div className="col-span-3 space-y-2">
                      <Label htmlFor={`fieldIrrigations.${index}.percentage`}>Sulanan Alan (%)</Label>
                      <Input
                        id={`fieldIrrigations.${index}.percentage`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        {...form.register(`fieldIrrigations.${index}.percentage` as const, { valueAsNumber: true })}
                        className="neon-border neon-glow"
                        onChange={(e) => {
                          const percentage = parseFloat(e.target.value);
                          const field = fields.find(f => f.id === form.getValues(`fieldIrrigations.${index}.fieldId`));
                          if (field && !isNaN(percentage)) {
                            form.setValue(`fieldIrrigations.${index}.actualIrrigatedArea`, round((field.size * percentage) / 100));
                          } else {
                            form.setValue(`fieldIrrigations.${index}.actualIrrigatedArea`, undefined);
                          }
                          form.setValue(`fieldIrrigations.${index}.percentage`, percentage);
                        }}
                      />
                      {form.formState.errors.fieldIrrigations?.[index]?.percentage && <p className="text-sm text-red-500">{form.formState.errors.fieldIrrigations[index]?.percentage?.message}</p>}
                    </div>
                    <div className="col-span-3 space-y-2">
                      <Label htmlFor={`fieldIrrigations.${index}.actualIrrigatedArea`}>Gerçek Sulanan Alan (Dekar)</Label>
                      <Input
                        id={`fieldIrrigations.${index}.actualIrrigatedArea`}
                        type="number"
                        min="0"
                        step="0.01"
                        {...form.register(`fieldIrrigations.${index}.actualIrrigatedArea` as const, { valueAsNumber: true })}
                        className="neon-border neon-glow"
                        onChange={(e) => {
                          const actualIrrigatedArea = parseFloat(e.target.value);
                          const field = fields.find(f => f.id === form.getValues(`fieldIrrigations.${index}.fieldId`));
                          if (field && !isNaN(actualIrrigatedArea) && field.size > 0) {
                            form.setValue(`fieldIrrigations.${index}.percentage`, round((actualIrrigatedArea / field.size) * 100));
                          } else {
                            form.setValue(`fieldIrrigations.${index}.percentage`, undefined);
                          }
                          form.setValue(`fieldIrrigations.${index}.actualIrrigatedArea`, actualIrrigatedArea);
                        }}
                      />
                      {form.formState.errors.fieldIrrigations?.[index]?.actualIrrigatedArea && <p className="text-sm text-red-500">{form.formState.errors.fieldIrrigations[index]?.actualIrrigatedArea?.message}</p>}
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
                  <Button type="button" variant="outline" size="sm" onClick={handleAddInventoryGroup} disabled={involvedOwners.length === 0} className="btn-cyberpunk">
                    <Plus className="h-4 w-4 mr-2" />Envanter Grubu Ekle
                  </Button>
                </div>
                {inventoryGroups.map((group, index) => {
                  const inventoryType = inventories.find(inv => inv.id === group.inventoryTypeId);
                  const distribution = displayInventoryDistribution.find(d => d.inventoryName === inventoryType?.name)?.distribution || [];
                  
                  return (
                    <div key={group.id} className="p-4 border rounded-md space-y-4">
                      <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-6 space-y-2">
                          <Label>Envanter Türü</Label>
                          <Select
                            onValueChange={(value) => form.setValue(`inventoryGroups.${index}.inventoryTypeId`, value)}
                            defaultValue={group.inventoryTypeId}
                          >
                            <SelectTrigger><SelectValue placeholder="Envanter türü seçin..." /></SelectTrigger>
                            <SelectContent>
                              {inventories
                                .filter(inv => inv.category === 'FERTILIZER' || inv.category === 'PESTICIDE')
                                .map(inv => <SelectItem key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-5 space-y-2">
                          <Label>Toplam Miktar ({inventoryType?.unit || 'Birim'})</Label>
                          <Input
                            type="number"
                            {...form.register(`inventoryGroups.${index}.totalQuantity`)}
                          />
                        </div>
                        <div className="col-span-1 flex items-end">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeInventoryGroup(index)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-md font-medium mb-2">Otomatik Dağıtım ve Stok Seçimi</h4>
                        <div className="border rounded-md overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-transparent">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sahip</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Düşülecek Miktar</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanılacak Stok</th>
                              </tr>
                            </thead>
                            <tbody className="bg-transparent divide-y divide-gray-200">
                              {distribution.map(dist => {
                                const owner = involvedOwners.find(o => o.name === dist.ownerName);
                                if (!owner) return null;

                                // Bu owner için uygun stoklar:
                                // Kural: Eğer owner bu gruptaki stokta ortak DEĞİLSE, bu owner'a AİT (ownerships içinde owner.id olan)
                                // ve ADI inventoryType.name OLMAYAN (yani farklı ÜRE stokları vb.) stokları göster.
                                // Eğer ortaksa, mevcut davranış: sadece aynı adı taşıyan stoklardan seçim yap.
                                const isOwnerInSelectedType = inventories.some(inv => inv.name === inventoryType?.name && inv.ownerships?.some(o => o.userId === owner.id));

                                let ownerInventories: Inventory[] = [];
                                if (!isOwnerInSelectedType) {
                                  // 3. kişi gruptaki stoğa ortak değil → onun diğer uygun stoklarını (aynı kategori ve sahibi kendisi olan, isim fark etmeksizin TERCIHEN farklı adlar) göster
                                  ownerInventories = inventories.filter(inv =>
                                    (inv.category === inventoryType?.category) &&
                                    inv.ownerships?.some(o => o.userId === owner.id) &&
                                    inv.totalQuantity > 0 &&
                                    // Grubun adıyla aynı ismi ELEMINE ET (Üre B_M_1'i hariç tut)
                                    inv.name !== inventoryType?.name
                                  );
                                  // Eğer hiçbir sonuç çıkmazsa, fallback olarak owner'ın aynı kategori tüm stoklarını göster
                                  if (ownerInventories.length === 0) {
                                    ownerInventories = inventories.filter(inv =>
                                      (inv.category === inventoryType?.category) &&
                                      inv.ownerships?.some(o => o.userId === owner.id) &&
                                      inv.totalQuantity > 0
                                    );
                                  }
                                } else {
                                  // Ortak ise mevcut tipteki stokları göster
                                  ownerInventories = inventories.filter(inv =>
                                    inv.name === inventoryType?.name &&
                                    inv.ownerships?.some(o => o.userId === owner.id) &&
                                    inv.totalQuantity > 0
                                  );
                                }

                                // Form state'ten bu owner için mevcut allocation listesi
                                // Mevcut allocations her zaman dizi olmayabilir; güvenli normalize et
                                const rawAlloc = form.getValues(`inventoryGroups.${index}.allocations.${owner.id}`) as unknown;
                                const currentAllocations: OwnerAllocationItem[] = Array.isArray(rawAlloc)
                                  ? rawAlloc as OwnerAllocationItem[]
                                  : [];

                                const ownerRequiredAmount = dist.quantityShare; // Bu kişiye düşen toplam miktar
                                const currentTotalAllocated = round(currentAllocations.reduce((s, a) => s + (Number(a.amount) || 0), 0));
                                const remaining = round(ownerRequiredAmount - currentTotalAllocated);

                                const addAllocationRow = () => {
                                  const path = `inventoryGroups.${index}.allocations.${owner.id}` as const;
                                  const initialArr: OwnerAllocationItem[] = Array.isArray(form.getValues(path))
                                    ? (form.getValues(path) as OwnerAllocationItem[])
                                    : [];
                                  // Varsayılan ilk seçenek: uygun stoklardan ilki
                                  const defaultInvId = ownerInventories[0]?.id || "";
                                  const newItem: OwnerAllocationItem = { inventoryId: defaultInvId, amount: remaining > 0 ? remaining : 0.01 };
                                  form.setValue(path, [...initialArr, newItem], { shouldValidate: true, shouldDirty: true });
                                };

                                const updateAllocation = (rowIdx: number, key: "inventoryId" | "amount", value: string) => {
                                  const path = `inventoryGroups.${index}.allocations.${owner.id}` as const;
                                  const existing = form.getValues(path) as unknown;
                                  const arr: OwnerAllocationItem[] = Array.isArray(existing) ? [...(existing as OwnerAllocationItem[])] : [];
                                  if (!arr[rowIdx]) return;
                                  if (key === "inventoryId") {
                                    arr[rowIdx].inventoryId = value;
                                  } else {
                                    const num = parseFloat(value);
                                    arr[rowIdx].amount = isNaN(num) ? 0 : num;
                                  }
                                  form.setValue(path, arr, { shouldValidate: true, shouldDirty: true });
                                };

                                const removeAllocation = (rowIdx: number) => {
                                  const path = `inventoryGroups.${index}.allocations.${owner.id}` as const;
                                  const existing = form.getValues(path) as unknown;
                                  const arr: OwnerAllocationItem[] = Array.isArray(existing) ? [...(existing as OwnerAllocationItem[])] : [];
                                  if (rowIdx < 0 || rowIdx >= arr.length) return;
                                  arr.splice(rowIdx, 1);
                                  form.setValue(path, arr, { shouldValidate: true, shouldDirty: true });
                                };

                                // Uyarı: owner bu grup stokta ortak değilse, kendi stoklarını seçmesi gerekecek
                                const isOwnerInGroup = ownerInventories.length > 0;

                                return (
                                  <tr key={owner.id}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-green-500 dark:text-green-400">
                                      <div className="flex items-center gap-2">
                                        <span>{dist.ownerName}</span>
                                        {!isOwnerInGroup && (
                                          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300">
                                            Bu kişi bu stokta ortak değil. Kendi stoklarını seçin.
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                      {ownerRequiredAmount.toFixed(2)} {inventoryType?.unit}
                                      {currentTotalAllocated !== ownerRequiredAmount && (
                                        <div className="text-xs mt-1">
                                          <span className={currentTotalAllocated > ownerRequiredAmount ? "text-red-600" : "text-amber-600"}>
                                            Dağıtılan: {currentTotalAllocated.toFixed(2)} • Kalan: {Math.max(0, remaining).toFixed(2)}
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                      <div className="space-y-2">
                                        {currentAllocations.length === 0 && (
                                          <Button type="button" variant="outline" size="sm" onClick={addAllocationRow} className="btn-cyberpunk">
                                            + Stok Ekle
                                          </Button>
                                        )}
                                        {/* Otomatik dağıtım: Tek stok varsa miktarı otomatik doldur ve input'u gizle */}
                                        {currentAllocations.map((row, rowIdx) => {
                                          const selectedInv = inventories.find(inv => inv.id === row.inventoryId);
                                          const ownerShare = selectedInv?.ownerships?.find(o => o.userId === owner.id)?.shareQuantity ?? 0;

                                          const isSingleRow = currentAllocations.length === 1;
                                          const autoAmount = isSingleRow ? ownerRequiredAmount : (row.amount ?? 0);
                                          if (isSingleRow && row.amount !== autoAmount) {
                                            // Tek satırsa otomatik olarak hedef miktarı set et
                                            updateAllocation(rowIdx, "amount", String(autoAmount));
                                          }

                                          return (
                                            <div key={`${owner.id}-${rowIdx}`} className="flex items-center gap-2">
                                              <Select
                                                onValueChange={(value) => updateAllocation(rowIdx, "inventoryId", value)}
                                                defaultValue={row.inventoryId}
                                              >
                                                <SelectTrigger className="w-72"><SelectValue placeholder="Stok Seçin" /></SelectTrigger>
                                                <SelectContent>
                                                  {ownerInventories.map(inv => (
                                                    <SelectItem key={inv.id} value={inv.id}>
                                                      {inv.name} (Mevcut: {inv.ownerships?.find(o => o.userId === owner.id)?.shareQuantity.toFixed(2)})
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>

                                              {/* Tek satırda miktar input'unu gizle, çoklu satırda göster */}
                                              {isSingleRow ? (
                                                <span className="text-sm text-muted-foreground">
                                                  {ownerRequiredAmount.toFixed(2)} {inventoryType?.unit}
                                                </span>
                                              ) : (
                                                <Input
                                                  type="number"
                                                  step="0.01"
                                                  className="w-28"
                                                  value={row.amount ?? 0}
                                                  onChange={(e) => updateAllocation(rowIdx, "amount", e.target.value)}
                                                />
                                              )}

                                              <span className={`text-xs ${autoAmount > ownerShare ? "text-red-600" : "text-muted-foreground"}`}>
                                                Stok: {ownerShare.toFixed(2)}
                                              </span>

                                              {/* Tek satırda sil butonu gösterme; çokluysa göster */}
                                              {!isSingleRow && (
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeAllocation(rowIdx)} className="text-red-500">
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              )}
                                            </div>
                                          );
                                        })}
                                        {currentAllocations.length > 0 && (
                                          <div className="flex items-center gap-2">
                                            <Button type="button" variant="outline" size="sm" onClick={addAllocationRow} className="btn-cyberpunk">
                                              + Stok Ekle
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4 border p-4 rounded-md bg-gray-50 mt-6">
                <h3 className="text-lg font-medium">Hesaplanan Değerler (Önizleme)</h3>
                {displayTotalIrrigatedArea > 0 ? (
                  <>
                    <div className="space-y-2">
                      <h4 className="font-medium">Toplam Sulanan Alan</h4>
                      <p>{displayTotalIrrigatedArea.toFixed(2)} dekar</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Sahip Bazında Sulama Süreleri</h4>
                        {/* Dark tema uyumu: arka planı transparan, sadece sınırları koru */}
                        <div className="rounded-md overflow-hidden border border-border bg-transparent">
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
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-foreground">{round(owner.irrigatedArea).toFixed(2)}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-foreground">{round(owner.duration).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Sulama bilgileri henüz girilmedi veya hesaplanamadı.</p>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium">Hesaplanan Envanter Dağılımı</h4>
                  {displayInventoryDistribution.length > 0 ? (
                    displayInventoryDistribution.map((inventoryGroup, groupIndex) => (
                      <div key={groupIndex} className="border rounded-md overflow-hidden mb-4">
                        <div className="bg-transparent px-4 py-2">
                          <span className="font-semibold">{inventoryGroup.inventoryName}</span> - Toplam Kullanılan: {inventoryGroup.totalUsed.toFixed(2)} {inventoryGroup.unit}
                        </div>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-transparent">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sahip</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hesaplanan Pay ({inventoryGroup.unit})</th>
                            </tr>
                          </thead>
                            <tbody className="bg-transparent divide-y divide-gray-200">
                            {inventoryGroup.distribution.map((dist, distIndex) => (
                              <tr key={distIndex}>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-green-500 dark:text-green-400">{dist.ownerName}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{dist.quantityShare.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Kullanılan envanter bulunamadı.</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between gap-4">
            {currentStep > 0 && (
              <Button type="button" variant="outline" onClick={handleBack} disabled={loadingSubmit} className="btn-cyberpunk">Geri</Button>
            )}
            <div className="flex-grow"></div> {/* Boşluk bırakmak için */}
            {currentStep < 3 && (
              <Button type="button" onClick={handleNext} disabled={loadingSubmit || loadingFields || loadingInventories || loadingWells || loadingSeasons} className="btn-cyberpunk">İleri</Button>
            )}
            {currentStep === 3 && (
              <Button
                type="button"
                onClick={handleSubmitForm}
                className="btn-cyberpunk"
                disabled={loadingSubmit || loadingFields || loadingInventories || loadingWells || loadingSeasons}
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
