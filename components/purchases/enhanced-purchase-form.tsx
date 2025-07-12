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
import { Unit, InventoryCategory, PaymentMethod } from "@prisma/client";
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
  isCreditor: z.boolean().optional(), // isCreditor alanı eklendi
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
  paymentMethod: z.nativeEnum(PaymentMethod, {
    required_error: "Lütfen bir ödeme yöntemi seçin.",
  }),
  purchaseDate: z.date({
    required_error: "Lütfen bir tarih seçin.",
  }),
  creditorId: z.string({
    required_error: "Ödemeyi yapan kişi seçilmelidir.",
  }),
  creditorPaymentDueDate: z.date().optional(),
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
      creditorId: user?.id || "",
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
              isCreditor: true,
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
  const paymentMethod = form.watch("paymentMethod");
  const creditorPaymentDueDate = form.watch("creditorPaymentDueDate");

  // Miktar veya birim fiyat değiştiğinde toplam maliyeti hesapla
  useEffect(() => {
    if (quantity && unitPrice) {
      const totalCost = quantity * unitPrice;
      form.setValue("totalCost", totalCost);
    }
  }, [quantity, unitPrice, form]);

  // Calculate total percentage when partners change
  useEffect(() => {
    const total = partners.reduce((sum, partner) => {
      const percentage =
        Number.parseFloat(String(partner.sharePercentage)) || 0;
      return sum + percentage;
    }, 0);
    setTotalPercentage(Number(total.toFixed(2)));
  }, [partners]);

  // Fetch users, templates and seasons from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users?role=OWNER");
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
          const responseData = await response.json();
          const seasonsData = responseData.data || []; // API'den gelen 'data' anahtarını kullan
          setSeasons(seasonsData);

          const activeSeason = seasonsData.find((season: Season) => season.isActive);
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
    fetchSeasons();
  }, [form]);

  // Fetch template data if templateId is provided
  useEffect(() => {
    if (templateId) {
      const fetchTemplate = async () => {
        try {
          const response = await fetch(`/api/purchase-templates/${templateId}`);
          if (response.ok) {
            const template = await response.json();
            form.reset({
              product: template.product,
              category: template.category,
              quantity: template.quantity,
              unit: template.unit,
              unitPrice: template.unitPrice,
              totalCost: template.totalCost,
              paymentMethod: template.paymentMethod,
              purchaseDate: new Date(),
              creditorId: user?.id || "",
              notes: template.description,
              isTemplate: false,
              templateName: "",
              seasonId: activeSeasonId || "",
              partners: template.contributors.map((contributor: any) => ({
                userId: contributor.userId,
                userName: contributor.user.name,
                sharePercentage: contributor.sharePercentage,
                hasPaid: false,
                isCreditor: contributor.userId === user?.id,
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
  }, [templateId, form, activeSeasonId, user]);

  // Add a new partner
  const addPartner = () => {
    append({
      userId: "",
      userName: "",
      sharePercentage: 0,
      hasPaid: false,
    });
  };

  // Distribute equally
  const distributeEqually = () => {
    if (fields.length === 0) return;
    const equalShare = 100 / fields.length;
    fields.forEach((_, index) => {
      form.setValue(`partners.${index}.sharePercentage`, equalShare);
    });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (Math.abs(totalPercentage - 100) > 0.01) {
      toast({
        title: "Hata!",
        description: "Ortaklık yüzdelerinin toplamı %100 olmalıdır.",
        variant: "destructive",
      });
      return;
    }

    const finalPartners = values.partners.map(p => ({
      ...p,
      isCreditor: p.userId === values.creditorId,
    }));

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, productName: values.product, partners: finalPartners }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Alış kaydı oluşturulamadı.");
      }

      toast({ title: "Başarılı!", description: "Alış kaydı başarıyla oluşturuldu." });
      router.push("/dashboard/owner/purchases");
      router.refresh();
    } catch (error: any) {
      toast({ title: "Hata!", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Form content */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField control={form.control} name="product" render={({ field }) => (<FormItem><FormLabel>Ürün Adı</FormLabel><FormControl><Input placeholder="Örn: Amonyum Sülfat" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>Ürün Kategorisi</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Kategori seçin" /></SelectTrigger></FormControl><SelectContent><SelectItem value="FERTILIZER">Gübre</SelectItem><SelectItem value="SEED">Tohum</SelectItem><SelectItem value="PESTICIDE">İlaç</SelectItem><SelectItem value="FUEL">Yakıt</SelectItem><SelectItem value="EQUIPMENT">Ekipman</SelectItem><SelectItem value="OTHER">Diğer</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="purchaseDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Alış Tarihi</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}>{field.value ? format(field.value, "PPP", { locale: tr }) : <span>Tarih seçin</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>Miktar</FormLabel><FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="unit" render={({ field }) => (<FormItem><FormLabel>Birim</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Birim seçin" /></SelectTrigger></FormControl><SelectContent><SelectItem value="KG">Kilogram (kg)</SelectItem><SelectItem value="TON">Ton</SelectItem><SelectItem value="LITRE">Litre (L)</SelectItem><SelectItem value="ADET">Adet</SelectItem><SelectItem value="CUVAL">Çuval</SelectItem><SelectItem value="BIDON">Bidon</SelectItem><SelectItem value="PAKET">Paket</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="unitPrice" render={({ field }) => (<FormItem><FormLabel>Birim Fiyat (₺)</FormLabel><FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="totalCost" render={({ field }) => (<FormItem><FormLabel>Toplam Maliyet (₺)</FormLabel><FormControl><Input type="number" min="0" step="0.01" {...field} readOnly className="bg-muted/50" /></FormControl><FormDescription>Miktar × Birim Fiyat</FormDescription><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="paymentMethod" render={({ field }) => (<FormItem><FormLabel>Ödeme Yöntemi</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Ödeme yöntemi seçin" /></SelectTrigger></FormControl><SelectContent><SelectItem value="CASH">Nakit</SelectItem><SelectItem value="CREDIT_CARD">Kredi Kartı</SelectItem><SelectItem value="CREDIT">Kredi</SelectItem><SelectItem value="BANK_TRANSFER">Banka Transferi</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
          
          <FormField control={form.control} name="creditorId" render={({ field }) => (<FormItem><FormLabel>Ödemeyi Yapan (Alacaklı)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Ödemeyi yapan ortağı seçin" /></SelectTrigger></FormControl><SelectContent>{users.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}</SelectContent></Select><FormDescription>Diğer ortaklar bu kişiye borçlanacaktır.</FormDescription><FormMessage /></FormItem>)} />

          {(paymentMethod === "CREDIT" || paymentMethod === "CREDIT_CARD") && (
            <FormField control={form.control} name="creditorPaymentDueDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Alacaklının Son Ödeme Tarihi</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}>{field.value ? format(field.value, "PPP", { locale: tr }) : <span>Tarih seçin</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus /></PopoverContent></Popover><FormDescription>Kredi kartı ekstresi gibi, alacaklının bu alım için yapacağı son ödeme tarihini girin.</FormDescription><FormMessage /></FormItem>)} />
          )}
        </div>

        <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notlar</FormLabel><FormControl><Textarea placeholder="Alış hakkında ek bilgiler..." {...field} /></FormControl><FormMessage /></FormItem>)} />
        
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between"><span>Ortaklar</span><div className="text-sm font-normal">Toplam: <span className={Math.abs(totalPercentage - 100) < 0.01 ? "text-green-500" : "text-red-500"}>%{totalPercentage.toFixed(2)}</span></div></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={distributeEqually}>Eşit Dağıt</Button></div>
            {fields.map((field, index) => {
              const isDueDateDisabled = (paymentMethod === "CREDIT" || paymentMethod === "CREDIT_CARD") && !!creditorPaymentDueDate;
              return (
              <div key={field.id} className="rounded-md border p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <FormField control={form.control} name={`partners.${index}.userId`} render={({ field }) => (<FormItem><FormLabel>Ortak</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Ortak seçin" /></SelectTrigger></FormControl><SelectContent>{users.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name={`partners.${index}.sharePercentage`} render={({ field }) => (<FormItem><FormLabel>Ortaklık Yüzdesi (%)</FormLabel><FormControl><Input type="number" min="0" max="100" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name={`partners.${index}.hasPaid`} render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Ödeme Yaptı</FormLabel></div></FormItem>)} />
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
                                className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                                disabled={isDueDateDisabled}
                              >
                                {field.value ? format(field.value, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-[100]" align="start">
                            <Calendar 
                              mode="single" 
                              selected={field.value} 
                              onSelect={field.onChange} 
                              disabled={(date) => date < new Date() || isDueDateDisabled}
                              initialFocus 
                            />
                          </PopoverContent>
                        </Popover>
                        {isDueDateDisabled && <FormDescription>Merkezi vade tarihi girildiği için bu alan devre dışıdır.</FormDescription>}
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  )}
                  <div className="flex items-center justify-end md:col-span-2 lg:col-span-4"><Button type="button" variant="destructive" size="sm" onClick={() => remove(index)} disabled={fields.length === 1}><Trash className="mr-2 h-4 w-4" />Ortağı Kaldır</Button></div>
                </div>
              </div>
              );
            })}
            <Button type="button" variant="outline" onClick={addPartner}><Plus className="mr-2 h-4 w-4" />Ortak Ekle</Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>İptal</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Kaydediliyor...</> : <><Save className="mr-2 h-4 w-4" />Kaydet</>}</Button>
        </div>
      </form>
    </Form>
  );
}
