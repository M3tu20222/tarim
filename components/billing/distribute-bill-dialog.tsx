"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { WellBillingPeriod } from "@prisma/client";

interface DistributeBillDialogProps {
  period: WellBillingPeriod;
  isOpen: boolean;
  onClose: (submitted: boolean) => void;
}

export function DistributeBillDialog({
  period,
  isOpen,
  onClose,
}: DistributeBillDialogProps) {
  const [totalAmount, setTotalAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const amount = parseFloat(totalAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Hata",
          description: "Lütfen geçerli bir tutar girin.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        `/api/billing/well-periods/${period.id}/distribute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ totalAmount: amount }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Fatura dağıtılırken bir hata oluştu."
        );
      }

      toast({
        title: "Başarılı",
        description: "Fatura başarıyla dağıtıldı ve borçlar oluşturuldu.",
      });
      onClose(true);
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Faturayı Dağıt</DialogTitle>
          <DialogDescription>
            {`${new Date(
              period.startDate
            ).toLocaleDateString()} - ${new Date(
              period.endDate
            ).toLocaleDateString()} dönemi için toplam fatura tutarını girin.`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="totalAmount" className="text-right">
              Tutar (TL)
            </Label>
            <Input
              id="totalAmount"
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="col-span-3"
              placeholder="Örn: 61500.00"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} disabled={isLoading}>
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Dağıtılıyor..." : "Onayla ve Dağıt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
