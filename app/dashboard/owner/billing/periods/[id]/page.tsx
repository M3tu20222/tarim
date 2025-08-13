"use client";

import { useState, useEffect } from "react";
import { notFound, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RecordPaymentDialog } from "@/components/billing/record-payment-dialog";
import { toast } from "@/components/ui/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { WellBillingPeriod, WellBillDistribution, Well, User, Field, Debt } from "@prisma/client";

// Define the type for the period data we expect
type PeriodDetails = WellBillingPeriod & {
  well: Well;
  distributions: (WellBillDistribution & {
    owner: Pick<User, "id" | "name" | "email">;
    field: Pick<Field, "name">;
    debt: Debt | null;
  })[];
};

export default function BillingPeriodDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [period, setPeriod] = useState<PeriodDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [payingOwnerId, setPayingOwnerId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchPeriodDetails = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/billing/periods/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          throw new Error("Dönem detayları yüklenemedi.");
        }
        const data = await response.json();
        setPeriod(data);
      } catch (error: any) {
        console.error("Failed to fetch period details:", error);
        toast({
          title: "Hata",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPeriodDetails();
  }, [id]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Yükleniyor...</div>;
  }

  if (!period) {
    // notFound() must be called within a Server Component or a Page, so we handle it differently here.
    // In a real app, you might redirect or show a more specific error component.
    return <div className="text-center text-red-500">Dönem bulunamadı.</div>;
  }

  const uniqueOwners = Array.from(new Map(period.distributions.map(d => [d.owner.id, d.owner])).values());

  const handlePaymentRecorded = () => {
    toast({
      title: "Başarılı",
      description: "Ödeme kaydedildi. Sayfa yenileniyor...",
    });
    // Fetch data again to reflect changes
    const fetchPeriodDetails = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/billing/periods/${id}`);
        if (!response.ok) throw new Error("Dönem detayları yeniden yüklenemedi.");
        const data = await response.json();
        setPeriod(data);
      } catch (error: any) {
        toast({ title: "Hata", description: error.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchPeriodDetails();
  };

  const ownerTotals = period.distributions.reduce((acc, dist) => {
    const ownerId = dist.owner.id;
    if (!acc[ownerId]) {
      acc[ownerId] = { 
        name: dist.owner.name || "Bilinmeyen Sahip", 
        total: 0,
        unpaidDebtIds: [],
        isFullyPaid: true 
      };
    }
    acc[ownerId].total += dist.amount;
    if (dist.debt && dist.debt.status !== 'PAID') {
      acc[ownerId].unpaidDebtIds.push(dist.debt.id);
      acc[ownerId].isFullyPaid = false;
    }
    return acc;
  }, {} as Record<string, { name: string; total: number; unpaidDebtIds: string[]; isFullyPaid: boolean }>);

  const handlePayDebts = async (ownerId: string) => {
    const ownerInfo = ownerTotals[ownerId];
    if (!ownerInfo || ownerInfo.unpaidDebtIds.length === 0) {
      toast({ title: "Bilgi", description: "Ödenecek borç bulunmuyor." });
      return;
    }

    setPayingOwnerId(ownerId);

    try {
      const paymentPromises = ownerInfo.unpaidDebtIds.map(debtId => {
        // We need to fetch the debt amount to pay it fully
        const distribution = period.distributions.find(d => d.debt?.id === debtId);
        if (!distribution || !distribution.debt) return Promise.reject(`Borç detayı bulunamadı: ${debtId}`);
        
        return fetch(`/api/debts/${debtId}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: distribution.debt.amount, // Pay the full amount of the specific debt
            paymentMethod: 'BANK_TRANSFER',
            paymentDate: new Date().toISOString(),
            notes: `Fatura dönemi ${period.id} için otomatik ödeme.`
          }),
        });
      });

      const results = await Promise.all(paymentPromises);

      const allSuccess = results.every(res => res.ok);

      if (allSuccess) {
        toast({
          title: "Başarılı",
          description: `${ownerInfo.name} için tüm borçlar ödendi.`,
        });
        // Refresh the page to show the new status
        window.location.reload();
      } else {
        throw new Error("Bazı ödemeler başarısız oldu.");
      }
    } catch (error: any) {
      console.error("Ödeme işlemi başarısız:", error);
      toast({
        title: "Ödeme Hatası",
        description: error.message || "Borçlar ödenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setPayingOwnerId(null);
    }
  };

  const totalDurationInMinutes = period.distributions.reduce(
    (sum, dist) => sum + dist.basisDuration,
    0
  );
  const totalDurationInHours = totalDurationInMinutes / 60;
  const hourlyRate =
    totalDurationInHours > 0
      ? period.totalAmount / totalDurationInHours
      : 0;

  const handleDownloadPdf = async () => {
    const doc = new jsPDF();

    // Helper function to convert ArrayBuffer to Base64
    function arrayBufferToBase64(buffer: ArrayBuffer) {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    }

    try {
      // Fetch the font file from the public directory
      const fontResponse = await fetch('/fonts/LiberationSans-Regular.ttf');
      if (!fontResponse.ok) {
        throw new Error('Font file could not be loaded.');
      }
      const font = await fontResponse.arrayBuffer();
      
      // Add the font to jsPDF's virtual file system
      doc.addFileToVFS('LiberationSans-Regular.ttf', arrayBufferToBase64(font));
      doc.addFont('LiberationSans-Regular.ttf', 'LiberationSans', 'normal');
      doc.setFont('LiberationSans');

      // Set text and generate tables as before
      doc.text(`Kuyu Fatura Raporu: ${period.well.name}`, 14, 20);
      doc.text(`Dönem: ${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`, 14, 28);
      
      const ownerData = Object.values(ownerTotals).map(ownerInfo => [ownerInfo.name, `${ownerInfo.total.toFixed(2)} TL`]);
      autoTable(doc, {
        startY: 35,
        head: [['Sahip', 'Toplam Tutar']],
        body: ownerData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], font: 'LiberationSans' },
        styles: { font: 'LiberationSans' },
      });

      const summaryData = [
          ['Toplam Tutar', `${period.totalAmount.toFixed(2)} TL`],
          ['Saatlik Ücret', `${hourlyRate.toFixed(2)} TL/saat`],
          ['Toplam Süre', `${totalDurationInHours.toFixed(2)} saat`],
      ];
      autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 10,
          head: [['Özet Kalemi', 'Değer']],
          body: summaryData,
          theme: 'grid',
          headStyles: { fillColor: [22, 160, 133], font: 'LiberationSans' },
          styles: { font: 'LiberationSans' },
      });

      const tableData = period.distributions.map(dist => [
        dist.field.name,
        dist.owner.name,
        (dist.basisDuration / 60).toFixed(2),
        `${dist.amount.toFixed(2)} TL`,
        dist.debt?.status === 'PAID' ? 'Ödendi' : 'Ödenmedi',
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Tarla Adı', 'Sahip', 'Süre (saat)', 'Tutar', 'Ödeme Durumu']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80], font: 'LiberationSans' },
        styles: { font: 'LiberationSans' },
      });

      doc.save(`fatura-raporu-${period.id}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast({
        title: "PDF Oluşturma Hatası",
        description: "Font dosyası yüklenemedi veya PDF oluşturulurken bir hata oluştu. Lütfen 'public/fonts' klasöründe 'LiberationSans-Regular.ttf' dosyasının bulunduğundan emin olun.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8 cyberpunk-grid p-4 md:p-6">
       <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-bold neon-text-purple animate-flicker">
          Fatura Detayları
        </h1>
        <div className="flex gap-2">
          <RecordPaymentDialog
            periodId={id}
            owners={uniqueOwners}
            ownerTotals={ownerTotals}
            wellName={period.well.name}
            startDate={period.startDate}
            endDate={period.endDate}
            totalAmount={period.totalAmount}
            onPaymentRecorded={handlePaymentRecorded}
          />
          <Button onClick={handleDownloadPdf} className="btn-cyberpunk">
            PDF Olarak İndir
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(ownerTotals).map(([ownerId, ownerInfo]) => (
          <Card key={ownerId} className="card-cyberpunk flex flex-col justify-between">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium neon-text-cyan">{ownerInfo.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold neon-text-green">{ownerInfo.total.toFixed(2)} TL</div>
              <p className="text-xs text-muted-foreground mb-4">
                Toplam Bakiye
              </p>
              {ownerInfo.isFullyPaid ? (
                 <div className="text-center py-2 px-4 rounded-md bg-green-900/50 text-green-300 border border-green-500/50 font-semibold">
                   Tümü Ödendi
                 </div>
              ) : (
                <Button 
                  onClick={() => handlePayDebts(ownerId)} 
                  disabled={payingOwnerId === ownerId}
                  className="w-full btn-cyberpunk-secondary"
                >
                  {payingOwnerId === ownerId ? 'Ödeniyor...' : 'Toplu Ödeme Yap'}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="card-cyberpunk">
        <CardHeader>
          <CardTitle className="neon-text-cyan">Dönem Özeti</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="font-semibold neon-text-pink">Kuyu Adı</h3>
            <p>{period.well.name}</p>
          </div>
          <div>
            <h3 className="font-semibold neon-text-pink">Dönem</h3>
            <p>
              {new Date(period.startDate).toLocaleDateString()} -{" "}
              {new Date(period.endDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <h3 className="font-semibold neon-text-pink">Toplam Tutar</h3>
            <p>{period.totalAmount.toFixed(2)} TL</p>
          </div>
          <div>
            <h3 className="font-semibold neon-text-pink">Saatlik Ücret</h3>
            <p>{hourlyRate.toFixed(2)} TL/saat</p>
          </div>
          <div>
            <h3 className="font-semibold neon-text-pink">Toplam Süre</h3>
            <p>{totalDurationInHours.toFixed(2)} saat</p>
          </div>
        </CardContent>
      </Card>

      <Card className="card-cyberpunk">
        <CardHeader>
          <CardTitle className="neon-text-cyan">Detaylı Dağıtım Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-purple-500/30 rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-purple-500/10">
                  <TableHead className="neon-text-pink">Tarla Adı</TableHead>
                  <TableHead className="neon-text-pink">Sahip</TableHead>
                  <TableHead className="text-right neon-text-pink">Süre (saat)</TableHead>
                  <TableHead className="text-right neon-text-pink">Tutar</TableHead>
                  <TableHead className="text-center neon-text-pink">Ödeme Durumu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-purple-500/30">
                {period.distributions.map((dist) => {
                  const isPaid = dist.debt?.status === "PAID";
                  return (
                    <TableRow key={dist.id} className="bg-background/50 hover:bg-purple-500/20 transition-colors duration-200">
                      <TableCell className="font-medium">
                        {dist.field.name}
                      </TableCell>
                      <TableCell>{dist.owner.name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {(dist.basisDuration / 60).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold font-mono">
                        {dist.amount.toFixed(2)} TL
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            isPaid
                              ? "bg-green-900/50 text-green-300 border border-green-500/50"
                              : "bg-red-900/50 text-red-300 border border-red-500/50"
                          }`}
                        >
                          {isPaid ? "Ödendi" : "Ödenmedi"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
