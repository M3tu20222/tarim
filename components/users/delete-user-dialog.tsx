"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { UserFormData } from "@/types/user-form-data";
import { AlertTriangleIcon } from "lucide-react";

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserFormData;
  onUserDeleted: () => void;
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  user,
  onUserDeleted,
}: DeleteUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Token bulunamadı");
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
        credentials: "include", // Include cookies with the request
        // headers: {  // Authorization header is no longer needed
        //   Authorization: `Bearer ${token}`,
        // },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Kullanıcı silinirken bir hata oluştu");
      }

      toast({
        title: "Başarılı",
        description: "Kullanıcı başarıyla silindi",
      });

      // Dialog'u kapat ve tabloyu yenile
      onUserDeleted();
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
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangleIcon className="h-5 w-5" />
            Kullanıcı Sil
          </DialogTitle>
          <DialogDescription>
            Bu işlem geri alınamaz. Bu kullanıcıyı silmek istediğinizden emin
            misiniz?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-2">
            <strong>Kullanıcı:</strong> {user.name}
          </p>
          <p className="mb-2">
            <strong>E-posta:</strong> {user.email}
          </p>
          <p>
            <strong>Rol:</strong>{" "}
            {user.role === "ADMIN"
              ? "Admin"
              : user.role === "OWNER"
                ? "Sahip"
                : "İşçi"}
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-purple-500/30"
          >
            İptal
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Siliniyor..." : "Sil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
