"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Send, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/components/ui/use-toast";
import { MultiSelect } from "@/components/ui/multi-select";

interface User {
  id: string;
  name: string;
  role: string;
}

interface NotificationSendFormProps {
  userId?: string;
  role?: string;
}

const formSchema = z.object({
  title: z.string().min(3, {
    message: "Başlık en az 3 karakter olmalıdır.",
  }),
  message: z.string().min(5, {
    message: "Mesaj en az 5 karakter olmalıdır.",
  }),
  type: z.string({
    required_error: "Bildirim türü seçmelisiniz.",
  }),
  recipientType: z.enum(["individual", "role", "all"], {
    required_error: "Alıcı türü seçmelisiniz.",
  }),
  recipients: z.array(z.string()).optional(),
  recipientRole: z.string().optional(),
});

export function NotificationSendForm({
  userId,
  role = "USER",
}: NotificationSendFormProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      message: "",
      type: "GENERAL",
      recipientType: "individual",
      recipients: [],
      recipientRole: "",
    },
  });

  // Kullanıcıları getir
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Hata",
        description: "Kullanıcılar yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Form gönderildiğinde
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);

      const endpoint = "/api/notifications";
      let method = "POST";
      let body: any = {};

      if (
        values.recipientType === "individual" &&
        values.recipients &&
        values.recipients.length > 0
      ) {
        // Tek tek bildirim gönder
        method = "PUT";
        body = {
          notifications: {
            title: values.title,
            message: values.message,
            type: values.type,
          },
          userIds: values.recipients,
        };
      } else if (values.recipientType === "role" && values.recipientRole) {
        // Role göre bildirim gönder
        method = "PUT";
        body = {
          notifications: {
            title: values.title,
            message: values.message,
            type: values.type,
          },
          userRole: values.recipientRole,
        };
      } else if (values.recipientType === "all") {
        // Herkese bildirim gönder
        method = "PUT";
        body = {
          notifications: {
            title: values.title,
            message: values.message,
            type: values.type,
          },
        };
      } else {
        toast({
          title: "Hata",
          description: "Lütfen geçerli alıcı seçin.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: "Bildirim başarıyla gönderildi.",
        });
        router.push("/dashboard/notifications");
      } else {
        const error = await response.json();
        throw new Error(
          error.error || "Bildirim gönderilirken bir hata oluştu."
        );
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      toast({
        title: "Hata",
        description:
          error instanceof Error
            ? error.message
            : "Bildirim gönderilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Bildirim türleri
  const notificationTypes = [
    { value: "GENERAL", label: "Genel" },
    { value: "PAYMENT_DUE", label: "Ödeme Hatırlatma" },
    { value: "TASK_ASSIGNED", label: "Görev Atama" },
    { value: "INVENTORY_LOW", label: "Stok Uyarısı" },
    { value: "SYSTEM_ALERT", label: "Sistem Uyarısı" },
    { value: "IRRIGATION_SCHEDULED", label: "Sulama Planlandı" },
  ];

  // Kullanıcı rolleri
  const userRoles = [
    { value: "ADMIN", label: "Yönetici" },
    { value: "OWNER", label: "Çiftlik Sahibi" },
    { value: "MANAGER", label: "Müdür" },
    { value: "WORKER", label: "Çalışan" },
    { value: "USER", label: "Kullanıcı" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yeni Bildirim</CardTitle>
        <CardDescription>
          Kullanıcılara bildirim göndermek için formu doldurun.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Başlık</FormLabel>
                  <FormControl>
                    <Input placeholder="Bildirim başlığı" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mesaj</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Bildirim mesajı" {...field} />
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
                  <FormLabel>Bildirim Türü</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Bildirim türü seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {notificationTypes.map((type) => (
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
              name="recipientType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Alıcı Türü</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="individual" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Belirli Kullanıcılar
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="role" />
                        </FormControl>
                        <FormLabel className="font-normal">Rol Bazlı</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="all" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Tüm Kullanıcılar
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("recipientType") === "individual" && (
              <FormField
                control={form.control}
                name="recipients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alıcılar</FormLabel>
                    <FormControl>
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={fetchUsers}
                          disabled={loadingUsers}
                          className="mb-2"
                        >
                          {loadingUsers ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Yükleniyor
                            </>
                          ) : (
                            "Kullanıcıları Getir"
                          )}
                        </Button>
                        <MultiSelect
                          options={users.map((user) => ({
                            label: `${user.name} (${user.role})`,
                            value: user.id,
                          }))}
                          value={field.value || []}
                          onChange={field.onChange}
                          // placeholder prop'u MultiSelect bileşeni için geçerli olmadığından kaldırıldı.
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Bildirim göndermek istediğiniz kullanıcıları seçin.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {form.watch("recipientType") === "role" && (
              <FormField
                control={form.control}
                name="recipientRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Rol seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {userRoles.map((userRole) => (
                          <SelectItem
                            key={userRole.value}
                            value={userRole.value}
                          >
                            {userRole.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Bildirim göndermek istediğiniz kullanıcı rolünü seçin.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gönderiliyor
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Bildirim Gönder
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
