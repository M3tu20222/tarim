"use client";

import type React from "react";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { UserFormData } from "@/types/user-form-data";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserFormData;
  onUserEdited: () => void;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onUserEdited,
}: EditUserDialogProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "OWNER" | "WORKER">(user.role);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(user.status);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPassword("");
      setRole(user.role);
      setStatus(user.status);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !role || !status) {
      toast({
        title: "Hata",
        description: "Lütfen gerekli alanları doldurun",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Token bulunamadı");
      }

      const updateData: any = {
        name,
        email,
        role,
        status,
      };

      // Şifre alanı doldurulmuşsa ekle
      if (password) {
        updateData.password = password;
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || "Kullanıcı güncellenirken bir hata oluştu"
        );
      }

      toast({
        title: "Başarılı",
        description: "Kullanıcı başarıyla güncellendi",
      });

      // Dialog'u kapat ve tabloyu yenile
      onUserEdited();
    } catch (error: any) {
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
      <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-sm border-purple-500/30">
        <DialogHeader>
          <DialogTitle>Kullanıcı Düzenle</DialogTitle>
          <DialogDescription>
            Kullanıcı bilgilerini güncellemek için aşağıdaki formu doldurun.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Ad Soyad
              </Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">
                E-posta
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-password" className="text-right">
                Şifre
              </Label>
              <Input
                id="edit-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="col-span-3"
                placeholder="Değiştirmek için yeni şifre girin"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">
                Rol
              </Label>
              <Select
                value={role}
                onValueChange={(value: any) => setRole(value)}
              >
                <SelectTrigger id="edit-role" className="col-span-3">
                  <SelectValue placeholder="Rol seçin" />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-sm border-purple-500/30">
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="OWNER">Sahip</SelectItem>
                  <SelectItem value="WORKER">İşçi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-status" className="text-right">
                Durum
              </Label>
              <Select
                value={status}
                onValueChange={(value: any) => setStatus(value)}
              >
                <SelectTrigger id="edit-status" className="col-span-3">
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-sm border-purple-500/30">
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="INACTIVE">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? "Güncelleniyor..." : "Güncelle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
