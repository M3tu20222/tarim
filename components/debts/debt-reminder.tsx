"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { DebtStatus } from "@prisma/client";

interface DebtReminderProps {
  debts: {
    id: string;
    amount: number;
    dueDate: string;
    status: DebtStatus;
    reminderSent: boolean;
    lastReminderDate: string | null;
    debtor: {
      id: string;
      name: string;
    };
  }[];
}

export function DebtReminder({ debts }: DebtReminderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedDebts, setSelectedDebts] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Durum rengini belirle
  const getStatusColor = (status: DebtStatus) => {
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
  const getStatusText = (status: DebtStatus) => {
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

  // Tüm borçları seç/kaldır
  const toggleSelectAll = () => {
    if (selectedDebts.length === debts.length) {
      setSelectedDebts([]);
    } else {
      setSelectedDebts(debts.map((debt) => debt.id));
    }
  };

  // Borç seçimini değiştir
  const toggleDebt = (debtId: string) => {
    if (selectedDebts.includes(debtId)) {
      setSelectedDebts(selectedDebts.filter((id) => id !== debtId));
    } else {
      setSelectedDebts([...selectedDebts, debtId]);
    }
  };

  // Hatırlatma gönder
  const sendReminders = async () => {
    if (selectedDebts.length === 0) {
      toast({
        title: "Uyarı",
        description: "Lütfen en az bir borç seçin.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/debts/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          debtIds: selectedDebts,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Hatırlatmalar gönderilirken bir hata oluştu"
        );
      }

      const data = await response.json();
      toast({
        title: "Başarılı!",
        description: data.message,
      });

      setSelectedDebts([]);
      router.refresh();
    } catch (error: any) {
      console.error("Error sending reminders:", error);
      toast({
        title: "Hata!",
        description:
          error.message || "Hatırlatmalar gönderilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Vadesi geçmiş borçları filtrele
  const overdueDebts = debts.filter(
    (debt) => new Date(debt.dueDate) < new Date() && debt.status !== "PAID"
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Borç Hatırlatmaları</CardTitle>
        <CardDescription>
          Vadesi yaklaşan veya geçmiş borçlar için hatırlatma gönderin
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="selectAll"
              checked={selectedDebts.length === debts.length}
              onCheckedChange={toggleSelectAll}
            />
            <label
              htmlFor="selectAll"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Tümünü Seç
            </label>
          </div>

          {overdueDebts.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/50">
              <p className="text-sm text-red-600 dark:text-red-400">
                <strong>{overdueDebts.length}</strong> adet vadesi geçmiş borç
                bulunmaktadır.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {debts.map((debt) => (
              <div
                key={debt.id}
                className="flex items-center space-x-2 rounded-md border p-3"
              >
                <Checkbox
                  id={debt.id}
                  checked={selectedDebts.includes(debt.id)}
                  onCheckedChange={() => toggleDebt(debt.id)}
                />
                <div className="flex flex-1 items-center justify-between">
                  <div>
                    <p className="font-medium">{debt.debtor.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Vade:{" "}
                      {format(new Date(debt.dueDate), "PPP", { locale: tr })}
                    </p>
                    {debt.lastReminderDate && (
                      <p className="text-xs text-muted-foreground">
                        Son hatırlatma:{" "}
                        {format(new Date(debt.lastReminderDate), "PPP", {
                          locale: tr,
                        })}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(debt.amount)}</p>
                    <Badge
                      variant="outline"
                      className={getStatusColor(debt.status)}
                    >
                      {getStatusText(debt.status)}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={sendReminders}
          disabled={selectedDebts.length === 0 || isSending}
          className="ml-auto"
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gönderiliyor...
            </>
          ) : (
            <>
              <Bell className="mr-2 h-4 w-4" />
              Hatırlatma Gönder ({selectedDebts.length})
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
