"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash,
  Eye,
  Calendar,
  MapPin,
  Package,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Harvest {
  id: string;
  harvestDate: string;
  harvestedArea: number;
  quantity: number;
  unit: string;
  pricePerUnit?: number;
  totalRevenue?: number;
  quality?: string;
  moistureContent?: number;
  storageLocation?: string;
  buyerInfo?: string;
  notes?: string;
  field: {
    id: string;
    name: string;
    location: string;
    size: number;
  };
  crop: {
    id: string;
    name: string;
    cropType: string;
    plantedDate: string;
  };
  season?: {
    id: string;
    name: string;
    isActive: boolean;
  };
  harvestedBy: {
    id: string;
    name: string;
  };
}

interface Field {
  id: string;
  name: string;
  location: string;
}

interface Season {
  id: string;
  name: string;
  isActive: boolean;
}

export default function HarvestList() {
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedField, setSelectedField] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const itemsPerPage = 10;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchHarvests();
    fetchFields();
    fetchSeasons();
  }, [currentPage, selectedField, selectedSeason]);

  useEffect(() => {
    // Search term değiştiğinde ilk sayfaya dön
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    // Filter değiştiğinde hasat listesini yenile
    if (currentPage === 1) {
      fetchHarvests();
    } else {
      setCurrentPage(1);
    }
  }, [selectedField, selectedSeason, searchTerm]);

  const fetchHarvests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (selectedField) params.append('fieldId', selectedField);
      if (selectedSeason) params.append('seasonId', selectedSeason);

      const response = await fetch(`/api/harvests?${params}`);
      if (!response.ok) throw new Error("Hasat kayıtları yüklenemedi");

      const data = await response.json();

      // Search filtrelemesi client-side'da yapılıyor
      let filteredHarvests = data.data || [];
      if (searchTerm) {
        filteredHarvests = filteredHarvests.filter((harvest: Harvest) =>
          harvest.field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          harvest.crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          harvest.crop.cropType.toLowerCase().includes(searchTerm.toLowerCase()) ||
          harvest.field.location.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setHarvests(filteredHarvests);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.totalCount || 0);
    } catch (error) {
      console.error("Error fetching harvests:", error);
      toast({
        title: "Hata",
        description: "Hasat kayıtları yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFields = async () => {
    try {
      const response = await fetch("/api/fields?includeOwnerships=true&fetchAll=true");
      if (!response.ok) throw new Error("Tarlalar yüklenemedi");

      const data = await response.json();
      setFields(data.data || []);
    } catch (error) {
      console.error("Error fetching fields:", error);
    }
  };

  const fetchSeasons = async () => {
    try {
      const response = await fetch("/api/seasons?fetchAll=true");
      if (!response.ok) throw new Error("Sezonlar yüklenemedi");

      const data = await response.json();
      setSeasons(data.data || []);
    } catch (error) {
      console.error("Error fetching seasons:", error);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/harvests/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Hasat kaydı silinirken bir hata oluştu");
      }

      toast({
        title: "Başarılı",
        description: "Hasat kaydı başarıyla silindi.",
      });

      // Listeyi yenile
      fetchHarvests();
      setDeleteId(null);
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "-";
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('tr-TR').format(num);
  };

  const getCropTypeLabel = (cropType: string) => {
    const types: { [key: string]: string } = {
      CORN: "Mısır",
      WHEAT: "Buğday",
      BEAN: "Fasulye",
      CHICKPEA: "Nohut",
      CUMIN: "Kimyon",
      CANOLA: "Kanola",
      OATS: "Yulaf",
      BARLEY: "Arpa",
      SUNFLOWER: "Ayçiçeği",
      COTTON: "Pamuk",
      SUGAR_BEET: "Şeker Pancarı",
      POTATO: "Patates",
      TOMATO: "Domates",
      ONION: "Soğan",
      OTHER: "Diğer",
    };
    return types[cropType] || cropType;
  };

  const getQualityBadgeColor = (quality?: string) => {
    if (!quality) return "bg-gray-100 text-gray-700";
    switch (quality) {
      case "Extra":
        return "bg-green-100 text-green-700 border-green-200";
      case "A":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "B":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "C":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Hasat Kayıtları</h1>
          <p className="text-muted-foreground">
            {totalCount > 0 ? `Toplam ${totalCount} hasat kaydı` : "Henüz hasat kaydı bulunmuyor"}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/harvests/new">
            <Plus className="mr-2 h-4 w-4" />
            Yeni Hasat Kaydı
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Tarla, ekin veya lokasyon ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Field Filter */}
            <div className="w-full lg:w-48">
              <Select value={selectedField || "all"} onValueChange={(value) => setSelectedField(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tüm Tarlalar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Tarlalar</SelectItem>
                  {fields.map((field) => (
                    <SelectItem key={field.id} value={field.id}>
                      {field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Season Filter */}
            <div className="w-full lg:w-48">
              <Select value={selectedSeason || "all"} onValueChange={(value) => setSelectedSeason(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tüm Sezonlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Sezonlar</SelectItem>
                  {seasons.map((season) => (
                    <SelectItem key={season.id} value={season.id}>
                      {season.name} {season.isActive && "(Aktif)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {(searchTerm || selectedField || selectedSeason) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedField("");
                  setSelectedSeason("");
                }}
              >
                <Filter className="mr-2 h-4 w-4" />
                Temizle
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Harvest List */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Hasat kayıtları yükleniyor...</span>
          </CardContent>
        </Card>
      ) : harvests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Hasat kaydı bulunamadı</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || selectedField || selectedSeason
                ? "Arama kriterlerinize uygun hasat kaydı bulunamadı."
                : "Henüz hiç hasat kaydı oluşturulmamış."}
            </p>
            <Button asChild>
              <Link href="/dashboard/harvests/new">
                <Plus className="mr-2 h-4 w-4" />
                İlk Hasat Kaydını Oluştur
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : isMobile ? (
        // Mobile Card View
        <div className="space-y-4">
          {harvests.map((harvest) => (
            <Card key={harvest.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{harvest.crop.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getCropTypeLabel(harvest.crop.cropType)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/harvests/${harvest.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Görüntüle
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/harvests/${harvest.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Düzenle
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(harvest.id)}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4" />
                    {harvest.field.name} - {harvest.field.location}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(new Date(harvest.harvestDate), "PPP", { locale: tr })}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Package className="mr-2 h-4 w-4" />
                    {formatNumber(harvest.quantity)} {harvest.unit} ({harvest.harvestedArea} dönüm)
                  </div>
                  {harvest.totalRevenue && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      {formatCurrency(harvest.totalRevenue)}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {harvest.quality && (
                    <Badge variant="outline" className={getQualityBadgeColor(harvest.quality)}>
                      {harvest.quality} Kalite
                    </Badge>
                  )}
                  {harvest.season && (
                    <Badge variant="outline">
                      {harvest.season.name}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Desktop Table View
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ekin</TableHead>
                <TableHead>Tarla</TableHead>
                <TableHead>Hasat Tarihi</TableHead>
                <TableHead>Miktar</TableHead>
                <TableHead>Gelir</TableHead>
                <TableHead>Kalite</TableHead>
                <TableHead>Sezon</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {harvests.map((harvest) => (
                <TableRow key={harvest.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{harvest.crop.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {getCropTypeLabel(harvest.crop.cropType)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{harvest.field.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {harvest.field.location}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(harvest.harvestDate), "PPP", { locale: tr })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div>{formatNumber(harvest.quantity)} {harvest.unit}</div>
                      <div className="text-sm text-muted-foreground">
                        {harvest.harvestedArea} dönüm
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {harvest.totalRevenue ? (
                      <div>
                        <div className="font-medium">
                          {formatCurrency(harvest.totalRevenue)}
                        </div>
                        {harvest.pricePerUnit && (
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(harvest.pricePerUnit)}/{harvest.unit}
                          </div>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {harvest.quality ? (
                      <Badge variant="outline" className={getQualityBadgeColor(harvest.quality)}>
                        {harvest.quality}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {harvest.season ? (
                      <Badge variant="outline">
                        {harvest.season.name}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/harvests/${harvest.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Görüntüle
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/harvests/${harvest.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Düzenle
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(harvest.id)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {!loading && harvests.length > 0 && totalPages > 1 && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Sayfa {currentPage} / {totalPages} (Toplam {totalCount} kayıt)
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(pageNum)}
                        className="min-w-[40px]"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hasat Kaydını Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu hasat kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}