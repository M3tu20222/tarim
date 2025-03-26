"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { CalendarIcon, Plus, Trash, Loader2 } from "lucide-react";
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
import { Unit, InventoryCategory } from "@prisma/client";
import { useAuth } from "@/components/auth-provider";
import { Switch } from "@/components/ui/switch";

// Ürün kategorisi için enum - Prisma'dan InventoryCategory kullanıyoruz
type ProductCategory = InventoryCategory;

// Partner schema for validation
const partnerSchema = z.object({
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

// formSchema'ya category alanını ekleyelim
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
  saveAsTemplate: z.boolean().default(false),
  templateName: z.string().optional(),
  partners: z.array(partnerSchema).min(1, {
    message: "En az bir ortak eklenmelidir.",
  }),
});

// Kullanıcı tipi
interface User {
  id: string;
  name: string;
  role: string;
}

export function NewPurchaseForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  // Initialize form with current user as first partner
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product: "",
      category: "FERTILIZER" as InventoryCategory,
      quantity: 0,
      unit: Unit.KG,
      unitPrice: 0,
      totalCost: 0,
      paymentMethod: "CASH",
      purchaseDate: new Date(),
      notes: "",
      saveAsTemplate: false,
      templateName: "",
      partners: user
        ? [
            {
              userId: user.id,
              userName: user.name,
              sharePercentage: 100,
              hasPaid: true,
            },
          ]
        : [],
    },
  });

  // Setup field array for partners
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "partners",
  });

  // Watch for changes to calculate values
  const quantity = form.watch("quantity");
  const unitPrice = form.watch("unitPrice");
  const partners = form.watch("partners");
  const saveAsTemplateValue = form.watch("saveAsTemplate");

  // Miktar veya birim fiyat değiştiğinde toplam maliyeti hesapla
  useEffect(() => {
    if (quantity && unitPrice) {
      const totalCost = quantity * unitPrice;
      form.setValue("totalCost", totalCost);
    }
  }, [quantity, unitPrice, form]);

  // Calculate total percentage when partners change
  useEffect(() => {
    const total = partners.reduce(
      (sum: number, partner: any) => sum + (partner.sharePercentage || 0),
      0
    );
    setTotalPercentage(total);
  }, [partners]);

  // Update saveAsTemplate state when form value changes
  useEffect(() => {
    setSaveAsTemplate(saveAsTemplateValue);
  }, [saveAsTemplateValue]);

  // Fetch users from API - sadece OWNER rolündeki kullanıcıları getir
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        console.log("Fetching OWNER users from API...");
        const response = await fetch("/api/users?role=OWNER");
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        console.log("Fetched users:", data);
        if (Array.isArray(data) && data.length > 0) {
          setUsers(data as User[]);
        } else {
          console.warn(
            "API returned empty or invalid user data, using mock data"
          );
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Kullanıcılar yüklenemedi",
          description:
            "Ortak listesi yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [toast]);

  // Eşit dağıtma fonksiyonu
  const distributeEqually = () => {
    if (fields.length === 0) return;

    const equalShare = 100 / fields.length;
    const roundedShare = Math.floor(equalShare * 100) / 100; // İki ondalık basamağa yuvarla

    fields.forEach((_, index) => {
      form.setValue(`partners.${index}.sharePercentage`, roundedShare);
    });
  };

  // Kalanı dağıtma fonksiyonu
  const distributeRemaining = () => {
    if (fields.length <= 1) return;

    // İlk ortak hariç diğerlerinin toplam yüzdesini hesapla
    const otherPartnersTotal = partners
      .slice(1)
      .reduce(
        (sum: number, partner: any) => sum + (partner.sharePercentage || 0),
        0
      );

    // İlk ortağa kalan yüzdeyi ata
    const remainingPercentage = 100 - otherPartnersTotal;
    form.setValue(
      `partners.0.sharePercentage`,
      remainingPercentage > 0 ? remainingPercentage : 0
    );
  };

  // Add a new partner
  const addPartner = () => {
    append({
      userId: "",
      userName: "",
      sharePercentage: 0,
      hasPaid: false,
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
    try {
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Alış kaydı oluşturulurken bir hata oluştu."
        );
      }

      toast({
        title: "Başarılı!",
        description: "Alış kaydı başarıyla oluşturuldu.",
      });

      router.push("/dashboard/owner/purchases");
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
                    <SelectItem value="FEED">Besleme</SelectItem>
                    <SelectItem value="PESTICIDE">İlaç</SelectItem>
                    <SelectItem value="FUEL">Yakıt</SelectItem>
                    <SelectItem value="SEED">Tohum</SelectItem>
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
        </div>

        <FormField
          control={form.control}
          name="saveAsTemplate"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Şablon Olarak Kaydet
                </FormLabel>
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

        {saveAsTemplate && (
          <FormField
            control={form.control}
            name="templateName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Şablon Adı</FormLabel>
                <FormControl>
                  <Input placeholder="Örn: Aylık Gübre Alışı" {...field} />
                </FormControl>
                <FormDescription>
                  Şablonu kolayca bulabilmek için bir isim verin
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
                    totalPercentage === 100 ? "text-green-500" : "text-red-500"
                  }
                >
                  %{totalPercentage.toFixed(2)}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
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
                      <FormItem>
                        <FormLabel>Ortak</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Ortak seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingUsers ? (
                              <SelectItem value="loading" disabled>
                                Yükleniyor...
                              </SelectItem>
                            ) : users.length > 0 ? (
                              users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-data" disabled>
                                Kullanıcı bulunamadı
                              </SelectItem>
                            )}
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
                            step="0.01"
                            {...field}
                          />
                        </FormControl>
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
                                  variant={"outline"}
                                  className={`w-full pl-3 text-left font-normal ${
                                    !field.value ? "text-muted-foreground" : ""
                                  }`}
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
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
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
            ) : (
              "Kaydet"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
