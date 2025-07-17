"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDateRangePicker } from "@/components/date-range-picker";
import { toast } from "@/components/ui/use-toast";
import { addDays } from "date-fns";
import type { DateRange } from "react-day-picker";

// Define types for the data we expect from the API
interface Field {
  id: string;
  name: string;
}

interface InventoryUsage {
  itemName: string;
  totalQuantity: number;
  unit: string;
}

interface ReportData {
  totalIrrigationHours: number;
  inventoryUsage: InventoryUsage[];
  logCount: number;
}

export default function FieldReportsPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)), // Default to one month ago
    to: new Date(),
  });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch fields for the select dropdown
  useEffect(() => {
    const fetchFields = async () => {
      try {
        // fetchAll=true parametresi ile tüm tarlaları çekiyoruz
        const response = await fetch("/api/fields?fetchAll=true");
        if (!response.ok) throw new Error("Tarlalar yüklenemedi.");
        const data = await response.json();
        // Gelen verinin içindeki 'data' dizisini state'e atıyoruz
        if (Array.isArray(data.data)) {
          setFields(data.data);
        } else {
          setFields([]);
          throw new Error("API'den beklenen formatta tarla verisi gelmedi.");
        }
      } catch (error: any) {
        toast({
          title: "Hata",
          description: error.message,
          variant: "destructive",
        });
      }
    };
    fetchFields();
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedField || !dateRange?.from || !dateRange?.to) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen bir tarla ve geçerli bir tarih aralığı seçin.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setReportData(null);

    try {
      const response = await fetch("/api/reports/field-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldId: selectedField,
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Rapor oluşturulurken bir hata oluştu."
        );
      }

      const data = await response.json();
      setReportData(data);
    } catch (error: any) {
      toast({
        title: "Rapor Hatası",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 cyberpunk-grid p-4 md:p-6">
      <h1 className="text-3xl md:text-4xl font-bold neon-text-purple animate-flicker">
        Tarla Bazlı Raporlama
      </h1>

      <Card className="card-cyberpunk">
        <CardHeader>
          <CardTitle className="neon-text-cyan">Rapor Filtreleri</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium neon-text-pink">
              Tarla Seçin
            </label>
            <Select onValueChange={setSelectedField} value={selectedField}>
              <SelectTrigger className="neon-border">
                <SelectValue placeholder="Bir tarla seçin..." />
              </SelectTrigger>
              <SelectContent className="bg-background/80 backdrop-blur-sm border-purple-500/30">
                {fields.map((field) => (
                  <SelectItem
                    key={field.id}
                    value={field.id}
                    className="hover:bg-purple-500/20"
                  >
                    {field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium neon-text-pink">
              Tarih Aralığı Seçin
            </label>
            <CalendarDateRangePicker
              date={dateRange}
              onSelect={setDateRange}
              className="neon-border"
            />
          </div>
          <div>
            <Button
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="btn-cyberpunk"
            >
              {isLoading ? "Oluşturuluyor..." : "Rapor Oluştur"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <Card className="card-cyberpunk animate-pulse-neon">
          <CardHeader>
            <CardTitle className="neon-text-cyan">Rapor Sonuçları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-background/80 backdrop-blur-sm border-cyan-500/30 neon-glow-cyan">
                <CardHeader>
                  <CardTitle className="neon-text-cyan">
                    Toplam Sulama
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl lg:text-5xl font-bold neon-text-green">
                    {reportData.totalIrrigationHours} saat
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {reportData.logCount} sulama kaydı bulundu
                  </p>
                </CardContent>
              </Card>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3 neon-text-cyan">
                Kullanılan Malzemeler
              </h3>
              <div className="border border-purple-500/30 rounded-md overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-bold uppercase neon-text-pink tracking-wider">
                        Malzeme
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-bold uppercase neon-text-pink tracking-wider">
                        Miktar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-500/30">
                    {reportData.inventoryUsage.length > 0 ? (
                      reportData.inventoryUsage.map((item, index) => (
                        <tr
                          key={index}
                          className="bg-background/50 hover:bg-purple-500/10 transition-colors duration-200"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            {item.itemName}
                          </td>
                          <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                            {item.totalQuantity.toFixed(2)} {item.unit}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={2}
                          className="text-center py-6 text-muted-foreground"
                        >
                          Bu dönemde malzeme kullanımı kaydedilmemiş.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
