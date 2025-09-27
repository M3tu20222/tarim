"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
 } from "@/components/ui/card";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { CalendarDateRangePicker } from "@/components/date-range-picker"; // DateRangePicker -> CalendarDateRangePicker
 import {
   Select,
   SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Droplet, Clock, Calendar } from "lucide-react";
import { tr } from "date-fns/locale";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

// Tarla tipi
interface Field {
  id: string;
  name: string;
}

// Sezon tipi
interface Season {
  id: string;
  name: string;
  isActive: boolean;
}

// İstatistik tipi
interface IrrigationStats {
  totalAmount: number;
  totalDuration: number;
  irrigationCount: number;
  methodDistribution: {
    method: string;
    _count: {
      method: number;
    };
    _sum: {
      amount: number;
      duration: number;
    };
  }[];
  fieldDistribution: {
    fieldId: string;
    fieldName: string;
    _count: number;
    _sum: {
      amount: number;
      duration: number;
    };
  }[];
  monthlyData: {
    month: string;
    total_amount: number;
    total_duration: number;
    count: number;
  }[];
}

// Sulama metodu tipi
interface IrrigationMethod {
  value: string;
  label: string;
}

// Renk paleti
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export function IrrigationStats() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<IrrigationStats | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  // Sulama metodları
  const irrigationMethods: IrrigationMethod[] = [
    { value: "DRIP", label: "Damla Sulama" },
    { value: "SPRINKLER", label: "Yağmurlama" },
    { value: "FLOOD", label: "Salma Sulama" },
    { value: "CENTER_PIVOT", label: "Merkezi Pivot" },
    { value: "OTHER", label: "Diğer" },
  ];

  useEffect(() => {
    fetchFields();
    fetchSeasons();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [selectedField, selectedSeason, dateRange]);

  const fetchFields = async () => {
    try {
      const response = await fetch("/api/fields");
      if (response.ok) {
        const data = await response.json();
        setFields(data);
      } else {
        toast({
          title: "Hata",
          description: "Tarlalar yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching fields:", error);
      toast({
        title: "Hata",
        description: "Tarlalar yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const fetchSeasons = async () => {
    try {
      const response = await fetch("/api/seasons");
      if (response.ok) {
        const data = await response.json();
        setSeasons(data);

        // Aktif sezonu seç
        const activeSeason = data.find((season: Season) => season.isActive);
        if (activeSeason) {
          setSelectedSeason(activeSeason.id);
        }
      } else {
        toast({
          title: "Hata",
          description: "Sezonlar yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching seasons:", error);
      toast({
        title: "Hata",
        description: "Sezonlar yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);

      // URL parametrelerini oluştur
      const params = new URLSearchParams();
      if (selectedField) params.append("fieldId", selectedField);
      if (selectedSeason) params.append("seasonId", selectedSeason);
      if (dateRange.from)
        params.append("startDate", dateRange.from.toISOString());
      if (dateRange.to) params.append("endDate", dateRange.to.toISOString());

      const response = await fetch(
        `/api/irrigation/stats?${params.toString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        toast({
          title: "Hata",
          description: "İstatistikler yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast({
        title: "Hata",
        description: "İstatistikler yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Sulama metodunu formatla
  const formatMethod = (method: string) => {
    const methodObj = irrigationMethods.find((m) => m.value === method);
    return methodObj ? methodObj.label : method;
  };

  // Metod dağılımı için veri hazırla
  const prepareMethodDistributionData = () => {
    if (!stats) return [];

    return stats.methodDistribution.map((item) => ({
      name: formatMethod(item.method),
      value: item._count.method,
    }));
  };

  // Tarla dağılımı için veri hazırla
  const prepareFieldDistributionData = () => {
    if (!stats) return [];

    return stats.fieldDistribution.map((item) => ({
      name: item.fieldName,
      value: item._sum.amount,
    }));
  };

  // Aylık veri için hazırla
  const prepareMonthlyData = () => {
    if (!stats) return [];

    return stats.monthlyData.map((item) => ({
      name: format(new Date(item.month), "MMM yyyy", { locale: tr }),
      miktar: item.total_amount,
      süre: item.total_duration,
    }));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sulama İstatistikleri</CardTitle>
          <CardDescription>
            Tarla, sezon ve tarih aralığına göre sulama istatistiklerini
            görüntüleyin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Tarla</label>
              <Select
                value={selectedField || ""}
                onValueChange={(value) =>
                  setSelectedField(value === "" ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tüm tarlalar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm tarlalar</SelectItem>
                  {fields.map((field) => (
                    <SelectItem key={field.id} value={field.id}>
                      {field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Sezon</label>
              <Select
                value={selectedSeason || ""}
                onValueChange={(value) =>
                  setSelectedSeason(value === "" ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tüm sezonlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm sezonlar</SelectItem>
                  {seasons.map((season) => (
                    <SelectItem key={season.id} value={season.id}>
                      {season.name} {season.isActive && "(Aktif)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                 Tarih Aralığı
               </label>
               <CalendarDateRangePicker
                 date={dateRange}
                 onSelect={(range: DateRange | undefined) => {
                   setDateRange(range || { from: undefined, to: undefined });
                 }}
                 className="w-full"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : stats ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center">
                      <Droplet className="h-8 w-8 text-primary mb-2" />
                      <div className="text-2xl font-bold">
                        {stats.totalAmount.toLocaleString()} lt
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Toplam Sulama Miktarı
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center">
                      <Clock className="h-8 w-8 text-primary mb-2" />
                      <div className="text-2xl font-bold">
                        {stats.totalDuration.toLocaleString()} dk
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Toplam Sulama Süresi
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center">
                      <Calendar className="h-8 w-8 text-primary mb-2" />
                      <div className="text-2xl font-bold">
                        {stats.irrigationCount}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Toplam Sulama Sayısı
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="monthly">
                <TabsList className="mb-4">
                  <TabsTrigger value="monthly">Aylık Sulama</TabsTrigger>
                  <TabsTrigger value="method">Metod Dağılımı</TabsTrigger>
                  <TabsTrigger value="field">Tarla Dağılımı</TabsTrigger>
                </TabsList>

                <TabsContent value="monthly">
                  <Card>
                    <CardHeader>
                      <CardTitle>Aylık Sulama Miktarları</CardTitle>
                      <CardDescription>
                        Aylara göre sulama miktarı ve süresi
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={prepareMonthlyData()}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis
                              yAxisId="left"
                              orientation="left"
                              stroke="#8884d8"
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              stroke="#82ca9d"
                            />
                            <Tooltip />
                            <Legend />
                            <Bar
                              yAxisId="left"
                              dataKey="miktar"
                              name="Miktar (lt)"
                              fill="#8884d8"
                            />
                            <Bar
                              yAxisId="right"
                              dataKey="süre"
                              name="Süre (dk)"
                              fill="#82ca9d"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="method">
                  <Card>
                    <CardHeader>
                      <CardTitle>Sulama Metodu Dağılımı</CardTitle>
                      <CardDescription>
                        Sulama metodlarına göre dağılım
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={prepareMethodDistributionData()}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) =>
                                `${name}: ${(percent * 100).toFixed(0)}%`
                              }
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {prepareMethodDistributionData().map(
                                (entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                )
                              )}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="field">
                  <Card>
                    <CardHeader>
                      <CardTitle>Tarla Dağılımı</CardTitle>
                      <CardDescription>
                        Tarlalara göre sulama miktarı dağılımı
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={prepareFieldDistributionData()}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) =>
                                `${name}: ${(percent * 100).toFixed(0)}%`
                              }
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {prepareFieldDistributionData().map(
                                (entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                  />
                                )
                              )}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <p className="text-muted-foreground">Veri bulunamadı.</p>
                <p className="text-sm text-muted-foreground">
                  Lütfen farklı filtre seçenekleri deneyin.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
