"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DistributeBillDialog } from "./distribute-bill-dialog";
import { toast } from "@/components/ui/use-toast";
import { WellBillingPeriod, Well } from "@prisma/client";
import { useRouter } from "next/navigation";

type PeriodWithWell = WellBillingPeriod & {
  well: { name: string };
};

interface PeriodsTableProps {
  data: PeriodWithWell[];
}

export function PeriodsTable({ data }: PeriodsTableProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<WellBillingPeriod | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  const handleDistributeClick = (period: WellBillingPeriod) => {
    setSelectedPeriod(period);
    setDialogOpen(true);
  };

  const handleDialogClose = (submitted: boolean) => {
    setDialogOpen(false);
    setSelectedPeriod(null);
    if (submitted) {
      router.refresh(); // Sayfayı yenileyerek güncel veriyi çek
    }
  };

  const handleDelete = async (periodId: string) => {
    if (
      !window.confirm(
        "Bu fatura dönemini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve ilişkili tüm borç kayıtları da silinecektir."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/billing/well-periods/${periodId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fatura dönemi silinemedi.");
      }

      toast({
        title: "Başarılı",
        description: "Fatura dönemi ve ilişkili kayıtlar başarıyla silindi.",
      });
      router.refresh(); // Tabloyu güncelle
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "PENDING":
        return "secondary";
      case "DISTRIBUTED":
        return "default";
      case "PAID":
        return "success";
      default:
        return "outline";
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kuyu</TableHead>
            <TableHead>Başlangıç Tarihi</TableHead>
            <TableHead>Bitiş Tarihi</TableHead>
            <TableHead>Tutar</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((period) => (
            <TableRow key={period.id}>
              <TableCell>{period.well.name}</TableCell>
              <TableCell>
                {new Date(period.startDate).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {new Date(period.endDate).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {period.totalAmount
                  ? `${period.totalAmount.toFixed(2)} TL`
                  : "-"}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(period.status)}>
                  {period.status}
                </Badge>
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
                    <DropdownMenuItem
                      disabled={period.status !== "PENDING"}
                      onClick={() => handleDistributeClick(period)}
                    >
                      Dağıt
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(
                          `/dashboard/owner/billing/periods/${period.id}`
                        )
                      }
                    >
                      Detayları Görüntüle
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => handleDelete(period.id)}
                    >
                      Sil
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {selectedPeriod && (
        <DistributeBillDialog
          period={selectedPeriod}
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
        />
      )}
    </>
  );
}
