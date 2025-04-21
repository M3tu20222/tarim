"use client";

import { useState, useEffect, useCallback } from "react"; // useCallback eklendi
import { formatDate, formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input"; // Input eklendi
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
import { Edit, Eye, Filter, Search, Trash } from "lucide-react";
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

// İşlem tipi enum değerlerini Türkçe etiketlere dönüştür
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    PLOWING: "Sürme",
    SEEDING: "Ekim",
    FERTILIZING: "Gübreleme",
    PESTICIDE: "İlaçlama",
    HARVESTING: "Hasat",
    OTHER: "Diğer",
  };
  return labels[type] || type;
}

export default function ProcessTable() {
  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); // Arama state'i
  // const [selectedType, setSelectedType] = useState<string | null>(null); // Filtre state'i (şimdilik yorumlu)
  const { toast } = useToast();

  // useCallback ile fetchProcesses'ı optimize edelim
  const fetchProcesses = useCallback(async (currentSearchTerm = "") => {
    // currentSearchTerm parametresi eklendi
    try {
      setLoading(true);
      let apiUrl = "/api/processes";
      const params = new URLSearchParams();
      if (currentSearchTerm) {
        params.append("search", currentSearchTerm);
      }
      // if (selectedType) { // Filtre eklenirse
      //   params.append("type", selectedType);
      // }
      const queryString = params.toString();
      if (queryString) {
        apiUrl += `?${queryString}`;
      }

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error("İşlem verileri alınamadı");
      }
      const data = await response.json();
      setProcesses(data);
    } catch (error) {
      console.error("Error fetching processes:", error); // Hata logunu koru
      toast({
        title: "Hata",
        description: "İşlem verileri yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Bağımlılıkları boş bırakarak sadece ilk render'da ve manuel çağrıldığında çalışmasını sağlıyoruz

  useEffect(() => {
    fetchProcesses(); // İlk yüklemede çağır
  }, [fetchProcesses]);

  // Arama işlemini tetikleyen fonksiyon
  const handleSearch = () => {
    fetchProcesses(searchTerm);
  };

  // Silme sonrası listeyi yenilemek için fetchProcesses'ı çağır
  const refreshList = () => {
    fetchProcesses(searchTerm); // Mevcut arama terimiyle yenile
  };

  // İşlem silme
  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/processes/${deleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "İşlem silinirken bir hata oluştu");
      }

      toast({
        title: "Başarılı",
        description: "İşlem başarıyla silindi.",
      });

      // İşlemi listeden kaldır yerine listeyi yenile
      // setProcesses(processes.filter((item) => item.id !== deleteId));
      refreshList(); // Listeyi yenile
    } catch (error: any) {
      console.error("Error deleting process:", error); // Hata logunu koru
      toast({
        title: "Hata",
        description: error.message || "İşlem silinirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Toplam maliyeti hesapla
  const calculateTotalCost = (process: any) => {
    if (!process.processCosts || process.processCosts.length === 0) return 0;
    return process.processCosts.reduce(
      (sum: number, cost: any) => sum + cost.totalCost,
      0
    );
  };

  return (
    <div className="space-y-4">
      {/* Filtreleme ve Arama Alanı */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            {/* Arama */}
            <div className="flex flex-grow gap-2">
              <Input
                placeholder="Tarla, işçi veya açıklamada ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()} // Enter ile arama
                className="max-w-sm"
              />
              <Button onClick={handleSearch} size="sm">
                <Search className="h-4 w-4 mr-2" />
                Ara
              </Button>
            </div>
            {/* Filtreleme (Şimdilik basit buton) */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled> {/* Şimdilik devre dışı */}
                <Filter className="h-4 w-4 mr-2" />
                Filtrele
              </Button>
              {/* Başka filtre butonları eklenebilir */}
            </div>
          </div>
        </CardContent>
      </Card>
      {/* // Filtreleme ve Arama Alanı Sonu */}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarla</TableHead>
              <TableHead>İşlem Tipi</TableHead>
              <TableHead>İşlenen Alan</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Yapan</TableHead>
              <TableHead>Toplam Maliyet</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  İşlemler yükleniyor...
                </TableCell>
              </TableRow>
            ) : processes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Henüz işlem kaydı bulunmuyor.
                </TableCell>
              </TableRow>
            ) : (
              processes.map((process) => (
                <TableRow key={process.id}>
                  <TableCell className="font-medium">
                    {process.field.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getTypeLabel(process.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {process.processedArea.toFixed(2)} dekar
                    <span className="text-xs text-muted-foreground ml-1">
                      (%{process.processedPercentage})
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(process.date)}</TableCell>
                  <TableCell>{process.worker.name}</TableCell>
                  <TableCell>
                    {formatCurrency(calculateTotalCost(process))}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" asChild>
                        <Link href={`/dashboard/owner/processes/${process.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="outline" size="icon" asChild>
                        <Link
                          href={`/dashboard/owner/processes/${process.id}/edit`}
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(process.id)}
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
              İşlemi silmek istediğinize emin misiniz?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Bu kayıt ve ilişkili tüm maliyet verileri
              kalıcı olarak silinecektir.
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
