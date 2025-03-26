"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { CalendarIcon, Loader2 } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/components/auth-provider";

// Form şeması
const formSchema = z.object({
  amount: z.coerce.number().positive({
    message: "Borç tutarı pozitif bir sayı olmalıdır.",
  }),
  dueDate: z.date({
    required_error: "Vade tarihi seçilmelidir.",
  }),
  description: z.string().optional(),
  creditorId: z.string({
    required_error: "Alacaklı seçilmelidir.",
  }),
  debtorId: z.string({
    required_error: "Borçlu seçilmelidir.",
  }),
  reason: z.string().optional(),
});

interface DebtFormProps {
  initialData?: {
    id: string;
    amount: number;
    dueDate: Date;
    description?: string;
    creditorId: string;
    debtorId: string;
    reason?: string;
    status: string;
  };
}

export function DebtForm({ initialData }: DebtFormProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form tanımı
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      amount: 0,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 30)), // Varsayılan olarak 30 gün sonra
      description: "",
      creditorId: user?.id || "",
      debtorId: "",
      reason: "",
    },
  });

  // Kullanıcıları getir
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users");
        if (!response.ok) {
          throw new Error("Kullanıcılar yüklenirken bir hata oluştu");
        }
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
        setError(
          "Kullanıcılar yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin."
        );
      }
    };

    fetchUsers();
  }, []);

  // Form gönderme
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setError(null);

    try {
      const url = initialData ? `/api/debts/${initialData.id}` : "/api/debts";
      const method = initialData ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Borç kaydedilirken bir hata oluştu"
        );
      }

      toast({
        title: "Başarılı!",
        description: initialData
          ? "Borç başarıyla güncellendi."
          : "Borç başarıyla oluşturuldu.",
      });

      router.push("/dashboard/owner/debts");
      router.refresh();
    } catch (error: any) {
      console.error("Error saving debt:", error);
      setError(error.message || "Borç kaydedilirken bir hata oluştu");
      toast({
        title: "Hata!",
        description: error.message || "Borç kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Hata</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Borç Tutarı (₺)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Vade Tarihi</FormLabel>
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
                      disabled={(date) => date < new Date()}
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
            name="creditorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alacaklı</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Alacaklı seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.length === 0 ? (
                      <SelectItem value="loading" disabled>
                        Kullanıcılar yükleniyor...
                      </SelectItem>
                    ) : (
                      users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>Borç kime ödenmeli?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="debtorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Borçlu</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Borçlu seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.length === 0 ? (
                      <SelectItem value="loading" disabled>
                        Kullanıcılar yükleniyor...
                      </SelectItem>
                    ) : (
                      users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>Borcu kim ödemeli?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Borç Nedeni</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Borç nedeni seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PURCHASE">Alış</SelectItem>
                    <SelectItem value="LOAN">Kredi</SelectItem>
                    <SelectItem value="SERVICE">Hizmet</SelectItem>
                    <SelectItem value="EQUIPMENT">Ekipman</SelectItem>
                    <SelectItem value="OTHER">Diğer</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>Borç hangi nedenle oluştu?</FormDescription>
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
                  placeholder="Borç hakkında ek bilgiler..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>İsteğe bağlı</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/owner/debts")}
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
              "Oluştur"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
