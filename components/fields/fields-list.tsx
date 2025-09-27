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
  Calendar,
  Loader2,
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
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
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
    id: string; // Eklendi: FieldWell ilişki kaydının ID'si
    well: {
      id: string;
      name: string;
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

// Sahip renkleri - her sahip için konsistentfixe bir renk
const getOwnerColor = (ownerId: string) => {
  const colors = [
    { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
    { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
    { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  ];

  // Simple hash function to consistently assign colors
  let hash = 0;
  for (let i = 0; i < ownerId.length; i++) {
    hash = ownerId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export default function FieldsList() {
  const [fields, setFields] = useState<Field[]>([]);
  const [filteredFields, setFilteredFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [wells, setWells] = useState<Well[]>([]);
  const [seasons, setSeasons] = useState<{id: string, name: string, isActive: boolean}[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [paginatedFields, setPaginatedFields] = useState<Field[]>([]);

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
    fetchSeasons();

    // Mobile detection
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
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

    // Sezonlara göre filtrele
    if (selectedSeasons.length > 0) {
      result = result.filter((field) => {
        if (selectedSeasons.includes("no-season")) {
          return !field.seasonId || selectedSeasons.includes(field.seasonId);
        }
        return field.seasonId && selectedSeasons.includes(field.seasonId);
      });
    }

    setFilteredFields(result);
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [fields, searchTerm, selectedOwners, selectedWells, selectedProcessTypes, selectedSeasons]);

  // Pagination işlevi
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filteredFields.slice(startIndex, endIndex);
    setPaginatedFields(paginated);
  }, [filteredFields, currentPage, itemsPerPage]);

  const fetchFields = async () => {
    try {
      setLoading(true);
      // includeOwnerships=true ve fetchAll=true parametrelerini ekle
      const response = await fetch("/api/fields?includeOwnerships=true&fetchAll=true");
      if (!response.ok) {
        throw new Error("Tarlalar yüklenirken bir hata oluştu");
      }
      const responseData = await response.json();
      // API'den gelen yanıtın 'data' özelliğini kullan
      const fieldsData = responseData.data || []; // Eğer data yoksa boş dizi ata
      setFields(fieldsData);
      setFilteredFields(fieldsData);
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
      const responseData = await response.json();
      // API'den gelen yanıtın 'data' özelliğini kullan
      const wellsData = responseData.data || []; // Eğer data yoksa boş dizi ata
      setWells(wellsData);
    } catch (error) {
      console.error("Error fetching wells:", error);
    }
  };

  const fetchSeasons = async () => {
    try {
      const response = await fetch("/api/seasons?fetchAll=true");
      if (!response.ok) {
        throw new Error("Sezonlar yüklenirken bir hata oluştu");
      }
      const responseData = await response.json();
      const seasonsData = responseData.data || [];
      setSeasons(seasonsData);
    } catch (error) {
      console.error("Error fetching seasons:", error);
    }
  };

  const handleDelete = async (id: string) => {
    // Loglar kaldırıldı
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/fields/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // JSON parse hatasını yakala
        const errorData = await response.json().catch(() => ({ error: "Tarla silinirken bir hata oluştu (JSON ayrıştırılamadı)" }));
        throw new Error(errorData.error || `Tarla silinirken bir hata oluştu (status: ${response.status})`);
      }

      toast({
        title: "Başarılı",
        description: "Tarla başarıyla silindi.",
      });

      // Hem ana listeyi hem de filtrelenmiş listeyi doğrudan güncelle
      setFields((prevFields) => prevFields.filter((field) => field.id !== id));
      setFilteredFields((prevFiltered) => prevFiltered.filter((field) => field.id !== id));

    } catch (error: any) {
      console.error("Error deleting field:", error); // Hata logu kalsın
      toast({
        title: "Hata",
        description: error.message || "Tarla silinirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      // Her durumda state'leri sıfırla
      setIsDeleting(false);
      // setDeleteId(null); // Artık AlertDialog kullanmadığımız için buna gerek yok
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

  // Sezon seçimini değiştir
  const toggleSeason = (seasonId: string) => {
    setSelectedSeasons((prev) =>
      prev.includes(seasonId)
        ? prev.filter((s) => s !== seasonId)
        : [...prev, seasonId]
    );
  };

  // Filtreleri temizle
  const clearFilters = () => {
    setSelectedOwners([]);
    setSelectedWells([]);
    setSelectedProcessTypes([]);
    setSelectedSeasons([]);
    setSearchTerm("");
    setShowSearchInput(false);
    setFilteredFields(fields);
  };

  // Aktif filtre sayısını hesapla
  const activeFiltersCount =
    selectedOwners.length +
    selectedWells.length +
    selectedProcessTypes.length +
    selectedSeasons.length +
    (searchTerm ? 1 : 0);

  // Pagination hesaplamaları
  const totalPages = Math.ceil(filteredFields.length / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, filteredFields.length);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

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
                  <DropdownMenuLabel>Sezonlar</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    key="no-season"
                    checked={selectedSeasons.includes("no-season")}
                    onCheckedChange={() => toggleSeason("no-season")}
                  >
                    Sezon Yok
                  </DropdownMenuCheckboxItem>
                  {seasons.map((season) => (
                    <DropdownMenuCheckboxItem
                      key={season.id}
                      checked={selectedSeasons.includes(season.id)}
                      onCheckedChange={() => toggleSeason(season.id)}
                    >
                      {season.name} {season.isActive && "(Aktif)"}
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

            {/* Aktif filtre bilgisi ve pagination info */}
            <div className="text-sm text-muted-foreground">
              {activeFiltersCount > 0 ? (
                <span>{filteredFields.length} sonuç bulundu</span>
              ) : (
                <span>Toplam {fields.length} tarla</span>
              )}
              {filteredFields.length > 0 && (
                <span className="ml-2">
                  (Sayfa {currentPage}/{totalPages})
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isMobile ? (
        // Mobile Card View
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Tarlalar yükleniyor...</span>
            </div>
          ) : filteredFields.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-24">
                <p className="text-muted-foreground text-center">
                  {fields.length === 0
                    ? "Henüz tarla kaydı bulunmuyor."
                    : "Arama kriterlerine uygun tarla bulunamadı."}
                </p>
              </CardContent>
            </Card>
          ) : (
            paginatedFields.map((field) => (
              <Card key={field.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{field.name}</h3>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {field.location}
                      </div>
                    </div>
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
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Alan</p>
                      <p className="font-medium">{field.size} dönüm</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sezon</p>
                      {field.season ? (
                        <Badge
                          variant="outline"
                          className={field.season.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"}
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          {field.season.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sezon yok</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Sahipler</p>
                      <div className="flex flex-wrap gap-1">
                        {(field.owners || []).map((owner) => {
                          const ownerColor = getOwnerColor(owner.userId);
                          return (
                            <div
                              key={owner.id}
                              className={`text-xs flex items-center gap-1 px-2 py-1 rounded-md ${ownerColor.bg} ${ownerColor.border} border`}
                            >
                              <User className={`h-3 w-3 ${ownerColor.text}`} />
                              <span className={ownerColor.text}>{owner.user.name}</span>
                              <span className={`${ownerColor.text} opacity-75`}>
                                (%{owner.percentage})
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {field.fieldWells && field.fieldWells.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Kuyular</p>
                        <div className="flex flex-wrap gap-1">
                          {field.fieldWells.map((fieldWell) => (
                            <div
                              key={fieldWell.id}
                              className="text-xs flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md"
                            >
                              <DropletIcon className="h-3 w-3" />
                              <span>{fieldWell.well.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/owner/fields/${field.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/owner/fields/${field.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (window.confirm(`${field.name} tarlasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
                          handleDelete(field.id);
                        }
                      }}
                      disabled={isDeleting}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        // Desktop Table View
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarla Adı</TableHead>
                <TableHead>Konum</TableHead>
                <TableHead>Alan (dönüm)</TableHead>
                <TableHead>Sezon</TableHead>
                <TableHead>Sahipler</TableHead>
                <TableHead>Kuyular</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Tarlalar yükleniyor...
                  </TableCell>
                </TableRow>
              ) : filteredFields.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    {fields.length === 0
                      ? "Henüz tarla kaydı bulunmuyor."
                      : "Arama kriterlerine uygun tarla bulunamadı."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedFields.map((field) => (
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
                      {field.season ? (
                        <Badge
                          variant="outline"
                          className={field.season.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"}
                        >
                          {field.season.name}
                          {field.season.isActive && " (Aktif)"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sezon yok</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {(field.owners || []).map((owner) => {
                          const ownerColor = getOwnerColor(owner.userId);
                          return (
                            <div
                              key={owner.id}
                              className={`text-xs flex items-center gap-1 px-2 py-1 rounded-md ${ownerColor.bg} ${ownerColor.border} border`}
                            >
                              <User className={`h-3 w-3 ${ownerColor.text}`} />
                              <span className={ownerColor.text}>{owner.user.name}</span>
                              <span className={`${ownerColor.text} opacity-75`}>
                                (%{owner.percentage})
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {field.fieldWells && field.fieldWells.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {field.fieldWells.map((fieldWell) => (
                            <div
                              key={fieldWell.id}
                              className="text-xs flex items-center gap-1"
                            >
                              <DropletIcon className="h-3 w-3 text-muted-foreground" />
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
                          onClick={() => {
                            if (window.confirm(`${field.name} tarlasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
                              handleDelete(field.id);
                            }
                          }}
                          disabled={isDeleting}
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
      )}

      {/* Pagination */}
      {!loading && filteredFields.length > itemsPerPage && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Sayfa bilgisi */}
              <div className="text-sm text-muted-foreground">
                {startItem}-{endItem} arası, toplam {filteredFields.length} sonuç
              </div>

              {/* Pagination controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToFirstPage}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first, last, current and adjacent pages
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      );
                    })
                    .map((page, index, array) => {
                      // Add ellipsis if there's a gap
                      const elements = [];
                      if (index > 0 && page > array[index - 1] + 1) {
                        elements.push(
                          <span key={`ellipsis-${page}`} className="px-2 text-muted-foreground">
                            ...
                          </span>
                        );
                      }
                      elements.push(
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(page)}
                          className="min-w-[40px]"
                        >
                          {page}
                        </Button>
                      );
                      return elements;
                    })
                    .flat()}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToLastPage}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
