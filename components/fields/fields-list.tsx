"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Edit,
  Eye,
  Filter,
  Search,
  Trash,
  X,
  MapPin,
  User,
  DropletIcon,
} from "lucide-react";
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

// Tarla tipi
interface Field {
  id: string;
  name: string;
  location: string;
  size: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  seasonId: string | null;
  season?: {
    id: string;
    name: string;
  };
  owners: {
    id: string;
    userId: string;
    percentage: number;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }[];
  // Güncellendi: wells -> fieldWells
  fieldWells: { 
    well: {
      id: string;
      name: string;
      status: string;
    };
  }[];
  processingLogs?: {
    id: string;
    date: string;
    processType: string;
  }[];
}

// Sahip tipi
interface Owner {
  id: string;
  name: string;
}

// Kuyu tipi
interface Well {
  id: string;
  name: string;
  status: string;
}

// İşlem tipi
interface ProcessType {
  value: string;
  label: string;
}

export default function FieldsList() {
  const [fields, setFields] = useState<Field[]>([]);
  const [filteredFields, setFilteredFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Filtreleme ve arama durumları
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [selectedWells, setSelectedWells] = useState<string[]>([]);
  const [selectedProcessTypes, setSelectedProcessTypes] = useState<string[]>(
    []
  );
  const [owners, setOwners] = useState<Owner[]>([]);
  const [wells, setWells] = useState<Well[]>([]);

  // İşlem tipleri
  const processTypes: ProcessType[] = [
    { value: "PLOWING", label: "Sürme" },
    { value: "SEEDING", label: "Ekim" },
    { value: "FERTILIZING", label: "Gübreleme" },
    { value: "PESTICIDE", label: "İlaçlama" },
    { value: "HARVESTING", label: "Hasat" },
    { value: "OTHER", label: "Diğer" },
  ];

  useEffect(() => {
    fetchFields();
    fetchOwners();
    fetchWells();
  }, []);

  // Filtreleme ve arama işlevi
  useEffect(() => {
    let result = [...fields];

    // İsme göre ara
    if (searchTerm) {
      result = result.filter(
        (field) =>
          field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          field.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sahiplere göre filtrele
    if (selectedOwners.length > 0) {
      result = result.filter((field) =>
        field.owners.some((owner) => selectedOwners.includes(owner.userId))
      );
    }

    // Kuyulara göre filtrele (Güncellendi: field.wells -> field.fieldWells)
    if (selectedWells.length > 0) {
      result = result.filter((field) =>
        field.fieldWells?.some((fw) => selectedWells.includes(fw.well.id))
      );
    }

    // İşlem tiplerine göre filtrele
    if (selectedProcessTypes.length > 0) {
      result = result.filter((field) =>
        field.processingLogs?.some((log) =>
          selectedProcessTypes.includes(log.processType)
        )
      );
    }

    setFilteredFields(result);
  }, [fields, searchTerm, selectedOwners, selectedWells, selectedProcessTypes]);

  const fetchFields = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/fields");
      if (!response.ok) {
        throw new Error("Tarlalar yüklenirken bir hata oluştu");
      }
      const data = await response.json();
      setFields(data);
      setFilteredFields(data);
    } catch (error) {
      console.error("Error fetching fields:", error);
      toast({
        title: "Hata",
        description: "Tarlalar yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOwners = async () => {
    try {
      const response = await fetch("/api/users/owners");
      if (!response.ok) {
        throw new Error("Sahipler yüklenirken bir hata oluştu");
      }
      const data = await response.json();
      setOwners(data);
    } catch (error) {
      console.error("Error fetching owners:", error);
    }
  };

  const fetchWells = async () => {
    try {
      const response = await fetch("/api/wells");
      if (!response.ok) {
        throw new Error("Kuyular yüklenirken bir hata oluştu");
      }
      const data = await response.json();
      setWells(data);
    } catch (error) {
      console.error("Error fetching wells:", error);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/fields/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Tarla silinirken bir hata oluştu");
      }

      toast({
        title: "Başarılı",
        description: "Tarla başarıyla silindi.",
      });

      setFields(fields.filter((field) => field.id !== id));
      setFilteredFields(filteredFields.filter((field) => field.id !== id));
    } catch (error: any) {
      console.error("Error deleting field:", error);
      toast({
        title: "Hata",
        description: error.message || "Tarla silinirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Sahip seçimini değiştir
  const toggleOwner = (ownerId: string) => {
    setSelectedOwners((prev) =>
      prev.includes(ownerId)
        ? prev.filter((o) => o !== ownerId)
        : [...prev, ownerId]
    );
  };

  // Kuyu seçimini değiştir
  const toggleWell = (wellId: string) => {
    setSelectedWells((prev) =>
      prev.includes(wellId)
        ? prev.filter((w) => w !== wellId)
        : [...prev, wellId]
    );
  };

  // İşlem tipi seçimini değiştir
  const toggleProcessType = (processType: string) => {
    setSelectedProcessTypes((prev) =>
      prev.includes(processType)
        ? prev.filter((p) => p !== processType)
        : [...prev, processType]
    );
  };

  // Filtreleri temizle
  const clearFilters = () => {
    setSelectedOwners([]);
    setSelectedWells([]);
    setSelectedProcessTypes([]);
    setSearchTerm("");
    setShowSearchInput(false);
    setFilteredFields(fields);
  };

  // Aktif filtre sayısını hesapla
  const activeFiltersCount =
    selectedOwners.length +
    selectedWells.length +
    selectedProcessTypes.length +
    (searchTerm ? 1 : 0);

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
                    {activeFiltersCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-2 px-1 rounded-full"
                      >
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
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
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Kuyular</DropdownMenuLabel>
                  {wells.map((well) => (
                    <DropdownMenuCheckboxItem
                      key={well.id}
                      checked={selectedWells.includes(well.id)}
                      onCheckedChange={() => toggleWell(well.id)}
                    >
                      {well.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>İşlem Tipleri</DropdownMenuLabel>
                  {processTypes.map((type) => (
                    <DropdownMenuCheckboxItem
                      key={type.value}
                      checked={selectedProcessTypes.includes(type.value)}
                      onCheckedChange={() => toggleProcessType(type.value)}
                    >
                      {type.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Arama butonu ve input */}
              {showSearchInput ? (
                <div className="flex items-center border rounded-md">
                  <Input
                    type="text"
                    placeholder="Tarla ara..."
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
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Temizle
                </Button>
              )}
            </div>

            {/* Aktif filtre bilgisi */}
            {activeFiltersCount > 0 && (
              <div className="text-sm text-muted-foreground">
                {filteredFields.length} sonuç bulundu
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarla Adı</TableHead>
              <TableHead>Konum</TableHead>
              <TableHead>Alan (dönüm)</TableHead>
              <TableHead>Sahipler</TableHead>
              <TableHead>Kuyular</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Tarlalar yükleniyor...
                </TableCell>
              </TableRow>
            ) : filteredFields.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {fields.length === 0
                    ? "Henüz tarla kaydı bulunmuyor."
                    : "Arama kriterlerine uygun tarla bulunamadı."}
                </TableCell>
              </TableRow>
            ) : (
              filteredFields.map((field) => (
                <TableRow key={field.id}>
                  <TableCell className="font-medium">{field.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-muted-foreground mr-1" />
                      {field.location}
                    </div>
                  </TableCell>
                  <TableCell>{field.size}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {field.owners.map((owner) => (
                        <div
                          key={owner.id}
                          className="text-xs flex items-center gap-1"
                        >
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span>{owner.user.name}</span>
                          <span className="text-muted-foreground">
                            (%{owner.percentage})
                          </span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {/* Güncellendi: field.wells -> field.fieldWells */}
                    {field.fieldWells && field.fieldWells.length > 0 ? ( 
                      <div className="flex flex-col gap-1">
                        {/* Güncellendi: field.wells -> field.fieldWells */}
                        {field.fieldWells.map((fieldWell) => ( 
                          <div
                            key={fieldWell.well.id} // fieldWell.well.id
                            className="text-xs flex items-center gap-1"
                          >
                            <DropletIcon className="h-3 w-3 text-muted-foreground" />
                            {/* Güncellendi: well.name -> fieldWell.well.name */}
                            <span>{fieldWell.well.name}</span> 
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Kuyu yok
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        field.status === "ACTIVE"
                          ? "bg-green-500/10 text-green-500 border-green-500"
                          : "bg-gray-500/10 text-gray-500 border-gray-500"
                      }
                    >
                      {field.status === "ACTIVE" ? "Aktif" : "Pasif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" asChild>
                        <Link href={`/dashboard/owner/fields/${field.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="outline" size="icon" asChild>
                        <Link href={`/dashboard/owner/fields/${field.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(field.id)}
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
              Tarlayı silmek istediğinize emin misiniz?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Bu tarla ve ilişkili tüm veriler kalıcı
              olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
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
