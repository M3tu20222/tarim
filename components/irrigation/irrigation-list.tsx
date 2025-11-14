"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Edit,
  Trash2,
  Eye,
  Filter,
  Calendar,
  Clock,
  StickyNote,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// API'den gelen veri tipleri
interface IrrigationOwnerUsage {
  id: string;
  owner: { id: string; name: string; email?: string | null };
  quantity: number; // owner kullanımı miktarı
  cost?: number | null; // opsiyonel maliyet
}

interface IrrigationInventoryUsage {
  id: string;
  inventory: { id: string; name: string; unit: string };
  quantity: number; // kullanım miktarı
  unitCost?: number | null; // birim maliyet (varsa)
  ownerUsages?: IrrigationOwnerUsage[];
}

interface IrrigationLog {
  id: string;
  startDateTime: string;
  duration: number;
  well: { name: string };
  fieldUsages: { id: string; field: { name: string; size: number | null }; percentage: number }[];
  user: { name: string };
  status: string;
  notes?: string;
  inventoryUsages?: IrrigationInventoryUsage[]; // API include ediyor
}

interface ApiResponse {
  data: IrrigationLog[];
  meta: {
    total: number;
    pages: number;
  };
}

// Veri çekme fonksiyonu
const fetchIrrigationLogs = async (
  filters: any,
  page: number
): Promise<ApiResponse> => {
  const params = new URLSearchParams();
  params.append("page", page.toString());
  params.append("limit", "10");

  if (filters.wellId) params.append("wellId", filters.wellId);
  if (filters.fieldId) params.append("fieldId", filters.fieldId);
  if (filters.seasonId) params.append("seasonId", filters.seasonId);
  if (filters.status) params.append("status", filters.status);
  if (filters.startDate)
    params.append("startDate", filters.startDate.toISOString());
  if (filters.endDate) params.append("endDate", filters.endDate.toISOString());
  if (filters.createdBy) params.append("createdBy", filters.createdBy);

  const response = await fetch(`/api/irrigation?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Sulama kayıtları getirilemedi.");
  }
  return response.json();
};

export function IrrigationList() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    wellId: "",
    fieldId: "",
    seasonId: "",
    status: "",
    startDate: null as Date | null,
    endDate: null as Date | null,
    createdBy: "",
  });
  const [page, setPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewItem, setViewItem] = useState<IrrigationLog | null>(null);

  // Veri sorguları
  const { data: wellsData = [] } = useQuery({
    queryKey: ["wells"],
    queryFn: () =>
      fetch("/api/wells")
        .then((res) => res.json())
        .then((data) => data.data || []),
  });
  const { data: fieldsData = [] } = useQuery({
    queryKey: ["fields"],
    queryFn: () =>
      fetch("/api/fields")
        .then((res) => res.json())
        .then((data) => data.data || []),
  });
  const { data: seasonsData = [] } = useQuery({
    queryKey: ["seasons"],
    queryFn: () =>
      fetch("/api/seasons")
        .then((res) => res.json())
        .then((data) => data.data || []),
  });
  const { data: workersData = [] } = useQuery({
    queryKey: ["workers"],
    queryFn: () =>
      fetch("/api/users?role=WORKER")
        .then((res) => res.json())
        .then((data) => data.data || []),
  });

  // İlk açılışta aktif sezonu otomatik seç
  useEffect(() => {
    if (seasonsData.length > 0) {
      // Eğer henüz bir sezon seçilmemişse, aktif sezonu otomatik seç
      if (!filters.seasonId) {
        const activeSeason = seasonsData.find((season: any) => season.isActive);
        if (activeSeason) {
          setFilters((prev) => ({ ...prev, seasonId: activeSeason.id }));
        }
      }
    }
  }, [seasonsData]); // seasonsData yüklendikten sonra çalış

  // Seçili kuya göre tarlaları filtrele
  const filteredFieldsData = fieldsData.filter((field: any) => {
    if (!filters.wellId) return true;
    // Prisma şemasına göre Field ve Well arasında FieldWell modeli ile bir ilişki var.
    // API'den gelen veri yapısı { well: { id: '...' } } şeklinde olduğu için fw.well.id olarak erişiyoruz.
    return field.fieldWells?.some((fw: any) => fw.well?.id === filters.wellId);
  });

  const { data, isLoading, isError, error } = useQuery<ApiResponse, Error>({
    queryKey: ["irrigationLogs", filters, page],
    queryFn: () => fetchIrrigationLogs(filters, page),
    placeholderData: (previousData) => previousData,
  });

  // Silme işlemi
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/irrigation/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Sulama kaydı başarıyla silindi.",
      });
      queryClient.invalidateQueries({ queryKey: ["irrigationLogs"] });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Sulama kaydı silinirken bir hata oluştu.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    },
  });

  const clearFilters = () => {
    setFilters({
      wellId: "",
      fieldId: "",
      seasonId: "",
      status: "",
      startDate: null,
      endDate: null,
      createdBy: "",
    });
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="success">Tamamlandı</Badge>;
      case "PLANNED":
        return <Badge variant="warning">Planlandı</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">İptal Edildi</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const irrigationLogs = data?.data || [];
  const totalPages = data?.meta?.pages || 1;
  const totalRecords = data?.meta?.total || 0;

  if (isError) {
    return <div>Hata: {error.message}</div>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <Card className="card-cyberpunk">
          <CardHeader>
            <CardTitle className="neon-text-cyan">Filtreler</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sulama kayıtlarını filtrelemek için aşağıdaki seçenekleri kullanın. Eski kayıtlar için Sezon seçin.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label className="block text-sm font-medium neon-text-pink">Kuyu</Label>
              <Select
                value={filters.wellId}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    wellId: value === "all" ? "" : value,
                    fieldId: "", // Kuyu filtresi değiştiğinde tarla filtresini sıfırla
                  })
                }
              >
                <SelectTrigger className="neon-border">
                  <SelectValue placeholder="Tüm Kuyular" />
                </SelectTrigger>
                <SelectContent className="bg-background/80 backdrop-blur-sm border-purple-500/30 max-h-60 overflow-y-auto">
                  <SelectItem value="all">Tüm Kuyular</SelectItem>
                  {wellsData.map((well: any) => (
                    <SelectItem key={well.id} value={well.id} className="hover:bg-purple-500/20">
                      {well.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label className="block text-sm font-medium neon-text-pink">Tarla</Label>
              <Select
                value={filters.fieldId}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    fieldId: value === "all" ? "" : value,
                  })
                }
              >
                <SelectTrigger className="neon-border">
                  <SelectValue placeholder="Tüm Tarlalar" />
                </SelectTrigger>
                <SelectContent className="bg-background/80 backdrop-blur-sm border-purple-500/30 max-h-60 overflow-y-auto">
                  <SelectItem value="all">Tüm Tarlalar</SelectItem>
                  {filteredFieldsData.map((field: any) => (
                    <SelectItem key={field.id} value={field.id} className="hover:bg-purple-500/20">
                      {field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label className="block text-sm font-medium neon-text-pink">Sezon</Label>
              <Select
                value={filters.seasonId}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    seasonId: value === "all" ? "" : value,
                  })
                }
              >
                <SelectTrigger className="neon-border">
                  <SelectValue placeholder="Tüm Sezonlar" />
                </SelectTrigger>
                <SelectContent className="bg-background/80 backdrop-blur-sm border-purple-500/30 max-h-60 overflow-y-auto">
                  <SelectItem value="all">Tüm Sezonlar</SelectItem>
                  {seasonsData.map((season: any) => (
                    <SelectItem key={season.id} value={season.id} className="hover:bg-purple-500/20">
                      {season.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label className="block text-sm font-medium neon-text-pink">Durum</Label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    status: value === "all" ? "" : value,
                  })
                }
              >
                <SelectTrigger className="neon-border">
                  <SelectValue placeholder="Tüm Durumlar" />
                </SelectTrigger>
                <SelectContent className="bg-background/80 backdrop-blur-sm border-purple-500/30 max-h-60 overflow-y-auto">
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="COMPLETED">Tamamlandı</SelectItem>
                  <SelectItem value="PLANNED">Planlandı</SelectItem>
                  <SelectItem value="CANCELLED">İptal Edildi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label className="block text-sm font-medium neon-text-pink">Başlangıç Tarihi</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal neon-border",
                      !filters.startDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {filters.startDate ? (
                      format(filters.startDate, "PPP", { locale: tr })
                    ) : (
                      <span>Tarih Seçin</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 neon-border">
                  <CalendarComponent
                    mode="single"
                    selected={filters.startDate || undefined}
                    onSelect={(date) =>
                      setFilters({ ...filters, startDate: date || null })
                    }
                    initialFocus
                    locale={tr}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 space-y-2">
              <Label className="block text-sm font-medium neon-text-pink">Bitiş Tarihi</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal neon-border",
                      !filters.endDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {filters.endDate ? (
                      format(filters.endDate, "PPP", { locale: tr })
                    ) : (
                      <span>Tarih Seçin</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 neon-border">
                  <CalendarComponent
                    mode="single"
                    selected={filters.endDate || undefined}
                    onSelect={(date) =>
                      setFilters({ ...filters, endDate: date || null })
                    }
                    initialFocus
                    locale={tr}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 space-y-2">
              <Label className="block text-sm font-medium neon-text-pink">İşçi</Label>
              <Select
                value={filters.createdBy}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    createdBy: value === "all" ? "" : value,
                  })
                }
              >
                <SelectTrigger className="neon-border">
                  <SelectValue placeholder="Tüm İşçiler" />
                </SelectTrigger>
                <SelectContent className="bg-background/80 backdrop-blur-sm border-purple-500/30 max-h-60 overflow-y-auto">
                  <SelectItem value="all">Tüm İşçiler</SelectItem>
                  {workersData.map((worker: any) => (
                    <SelectItem key={worker.id} value={worker.id} className="hover:bg-purple-500/20">
                      {worker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button variant="outline" onClick={clearFilters} className="neon-border">
              Filtreleri Temizle
            </Button>
          </CardFooter>
        </Card>

        <Card className="card-cyberpunk">
          <CardHeader>
            <CardTitle className="neon-text-cyan">Sulama Kayıtları</CardTitle>
            <CardDescription className="text-muted-foreground">
              Toplam {totalRecords} kayıt bulundu. Sayfa {page}/{totalPages}
            </CardDescription>
            <Button
              onClick={() => router.push("/dashboard/owner/irrigation/new")}
              className="btn-cyberpunk"
            >
              Yeni Sulama Kaydı
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <p>Yükleniyor...</p>
              </div>
            ) : irrigationLogs.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-40">
                <p className="text-muted-foreground">Kayıt bulunamadı.</p>
                <Button variant="link" onClick={clearFilters}>
                  Filtreleri temizle
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Kuyu</TableHead>
                      <TableHead>Süre</TableHead>
                      <TableHead>Tarlalar</TableHead>
                      <TableHead>İşçi</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Not</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {irrigationLogs.map((log: IrrigationLog) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                            {format(
                              new Date(log.startDateTime),
                              "dd MMM yyyy",
                              { locale: tr }
                            )}
                            <Clock className="ml-4 mr-2 h-4 w-4 text-muted-foreground" />
                            {format(new Date(log.startDateTime), "HH:mm", {
                              locale: tr,
                            })}
                          </div>
                        </TableCell>
                        <TableCell>{log.well?.name || "-"}</TableCell>
                        <TableCell>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${
                                log.duration / 60 > 10 
                                  ? "bg-red-600" 
                                  : log.duration / 60 > 4 
                                    ? "bg-blue-600" 
                                    : "bg-green-600"
                              }`}
                              style={{ width: `${Math.min((log.duration / (20 * 60)) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-center mt-1 text-muted-foreground">
                            {Math.floor(log.duration / 60)}s {log.duration % 60}dk
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {log.fieldUsages?.map(
                              (usage: {
                                id: string;
                                field: { name: string; size: number | null };
                                percentage: number;
                              }) => {
                                const calculatedArea = usage.field?.size && usage.percentage 
                                  ? (usage.field.size * usage.percentage) / 100 
                                  : null;
                                
                                return (
                                  <Badge
                                    key={usage.id}
                                    variant="outline"
                                    className="border-yellow-500 text-[rgb(3,207,252)]"
                                  >
                                    {usage.field?.name} ({calculatedArea ? `${calculatedArea.toFixed(2)} dekar` : usage.field?.size ? `${usage.field.size} dekar` : 'Bilinmeyen alan'} - %{usage.percentage})
                                  </Badge>
                                );
                              }
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{log.user?.name || "-"}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>
                          {log.notes && (
                            <Tooltip>
                              <TooltipTrigger>
                                <StickyNote className="h-5 w-5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{log.notes}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setViewItem(log);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                router.push(
                                  `/dashboard/owner/irrigation/${log.id}/edit`
                                )
                              }
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              onClick={() => {
                                setItemToDelete(log.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex justify-center mt-4 space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                >
                  Önceki
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pageNum) => (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={page === totalPages}
                >
                  Sonraki
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Görüntüleme (göz) diyaloğu - /dashboard/owner/reports sayfasıyla aynı stil */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] p-4 sm:p-6 left-[60%] translate-x-[-60%] top-[50%] -translate-y-1/2">
            <DialogHeader>
              <DialogTitle>Sulama Kaydı Detayı</DialogTitle>
              <DialogDescription>
                Seçili sulama kaydına ait özet bilgiler.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 -mr-2">
              {viewItem ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Tarih ve Saat
                      </Label>
                      <div className="flex items-center text-sm">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        {format(
                          new Date(viewItem.startDateTime),
                          "dd MMM yyyy",
                          { locale: tr }
                        )}
                        <Clock className="ml-4 mr-2 h-4 w-4 text-muted-foreground" />
                        {format(new Date(viewItem.startDateTime), "HH:mm", {
                          locale: tr,
                        })}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Kuyu
                      </Label>
                      <div className="text-sm">
                        {viewItem.well?.name || "-"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Süre
                      </Label>
                      <div className="text-sm">
                        {Math.floor(viewItem.duration / 60)}s{" "}
                        {viewItem.duration % 60}dk
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        İşçi
                      </Label>
                      <div className="text-sm">
                        {viewItem.user?.name || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Tarlalar
                    </Label>
                    <div className="flex flex-wrap gap-1">
                      {viewItem.fieldUsages?.map((usage) => {
                        const calculatedArea = usage.field?.size && usage.percentage 
                          ? (usage.field.size * usage.percentage) / 100 
                          : null;
                        
                        return (
                          <Badge
                            key={usage.id}
                            variant="outline"
                            className="border-yellow-500 text-[rgb(3,207,252)]"
                          >
                            {usage.field?.name} ({calculatedArea ? `${calculatedArea.toFixed(2)} dekar` : usage.field?.size ? `${usage.field.size} dekar` : 'Bilinmeyen alan'} - %{usage.percentage})
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Durum
                    </Label>
                    <div>{getStatusBadge(viewItem.status)}</div>
                  </div>

                  {/* Envanter Kullanımı Özeti */}
                  {Array.isArray(viewItem.inventoryUsages) &&
                    viewItem.inventoryUsages.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Envanter Kullanımı
                        </Label>
                        <div className="rounded-md border">
                          <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground border-b px-3 py-2">
                            <div>Envanter</div>
                            <div className="text-right">Miktar</div>
                            <div className="text-right">Birim Fiyat</div>
                            <div className="text-right">Toplam Maliyet</div>
                          </div>
                          <div className="divide-y">
                            {viewItem.inventoryUsages.map((iu) => {
                              const totalCost =
                                iu.unitCost != null
                                  ? iu.quantity * iu.unitCost
                                  : null;
                              return (
                                <div
                                  key={iu.id}
                                  className="grid grid-cols-4 items-center px-3 py-2 text-sm"
                                >
                                  <div className="truncate">
                                    {iu.inventory?.name}
                                  </div>
                                  <div className="text-right">
                                    {Number(iu.quantity).toFixed(2)}{" "}
                                    {iu.inventory?.unit}
                                  </div>
                                  <div className="text-right">
                                    {iu.unitCost != null
                                      ? `${iu.unitCost.toFixed(2)} TL`
                                      : "-"}
                                  </div>
                                  <div className="text-right">
                                    {totalCost != null
                                      ? `${totalCost.toFixed(2)} TL`
                                      : "-"}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Sahip Bazlı Envanter Kullanımı */}
                  {Array.isArray(viewItem.inventoryUsages) &&
                    viewItem.inventoryUsages.some(
                      (iu) =>
                        Array.isArray(iu.ownerUsages) &&
                        iu.ownerUsages.length > 0
                    ) && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Sahip Bazlı Envanter Kullanımı
                        </Label>
                        <div className="space-y-3">
                          {(() => {
                            // ownerId bazlı grupla
                            const ownerMap = new Map<
                              string,
                              {
                                ownerName: string;
                                ownerEmail?: string | null;
                                items: {
                                  name: string;
                                  quantity: number;
                                  unit: string;
                                  cost?: number | null;
                                }[];
                              }
                            >();
                            viewItem.inventoryUsages!.forEach((iu) => {
                              (iu.ownerUsages || []).forEach((ou) => {
                                const key = ou.owner.id;
                                const entry = ownerMap.get(key) || {
                                  ownerName: ou.owner.name,
                                  ownerEmail: ou.owner.email,
                                  items: [],
                                };
                                entry.items.push({
                                  name: iu.inventory.name,
                                  quantity: ou.quantity,
                                  unit: iu.inventory.unit,
                                  cost:
                                    ou.cost ??
                                    (iu.unitCost != null
                                      ? ou.quantity * iu.unitCost
                                      : null),
                                });
                                ownerMap.set(key, entry);
                              });
                            });
                            const owners = Array.from(ownerMap.entries());
                            return owners.map(([ownerId, data]) => {
                              const totalCost = data.items.reduce(
                                (sum, it) => sum + (it.cost || 0),
                                0
                              );
                              return (
                                <div
                                  key={ownerId}
                                  className="rounded-md border"
                                >
                                  <div className="px-3 py-2 border-b">
                                    <div className="text-sm font-medium">
                                      {data.ownerName}
                                      {data.ownerEmail
                                        ? ` (${data.ownerEmail})`
                                        : ""}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground border-b px-3 py-2">
                                    <div>Envanter</div>
                                    <div className="text-right">Miktar</div>
                                    <div className="text-right">Maliyet</div>
                                  </div>
                                  <div className="divide-y">
                                    {data.items.map((it, idx) => (
                                      <div
                                        key={idx}
                                        className="grid grid-cols-3 items-center px-3 py-2 text-sm"
                                      >
                                        <div className="truncate">
                                          {it.name}
                                        </div>
                                        <div className="text-right">
                                          {Number(it.quantity).toFixed(2)}{" "}
                                          {it.unit}
                                        </div>
                                        <div className="text-right">
                                          {it.cost != null
                                            ? `${it.cost.toFixed(2)} TL`
                                            : "-"}
                                        </div>
                                      </div>
                                    ))}
                                    <div className="grid grid-cols-3 items-center px-3 py-2 text-sm font-medium">
                                      <div className="text-right col-span-2">
                                        Toplam
                                      </div>
                                      <div className="text-right">
                                        {totalCost > 0
                                          ? `${totalCost.toFixed(2)} TL`
                                          : "-"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                  {viewItem.notes && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Not
                      </Label>
                      <div className="flex items-start gap-2 text-sm">
                        <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <p className="whitespace-pre-wrap">{viewItem.notes}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Kayıt yükleniyor...
                </div>
              )}
            </div>
            <DialogFooter className="sm:justify-between">
              <div className="text-xs text-muted-foreground">
                Detayları görüntüleme penceresi
              </div>
              <div className="flex gap-2">
                {viewItem && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setViewDialogOpen(false);
                        router.push(
                          `/dashboard/owner/irrigation/${viewItem.id}`
                        );
                      }}
                    >
                      Tam Sayfada Aç
                    </Button>
                    <Button
                      onClick={() => {
                        setViewDialogOpen(false);
                        router.push(
                          `/dashboard/owner/irrigation/${viewItem.id}/edit`
                        );
                      }}
                    >
                      Düzenle
                    </Button>
                  </>
                )}
                <Button
                  variant="secondary"
                  onClick={() => setViewDialogOpen(false)}
                >
                  Kapat
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Silme diyaloğu */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sulama Kaydını Sil</DialogTitle>
              <DialogDescription>
                Bu sulama kaydını silmek istediğinizden emin misiniz? Bu işlem
                geri alınamaz.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setItemToDelete(null);
                }}
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  itemToDelete && deleteMutation.mutate(itemToDelete)
                }
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Siliniyor..." : "Sil"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
