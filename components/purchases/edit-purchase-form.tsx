"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { CalendarIcon, Plus, Trash, Loader2, Save } from "lucide-react";
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
import { Unit, InventoryCategory } from "@prisma/client"; // Keep Unit enum, Add InventoryCategory
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// Removed NextRequest, NextResponse, prisma imports

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
  category: z.nativeEnum(InventoryCategory, { // Add category field
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
  notes: z.string().optional(),
  partners: z.array(partnerSchema).min(1, {
    message: "En az bir ortak eklenmelidir.",
  }),
  seasonId: z.string().optional(),
  approvalRequired: z.boolean().default(false),
  approvalThreshold: z.number().optional(),
});

// Removed misplaced GET and PUT functions

import { RelatedRecordsPanel } from "@/components/purchases/related-records-panel";

export function EditPurchaseForm({ purchase }: { purchase: any }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [seasons, setSeasons] = useState<Season[] | null>(null);

  // Format partners data from purchase
  const initialPartners = purchase.contributors.map((contributor: any) => ({
    id: contributor.id,
    userId: contributor.userId,
    userName: contributor.user?.name || "",
    sharePercentage: contributor.sharePercentage,
    hasPaid: contributor.hasPaid,
    dueDate: contributor.paymentDate
      ? new Date(contributor.paymentDate)
      : new Date(new Date().setDate(new Date().getDate() + 30)),
  }));

  // Initialize form with purchase data
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product: purchase.product,
      category: purchase.category as InventoryCategory, // Add category default value
      quantity: purchase.quantity,
      unit: purchase.unit as Unit,
      unitPrice: purchase.unitPrice,
      totalCost: purchase.totalCost,
      paymentMethod: purchase.paymentMethod,
      notes: purchase.description || "",
      seasonId: purchase.seasonId || "",
      approvalRequired: purchase.approvalRequired,
      approvalThreshold: purchase.approvalThreshold,
      partners: initialPartners,
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

  // Fetch users and seasons from API
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

    const fetchSeasons = async () => {
      try {
        const response = await fetch("/api/seasons", {
          headers: {
            "x-user-id": typeof window !== "undefined" ? (window as any)?.APP_USER_ID ?? "" : "",
            "x-user-role": typeof window !== "undefined" ? (window as any)?.APP_USER_ROLE ?? "" : "",
          },
        });
        if (response.ok) {
          const data = await response.json();
          // API /api/seasons GET: { data: Season[] }
          const list = Array.isArray(data?.data) ? data.data : [];
          setSeasons(list);
        } else {
          setSeasons([]);
        }
      } catch (error) {
        console.error("Error fetching seasons:", error);
        setSeasons([]);
      }
    };

    fetchUsers();
    fetchSeasons();
  }, []);

  // Add a new partner
  const addPartner = () => {
    append({
      userId: "",
      userName: "",
      sharePercentage: 0,
      hasPaid: false,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
    });

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

    try {
      const response = await fetch(`/api/purchases/${purchase.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Alış kaydı güncellenirken bir hata oluştu."
        );
      }

      toast({
        title: "Başarılı!",
        description: "Alış kaydı başarıyla güncellendi.",
      });

      router.push("/dashboard/owner/purchases");
      router.refresh();
    } catch (error: any) {
      console.error("Alış güncelleme hatası:", error);
      toast({
        title: "Hata!",
        description:
          error.message || "Alış kaydı güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <RelatedRecordsPanel purchaseId={purchase.id} />
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

          {/* Add Category Field Here */}
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
                    {Array.isArray(seasons) && seasons.length === 0 && (
                      <SelectItem value="no-season" disabled>
                        Sezon bulunamadı
                      </SelectItem>
                    )}
                    {Array.isArray(seasons) &&
                      seasons.map((season) => (
                        <SelectItem key={season.id} value={season.id}>
                          {season.name} {season.isActive && "(Aktif)"}
                        </SelectItem>
                      ))}
                    {!Array.isArray(seasons) && (
                      <SelectItem value="loading" disabled>
                        Sezonlar yükleniyor...
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
        <Card className="border border-purple-500/30 rounded-md bg-background/70 backdrop-blur-sm">
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
              <div key={field.id} className="rounded-md border border-purple-500/30 bg-background/60 backdrop-blur-sm p-4">
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
                            step="0.01"
                            placeholder="Örn: 75.5"
                            {...field}
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
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Güncelle
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
    </>
  );
}
