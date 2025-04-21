"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import {
  CalendarIcon,
  Plus,
  Trash,
  Loader2,
  Save,
  LayoutTemplateIcon as Template,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Unit, InventoryCategory } from "@prisma/client";
import { useAuth } from "@/components/auth-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Sezon tipi tanımı
interface Season {
  id: string;
  name: string;
  isActive: boolean;
}

// Partner schema for validation
const partnerSchema = z.object({
  id: z.string().optional(),
  userId: z.string({
    required_error: "Ortak seçilmelidir",
  }),
  userName: z.string().optional(),
  sharePercentage: z.coerce
    .number()
    .min(0.01, "Ortaklık yüzdesi 0'dan büyük olmalıdır")
    .max(100, "Ortaklık yüzdesi 100'den büyük olamaz"),
  hasPaid: z.boolean().default(false),
  dueDate: z.date().optional(),
});

const formSchema = z.object({
  product: z.string().min(2, {
    message: "Ürün adı en az 2 karakter olmalıdır.",
  }),
  category: z.nativeEnum(InventoryCategory, {
    required_error: "Lütfen bir ürün kategorisi seçin.",
  }),
  quantity: z.coerce.number().positive({
    message: "Miktar pozitif bir sayı olmalıdır.",
  }),
  unit: z.nativeEnum(Unit, {
    required_error: "Lütfen bir birim seçin.",
  }),
  unitPrice: z.coerce.number().positive({
    message: "Birim fiyat pozitif bir sayı olmalıdır.",
  }),
  totalCost: z.coerce.number().positive({
    message: "Toplam maliyet pozitif bir sayı olmalıdır.",
  }),
  paymentMethod: z.enum(["CASH", "CREDIT_CARD", "CREDIT", "BANK_TRANSFER"], {
    required_error: "Lütfen bir ödeme yöntemi seçin.",
  }),
  purchaseDate: z.date({
    required_error: "Lütfen bir tarih seçin.",
  }),
  notes: z.string().optional(),
  partners: z.array(partnerSchema).min(1, {
    message: "En az bir ortak eklenmelidir.",
  }),
  isTemplate: z.boolean().default(false),
  templateName: z.string().optional(),
  seasonId: z.string().optional(), // Sezon ID'si eklendi
  approvalRequired: z.boolean().default(false),
  approvalThreshold: z.number().optional(),
});

export function EnhancedPurchaseForm({ templateId }: { templateId?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [seasons, setSeasons] = useState<Season[]>([]); // Sezonlar için state eklendi
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null); // Aktif sezon için state eklendi

  // Initialize form with current user as first partner
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product: "",
      category: InventoryCategory.FERTILIZER, // Varsayılan kategori
      quantity: 0,
      unit: Unit.KG,
      unitPrice: 0,
      totalCost: 0,
      paymentMethod: "CASH",
      purchaseDate: new Date(),
      notes: "",
      isTemplate: false,
      templateName: "",
      seasonId: "", // Sezon ID'si için varsayılan değer
      partners: user
        ? [
            {
              userId: user.id,
              userName: user.name,
              sharePercentage: 100,
              hasPaid: true,
              dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
            },
          ]
        : [],
      approvalRequired: false,
      approvalThreshold: undefined,
    },
  });

  // Setup field array for partners
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "partners",
  });

  // Watch for changes to calculate values
  const quantity = form.watch("quantity");
  const unitPrice = form.watch("unitPrice");
  const partners = form.watch("partners");
  const isTemplate = form.watch("isTemplate");

  // Miktar veya birim fiyat değiştiğinde toplam maliyeti hesapla
  useEffect(() => {
    if (quantity && unitPrice) {
      const totalCost = quantity * unitPrice;
      form.setValue("totalCost", totalCost);
    }
  }, [quantity, unitPrice, form]);

  // Calculate total percentage when partners change
  // 1. Toplam yüzde hesaplamasını düzelt
  useEffect(() => {
    const total = partners.reduce((sum, partner) => {
      // Sayısal değere dönüştürme işlemini güçlendirelim
      const percentage =
        Number.parseFloat(String(partner.sharePercentage)) || 0;
      return sum + percentage;
    }, 0);

    // Virgülden sonra 2 basamak ve sayısal değer olarak saklayalım
    setTotalPercentage(Number(total.toFixed(2)));
  }, [partners]);

  // Fetch users, templates and seasons from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users");
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    const fetchTemplates = async () => {
      try {
        const response = await fetch("/api/purchase-templates");
        if (response.ok) {
          const data = await response.json();
          setTemplates(data);
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
      }
    };

    const fetchSeasons = async () => {
      try {
        const response = await fetch("/api/seasons");
        if (response.ok) {
          const data = await response.json();
          setSeasons(data);

          // Aktif sezonu bul ve form değerini güncelle
          const activeSeason = data.find((season: Season) => season.isActive);
          if (activeSeason) {
            setActiveSeasonId(activeSeason.id);
            form.setValue("seasonId", activeSeason.id);
          }
        }
      } catch (error) {
        console.error("Error fetching seasons:", error);
      }
    };

    fetchUsers();
    fetchTemplates();
    fetchSeasons(); // Sezonları getir
  }, [form]);

  // Fetch template data if templateId is provided
  useEffect(() => {
    if (templateId) {
      const fetchTemplate = async () => {
        try {
          const response = await fetch(`/api/purchase-templates/${templateId}`);
          if (response.ok) {
            const template = await response.json();

            // Form değerlerini şablondan doldur
            form.reset({
              product: template.product,
              quantity: template.quantity,
              unit: template.unit,
              unitPrice: template.unitPrice,
              totalCost: template.totalCost,
              paymentMethod: template.paymentMethod,
              purchaseDate: new Date(),
              notes: template.description,
              isTemplate: false,
              templateName: "",
              seasonId: activeSeasonId || "", // Aktif sezon ID'sini kullan
              partners: template.contributors.map((contributor: any) => ({
                userId: contributor.userId,
                userName: contributor.user.name,
                sharePercentage: contributor.sharePercentage,
                hasPaid: false,
                dueDate: undefined,
              })),
            });
          }
        } catch (error) {
          console.error("Error fetching template:", error);
        }
      };

      fetchTemplate();
    }
  }, [templateId, form, activeSeasonId]);

  // Handle template selection
  const handleTemplateChange = async (templateId: string) => {
    if (!templateId) return;

    setSelectedTemplate(templateId);

    try {
      const response = await fetch(`/api/purchase-templates/${templateId}`);
      if (response.ok) {
        const template = await response.json();

        // Form değerlerini şablondan doldur
        form.reset({
          product: template.product,
          quantity: template.quantity,
          unit: template.unit,
          unitPrice: template.unitPrice,
          totalCost: template.totalCost,
          paymentMethod: template.paymentMethod,
          purchaseDate: new Date(),
          notes: template.description,
          isTemplate: false,
          templateName: "",
          seasonId: activeSeasonId || "", // Aktif sezon ID'sini kullan
          partners: template.contributors.map((contributor: any) => ({
            userId: contributor.userId,
            userName: contributor.user.name,
            sharePercentage: contributor.sharePercentage,
            hasPaid: false,
            dueDate: undefined,
          })),
        });
      }
    } catch (error) {
      console.error("Error fetching template:", error);
    }
  };

  // Add a new partner
  const addPartner = () => {
    append({
      userId: "",
      userName: "",
      sharePercentage: 0,
      hasPaid: false,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 gün sonrası için varsayılan vade
    });

    // Yeni eklenen ortağın görünür olması için daha güvenilir bir yöntem
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  };

  // Distribute remaining percentage
  const distributeRemaining = () => {
    if (fields.length <= 1) return;

    const remainingPercentage = 100 - totalPercentage;
    if (remainingPercentage <= 0) return;

    // Find partners with 0 percentage
    const zeroPartners = partners.filter((p) => p.sharePercentage === 0);

    if (zeroPartners.length > 0) {
      // Distribute equally among partners with 0 percentage
      const sharePerPartner = remainingPercentage / zeroPartners.length;

      partners.forEach((partner, index) => {
        if (partner.sharePercentage === 0) {
          update(index, { ...partner, sharePercentage: sharePerPartner });
        }
      });
    } else {
      // Add to the last partner
      const lastIndex = partners.length - 1;
      update(lastIndex, {
        ...partners[lastIndex],
        sharePercentage:
          partners[lastIndex].sharePercentage + remainingPercentage,
      });
    }
  };

  // Equal distribution
  const distributeEqually = () => {
    if (fields.length === 0) return;

    const equalShare = 100 / fields.length;

    partners.forEach((partner, index) => {
      update(index, { ...partner, sharePercentage: equalShare });
    });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Validate total percentage is 100%
    if (Math.abs(totalPercentage - 100) > 0.01) {
      toast({
        title: "Hata!",
        description: "Ortaklık yüzdelerinin toplamı %100 olmalıdır.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Form işleme fonksiyonunda, "no-season" değerini null olarak işleyelim:
    const seasonId = values.seasonId === "no-season" ? null : values.seasonId;

    try {
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: {
           "Content-Type": "application/json",
         },
         // Rename 'product' to 'productName' to match API expectation
         body: JSON.stringify({ ...values, productName: values.product, seasonId }),
       });

       if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Alış kaydı oluşturulurken bir hata oluştu."
        );
      }

      toast({
        title: "Başarılı!",
        description: values.isTemplate
          ? "Alış şablonu başarıyla oluşturuldu."
          : "Alış kaydı başarıyla oluşturuldu.",
      });

      router.push(
        values.isTemplate
          ? "/dashboard/owner/purchases/templates"
          : "/dashboard/owner/purchases"
      );
      router.refresh();
    } catch (error: any) {
      console.error("Alış oluşturma hatası:", error);
      toast({
        title: "Hata!",
        description:
          error.message || "Alış kaydı oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {templates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Şablon Seçimi</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                onValueChange={handleTemplateChange}
                value={selectedTemplate}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Şablon seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.templateName || template.product}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="product"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ürün Adı</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Örn: Amonyum Sülfat, Tohum, vb."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ürün Kategorisi</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="FERTILIZER">Gübre</SelectItem>
                    <SelectItem value="SEED">Tohum</SelectItem>
                    <SelectItem value="PESTICIDE">İlaç</SelectItem>
                    <SelectItem value="FUEL">Yakıt</SelectItem>
                    <SelectItem value="EQUIPMENT">Ekipman</SelectItem>
                    <SelectItem value="OTHER">Diğer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="purchaseDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Alış Tarihi</FormLabel>
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

          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Miktar</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} />
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
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Birim seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="KG">Kilogram (kg)</SelectItem>
                    <SelectItem value="TON">Ton</SelectItem>
                    <SelectItem value="LITRE">Litre (L)</SelectItem>
                    <SelectItem value="ADET">Adet</SelectItem>
                    <SelectItem value="CUVAL">Çuval</SelectItem>
                    <SelectItem value="BIDON">Bidon</SelectItem>
                    <SelectItem value="PAKET">Paket</SelectItem>
                    <SelectItem value="METRE">Metre (m)</SelectItem>
                    <SelectItem value="METREKARE">Metrekare (m²)</SelectItem>
                    <SelectItem value="DIGER">Diğer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unitPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Birim Fiyat (₺)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="totalCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Toplam Maliyet (₺)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    {...field}
                    readOnly
                    className="bg-muted/50"
                  />
                </FormControl>
                <FormDescription>
                  Miktar × Birim Fiyat otomatik hesaplanır
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ödeme Yöntemi</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Ödeme yöntemi seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="CASH">Nakit</SelectItem>
                    <SelectItem value="CREDIT_CARD">Kredi Kartı</SelectItem>
                    <SelectItem value="CREDIT">Kredi</SelectItem>
                    <SelectItem value="BANK_TRANSFER">
                      Banka Transferi
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sezon seçimi alanı */}
          <FormField
            control={form.control}
            name="seasonId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sezon</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sezon seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {seasons.length === 0 ? (
                      <SelectItem value="no-season" disabled>
                        Sezon bulunamadı
                      </SelectItem>
                    ) : (
                      seasons.map((season) => (
                        <SelectItem key={season.id} value={season.id}>
                          {season.name} {season.isActive && "(Aktif)"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="approvalRequired"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between space-x-3 space-y-0 rounded-md border p-4">
                <div className="space-y-1 leading-none">
                  <FormLabel>Onay Gerekli</FormLabel>
                  <FormDescription>
                    Bu alış için onay gerekip gerekmediğini belirtin
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {form.watch("approvalRequired") && (
            <FormField
              control={form.control}
              name="approvalThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Onay Eşiği (₺)</FormLabel>
                  <FormDescription>
                    Bu tutarın üzerindeki alışlar için onay gerekir
                  </FormDescription>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      {...field}
                      onChange={(e) =>
                        field.onChange(Number.parseFloat(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="isTemplate"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between space-x-3 space-y-0 rounded-md border p-4">
                <div className="space-y-1 leading-none">
                  <FormLabel>Şablon Olarak Kaydet</FormLabel>
                  <FormDescription>
                    Bu alışı şablon olarak kaydedin ve gelecekte tekrar kullanın
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {isTemplate && (
            <FormField
              control={form.control}
              name="templateName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şablon Adı</FormLabel>
                  <FormControl>
                    <Input placeholder="Örn: Aylık Gübre Alışı" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notlar</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Alış hakkında ek bilgiler..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Partners Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Ortaklar</span>
              <div className="text-sm font-normal">
                Toplam:{" "}
                <span
                  className={
                    Math.abs(totalPercentage - 100) < 0.01
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  %{totalPercentage.toFixed(2)}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toplam yüzde 100 değilse uyarı göster */}
            {/* typeof kontrolü eklendi */}
            {typeof totalPercentage === "number" &&
              Math.abs(totalPercentage - 100) > 0.01 && (
                <Alert variant="destructive">
                  <AlertTitle>Dikkat</AlertTitle>
                  <AlertDescription>
                    Ortaklık yüzdelerinin toplamı %100 olmalıdır. Şu anda
                    toplam: %{totalPercentage.toFixed(2)}
                  </AlertDescription>
                </Alert>
              )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={distributeEqually}
              >
                Eşit Dağıt
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={distributeRemaining}
              >
                Kalanı Dağıt
              </Button>
            </div>

            {fields.length === 0 && (
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Henüz ortak eklenmemiş.
                </p>
              </div>
            )}

            {fields.map((field, index) => (
              <div key={field.id} className="rounded-md border p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <FormField
                    control={form.control}
                    name={`partners.${index}.userId`}
                    render={({ field }) => (
                      <FormItem className="partner-select">
                        <FormLabel>Ortak</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Kullanıcı adını da güncelle
                            const selectedUser = users.find(
                              (u) => u.id === value
                            );
                            if (selectedUser) {
                              form.setValue(
                                `partners.${index}.userName`,
                                selectedUser.name
                              );
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Ortak seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent position="popper" className="z-50">
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name}
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
                    name={`partners.${index}.sharePercentage`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ortaklık Yüzdesi (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01" // Ondalık girişi destekler
                            placeholder="Örn: 75.5" // Nokta kullanımı için ipucu
                            {...field}
                            // Zod 'coerce' zaten string'i number'a çevirecek
                          />
                        </FormControl>
                        <FormDescription>
                          Ondalık için nokta (.) kullanın.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`partners.${index}.hasPaid`}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Ödeme Yaptı</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {!form.watch(`partners.${index}.hasPaid`) && (
                    <FormField
                      control={form.control}
                      name={`partners.${index}.dueDate`}
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Vade Tarihi</FormLabel>
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
                            <PopoverContent
                              className="w-auto p-0 z-[100]"
                              align="start"
                              side="bottom"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  if (date) {
                                    field.onChange(date);
                                    console.log("Tarih seçildi:", date);
                                  }
                                }}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Partner actions */}
                  <div className="flex items-center justify-end md:col-span-2 lg:col-span-4">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => remove(index)}
                      disabled={index === 0 && fields.length === 1} // Prevent removing the last partner
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Ortağı Kaldır
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addPartner}>
              <Plus className="mr-2 h-4 w-4" />
              Ortak Ekle
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/owner/purchases")}
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
            ) : isTemplate ? (
              <>
                <Template className="mr-2 h-4 w-4" />
                Şablon Olarak Kaydet
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Kaydet
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
