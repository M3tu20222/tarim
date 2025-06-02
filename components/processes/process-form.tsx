"use client";

import { useState, useEffect, useMemo } from "react";
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
import { InventoryGroup } from "@/components/processes/inventory-group";

// Sezon tipi tanımı
interface Season {
  id: string;
  name: string;
  isActive: boolean;
}

// Envanter Kategorisi Tipleri (Prisma Enum ile eşleşmeli)
type InventoryCategory = "SEED" | "FERTILIZER" | "PESTICIDE" | "FUEL" | "OTHER";

// Envanter birim tipleri
type Unit = "KG" | "TON" | "LITRE" | "ADET" | "CUVAL" | "BIDON" | "PAKET" | "METRE" | "METREKARE" | "DECARE" | "DONUM" | "HECTARE" | "DIGER";

// Kategori adlarını Türkçeye çevirmek için bir yardımcı obje
const categoryTranslations: Record<InventoryCategory, string> = {
  SEED: "Tohum",
  FERTILIZER: "Gübre",
  PESTICIDE: "İlaç",
  FUEL: "Yakıt",
  OTHER: "Diğer"
};

// Birim adlarını Türkçeye çevirmek için bir yardımcı obje
export const unitTranslations: Record<Unit, string> = {
  KG: "kg",
  TON: "ton",
  LITRE: "litre",
  ADET: "adet",
  CUVAL: "çuval",
  BIDON: "bidon",
  PAKET: "paket",
  METRE: "metre",
  METREKARE: "m²",
  DECARE: "dekar",
  DONUM: "dönüm",
  HECTARE: "hektar",
  DIGER: "diğer"
};

// Form schema for validation - Her adım için ayrı schema
const step1Schema = z.object({
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
});

const step2Schema = z.object({
  equipmentId: z.string().optional().nullable(),
  // inventoryItems artık doğrudan form schema'sında değil, ayrı yönetilecek
});

// Ana form schema, tüm alanları içerir
const masterFormSchema = step1Schema.extend({
  equipmentId: z.string().optional().nullable(),
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

// Helper function to get inventory category based on process type
const getCategoryForProcess = (processType: string): InventoryCategory | undefined => {
  switch (processType) {
    case "PESTICIDE":
      return "PESTICIDE";
    case "FERTILIZING":
      return "FERTILIZER";
    case "SEEDING":
      return "SEED";
    default:
      return undefined;
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
  
  // Yeni envanter grup state'i
  const [inventoryGroups, setInventoryGroups] = useState<Array<{
    id: string; // Unique ID for the group in frontend
    inventoryTypeId: string; // Bu, grubun genel envanter tipi seçimi olabilir (şimdilik kullanılmıyor ama tip uyumluluğu için tutuluyor)
    totalQuantity: number;
    unit: Unit;
    category: InventoryCategory;
    allocations: Array<{ // Her bir sahip için dağıtım ve seçilen envanter tipi
      ownerId: string;
      name: string;
      percentage: number;
      allocatedQuantity: number;
      inventoryTypeId?: string; // Sahip için seçilen envanter tipi
    }>;
  }>>([]);

  const [fieldOwnerships, setFieldOwnerships] = useState<Array<{ 
    id: string; // Added id property
    userId: string; 
    name: string; 
    percentage: number 
  }>>([]);
  const [inventoryTypes, setInventoryTypes] = useState<Array<{ 
    id: string; 
    name: string; 
    category: InventoryCategory; 
    unit: Unit;
    ownerships: Array<{
      id: string;
      userId: string;
      inventoryId: string; // Added missing property
      shareQuantity: number;
      user: {
        id: string;
        name: string;
        email: string;
      };
    }>;
  }>>([]);
  
  const [fuelAvailabilityError, setFuelAvailabilityError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Wizard için yeni state'ler
  const [currentStep, setCurrentStep] = useState(0);
  const [processId, setProcessId] = useState<string | null>(null); // Oluşturulan işlem ID'si

  const form = useForm<z.infer<typeof masterFormSchema>>({
    resolver: zodResolver(masterFormSchema), // Tüm alanları kapsayan schema
    defaultValues: {
      seasonId: "",
      fieldId: "",
      type: "",
      date: new Date(),
      workerId: user?.id || "",
      processedPercentage: 100,
      description: "",
      equipmentId: null,
    }
  });

  // Tarlaları, çalışanları, sahipleri, ekipmanları, sezonları ve envanter tiplerini getir
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fieldsRes, workersRes, ownersRes, equipmentRes, seasonsRes, inventoryTypesRes] = await Promise.all([
          fetch("/api/fields?includeOwnerships=true&fetchAll=true"),
          fetch("/api/users?role=WORKER"),
          fetch("/api/users/owners"),
          fetch("/api/equipment?status=ACTIVE"),
          fetch("/api/seasons?active=true"),
          fetch("/api/inventory?fetchAll=true")
        ]);

        if (fieldsRes.ok) {
            const responseData = await fieldsRes.json();
            setFields(responseData.data || []);
        }
        if (workersRes.ok) setWorkers(await workersRes.json());
        if (ownersRes.ok) setOwners(await ownersRes.json());
        if (equipmentRes.ok) setEquipment(await equipmentRes.json());
        if (seasonsRes.ok) {
            const seasonsData = await seasonsRes.json();
            setSeasons(seasonsData);
            if (seasonsData.length === 1 && !initialData) {
                form.setValue("seasonId", seasonsData[0].id, { shouldValidate: true });
            }
        }
        if (inventoryTypesRes.ok) {
            const inventoryTypesData = await inventoryTypesRes.json();
            setInventoryTypes(inventoryTypesData.data || []);
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
  }, [toast, initialData, form, user?.id]);

  // Formu initialData ile doldur (Edit modu) veya varsayılan değerleri ayarla (New modu)
  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        date: initialData.date ? new Date(initialData.date) : new Date(),
        equipmentId: initialData.equipmentId || null,
      });
      setProcessId(initialData.id);
      
      // Envanter gruplarını yükle (eğer varsa)
      if (initialData.inventoryDistribution) {
        try {
          const distribution = JSON.parse(initialData.inventoryDistribution);
          const loadedGroups = Object.keys(distribution).map(groupIdKey => {
            const groupData = distribution[groupIdKey];
            const inventoryType = inventoryTypes.find(it => it.id === groupData.distributions[0]?.inventoryTypeId);
            const category = inventoryType ? inventoryType.category : "OTHER";
            const allocations = groupData.distributions.map((dist: any) => ({
              ownerId: dist.ownerId,
              name: owners.find(o => o.id === dist.ownerId)?.name || "Bilinmeyen Sahip",
              percentage: owners.find(o => o.id === dist.ownerId)?.percentage || 0,
              allocatedQuantity: dist.quantity,
              inventoryTypeId: dist.inventoryTypeId || ""
            }));
            
            return {
              id: groupIdKey,
              inventoryTypeId: groupData.distributions[0]?.inventoryTypeId || "",
              totalQuantity: groupData.total,
              unit: groupData.unit,
              category,
              allocations
            };
          });
          setInventoryGroups(loadedGroups);
        } catch (e) {
          console.error("Envanter dağıtım verisi okunamadı", e);
        }
      }
    } else {
      form.reset({
        seasonId: seasons.length === 1 ? seasons[0].id : "",
        fieldId: "",
        type: "",
        date: new Date(),
        workerId: user?.id || "",
        processedPercentage: 100,
        description: "",
        equipmentId: null,
      });
      setInventoryGroups([]);
      setProcessId(null);
    }
  }, [initialData, form, user?.id, seasons, inventoryTypes, owners]);

  // Seçilen tarla değiştiğinde state'i ve sahiplik bilgilerini güncelle
  useEffect(() => {
    const fieldId = form.watch("fieldId");
    const field = fields.find((f) => f.id === fieldId);
    setSelectedField(field || null);

    if (field && field.owners) {
      const ownerships = field.owners.map((owner: any) => ({
        id: owner.userId,
        userId: owner.userId,
        name: owner.user.name,
        percentage: owner.percentage
      }));
      setFieldOwnerships(ownerships);
    } else {
      setFieldOwnerships([]);
    }
  }, [form.watch("fieldId"), fields]);

  // Seçilen ekipman değiştiğinde aktif envanter kategorilerini güncelle
  useEffect(() => {
    const equipmentId = form.watch("equipmentId");
    const currentSelectedEquipment = equipment.find((e) => e.id === equipmentId);
    setSelectedEquipment(currentSelectedEquipment || null);

    if (currentSelectedEquipment && currentSelectedEquipment.capabilities) {
      const capabilities: InventoryCategory[] = currentSelectedEquipment.capabilities
        .map((cap: any) => cap.inventoryCategory)
        .filter((category: InventoryCategory) => category !== "FUEL");
      setActiveEquipmentCategories(capabilities);
    } else {
      setActiveEquipmentCategories([]);
    }
  }, [form.watch("equipmentId"), equipment]);

  // Envanter grubu ekle
  const addInventoryGroup = () => {
    const processType = form.watch("type");
    const category = getCategoryForProcess(processType) || "OTHER";
    
    const newGroup = {
      id: Date.now().toString(),
      inventoryTypeId: "",
      totalQuantity: 0,
      unit: "KG" as Unit,
      category,
      allocations: []
    };
    setInventoryGroups([...inventoryGroups, newGroup]);
  };

  // Envanter grubunu kaldır
  const removeInventoryGroup = (groupId: string) => {
    setInventoryGroups(inventoryGroups.filter(group => group.id !== groupId));
  };

  // Envanter grubunu güncelle (totalQuantity, unit, veya allocations)
  const updateInventoryGroup = (groupId: string, updatedFields: Partial<typeof inventoryGroups[0]>) => {
    setInventoryGroups(inventoryGroups.map(group => {
      if (group.id === groupId) {
        return { ...group, ...updatedFields };
      }
      return group;
    }));
  };

  // Adım doğrulama ve ileri gitme
  const handleNext = async () => {
    let isValid = false;
    if (currentStep === 0) {
      isValid = await form.trigger(Object.keys(step1Schema.shape) as (keyof z.infer<typeof step1Schema>)[], { shouldFocus: true });
    } else if (currentStep === 1) {
      isValid = await form.trigger(Object.keys(step2Schema.shape) as (keyof z.infer<typeof step2Schema>)[], { shouldFocus: true });
      // Ek olarak envanter gruplarını da doğrula
      if (inventoryGroups.some(group => group.totalQuantity <= 0 || group.allocations.some(alloc => alloc.allocatedQuantity <= 0 || !alloc.inventoryTypeId))) {
        toast({
          title: "Hata",
          description: "Lütfen tüm envanter gruplarındaki miktarları ve envanter tiplerini doğru girin.",
          variant: "destructive",
        });
        isValid = false;
      }
    }

    if (isValid) {
      if (currentStep === 0) {
        // Adım 1'den sonra API çağrısı (initiate process)
        setIsSubmitting(true);
        setError(null);
        try {
          const values = form.getValues();
          const formData = {
            fieldId: values.fieldId,
            type: values.type,
            date: values.date,
            description: values.description,
            processedPercentage: values.processedPercentage,
            seasonId: values.seasonId,
            workerId: values.workerId,
          };

          const response = await fetch("/api/processes", { // POST /api/processes/initiate yerine /api/processes
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": user?.id || "",
              "x-user-role": user?.role || "",
            },
            body: JSON.stringify(formData),
          });

          if (response.ok) {
            const data = await response.json();
            setProcessId(data.processId);
            toast({
              title: "Başarılı!",
              description: "İşlem taslağı oluşturuldu. Envanter ve ekipman bilgilerini girebilirsiniz.",
            });
            setCurrentStep(currentStep + 1);
          } else {
            const errorData = await response.json();
            console.error("API Error (Initiate):", errorData);
            setError(errorData.error || `Sunucu hatası: ${response.status}`);
            toast({
              title: "Hata!",
              description: errorData.error || "İşlem başlatılırken bir sunucu hatası oluştu.",
              variant: "destructive",
            });
          }
        } catch (err: any) {
          console.error("İşlem başlatma hatası:", err);
          setError("İstemci tarafında bir hata oluştu.");
          toast({
            title: "Hata!",
            description: err.message || "İşlem başlatılırken bir hata oluştu.",
            variant: "destructive",
          });
        } finally {
          setIsSubmitting(false);
        }
      } else if (currentStep === 1) {
        // Adım 2'den sonra API çağrısı (update inventory/equipment)
        setIsSubmitting(true);
        setError(null);
        setFuelAvailabilityError(null);

        if (!processId) {
          setError("İşlem ID'si bulunamadı. Lütfen baştan başlayın.");
          setIsSubmitting(false);
          return;
        }

        // Envanter dağıtım verisini hazırla (JSON olarak saklanacak)
        const inventoryDistributionData: Record<string, {
          total: number;
          unit: Unit;
          distributions: Array<{
            ownerId: string;
            quantity: number;
            inventoryTypeId?: string;
          }>;
        }> = {};

        const finalInventoryItemsForBackend: { 
          inventoryId: string; 
          quantity: number; 
          ownerId: string;
        }[] = [];

        for (const group of inventoryGroups) {
          if (group.totalQuantity > 0 && group.allocations.length > 0) {
            const distributionsForGroup = group.allocations.map(allocation => ({
              ownerId: allocation.ownerId,
              quantity: allocation.allocatedQuantity,
              inventoryTypeId: allocation.inventoryTypeId || ""
            }));

            inventoryDistributionData[group.id] = {
              total: group.totalQuantity,
              unit: group.unit,
              distributions: distributionsForGroup
            };

            group.allocations.forEach(allocation => {
              if (allocation.inventoryTypeId) {
                finalInventoryItemsForBackend.push({
                  inventoryId: allocation.inventoryTypeId,
                  quantity: allocation.allocatedQuantity,
                  ownerId: allocation.ownerId,
                });
              }
            });
          }
        }

        // Yakıt Kontrolü (Ekipman seçiliyse ve yakıt tüketimi varsa)
        const values = form.getValues();
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
            for (const owner of fieldOwners) {
              const ownerInventoryResponse = await fetch(
                `/api/inventory?category=${fuelCategory}&userId=${owner.userId}`,
                { headers: { "x-user-id": user?.id || "", "x-user-role": user?.role || "" } }
              );
              if (ownerInventoryResponse.ok) {
                const ownerInventoryData = await ownerInventoryResponse.json();
                totalAvailableFuel += (ownerInventoryData.data || []).reduce(
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

        // API İsteği için Veriyi Hazırla
        const formData = {
          equipmentId: values.equipmentId === 'none' ? null : values.equipmentId,
          inventoryItems: finalInventoryItemsForBackend,
          inventoryDistribution: JSON.stringify(inventoryDistributionData),
        };

        try {
          const response = await fetch(`/api/processes?processId=${processId}`, { // PUT /api/processes/:processId/inventory-equipment yerine /api/processes?processId=...
            method: "PUT",
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
              description: "Envanter ve ekipman bilgileri kaydedildi. İşlemi sonlandırabilirsiniz.",
            });
            setCurrentStep(currentStep + 1);
          } else {
            const errorData = await response.json();
            console.error("API Error (Update Inventory/Equipment):", errorData);
            setError(errorData.error || `Sunucu hatası: ${response.status}`);
            toast({
              title: "Hata!",
              description: errorData.error || "Envanter ve ekipman bilgileri kaydedilirken bir sunucu hatası oluştu.",
              variant: "destructive",
            });
          }
        } catch (err: any) {
          console.error("Envanter/ekipman kaydetme hatası:", err);
          setError("İstemci tarafında bir hata oluştu.");
          toast({
            title: "Hata!",
            description: err.message || "Envanter ve ekipman bilgileri kaydedilirken bir hata oluştu.",
            variant: "destructive",
          });
        } finally {
          setIsSubmitting(false);
        }
      }
    }
  };

  // Sonlandırma işlemi
  const handleFinalize = async () => {
    setIsSubmitting(true);
    setError(null);

    if (!processId) {
      setError("İşlem ID'si bulunamadı. Lütfen baştan başlayın.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/processes/finalize?processId=${processId}`, { // POST /api/processes/:processId/finalize
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "",
        },
      });

      if (response.ok) {
        toast({
          title: "Başarılı!",
          description: "İşlem başarıyla tamamlandı.",
        });
        router.push("/dashboard/owner/processes");
        router.refresh();
      } else {
        const errorData = await response.json();
        console.error("API Error (Finalize):", errorData);
        setError(errorData.error || `Sunucu hatası: ${response.status}`);
        toast({
          title: "Hata!",
          description: errorData.error || "İşlem sonlandırılırken bir sunucu hatası oluştu.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("İşlem sonlandırma hatası:", err);
      setError("İstemci tarafında bir hata oluştu.");
      toast({
        title: "Hata!",
        description: err.message || "İşlem sonlandırılırken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
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
                      value={field.value || ""}
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
                          .sort((a, b) => a.name.localeCompare(b.name))
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
                        value={[Number(field.value || 0)]}
                        onValueChange={(values) => field.onChange(values[0])}
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
          </>
        );
      case 1:
        return (
          <>
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

            {/* Kullanılan Envanterler - Yeni Grup Yapısı */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Kullanılan Envanterler</span>
                  <Button type="button" variant="outline" size="sm" onClick={addInventoryGroup} disabled={!selectedField}>
                    <Plus className="mr-2 h-4 w-4" /> Yeni Envanter Grubu Ekle
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inventoryGroups.length === 0 ? (
                  <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                    <p className="text-sm text-muted-foreground">
                      Henüz envanter grubu eklenmemiş.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inventoryGroups.map(group => {
                      return (
                        <InventoryGroup
                          key={group.id}
                          group={group}
                          inventoryTypes={inventoryTypes}
                          selectedEquipment={selectedEquipment}
                          activeEquipmentCategories={activeEquipmentCategories}
                          owners={fieldOwnerships}
                          onChange={updateInventoryGroup}
                          onRemove={removeInventoryGroup}
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">İşlem Özeti</h3>
            <p>Lütfen girdiğiniz bilgileri kontrol edin ve işlemi tamamlayın.</p>
            <Card>
              <CardHeader>
                <CardTitle>Temel Bilgiler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Sezon:</strong> {seasons.find(s => s.id === form.getValues("seasonId"))?.name}</p>
                <p><strong>Tarla:</strong> {selectedField?.name} ({selectedField?.size} dekar)</p>
                <p><strong>İşlem Tipi:</strong> {processTypes.find(t => t.value === form.getValues("type"))?.label}</p>
                <p><strong>Tarih:</strong> {format(form.getValues("date"), "PPP", { locale: tr })}</p>
                <p><strong>İşlemi Yapan:</strong> {[...owners, ...workers].find(p => p.id === form.getValues("workerId"))?.name}</p>
                <p><strong>İşlenen Alan Yüzdesi:</strong> %{form.getValues("processedPercentage")}</p>
                <p><strong>İşlenen Alan:</strong> {((selectedField?.size * form.getValues("processedPercentage")) / 100).toFixed(2)} dekar</p>
                {form.getValues("description") && <p><strong>Açıklama:</strong> {form.getValues("description")}</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Ekipman ve Envanter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Kullanılan Ekipman:</strong> {selectedEquipment ? `${selectedEquipment.name} (${selectedEquipment.fuelConsumptionPerDecare} lt/dekar)` : "Yok"}</p>
                {selectedEquipment && selectedField && selectedEquipment.fuelConsumptionPerDecare > 0 &&
                  <p><strong>Tahmini Yakıt Tüketimi:</strong> {((selectedEquipment.fuelConsumptionPerDecare * selectedField.size * form.getValues("processedPercentage")) / 100).toFixed(2)} litre</p>
                }
                <h4 className="font-semibold mt-4">Kullanılan Envanter Grupları:</h4>
                {inventoryGroups.length === 0 ? (
                  <p>Envanter kullanılmadı.</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1">
                    {inventoryGroups.map(group => (
                      <li key={group.id}>
                        {group.totalQuantity} {unitTranslations[group.unit]} {categoryTranslations[group.category]}
                        <ul className="list-circle pl-5 text-sm text-muted-foreground">
                          {group.allocations.map(alloc => (
                            <li key={alloc.ownerId}>
                              {alloc.name}: {alloc.allocatedQuantity} {unitTranslations[group.unit]} ({inventoryTypes.find(it => it.id === alloc.inventoryTypeId)?.name || "Bilinmeyen Envanter Tipi"})
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6"> {/* Form submit'i manuel yönetilecek */}
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

        {/* İlerleme Çubuğu */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / 3) * 100}%` }}
            ></div>
          </div>
          <span className="ml-4 text-sm text-gray-600">Adım {currentStep + 1} / 3</span>
        </div>

        {renderStep()}

        {/* Butonlar */}
        <div className="flex justify-end gap-4">
          {currentStep > 0 && (
            <Button type="button" variant="outline" onClick={handleBack} disabled={isSubmitting}>
              Geri
            </Button>
          )}
          {currentStep < 2 && (
            <Button type="button" onClick={handleNext} disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> İlerle...</>
              ) : "İleri"}
            </Button>
          )}
          {currentStep === 2 && (
            <Button type="button" onClick={handleFinalize} disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Tamamlanıyor...</>
              ) : "Kaydet ve Bitir"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
