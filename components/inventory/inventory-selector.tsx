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
// FormLabel removed from here

interface InventorySelectorProps {
  onSelect: (id: string) => void;
  selectedId?: string;
  label?: string;
  required?: boolean;
  category?: string; // Kategori filtresi
  ownerIds?: string[]; // Tarla sahiplerinin ID'leri için eklendi
}

export function InventorySelector({
  onSelect,
  selectedId,
  label = "Envanter",
  required = false,
  category,
  ownerIds, // Yeni prop'u al
}: InventorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | undefined>(selectedId);
  const { toast } = useToast();

  // ownerIds veya category değiştiğinde envanteri yeniden yükle
  useEffect(() => {
    // Loglar kaldırıldı
    // Sadece ownerIds varsa ve boş değilse fetch yap
    if (ownerIds && ownerIds.length > 0) {
      fetchInventory();
    } else {
      // ownerIds yoksa veya boşsa, listeyi temizle ve yüklemeyi durdur
      setInventory([]);
      setLoading(false);
    }
  }, [category, ownerIds]); // ownerIds dependency eklendi

  const fetchInventory = async () => {
    // ownerIds kontrolü useEffect içinde yapıldığı için burada tekrar gerekmez,
    // ama URL oluştururken hala gerekli.
    // API'nin userIds parametresini işlemesi GEREKİR.
    // Örnek: /api/inventory?category=PESTICIDE&status=AVAILABLE&userIds=id1,id2
    if (!ownerIds || ownerIds.length === 0) {
      // Bu durumun oluşmaması gerekir çünkü useEffect kontrol ediyor, ama garanti olsun.
      setInventory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let url = `/api/inventory?status=AVAILABLE`;
      if (category) {
        url += `&category=${category}`;
      }
      // ownerIds varsa ve boş değilse, URL'ye ekle (useEffect'de kontrol edildi ama burada da kalsın)
      url += `&userIds=${ownerIds.join(',')}`; // Virgülle ayrılmış ID listesi

      const response = await fetch(url);
      if (!response.ok) {
        // 404 Not Found durumunu özel olarak ele alabiliriz, belki sahip için envanter yoktur.
        if (response.status === 404) {
          setInventory([]); // Envanter bulunamadı olarak ayarla
        } else {
          throw new Error(`Envanter verileri alınamadı (Status: ${response.status})`);
        }
      }
      const data = await response.json();
      // Gelen verinin bir dizi olduğundan emin olalım
      setInventory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      setInventory([]); // Hata durumunda listeyi boşalt
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
    // Removed the outer div and FormLabel wrapper
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
    // Removed orphaned closing div tag
  );
}
