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
import { Eye, CheckCircle, Clock, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WorkerProcessListProps {
  userId: string;
}

export function WorkerProcessList({ userId }: WorkerProcessListProps) {
  const router = useRouter();
  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [activeTab, setActiveTab] = useState("pending"); // pending, completed, upcoming
  const pageSize = 10;

  useEffect(() => {
    fetchProcesses();
  }, [page, activeTab]);

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/worker/processes?page=${page}&pageSize=${pageSize}&userId=${userId}&status=${activeTab}`);
      const data = await response.json();
      
      if (data.success) {
        setProcesses(data.processes);
        setTotalPages(data.totalPages);
        setTotalRecords(data.totalRecords);
      } else {
        console.error("İşlem kayıtları alınamadı:", data.error);
      }
    } catch (error) {
      console.error("İşlem kayıtları alınamadı:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1); // Tab değiştiğinde sayfa numarasını sıfırla
  };

  const getProcessTypeText = (type: string) => {
    const types: Record<string, string> = {
      PLOWING: "Sürme",
      SEEDING: "Ekim",
      FERTILIZING: "Gübreleme",
      PESTICIDE: "İlaçlama",
      HARVESTING: "Hasat",
      OTHER: "Diğer"
    };
    return types[type] || type;
  };

  const getStatusBadge = (process: any) => {
    // Bugünün tarihini al
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Process tarihini al
    const processDate = new Date(process.date);
    processDate.setHours(0, 0, 0, 0);
    
    // Tamamlanma durumunu kontrol et (processedPercentage 100 ise tamamlanmış)
    const isCompleted = process.processedPercentage === 100;
    
    // İleri tarihli mi kontrol et
    const isUpcoming = processDate > today;
    
    // Bugün mü kontrol et
    const isToday = processDate.getTime() === today.getTime();
    
    // Geçmiş tarihli ve tamamlanmamış mı kontrol et
    const isOverdue = processDate < today && !isCompleted;

    if (isCompleted) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Tamamlandı
        </Badge>
      );
    } else if (isUpcoming) {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500">
          <Calendar className="h-3 w-3 mr-1" />
          Planlandı
        </Badge>
      );
    } else if (isToday) {
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500">
          <Clock className="h-3 w-3 mr-1" />
          Bugün
        </Badge>
      );
    } else if (isOverdue) {
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500">
          <Clock className="h-3 w-3 mr-1" />
          Gecikmiş
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500">
          Devam Ediyor
        </Badge>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>İşlem Görevlerim</CardTitle>
            <CardDescription>
              Toplam {totalRecords} kayıt bulundu. Sayfa {page}/{totalPages}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Bekleyen Görevler</TabsTrigger>
            <TabsTrigger value="upcoming">Planlanan Görevler</TabsTrigger>
            <TabsTrigger value="completed">Tamamlanan Görevler</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab}>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            ) : processes.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-40">
                <p className="text-muted-foreground">
                  {activeTab === "pending" && "Bekleyen göreviniz bulunmamaktadır."}
                  {activeTab === "upcoming" && "Planlanan göreviniz bulunmamaktadır."}
                  {activeTab === "completed" && "Tamamlanan göreviniz bulunmamaktadır."}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarla</TableHead>
                        <TableHead>İşlem Tipi</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>İlerleme</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processes.map((process) => (
                        <TableRow key={process.id}>
                          <TableCell>{process.field?.name || "Genel"}</TableCell>
                          <TableCell>{getProcessTypeText(process.type)}</TableCell>
                          <TableCell>
                            {format(new Date(process.date), "dd MMM yyyy", { locale: tr })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="bg-primary h-2.5 rounded-full" 
                                  style={{ width: `${process.processedPercentage}%` }}
                                ></div>
                              </div>
                              <span className="text-xs">{process.processedPercentage}%</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(process)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/dashboard/worker/processes/${process.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
