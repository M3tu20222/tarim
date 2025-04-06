"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { FormLabel } from "@/components/ui/form";

interface InventorySelectorProps {
  onSelect: (id: string) => void;
  selectedId?: string;
  label?: string;
  required?: boolean;
  category?: string; // Kategori filtresi için eklendi
}

export function InventorySelector({
  onSelect,
  selectedId,
  label = "Envanter",
  required = false,
  category,
}: InventorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | undefined>(selectedId);
  const { toast } = useToast();

  useEffect(() => {
    fetchInventory();
  }, [category]); // Kategori değiştiğinde yeniden yükle

  const fetchInventory = async () => {
    try {
      setLoading(true);
      // Kategori filtresi varsa URL'ye ekle
      const url = category
        ? `/api/inventory?category=${category}&status=AVAILABLE`
        : `/api/inventory?status=AVAILABLE`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Envanter verileri alınamadı");
      }
      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast({
        title: "Hata",
        description: "Envanter verileri yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Kategori enum değerlerini Türkçe etiketlere dönüştür
  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      SEED: "Tohum",
      FERTILIZER: "Gübre",
      PESTICIDE: "İlaç",
      EQUIPMENT: "Ekipman",
      FUEL: "Yakıt",
      OTHER: "Diğer",
    };
    return labels[category] || category;
  };

  const handleSelect = (id: string) => {
    setSelected(id);
    onSelect(id);
    setOpen(false);
  };

  const getSelectedItem = () => {
    return inventory.find((item) => item.id === selected);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <FormLabel
          className={
            required
              ? "after:content-['*'] after:text-red-500 after:ml-0.5"
              : ""
          }
        >
          {label}
        </FormLabel>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selected && getSelectedItem() ? (
              <div className="flex items-center">
                <span>{getSelectedItem()?.name}</span>
                <Badge variant="outline" className="ml-2">
                  {getCategoryLabel(getSelectedItem()?.category)}
                </Badge>
              </div>
            ) : (
              "Envanter seçin"
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0">
          <Command>
            <CommandInput placeholder="Envanter ara..." />
            <CommandList>
              <CommandEmpty>
                {loading ? "Yükleniyor..." : "Envanter bulunamadı."}
              </CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {inventory.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => handleSelect(item.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selected === item.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-1 items-center justify-between">
                      <span>{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {item.totalQuantity} {item.unit}
                        </span>
                        <Badge variant="outline">
                          {getCategoryLabel(item.category)}
                        </Badge>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
