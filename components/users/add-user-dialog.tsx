"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";

const formSchema = z.object({
  name: z.string().min(2, { message: "Ad en az 2 karakter olmalıdır" }),
  email: z.string().email({ message: "Geçerli bir e-posta adresi giriniz" }),
  password: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır" }),
  role: z.enum(["ADMIN", "OWNER", "WORKER"], {
    required_error: "Lütfen bir rol seçin",
  }),
  status: z.enum(["ACTIVE", "INACTIVE"], {
    required_error: "Lütfen bir durum seçin",
  }),
});

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserAdded: () => void;
}

export function AddUserDialog({
  open,
  onOpenChange,
  onUserAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserAdded: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      console.log("Gönderilen veri:", values); // Şifrenin düz metin olduğunu kontrol et
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values), // values.password düz metin olmalı
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Kullanıcı eklenirken hata oluştu");
      }

      toast({
        title: "Başarılı!",
        description: "Kullanıcı başarıyla eklendi.",
      });

      form.reset();
      onUserAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Kullanıcı eklenirken hata:", error);
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad Soyad</FormLabel>
                  <FormControl>
                    <Input placeholder="Ad Soyad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-posta</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="E-posta" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şifre</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Şifre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
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
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="OWNER">Sahip</SelectItem>
                      <SelectItem value="WORKER">Çalışan</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="INACTIVE">Pasif</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? "Ekleniyor..." : "Ekle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
