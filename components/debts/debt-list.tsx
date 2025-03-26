"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Edit,
  Trash,
  MoreHorizontal,
  Bell,
  CheckCircle,
  AlertTriangle,
  CreditCard,
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
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
import { formatCurrency } from "@/lib/utils";
import type { DebtStatus } from "@prisma/client";

// Debt tipini tanımlayalım
export interface Debt {
  id: string;
  amount: number;
  dueDate: string;
  status: DebtStatus;
  description?: string;
  reason?: string;
  paymentDate?: string;
  reminderSent: boolean;
  lastReminderDate?: string;
  creditor: {
    id: string;
    name: string;
  };
  debtor: {
    id: string;
    name: string;
  };
  paymentHistory: {
    id: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    notes?: string;
  }[];
}

export interface DebtListProps {
  debts: Debt[];
}

export default function DebtList({ debts: initialDebts }: DebtListProps) {
  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const router = useRouter();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Durum rengini belirle
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-500/10 text-green-500 border-green-500";
      case "OVERDUE":
        return "bg-red-500/10 text-red-500 border-red-500";
      case "CANCELLED":
        return "bg-gray-500/10 text-gray-500 border-gray-500";
      case "PARTIALLY_PAID":
        return "bg-blue-500/10 text-blue-500 border-blue-500";
      default:
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500";
    }
  };

  // Durum metnini belirle
  const getStatusText = (status: string) => {
    switch (status) {
      case "PAID":
        return "Ödendi";
      case "OVERDUE":
        return "Gecikti";
      case "CANCELLED":
        return "İptal Edildi";
      case "PARTIALLY_PAID":
        return "Kısmen Ödendi";
      default:
        return "Bekliyor";
    }
  };

  // Borç nedenini belirle
  const getReasonText = (reason?: string) => {
    if (!reason) return "Belirtilmemiş";

    switch (reason) {
      case "PURCHASE":
        return "Alış";
      case "LOAN":
        return "Kredi";
      case "SERVICE":
        return "Hizmet";
      case "EQUIPMENT":
        return "Ekipman";
      default:
        return "Diğer";
    }
  };

  // Borç silme
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/debts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Borç silinirken bir hata oluştu");
      }

      toast({
        title: "Başarılı",
        description: "Borç başarıyla silindi.",
      });

      router.refresh();
    } catch (error: any) {
      console.error("Error deleting debt:", error);
      toast({
        title: "Hata",
        description: error.message || "Borç silinirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Hatırlatma gönder
  const sendReminder = async (id: string) => {
    try {
      const response = await fetch("/api/debts/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          debtIds: [id],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Hatırlatma gönderilirken bir hata oluştu"
        );
      }

      toast({
        title: "Başarılı",
        description: "Hatırlatma başarıyla gönderildi.",
      });

      router.refresh();
    } catch (error: any) {
      console.error("Error sending reminder:", error);
      toast({
        title: "Hata",
        description:
          error.message || "Hatırlatma gönderilirken bir hata oluştu.",
      });
    }
  };

  // Borcu ödenmiş olarak işaretle
  const markAsPaid = async (id: string) => {
    try {
      const response = await fetch(`/api/debts/${id}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: debts.find((debt) => debt.id === id)?.amount || 0,
          paymentMethod: "CASH",
          paymentDate: new Date().toISOString(),
          notes: "Otomatik ödeme",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            "Borç ödenmiş olarak işaretlenirken bir hata oluştu"
        );
      }

      toast({
        title: "Başarılı",
        description: "Borç ödenmiş olarak işaretlendi.",
      });

      router.refresh();
    } catch (error: any) {
      console.error("Error marking debt as paid:", error);
      toast({
        title: "Hata",
        description:
          error.message ||
          "Borç ödenmiş olarak işaretlenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  if (debts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border rounded-lg">
        <h3 className="text-xl font-semibold mb-2">Henüz borç bulunmuyor</h3>
        <p className="text-muted-foreground mb-4">
          Borç kayıtlarınızı takip etmek için yeni bir borç ekleyin.
        </p>
        <Button asChild>
          <Link href="/dashboard/owner/debts/new">Yeni Borç Oluştur</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {debts.map((debt) => (
        <Card
          key={debt.id}
          className={debt.status === "OVERDUE" ? "border-red-500" : ""}
        >
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                {formatCurrency(debt.amount)}
                <Badge
                  variant="outline"
                  className={getStatusColor(debt.status)}
                >
                  {getStatusText(debt.status)}
                </Badge>
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/owner/debts/${debt.id}`}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Detaylar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/owner/debts/${debt.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Düzenle
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => sendReminder(debt.id)}>
                    <Bell className="mr-2 h-4 w-4" />
                    Hatırlatma Gönder
                  </DropdownMenuItem>
                  {debt.status !== "PAID" && (
                    <DropdownMenuItem onClick={() => markAsPaid(debt.id)}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Ödenmiş Olarak İşaretle
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => setDeleteId(debt.id)}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Sil
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CardDescription>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>Alacaklı:</span>
                  <span className="font-medium">{debt.creditor.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Borçlu:</span>
                  <span className="font-medium">{debt.debtor.name}</span>
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vade Tarihi:</span>
                <span
                  className={
                    debt.status === "OVERDUE" ? "text-red-500 font-medium" : ""
                  }
                >
                  {format(new Date(debt.dueDate), "PPP", { locale: tr })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Borç Nedeni:</span>
                <span>{getReasonText(debt.reason)}</span>
              </div>
              {debt.description && (
                <div className="mt-2 text-sm">
                  <p className="text-muted-foreground mb-1">Açıklama:</p>
                  <p>{debt.description}</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex items-center text-sm text-muted-foreground">
              {debt.status === "OVERDUE" && (
                <div className="flex items-center text-red-500">
                  <AlertTriangle className="mr-1 h-4 w-4" />
                  <span>Vadesi Geçmiş</span>
                </div>
              )}
              {debt.reminderSent && (
                <div className="flex items-center">
                  <Bell className="mr-1 h-4 w-4" />
                  <span>Hatırlatma Gönderildi</span>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/owner/debts/${debt.id}`}>Detaylar</Link>
            </Button>
          </CardFooter>
        </Card>
      ))}

      {/* Silme onay dialogu */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Borcu silmek istediğinize emin misiniz?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Bu borç kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
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
