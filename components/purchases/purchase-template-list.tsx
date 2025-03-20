"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Copy, Edit, Trash, Package, Users } from "lucide-react";
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

export function PurchaseTemplateList() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch("/api/purchase-templates");
        if (response.ok) {
          const data = await response.json();
          setTemplates(data);
        } else {
          throw new Error("Şablonlar yüklenirken bir hata oluştu");
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
        toast({
          title: "Hata",
          description: "Şablonlar yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [toast]);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/purchase-templates/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Şablon silinemedi");
      }

      setTemplates(templates.filter((template) => template.id !== id));
      toast({
        title: "Başarılı",
        description: "Şablon başarıyla silindi.",
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Hata",
        description: "Şablon silinirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleUseTemplate = async (id: string) => {
    router.push(`/dashboard/owner/purchases/new?templateId=${id}`);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <h3 className="mb-2 text-lg font-semibold">Henüz şablon yok</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Sık kullandığınız alışları şablon olarak kaydederek zamandan tasarruf
          edebilirsiniz.
        </p>
        <Button asChild>
          <Link href="/dashboard/owner/purchases/templates/new">
            Yeni Şablon Oluştur
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Card key={template.id} className="flex flex-col">
          <CardHeader>
            <CardTitle>{template.templateName || template.product}</CardTitle>
            <CardDescription>
              {template.templateName ? template.product : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {template.quantity} {template.unit}
                  </span>
                </div>
                <Badge variant="outline">
                  {formatCurrency(template.totalCost)}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{template.contributors.length} ortak</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleUseTemplate(template.id)}
            >
              <Copy className="mr-2 h-4 w-4" />
              Kullan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(
                  `/dashboard/owner/purchases/templates/edit/${template.id}`
                )
              }
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Düzenle</span>
            </Button>
            <AlertDialog
              open={deleteId === template.id}
              onOpenChange={(open) => !open && setDeleteId(null)}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteId(template.id)}
                >
                  <Trash className="h-4 w-4" />
                  <span className="sr-only">Sil</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Şablonu silmek istediğinize emin misiniz?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Bu işlem geri alınamaz. Bu şablon kalıcı olarak
                    silinecektir.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>
                    İptal
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(template.id)}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? "Siliniyor..." : "Sil"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
