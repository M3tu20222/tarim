"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Edit, Trash, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";
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

interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
  isActive: boolean;
  creator: {
    id: string;
    name: string;
  };
}

export function SeasonList() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await fetch("/api/seasons");
        if (!response.ok) {
          throw new Error("Sezonlar yüklenirken bir hata oluştu");
        }
        const data = await response.json();
        // API'den gelen verinin { data: [...] } formatında olup olmadığını kontrol et
        if (data && Array.isArray(data.data)) {
          setSeasons(data.data);
        } else if (Array.isArray(data)) {
          // Eski format (direkt dizi) için yedek
          setSeasons(data);
        } else {
          console.error("API'den beklenmedik veri yapısı:", data);
          setSeasons([]); // Boş bir dizi ata
          setError("Sezonlar yüklenirken bir hata oluştu: Beklenmedik veri yapısı");
        }
      } catch (error) {
        console.error("Error fetching seasons:", error);
        setError("Sezonlar yüklenirken bir hata oluştu");
        toast({
          title: "Hata",
          description: "Sezonlar yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSeasons();
  }, [toast]);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/seasons/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Sezon silinirken bir hata oluştu");
      }

      setSeasons(seasons.filter((season) => season.id !== id));
      toast({
        title: "Başarılı",
        description: "Sezon başarıyla silindi.",
      });
    } catch (error: any) {
      console.error("Error deleting season:", error);
      toast({
        title: "Hata",
        description: error.message || "Sezon silinirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      const season = seasons.find((s) => s.id === id);
      if (!season) return;

      const response = await fetch(`/api/seasons/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...season,
          startDate: new Date(season.startDate),
          endDate: new Date(season.endDate),
          isActive: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Sezon güncellenirken bir hata oluştu"
        );
      }

      // Tüm sezonları güncelle
      setSeasons(
        seasons.map((s) => ({
          ...s,
          isActive: s.id === id,
        }))
      );

      toast({
        title: "Başarılı",
        description: "Aktif sezon değiştirildi.",
      });
    } catch (error: any) {
      console.error("Error updating season:", error);
      toast({
        title: "Hata",
        description: error.message || "Sezon güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Sezonlar yükleniyor...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => router.refresh()}>Yeniden Dene</Button>
      </div>
    );
  }

  if (seasons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border rounded-lg">
        <h3 className="text-xl font-semibold mb-2">Henüz sezon bulunmuyor</h3>
        <p className="text-muted-foreground mb-4">
          Tarım faaliyetlerinizi organize etmek için bir sezon oluşturun.
        </p>
        <Button asChild>
          <Link href="/dashboard/owner/seasons/new">Yeni Sezon Oluştur</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {seasons.map((season) => (
        <Card
          key={season.id}
          className={season.isActive ? "border-green-500" : ""}
        >
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                {season.name}
                {season.isActive && (
                  <Badge
                    variant="outline"
                    className="bg-green-500/10 text-green-500 border-green-500"
                  >
                    Aktif
                  </Badge>
                )}
              </CardTitle>
            </div>
            <CardDescription>
              {formatDate(season.startDate)} - {formatDate(season.endDate)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(season.endDate) > new Date()
                  ? "Devam ediyor"
                  : "Tamamlandı"}
              </span>
            </div>
            {season.description && (
              <p className="text-sm">{season.description}</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/owner/seasons/${season.id}`}>
                  Detaylar
                </Link>
              </Button>
              {!season.isActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetActive(season.id)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Aktif Yap
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" asChild>
                <Link href={`/dashboard/owner/seasons/${season.id}/edit`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
              <AlertDialog
                open={deleteId === season.id}
                onOpenChange={(open) => !open && setDeleteId(null)}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDeleteId(season.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Sezonu silmek istediğinize emin misiniz?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Bu işlem geri alınamaz. Bu sezon kalıcı olarak
                      silinecektir.
                      {season.isActive && (
                        <p className="text-red-500 mt-2">
                          Bu sezon şu anda aktif! Silmek, sistemde sorunlara
                          neden olabilir.
                        </p>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                      İptal
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(season.id)}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? "Siliniyor..." : "Sil"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
