"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DropletIcon as DropletPlus,
  Edit,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

// Kuyu tipi
interface Well {
  id: string;
  name: string;
  depth: number;
  capacity: number;
  status: string;
  fieldWells?: {
    field: {
      id: string;
      name: string;
    };
  }[];
  fields?: {
    id: string;
    name: string;
  }[];
}

export function WellList() {
  const router = useRouter();
  const { toast } = useToast();
  const [wells, setWells] = useState<Well[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Kuyuları getir
  useEffect(() => {
    const fetchWells = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/wells");
        if (response.ok) {
          const data = await response.json();
          setWells(data.data || []);
        } else {
          toast({
            title: "Hata",
            description: "Kuyular yüklenirken bir hata oluştu.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching wells:", error);
        toast({
          title: "Hata",
          description: "Kuyular yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWells();
  }, [toast]);

  // Kuyu sil
  const deleteWell = async (id: string) => {
    try {
      setDeleting(id);
      const response = await fetch(`/api/wells/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setWells(wells.filter((well) => well.id !== id));
        toast({
          title: "Başarılı",
          description: "Kuyu başarıyla silindi.",
        });
      } else {
        toast({
          title: "Hata",
          description: "Kuyu silinirken bir hata oluştu.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting well:", error);
      toast({
        title: "Hata",
        description: "Kuyu silinirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  // Kuyu durumu formatla
  const formatStatus = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "Aktif";
      case "INACTIVE":
        return "Pasif";
      case "MAINTENANCE":
        return "Bakımda";
      default:
        return status;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Kuyu Listesi</CardTitle>
          <CardDescription>
            Çiftliğinize ait tüm kuyuları görüntüleyin ve yönetin.
          </CardDescription>
        </div>
        <Button onClick={() => router.push("/dashboard/owner/wells/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Kuyu
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : wells.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <DropletPlus className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">
              Henüz kuyu eklenmemiş
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Çiftliğinize kuyu eklemek için "Yeni Kuyu" butonuna tıklayın.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kuyu Adı</TableHead>
                <TableHead>Derinlik (m)</TableHead>
                <TableHead>Kapasite (lt/sa)</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Bağlı Tarlalar</TableHead>
                <TableHead className="w-[100px]">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wells.map((well) => (
                <TableRow key={well.id}>
                  <TableCell className="font-medium">{well.name}</TableCell>
                  <TableCell>{well.depth}</TableCell>
                  <TableCell>{well.capacity}</TableCell>
                  <TableCell>{formatStatus(well.status)}</TableCell>
                  <TableCell>
                    {well.fieldWells?.map((fieldWell) => (
                      <div key={fieldWell.field.id} className="text-xs">
                        {fieldWell.field.name}
                      </div>
                    )) || "-"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Menüyü aç</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/dashboard/owner/wells/${well.id}`)
                          }
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => deleteWell(well.id)}
                          disabled={deleting === well.id}
                        >
                          {deleting === well.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
