"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Eye, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface WorkerIrrigationListProps {
  userId: string;
}

export function WorkerIrrigationList({ userId }: WorkerIrrigationListProps) {
  const router = useRouter();
  const [irrigations, setIrrigations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    fetchIrrigations();
  }, [page]);

  const fetchIrrigations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/worker/irrigations?page=${page}&pageSize=${pageSize}&userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        setIrrigations(data.irrigations);
        setTotalPages(data.totalPages);
        setTotalRecords(data.totalRecords);
      } else {
        console.error("Sulama kayıtları alınamadı:", data.error);
      }
    } catch (error) {
      console.error("Sulama kayıtları alınamadı:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return "0 dk";
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours > 0 ? `${hours} saat ` : ''}${mins > 0 ? `${mins} dk` : hours > 0 ? '' : '0 dk'}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Sulama Kayıtlarım</CardTitle>
            <CardDescription>
              Toplam {totalRecords} kayıt bulundu. Sayfa {page}/{totalPages}
            </CardDescription>
          </div>
          <Button
            onClick={() => router.push("/dashboard/worker/irrigation/new")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Yeni Sulama Kaydı
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : irrigations.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-40">
            <p className="text-muted-foreground">Henüz sulama kaydınız bulunmamaktadır.</p>
            <Button
              variant="link"
              onClick={() => router.push("/dashboard/worker/irrigation/new")}
            >
              Yeni sulama kaydı oluştur
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarla</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Miktar (L)</TableHead>
                    <TableHead>Süre</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {irrigations.map((irrigation) => {
                    // Tarla adını al (ilk tarla kullanımını göster)
                    const fieldName = irrigation.fieldUsages && irrigation.fieldUsages.length > 0
                      ? irrigation.fieldUsages[0].field?.name
                      : "Bilinmiyor";

                    // Sulama süresi (dakika)
                    const durationMinutes = irrigation.duration;

                    // Sulama miktarı hesapla (örnek olarak)
                    // Gerçek uygulamada bu değer veritabanından gelebilir
                    const waterAmount = Math.round(irrigation.duration * 100); // Örnek hesaplama

                    return (
                      <TableRow key={irrigation.id}>
                        <TableCell>{fieldName}</TableCell>
                        <TableCell>
                          {format(new Date(irrigation.startDateTime), "dd MMM yyyy HH:mm", { locale: tr })}
                        </TableCell>
                        <TableCell>{waterAmount.toLocaleString()} L</TableCell>
                        <TableCell>{formatDuration(durationMinutes)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              irrigation.status === "COMPLETED"
                                ? "bg-green-500/10 text-green-500 border-green-500"
                                : irrigation.status === "IN_PROGRESS"
                                ? "bg-blue-500/10 text-blue-500 border-blue-500"
                                : "bg-yellow-500/10 text-yellow-500 border-yellow-500"
                            }
                          >
                            {irrigation.status === "COMPLETED"
                              ? "Tamamlandı"
                              : irrigation.status === "IN_PROGRESS"
                              ? "Devam Ediyor"
                              : "Planlandı"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/dashboard/worker/irrigation/${irrigation.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(page - 1)}
                        className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => handlePageChange(pageNum)}
                          isActive={page === pageNum}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(page + 1)}
                        className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
