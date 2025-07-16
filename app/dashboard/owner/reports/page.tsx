'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDateRangePicker } from '@/components/date-range-picker';
import { toast } from '@/components/ui/use-toast';
import { addDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';

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
  const [selectedField, setSelectedField] = useState<string>('');
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
        const response = await fetch('/api/fields?fetchAll=true'); 
        if (!response.ok) throw new Error('Tarlalar yüklenemedi.');
        const data = await response.json();
        // Gelen verinin içindeki 'data' dizisini state'e atıyoruz
        if (Array.isArray(data.data)) {
          setFields(data.data);
        } else {
          setFields([]);
          throw new Error("API'den beklenen formatta tarla verisi gelmedi.");
        }
      } catch (error: any) {
        toast({ title: 'Hata', description: error.message, variant: 'destructive' });
      }
    };
    fetchFields();
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedField || !dateRange?.from || !dateRange?.to) {
      toast({ title: 'Eksik Bilgi', description: 'Lütfen bir tarla ve geçerli bir tarih aralığı seçin.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setReportData(null);

    try {
      const response = await fetch('/api/reports/field-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldId: selectedField,
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Rapor oluşturulurken bir hata oluştu.');
      }

      const data = await response.json();
      setReportData(data);

    } catch (error: any) {
      toast({ title: 'Rapor Hatası', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tarla Bazlı Raporlama</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Rapor Filtreleri</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Tarla Seçin</label>
            <Select onValueChange={setSelectedField} value={selectedField}>
              <SelectTrigger>
                <SelectValue placeholder="Bir tarla seçin..." />
              </SelectTrigger>
              <SelectContent>
                {fields.map((field) => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Tarih Aralığı Seçin</label>
            <CalendarDateRangePicker date={dateRange} onSelect={setDateRange} />
          </div>
          <div>
            <Button onClick={handleGenerateReport} disabled={isLoading}>
              {isLoading ? 'Oluşturuluyor...' : 'Rapor Oluştur'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>Rapor Sonuçları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader><CardTitle>Toplam Sulama</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{reportData.totalIrrigationHours} saat</p>
                        <p className="text-sm text-muted-foreground">{reportData.logCount} sulama kaydı bulundu</p>
                    </CardContent>
                </Card>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Kullanılan Malzemeler</h3>
              <div className="border rounded-md">
                <table className="min-w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Malzeme</th>
                      <th className="px-4 py-2 text-right">Miktar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.inventoryUsage.length > 0 ? (
                      reportData.inventoryUsage.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="px-4 py-2">{item.itemName}</td>
                          <td className="px-4 py-2 text-right font-mono">{item.totalQuantity.toFixed(2)} {item.unit}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="text-center py-4 text-muted-foreground">
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
