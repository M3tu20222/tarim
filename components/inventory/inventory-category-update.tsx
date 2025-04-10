"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface InventoryCategoryUpdateProps {
  inventoryId: string;
  currentCategory: string;
}

export function InventoryCategoryUpdate({
  inventoryId,
  currentCategory,
}: InventoryCategoryUpdateProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState(currentCategory);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/inventory/update-category", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inventoryId,
          category,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || "Kategori güncellenirken bir hata oluştu"
        );
      }

      toast({
        title: "Başarılı",
        description: "Kategori başarıyla güncellendi.",
      });

      setIsOpen(false);
      // Sayfayı yenile
      window.location.reload();
    } catch (error: any) {
      console.error("Error updating category:", error);
      toast({
        title: "Hata",
        description:
          error.message || "Kategori güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Kategori Güncelle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Kategori Güncelle</DialogTitle>
          <DialogDescription>
            Envanter kategorisini değiştirmek için aşağıdan yeni kategori seçin.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="col-span-4">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEED">Tohum</SelectItem>
                  <SelectItem value="FERTILIZER">Gübre</SelectItem>
                  <SelectItem value="PESTICIDE">İlaç</SelectItem>
                  <SelectItem value="EQUIPMENT">Ekipman</SelectItem>
                  <SelectItem value="FUEL">Yakıt</SelectItem>
                  <SelectItem value="OTHER">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || category === currentCategory}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Güncelleniyor...
              </>
            ) : (
              "Güncelle"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
