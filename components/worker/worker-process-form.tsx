"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon, Info } from "lucide-react";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";

// Form şeması
const processFormSchema = z.object({
  date: z.date({
    required_error: "İşlem tarihi gereklidir.",
  }),
  fieldId: z.string({
    required_error: "Tarla seçimi gereklidir.",
  }),
  processType: z.string({
    required_error: "İşlem tipi gereklidir.",
  }),
  description: z.string().optional(),
  totalArea: z.coerce.number().min(0.1, {
    message: "Alan en az 0.1 dekar olmalıdır.",
  }),
  processedArea: z.coerce.number().min(0.1, {
    message: "İşlenen alan en az 0.1 dekar olmalıdır.",
  }),
  processedPercentage: z.coerce
    .number()
    .min(1, {
      message: "İşlenen alan yüzdesi en az 1 olmalıdır.",
    })
    .max(100, {
      message: "İşlenen alan yüzdesi en fazla 100 olabilir.",
    }),
});

type ProcessFormValues = z.infer<typeof processFormSchema>;

// Varsayılan değerler
const defaultValues: Partial<ProcessFormValues> = {
  date: new Date(),
  processedPercentage: 100,
};

interface Field {
  id: string;
  name: string;
  size: number;
  wellId: string;
  seasonId: string;
}

interface Well {
  id: string;
  name: string;
}

interface WorkerProcessFormProps {
  userId: string;
  initialData?: any;
}

export function WorkerProcessForm({
  userId,
  initialData,
}: WorkerProcessFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState<Field[]>([]);
  const [assignedWell, setAssignedWell] = useState<Well | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedField, setSelectedField] = useState<Field | null>(null);

  // Form tanımlama
  const form = useForm<ProcessFormValues>({
    resolver: zodResolver(processFormSchema),
    defaultValues: initialData || defaultValues,
  });

  // Verileri yükle
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);

        // İşçinin atanmış kuyusunu getir
        const wellAssignmentResponse = await fetch(
          `/api/worker/well-assignment?workerId=${userId}`
        );
        const wellAssignmentData = await wellAssignmentResponse.json();

        if (!wellAssignmentData.data) {
          setLoadingData(false);
          return;
        }

        setAssignedWell(wellAssignmentData.data.well);

        // Kuyuya bağlı tarlaları getir
        const fieldsResponse = await fetch(
          `/api/fields?wellId=${wellAssignmentData.data.wellId}`
        );
        const fieldsData = await fieldsResponse.json();
        setFields(fieldsData.data || []);

        setLoadingData(false);
      } catch (error) {
        console.error("Veri yükleme hatası:", error);
        toast({
          title: "Hata",
          description: "Veriler yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
        setLoadingData(false);
      }
    };

    fetchData();
  }, [userId]);

  // Tarla değiştiğinde alanı güncelle
  useEffect(() => {
    const fieldId = form.watch("fieldId");
    if (fieldId) {
      const field = fields.find((f) => f.id === fieldId);
      if (field) {
        setSelectedField(field);
        form.setValue("totalArea", field.size);
        form.setValue("processedArea", field.size);
      }
    }
  }, [form.watch("fieldId"), fields, form]);

  // İşlenen alan yüzdesi değiştiğinde işlenen alanı güncelle
  useEffect(() => {
    const percentage = form.watch("processedPercentage");
    const totalArea = form.watch("totalArea");

    if (percentage && totalArea) {
      const processedArea = (totalArea * percentage) / 100;
      form.setValue(
        "processedArea",
        Number.parseFloat(processedArea.toFixed(2))
      );
    }
  }, [form.watch("processedPercentage"), form.watch("totalArea"), form]);

  // Form gönderme
  const onSubmit = async (data: ProcessFormValues) => {
    if (!assignedWell) {
      toast({
        title: "Hata",
        description:
          "Atanmış kuyu bulunamadı. Lütfen ayarlardan bir kuyu seçin.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // API'ye gönderilecek veriyi hazırla
      const formData = {
        date: data.date.toISOString(),
        fieldId: data.fieldId,
        type: data.processType,
        description: data.description,
        workerId: userId,
        totalArea: data.totalArea,
        processedArea: data.processedArea,
        processedPercentage: data.processedPercentage,
        seasonId: selectedField?.seasonId,
      };

      // API isteği
      const response = await fetch("/api/processes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || "İşlem kaydı oluşturulurken bir hata oluştu."
        );
      }

      toast({
        title: "Başarılı",
        description: "İşlem kaydı başarıyla oluşturuldu.",
      });

      router.push("/dashboard/worker");
      router.refresh();
    } catch (error: any) {
      console.error("Form gönderme hatası:", error);
      toast({
        title: "Hata",
        description:
          error.message || "İşlem kaydı oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!assignedWell) {
    return (
      <Alert className="mb-6">
        <AlertTitle>Atanmış kuyu bulunamadı</AlertTitle>
        <AlertDescription>
          İşlem kaydı oluşturabilmek için önce bir kuyuya atanmanız
          gerekmektedir. Lütfen ayarlar sayfasından bir kuyu seçin.
          <div className="mt-4">
            <Button onClick={() => router.push("/dashboard/worker/settings")}>
              Ayarlara Git
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>İşlem Kaydı Oluştur</CardTitle>
            <CardDescription>
              <span className="font-medium">{assignedWell.name}</span> kuyusuna
              bağlı tarlalar için işlem kaydı oluşturun.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">İşlem Tarihi</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.getValues().date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.getValues().date ? (
                        format(form.getValues().date, "PPP", { locale: tr })
                      ) : (
                        <span>Tarih Seçin</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.getValues().date}
                      onSelect={(date) =>
                        form.setValue("date", date || new Date())
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

              <div className="space-y-2">
                <Label htmlFor="processType">İşlem Tipi</Label>
                <Select
                  onValueChange={(value) => form.setValue("processType", value)}
                  defaultValue={form.getValues().processType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="İşlem Tipi Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLOWING">Sürme (Pulluk)</SelectItem>
                    <SelectItem value="SEEDING">Ekim</SelectItem>
                    <SelectItem value="FERTILIZING">Gübreleme</SelectItem>
                    <SelectItem value="PESTICIDE">İlaçlama</SelectItem>
                    <SelectItem value="HARVESTING">Hasat</SelectItem>
                    <SelectItem value="OTHER">Diğer</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.processType && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.processType.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fieldId">Tarla</Label>
              {fields.length === 0 ? (
                <Alert>
                  <AlertTitle>Tarla bulunamadı</AlertTitle>
                  <AlertDescription>
                    Seçtiğiniz kuyuya bağlı tarla bulunmamaktadır. Lütfen önce
                    tarla ekleyin veya başka bir kuyu seçin.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Select
                    onValueChange={(value) => form.setValue("fieldId", value)}
                    defaultValue={form.getValues().fieldId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tarla Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.name} ({field.size} dekar)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.fieldId && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.fieldId.message}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="İşlem hakkında notlar..."
              />
            </div>

            <div className="space-y-4 border p-4 rounded-md">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">İşlenen Alan Bilgileri</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      Tarlanın ne kadarının işlendiğini belirtin. Yüzdeyi
                      ayarladığınızda işlenen alan otomatik hesaplanacaktır.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalArea">Toplam Alan (dekar)</Label>
                  <Input
                    id="totalArea"
                    type="number"
                    step="0.01"
                    readOnly
                    {...form.register("totalArea", { valueAsNumber: true })}
                  />
                  {form.formState.errors.totalArea && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.totalArea.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="processedArea">İşlenen Alan (dekar)</Label>
                  <Input
                    id="processedArea"
                    type="number"
                    step="0.01"
                    readOnly
                    {...form.register("processedArea", { valueAsNumber: true })}
                  />
                  {form.formState.errors.processedArea && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.processedArea.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="processedPercentage">
                    İşlenen Alan Yüzdesi (%
                    {form.watch("processedPercentage") || 0})
                  </Label>
                </div>
                <Slider
                  id="processedPercentage"
                  min={1}
                  max={100}
                  step={1}
                  value={[form.watch("processedPercentage") || 100]}
                  onValueChange={(value) =>
                    form.setValue("processedPercentage", value[0])
                  }
                />
                {form.formState.errors.processedPercentage && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.processedPercentage.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/worker")}
              disabled={loading}
            >
              İptal
            </Button>
            <Button type="submit" disabled={loading || fields.length === 0}>
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
