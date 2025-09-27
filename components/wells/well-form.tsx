"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import * as z from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";

const numericCoordinate = (label: string) =>
  z
    .preprocess((value) => {
      if (value === "" || value === null || value === undefined) {
        return null;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }, z.number({ invalid_type_error: `${label} sayisal bir deger olmalidir.` }).nullable())
    .optional();

const formSchema = z.object({
  name: z.string().min(2, { message: "Kuyu adi en az 2 karakter olmalidir." }),
  depth: z.coerce.number().positive({ message: "Derinlik pozitif bir sayi olmalidir." }),
  capacity: z.coerce.number().positive({ message: "Kapasite pozitif bir sayi olmalidir." }),
  status: z.string().min(1, { message: "Durum secilmelidir." }),
  latitude: numericCoordinate("Enlem").refine(
    (value) => value === null || value === undefined || (value >= -90 && value <= 90),
    { message: "Enlem -90 ile 90 arasinda olmalidir." }
  ),
  longitude: numericCoordinate("Boylam").refine(
    (value) => value === null || value === undefined || (value >= -180 && value <= 180),
    { message: "Boylam -180 ile 180 arasinda olmalidir." }
  ),
  fieldIds: z.array(z.string()).optional(),
});

export type WellFormValues = z.infer<typeof formSchema>;

interface ApiField {
  id: string;
  name: string;
}

interface WellFormProps {
  wellId?: string;
  defaultValues?: Partial<WellFormValues>;
}

export function WellForm({ wellId, defaultValues }: WellFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [fields, setFields] = useState<ApiField[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(false);

  const form = useForm<WellFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      depth: defaultValues?.depth ?? undefined,
      capacity: defaultValues?.capacity ?? undefined,
      status: defaultValues?.status ?? "ACTIVE",
      latitude: defaultValues?.latitude ?? null,
      longitude: defaultValues?.longitude ?? null,
      fieldIds: defaultValues?.fieldIds ?? [],
    },
  });

  useEffect(() => {
    const run = async () => {
      setIsLoadingFields(true);
      try {
        const response = await fetch("/api/fields?fetchAll=true");
        if (!response.ok) {
          throw new Error("Tarlalar yuklenirken hata olustu.");
        }
        const payload = await response.json();
        if (Array.isArray(payload.data)) {
          setFields(payload.data as ApiField[]);
        } else {
          setFields([]);
        }
      } catch (error) {
        console.error("fields fetch error", error);
        toast({
          title: "Hata",
          description: "Tarlalar yuklenirken bir hata olustu.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingFields(false);
      }
    };
    run();
  }, [toast]);

  const onSubmit = async (values: WellFormValues) => {
    setIsSubmitting(true);
    try {
      const url = wellId ? `/api/wells/${wellId}` : "/api/wells";
      const method = wellId ? "PUT" : "POST";
      const payload = {
        ...values,
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error ?? "Kuyu kaydedilirken bir hata olustu.");
      }

      toast({
        title: "Basarili",
        description: wellId ? "Kuyu guncellendi." : "Kuyu olusturuldu.",
      });

      router.push("/dashboard/owner/wells");
      router.refresh();
    } catch (error) {
      console.error("well save error", error);
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Beklenmedik hata olustu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kuyu adi</FormLabel>
                <FormControl>
                  <Input placeholder="Orn: Merkez Kuyu" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="depth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Derinlik (metre)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kapasite (litre / saat)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </FormControl>
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Durum secin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Aktif</SelectItem>
                    <SelectItem value="INACTIVE">Pasif</SelectItem>
                    <SelectItem value="MAINTENANCE">Bakimda</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Enlem</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    placeholder="38.573794"
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="longitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Boylam</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    placeholder="31.850831"
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="fieldIds"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Tarlalar</FormLabel>
              <Sheet>
                <SheetTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className="w-full justify-start text-left">
                      {field.value && field.value.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {field.value.map((fieldId) => {
                            const matched = fields.find((item) => item.id === fieldId);
                            return matched ? (
                              <Badge key={fieldId} variant="secondary">
                                {matched.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <span>Tarla secin</span>
                      )}
                    </Button>
                  </FormControl>
                </SheetTrigger>
                <SheetContent className="flex flex-col">
                  <SheetHeader>
                    <SheetTitle>Tarlalar</SheetTitle>
                    <SheetDescription>Bu kuyu ile iliskilendirmek istediginiz tarlalari secin.</SheetDescription>
                  </SheetHeader>
                  <ScrollArea className="flex-1">
                    <div className="space-y-2 p-4">
                      {isLoadingFields ? (
                        <p className="text-sm text-muted-foreground">Tarlalar yukleniyor...</p>
                      ) : fields.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Kayitli tarla bulunamadi.</p>
                      ) : (
                        fields.map((item) => (
                          <FormField
                            key={item.id}
                            control={form.control}
                            name="fieldIds"
                            render={({ field: innerField }) => {
                              const currentValue = innerField.value ?? [];
                              const isChecked = currentValue.includes(item.id);
                              return (
                                <FormItem className="flex flex-row items-start space-x-3">
                                  <FormControl>
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          innerField.onChange([...currentValue, item.id]);
                                        } else {
                                          innerField.onChange(currentValue.filter((value) => value !== item.id));
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{item.name}</FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  <SheetFooter>
                    <SheetClose asChild>
                      <Button type="button">Kapat</Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/owner/wells")}
            disabled={isSubmitting}
          >
            Iptal
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
