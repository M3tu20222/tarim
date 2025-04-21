"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Edit, Eye, MoreHorizontal, Trash } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

interface IrrigationLog {
  id: string;
  date: string;
  amount: number;
  duration: number;
  method: string;
  notes?: string;
  field: {
    id: string;
    name: string;
    location: string;
  };
  worker: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export function IrrigationList() {
  const [irrigationLogs, setIrrigationLogs] = useState<IrrigationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Sulama kayıtlarını getir
  useEffect(() => {
    const fetchIrrigationLogs = async () => {
      setLoading(true);
      try {
        // URL parametrelerini al
        const fieldId = searchParams.get("fieldId");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const method = searchParams.get("method");

        // Query string oluştur
        let queryString = "";
        if (fieldId) queryString += `fieldId=${fieldId}&`;
        if (startDate) queryString += `startDate=${startDate}&`;
        if (endDate) queryString += `endDate=${endDate}&`;
        if (method) queryString += `method=${method}&`;

        // API'den verileri getir
        const response = await fetch(`/api/irrigation?${queryString}`);
        if (!response.ok) {
          throw new Error("Sulama kayıtları getirilemedi");
        }
        const data = await response.json();
        setIrrigationLogs(data);
      } catch (error) {
        console.error("Error fetching irrigation logs:", error);
        toast({
          title: "Hata",
          description: "Sulama kayıtları yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchIrrigationLogs();
  }, [searchParams, toast]);

  // Sulama kaydını sil
  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/irrigation/${deleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Sulama kaydı silinemedi");
      }

      // Başarılı silme işlemi
      setIrrigationLogs((prev) => prev.filter((log) => log.id !== deleteId));
      toast({
        title: "Başarılı",
        description: "Sulama kaydı başarıyla silindi.",
      });
    } catch (error) {
      console.error("Error deleting irrigation log:", error);
      toast({
        title: "Hata",
        description: "Sulama kaydı silinirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Sulama yöntemine göre badge rengi
  const getMethodBadgeVariant = (method: string) => {
    switch (method) {
      case "DRIP":
        return "default";
      case "SPRINKLER":
        return "secondary";
      case "FLOOD":
        return "destructive";
      case "CENTER_PIVOT":
        return "outline";
      default:
        return "default";
    }
  };

  // Sulama yöntemini Türkçe'ye çevir
  const getMethodTranslation = (method: string) => {
    switch (method) {
      case "DRIP":
        return "Damla Sulama";
      case "SPRINKLER":
        return "Yağmurlama";
      case "FLOOD":
        return "Salma Sulama";
      case "CENTER_PIVOT":
        return "Merkezi Pivot";
      case "MANUAL":
        return "Manuel Sulama";
      case "OTHER":
        return "Diğer";
      default:
        return method;
    }
  };

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarla</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Miktar (L)</TableHead>
              <TableHead>Süre (dk)</TableHead>
              <TableHead>Yöntem</TableHead>
              <TableHead>İşçi</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {irrigationLogs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  Sulama kaydı bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              irrigationLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/owner/fields/${log.field.id}`}
                      className="hover:underline"
                    >
                      {log.field.name}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(log.date)}</TableCell>
                  <TableCell>{log.amount}</TableCell>
                  <TableCell>{log.duration}</TableCell>
                  <TableCell>
                    <Badge variant={getMethodBadgeVariant(log.method)}>
                      {getMethodTranslation(log.method)}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.worker.name}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Menüyü aç</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/owner/irrigation/${log.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Görüntüle
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/dashboard/owner/irrigation/${log.id}/edit`}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Düzenle
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteId(log.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem sulama kaydını kalıcı olarak silecektir. Bu işlem geri
              alınamaz.
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
    </>
  );
}
