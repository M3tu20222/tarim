"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Edit, Trash2, Eye, Filter, Calendar, Clock } from "lucide-react";

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

interface IrrigationListProps {
  initialData?: any[];
}

export function IrrigationList({ initialData }: IrrigationListProps) {
  const router = useRouter();
  const [irrigationLogs, setIrrigationLogs] = useState<any[]>(
    initialData || []
  );
  const [loading, setLoading] = useState(false);
  const [wells, setWells] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    wellId: "",
    fieldId: "",
    seasonId: "",
    status: "",
    startDate: null as Date | null,
    endDate: null as Date | null,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Verileri yükle
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Kuyuları getir
        const wellsResponse = await fetch("/api/wells");
        const wellsData = await wellsResponse.json();
        setWells(wellsData.data || []);

        // Tarlaları getir
        const fieldsResponse = await fetch("/api/fields");
        const fieldsData = await fieldsResponse.json();
        setFields(fieldsData.data || []);

        // Sezonları getir
        const seasonsResponse = await fetch("/api/seasons");
        const seasonsData = await seasonsResponse.json();
        setSeasons(seasonsData.data || []);

        // Sulama kayıtlarını getir
        await fetchIrrigationLogs();
      } catch (error) {
        console.error("Veri yükleme hatası:", error);
        toast({
          title: "Hata",
          description: "Veriler yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, []);

  // Filtreleme değiştiğinde verileri yeniden yükle
  useEffect(() => {
    fetchIrrigationLogs();
  }, [filters, page]);

  // Sulama kayıtlarını getir
  const fetchIrrigationLogs = async () => {
    try {
      setLoading(true);

      // Filtre parametrelerini oluştur
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "10");

      if (filters.wellId) params.append("wellId", filters.wellId);
      if (filters.fieldId) params.append("fieldId", filters.fieldId);
      if (filters.seasonId) params.append("seasonId", filters.seasonId);
      if (filters.status) params.append("status", filters.status);
      if (filters.startDate)
        params.append("startDate", filters.startDate.toISOString());
      if (filters.endDate)
        params.append("endDate", filters.endDate.toISOString());

      // API isteği
      const response = await fetch(`/api/irrigation?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Sulama kayıtları getirilemedi.");
      }

      const data = await response.json();
      setIrrigationLogs(data.data || []);
      setTotalPages(data.meta?.pages || 1);
      setTotalRecords(data.meta?.total || 0);
    } catch (error) {
      console.error("Sulama kayıtları yükleme hatası:", error);
      toast({
        title: "Hata",
        description: "Sulama kayıtları yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtreleri temizle
  const clearFilters = () => {
    setFilters({
      wellId: "",
      fieldId: "",
      seasonId: "",
      status: "",
      startDate: null,
      endDate: null,
    });
    setPage(1);
  };

  // Sulama kaydını sil
  const deleteIrrigationLog = async () => {
    if (!itemToDelete) return;

    try {
      setLoading(true);

      // API isteği
      const response = await fetch(`/api/irrigation/${itemToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Sulama kaydı silinemedi.");
      }

      toast({
        title: "Başarılı",
        description: "Sulama kaydı başarıyla silindi.",
      });

      // Listeyi güncelle
      await fetchIrrigationLogs();
    } catch (error) {
      console.error("Sulama kaydı silme hatası:", error);
      toast({
        title: "Hata",
        description: "Sulama kaydı silinirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  // Durum badge'i
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
          <CardDescription>
            Sulama kayıtlarını filtrelemek için aşağıdaki seçenekleri kullanın.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wellId">Kuyu</Label>
              <Select
                value={filters.wellId}
                onValueChange={(value) =>
                  setFilters({ ...filters, wellId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tüm Kuyular" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Kuyular</SelectItem>
                  {wells.map((well) => (
                    <SelectItem key={well.id} value={well.id}>
                      {well.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fieldId">Tarla</Label>
              <Select
                value={filters.fieldId}
                onValueChange={(value) =>
                  setFilters({ ...filters, fieldId: value })
                }
              >
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

            <div className="space-y-2">
              <Label htmlFor="seasonId">Sezon</Label>
              <Select
                value={filters.seasonId}
                onValueChange={(value) =>
                  setFilters({ ...filters, seasonId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tüm Sezonlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Sezonlar</SelectItem>
                  {seasons.map((season) => (
                    <SelectItem key={season.id} value={season.id}>
                      {season.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Durum</Label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tüm Durumlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="COMPLETED">Tamamlandı</SelectItem>
                  <SelectItem value="PLANNED">Planlandı</SelectItem>
                  <SelectItem value="CANCELLED">İptal Edildi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Başlangıç Tarihi</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
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
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={filters.startDate || undefined}
                    onSelect={(date) =>
                      setFilters({ ...filters, startDate: date || null }) // undefined ise null ata
                    }
                    initialFocus
                    locale={tr}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Bitiş Tarihi</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
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
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={filters.endDate || undefined}
                    onSelect={(date) =>
                      setFilters({ ...filters, endDate: date || null }) // undefined ise null ata
                    }
                    initialFocus
                    locale={tr}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={clearFilters}>
            Filtreleri Temizle
          </Button>
          <Button onClick={() => fetchIrrigationLogs()}>
            <Filter className="mr-2 h-4 w-4" />
            Filtrele
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Sulama Kayıtları</CardTitle>
              <CardDescription>
                Toplam {totalRecords} kayıt bulundu. Sayfa {page}/{totalPages}
              </CardDescription>
            </div>
            <Button
              onClick={() => router.push("/dashboard/owner/irrigation/new")}
            >
              Yeni Sulama Kaydı
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
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
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {irrigationLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          {format(new Date(log.startDateTime), "dd MMM yyyy", {
                            locale: tr,
                          })}
                          <Clock className="ml-4 mr-2 h-4 w-4 text-muted-foreground" />
                          {format(new Date(log.startDateTime), "HH:mm", {
                            locale: tr,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>{log.well?.name || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          {Math.floor(log.duration / 60)}s {log.duration % 60}dk
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {log.fieldUsages?.map((usage: any) => (
                            <Badge
                              key={usage.id}
                              variant="outline"
                              className="mr-1 mb-1"
                            >
                              {usage.field?.name} (%{usage.percentage})
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              router.push(
                                `/dashboard/owner/irrigation/${log.id}`
                              )
                            }
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
              onClick={deleteIrrigationLog}
              disabled={loading}
            >
              {loading ? "Siliniyor..." : "Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
