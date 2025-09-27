"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Edit, Eye, Filter, Search, Trash, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Ekipman tipi enum değerlerini Türkçe etiketlere dönüştür
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    SEEDING: "Ekim",
    TILLAGE: "Toprak İşleme",
    SPRAYING: "İlaçlama",
    FERTILIZING: "Gübreleme",
    HARVESTING: "Hasat",
    OTHER: "Diğer",
  };
  return labels[type] || type;
}

// Durum enum değerlerini Türkçe etiketlere dönüştür
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Aktif",
    MAINTENANCE: "Bakımda",
    INACTIVE: "Pasif",
  };
  return labels[status] || status;
}

// Ekipman tipleri
const equipmentTypes = [
  { value: "SEEDING", label: "Ekim" },
  { value: "TILLAGE", label: "Toprak İşleme" },
  { value: "SPRAYING", label: "İlaçlama" },
  { value: "FERTILIZING", label: "Gübreleme" },
  { value: "HARVESTING", label: "Hasat" },
  { value: "OTHER", label: "Diğer" },
];

// Ekipman durumları
const equipmentStatuses = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "MAINTENANCE", label: "Bakımda" },
  { value: "INACTIVE", label: "Pasif" },
];

export function EquipmentTable() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Filtreleme ve arama durumları
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [owners, setOwners] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchEquipment();
    fetchOwners();
  }, []);

  // Filtreleme ve arama işlevi
  useEffect(() => {
    let result = [...equipment];

    // Tipe göre filtrele
    if (selectedTypes.length > 0) {
      result = result.filter((item) => selectedTypes.includes(item.type));
    }

    // Duruma göre filtrele
    if (selectedStatuses.length > 0) {
      result = result.filter((item) => selectedStatuses.includes(item.status));
    }

    // Sahipliğe göre filtrele
    if (selectedOwners.length > 0) {
      result = result.filter((item) =>
        item.ownerships.some((ownership: any) =>
          selectedOwners.includes(ownership.user.id)
        )
      );
    }

    // Ada göre ara
    if (searchTerm) {
      result = result.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEquipment(result);
  }, [equipment, selectedTypes, selectedStatuses, selectedOwners, searchTerm]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/equipment");
      if (!response.ok) {
        throw new Error("Ekipman verileri alınamadı");
      }
      const data = await response.json();
      setEquipment(data);
      setFilteredEquipment(data);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      toast({
        title: "Hata",
        description: "Ekipman verileri yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Sahip kullanıcıları getir
  const fetchOwners = async () => {
    try {
      const response = await fetch("/api/users/owners");
      if (!response.ok) {
        throw new Error("Sahip kullanıcıları alınamadı");
      }
      const data = await response.json();
      setOwners(data);
    } catch (error) {
      console.error("Error fetching owners:", error);
      toast({
        title: "Hata",
        description: "Sahip kullanıcıları yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  // Filtreleri temizle
  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setSelectedOwners([]);
    setSearchTerm("");
    setShowSearchInput(false);
    setFilteredEquipment(equipment);
  };

  // Ekipman silme
  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/equipment/${deleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Ekipman silinirken bir hata oluştu"
        );
      }

      toast({
        title: "Başarılı",
        description: "Ekipman başarıyla silindi.",
      });

      // Ekipmanı listeden kaldır
      const updatedEquipment = equipment.filter((item) => item.id !== deleteId);
      setEquipment(updatedEquipment);
      setFilteredEquipment(updatedEquipment);
    } catch (error: any) {
      console.error("Error deleting equipment:", error);
      toast({
        title: "Hata",
        description: error.message || "Ekipman silinirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Tip seçimini değiştir
  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Durum seçimini değiştir
  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  // Sahip seçimini değiştir
  const toggleOwner = (ownerId: string) => {
    setSelectedOwners((prev) =>
      prev.includes(ownerId)
        ? prev.filter((o) => o !== ownerId)
        : [...prev, ownerId]
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div className="flex flex-wrap gap-2">
              {/* Filtre butonu ve dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtrele
                    {(selectedTypes.length > 0 ||
                      selectedStatuses.length > 0) && (
                      <Badge
                        variant="secondary"
                        className="ml-2 px-1 rounded-full"
                      >
                        {selectedTypes.length +
                          selectedStatuses.length +
                          selectedOwners.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Ekipman Tipi</DropdownMenuLabel>
                  {equipmentTypes.map((type) => (
                    <DropdownMenuCheckboxItem
                      key={type.value}
                      checked={selectedTypes.includes(type.value)}
                      onCheckedChange={() => toggleType(type.value)}
                    >
                      {type.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Durum</DropdownMenuLabel>
                  {equipmentStatuses.map((status) => (
                    <DropdownMenuCheckboxItem
                      key={status.value}
                      checked={selectedStatuses.includes(status.value)}
                      onCheckedChange={() => toggleStatus(status.value)}
                    >
                      {status.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Sahipler</DropdownMenuLabel>
                  {owners.map((owner) => (
                    <DropdownMenuCheckboxItem
                      key={owner.id}
                      checked={selectedOwners.includes(owner.id)}
                      onCheckedChange={() => toggleOwner(owner.id)}
                    >
                      {owner.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Arama butonu ve input */}
              {showSearchInput ? (
                <div className="flex items-center border rounded-md">
                  <Input
                    type="text"
                    placeholder="Ekipman ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-0 h-9"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSearchTerm("");
                      setShowSearchInput(false);
                    }}
                    className="h-9 w-9"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSearchInput(true)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Ara
                </Button>
              )}

              {/* Filtreleri temizle butonu */}
              {(selectedTypes.length > 0 ||
                selectedStatuses.length > 0 ||
                searchTerm) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Temizle
                </Button>
              )}
            </div>

            {/* Aktif filtre bilgisi */}
            {(selectedTypes.length > 0 ||
              selectedStatuses.length > 0 ||
              selectedOwners.length > 0 ||
              searchTerm) && (
              <div className="text-sm text-muted-foreground">
                {filteredEquipment.length} sonuç bulundu
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ekipman Adı</TableHead>
              <TableHead>Tipi</TableHead>
              <TableHead>Yakıt Tüketimi</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Son Güncelleme</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Ekipmanlar yükleniyor...
                </TableCell>
              </TableRow>
            ) : filteredEquipment.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {equipment.length === 0
                    ? "Henüz ekipman kaydı bulunmuyor."
                    : "Arama kriterlerine uygun ekipman bulunamadı."}
                </TableCell>
              </TableRow>
            ) : (
              filteredEquipment.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{getTypeLabel(item.type)}</TableCell>
                  <TableCell>
                    {item.fuelConsumptionPerDecare} lt/dekar
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        item.status === "ACTIVE"
                          ? "bg-green-500/10 text-green-500 border-green-500"
                          : item.status === "MAINTENANCE"
                            ? "bg-yellow-500/10 text-yellow-500 border-yellow-500"
                            : "bg-gray-500/10 text-gray-500 border-gray-500"
                      }
                    >
                      {getStatusLabel(item.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(item.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" asChild>
                        <Link href={`/dashboard/owner/equipment/${item.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="outline" size="icon" asChild>
                        <Link
                          href={`/dashboard/owner/equipment/${item.id}/edit`}
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Ekipmanı silmek istediğinize emin misiniz?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Bu ekipman ve ilişkili tüm kullanım
              verileri kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Siliniyor..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
