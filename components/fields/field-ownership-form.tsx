"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

// Kullanıcı tipi
interface Owner {
  id: string;
  name: string;
  email: string;
}

// Sahiplik tipi
interface Ownership {
  userId: string;
  percentage: number;
}

interface FieldOwnershipFormProps {
  ownerships: Ownership[];
  onChange: (ownerships: Ownership[]) => void;
}

export function FieldOwnershipForm({
  ownerships = [],
  onChange,
}: FieldOwnershipFormProps) {
  const { toast } = useToast();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [localOwnerships, setLocalOwnerships] = useState<Ownership[]>([]);

  // Prop'tan gelen ownerships değiştiğinde local state'i güncelle
  useEffect(() => {
    setLocalOwnerships(ownerships);
  }, [ownerships]);

  // Owner kullanıcıları getir
  useEffect(() => {
    const fetchOwners = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/users/owners");
        if (response.ok) {
          const data = await response.json();
          setOwners(data);
        } else {
          toast({
            title: "Hata",
            description: "Kullanıcılar yüklenirken bir hata oluştu.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching owners:", error);
        toast({
          title: "Hata",
          description: "Kullanıcılar yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOwners();
  }, [toast]);

  // Sahiplik ekle
  const addOwnership = () => {
    // Kullanılmayan bir kullanıcı bul
    const unusedOwners = owners.filter(
      (owner) => !localOwnerships.some((o) => o.userId === owner.id)
    );

    if (unusedOwners.length === 0) {
      toast({
        title: "Uyarı",
        description: "Tüm kullanıcılar zaten eklenmiş.",
        variant: "destructive",
      });
      return;
    }

    const newOwnership: Ownership = {
      userId: unusedOwners[0].id,
      percentage: 0,
    };

    const updatedOwnerships = [...localOwnerships, newOwnership];
    setLocalOwnerships(updatedOwnerships);
    onChange(updatedOwnerships);
  };

  // Sahiplik sil
  const removeOwnership = (index: number) => {
    const updatedOwnerships = [...localOwnerships];
    updatedOwnerships.splice(index, 1);
    setLocalOwnerships(updatedOwnerships);
    onChange(updatedOwnerships);
  };

  // Kullanıcı değiştir
  const handleUserChange = (index: number, userId: string) => {
    const updatedOwnerships = [...localOwnerships];
    updatedOwnerships[index].userId = userId;
    setLocalOwnerships(updatedOwnerships);
    onChange(updatedOwnerships);
  };

  // Yüzde değiştir
  const handlePercentageChange = (index: number, value: string | number) => {
    // Eğer string ise ve virgül içeriyorsa, virgülü noktaya çevir
    let percentageValue: number;

    if (typeof value === 'string') {
      // Virgülü noktaya çevir
      const normalizedValue = value.replace(',', '.');
      percentageValue = parseFloat(normalizedValue) || 0;
    } else {
      percentageValue = value;
    }

    const updatedOwnerships = [...localOwnerships];
    updatedOwnerships[index].percentage = percentageValue;
    setLocalOwnerships(updatedOwnerships);
    onChange(updatedOwnerships);
  };

  // Toplam yüzde hesapla (sadece yüzdesi 0'dan büyük olanlar için)
  const totalPercentage = localOwnerships
    .filter(o => o.percentage > 0) // Sadece 0'dan büyük olanları hesaba kat
    .reduce((sum, o) => sum + o.percentage, 0);

  // Yuvarlama hatalarını önlemek için toplam yüzdeyi 1 ondalık basamağa yuvarla
  const roundedTotalPercentage = Math.round(totalPercentage * 10) / 10;

  // Kayan nokta hatalarını tolere etmek için küçük bir epsilon değeri
  const epsilon = 0.01;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tarla Sahiplikleri</CardTitle>
        <Button
          onClick={addOwnership}
          disabled={loading || owners.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          Sahip Ekle
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : localOwnerships.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            Henüz sahiplik eklenmemiş. "Sahip Ekle" butonuna tıklayarak tarla
            sahiplerini ekleyin.
          </div>
        ) : (
          <div className="space-y-4">
            {localOwnerships.map((ownership, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex-1">
                  <Select
                    value={ownership.userId}
                    onValueChange={(value) => handleUserChange(index, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kullanıcı seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {owners.map((owner) => (
                        <SelectItem
                          key={owner.id}
                          value={owner.id}
                          disabled={localOwnerships.some(
                            (o, i) => o.userId === owner.id && i !== index
                          )}
                        >
                          {owner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <div className="flex items-center">
                    <Input
                      type="text" // number yerine text kullanarak virgül girişine izin ver
                      inputMode="decimal" // Mobil cihazlarda sayısal klavye göster
                      min="0"
                      max="100"
                      step="0.1"
                      value={ownership.percentage}
                      onChange={(e) =>
                        handlePercentageChange(
                          index,
                          e.target.value // Doğrudan değeri gönder, handlePercentageChange içinde işlenecek
                        )
                      }
                      className={`text-right ${ownership.percentage === 0 ? "border-orange-500" : ""}`}
                      title={ownership.percentage === 0 ? "Yüzde 0 olan sahipler kaydedilmeyecektir" : ""}
                    />
                    <span className="ml-2">%</span>
                  </div>
                  {ownership.percentage === 0 && (
                    <div className="text-xs text-orange-500 mt-1">
                      %0 olan sahipler kaydedilmez
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOwnership(index)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-medium">Toplam:</span>
              <span
                className={`font-bold ${Math.abs(roundedTotalPercentage - 100) > 0.1 ? "text-destructive" : ""}`}
              >
                {roundedTotalPercentage.toFixed(1)}%
                {Math.abs(roundedTotalPercentage - 100) > 0.1 && (
                  <span className="ml-2 text-xs">
                    {roundedTotalPercentage < 100 ? "(Eksik)" : "(Fazla)"}
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
