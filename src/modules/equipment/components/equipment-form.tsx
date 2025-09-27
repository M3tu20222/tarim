"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";

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
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Form şeması
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Ekipman adı en az 2 karakter olmalıdır.",
  }),
  type: z.string().min(1, {
    message: "Ekipman tipi seçilmelidir.",
  }),
  fuelConsumptionPerDecare: z.coerce.number().min(0, {
    message: "Yakıt tüketimi 0 veya daha büyük olmalıdır.",
  }),
  status: z.string().min(1, {
    message: "Durum seçilmelidir.",
  }),
  description: z.string().optional(),
  capabilities: z.array(z.string()).min(1, {
    message: "En az bir yetenek seçilmelidir.",
  }),
});

// Ekipman tipleri
const equipmentTypes = [
  { value: "SEEDING", label: "Ekim" },
  { value: "TILLAGE", label: "Toprak İşleme" },
  { value: "SPRAYING", label: "İlaçlama" },
  { value: "FERTILIZING", label: "Gübreleme" },
  { value: "HARVESTING", label: "Hasat" },
  { value: "OTHER", label: "Diğer" },
];

// Envanter kategorileri
const inventoryCategories = [
  { value: "SEED", label: "Tohum" },
  { value: "FERTILIZER", label: "Gübre" },
  { value: "PESTICIDE", label: "İlaç" },
  { value: "FUEL", label: "Yakıt" },
  { value: "OTHER", label: "Diğer" },
];

interface EquipmentFormProps {
  initialData?: any;
}

export function EquipmentForm({ initialData }: EquipmentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [ownerships, setOwnerships] = useState<
    { userId: string; ownershipPercentage: number }[]
  >([]);
  const [totalPercentage, setTotalPercentage] = useState(0);

  // Form oluştur
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      type: "",
      fuelConsumptionPerDecare: 0,
      status: "ACTIVE",
      description: "",
      capabilities: [],
    },
  });

  // Kullanıcıları getir
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users/owners");
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  // Sahiplik yüzdelerini hesapla
  useEffect(() => {
    const total = ownerships.reduce(
      (sum, ownership) => sum + ownership.ownershipPercentage,
      0
    );
    setTotalPercentage(total);
  }, [ownerships]);

  // Sahiplik ekle
  const addOwnership = (userId: string, percentage: number) => {
    // Kullanıcı zaten eklenmiş mi kontrol et
    if (ownerships.some((o) => o.userId === userId)) {
      // Var olan sahipliği güncelle
      setOwnerships(
        ownerships.map((o) =>
          o.userId === userId ? { ...o, ownershipPercentage: percentage } : o
        )
      );
    } else {
      // Yeni sahiplik ekle
      setOwnerships([
        ...ownerships,
        { userId, ownershipPercentage: percentage },
      ]);
    }
  };

  // Sahiplik sil
  const removeOwnership = (userId: string) => {
    setOwnerships(ownerships.filter((o) => o.userId !== userId));
  };

  // Form gönderimi
  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Sahiplik toplamı 100 olmalı
    if (totalPercentage !== 100) {
      toast({
        title: "Hata",
        description: "Sahiplik yüzdelerinin toplamı %100 olmalıdır.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const url = initialData
        ? `/api/equipment/${initialData.id}`
        : "/api/equipment";
      const method = initialData ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          ownerships,
        }),
      });

      if (response.ok) {
        toast({
          title: "Başarılı!",
          description: initialData
            ? "Ekipman başarıyla güncellendi."
            : "Ekipman başarıyla eklendi.",
        });
        router.push("/dashboard/owner/equipment");
        router.refresh();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Bir hata oluştu");
      }
    } catch (error: any) {
      console.error("Ekipman kaydetme hatası:", error);
      toast({
        title: "Hata!",
        description: error.message || "Ekipman kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ekipman Adı</FormLabel>
                <FormControl>
                  <Input placeholder="Örn: Traktör, Pulluk, vb." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ekipman Tipi</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Ekipman tipi seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {equipmentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
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
            name="fuelConsumptionPerDecare"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yakıt Tüketimi (lt/dekar)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.1" {...field} />
                </FormControl>
                <FormDescription>
                  Dekar başına yakıt tüketimi (litre)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Durum</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Durum seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Aktif</SelectItem>
                    <SelectItem value="MAINTENANCE">Bakımda</SelectItem>
                    <SelectItem value="INACTIVE">Pasif</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Açıklama</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ekipman hakkında ek bilgiler..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="capabilities"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel>Yetenekler</FormLabel>
                <FormDescription>
                  Bu ekipmanın kullanabileceği envanter kategorilerini seçin
                </FormDescription>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {inventoryCategories.map((category) => (
                  <FormField
                    key={category.value}
                    control={form.control}
                    name="capabilities"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={category.value}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(category.value)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([
                                      ...field.value,
                                      category.value,
                                    ])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== category.value
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {category.label}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Sahiplik Bilgileri</span>
              <div className="text-sm font-normal">
                Toplam:{" "}
                <span
                  className={
                    totalPercentage === 100 ? "text-green-500" : "text-red-500"
                  }
                >
                  %{totalPercentage}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center space-x-4">
                  <div className="flex-1">
                    <p className="font-medium">{user.name}</p>
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={
                        ownerships.find((o) => o.userId === user.id)
                          ?.ownershipPercentage || 0
                      }
                      onChange={(e) =>
                        addOwnership(user.id, Number(e.target.value))
                      }
                      className="text-right"
                    />
                  </div>
                  <div>
                    <span>%</span>
                  </div>
                </div>
              ))}

              {totalPercentage !== 100 && (
                <p className="text-sm text-red-500">
                  Sahiplik yüzdelerinin toplamı %100 olmalıdır. Şu anki toplam:
                  %{totalPercentage}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/owner/equipment")}
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
            ) : initialData ? (
              "Güncelle"
            ) : (
              "Kaydet"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
