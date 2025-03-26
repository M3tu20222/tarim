"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { CalendarIcon, Download, FileBarChart2, Loader2 } from "lucide-react";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import type { InventoryCategory, InventoryStatus } from "@prisma/client";
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

// Form şeması
const formSchema = z.object({
  category: z.string().optional(),
  seasonId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  status: z.string().optional(),
});

// Kategori enum değerlerini Türkçe etiketlere dönüştür
function getCategoryLabel(category: InventoryCategory): string {
  const labels: Record<InventoryCategory, string> = {
    SEED: "Tohum",
    FERTILIZER: "Gübre",
    PESTICIDE: "İlaç",
    EQUIPMENT: "Ekipman",
    FUEL: "Yakıt",
    OTHER: "Diğer",
  };
  return labels[category] || category;
}

// Durum enum değerlerini Türkçe etiketlere dönüştür
function getStatusLabel(status: InventoryStatus): string {
  const labels: Record<InventoryStatus, string> = {
    AVAILABLE: "Mevcut",
    LOW_STOCK: "Az Stok",
    OUT_OF_STOCK: "Stokta Yok",
    EXPIRED: "Süresi Dolmuş",
  };
  return labels[status] || status;
}

// Renk paleti
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
];

export function InventoryReport() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  // Form tanımı
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "all",
      seasonId: "all",
      status: "all",
    },
  });

  // Sezonları ve kategorileri yükle
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Sezonları getir
        const seasonsResponse = await fetch("/api/seasons");
        if (seasonsResponse.ok) {
          const seasonsData = await seasonsResponse.json();
          setSeasons(seasonsData);
        }

        // Kategorileri getir
        const categoriesResponse = await fetch("/api/inventory/categories");
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData);
        }
      } catch (error) {
        console.error("Error fetching form data:", error);
      }
    };

    fetchData();
  }, []);

  // Rapor verilerini yükle
  const fetchReport = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      // URL parametrelerini oluştur
      const params = new URLSearchParams();
      if (values.category) params.append("category", values.category);
      if (values.seasonId) params.append("seasonId", values.seasonId);
      if (values.status) params.append("status", values.status);
      if (values.startDate)
        params.append("startDate", values.startDate.toISOString());
      if (values.endDate)
        params.append("endDate", values.endDate.toISOString());

      // Rapor verilerini getir
      const response = await fetch(
        `/api/inventory/reports?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error("Rapor verileri getirilirken bir hata oluştu");
      }

      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error("Error fetching report:", error);
      toast({
        title: "Hata",
        description: "Rapor verileri getirilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Form gönderildiğinde
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    fetchReport(values);
  };

  // Raporu dışa aktar
  const exportReport = () => {
    if (!reportData) return;

    // JSON verilerini CSV formatına dönüştür
    const inventoryCSV = reportData.inventory.map((item: any) => ({
      "Ürün Adı": item.name,
      Kategori: getCategoryLabel(item.category),
      "Toplam Miktar": item.totalQuantity,
      Birim: item.unit,
      Durum: getStatusLabel(item.status),
      "Son Güncelleme": format(new Date(item.updatedAt), "dd.MM.yyyy HH:mm"),
    }));

    // CSV dosyasını oluştur
    const csvContent =
      "data:text/csv;charset=utf-8," +
      Object.keys(inventoryCSV[0]).join(";") +
      "\n" +
      inventoryCSV.map((row: any) => Object.values(row).join(";")).join("\n");

    // Dosyayı indir
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `envanter-raporu-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Kategori bazlı grafik verileri
  const categoryChartData =
    reportData?.summary?.byCategory.map((item: any) => ({
      name: getCategoryLabel(item.category),
      value: item._sum.totalQuantity,
      count: item._count.id,
    })) || [];

  // Durum bazlı grafik verileri
  const statusChartData =
    reportData?.summary?.byStatus.map((item: any) => ({
      name: getStatusLabel(item.status),
      value: item._sum.totalQuantity,
      count: item._count.id,
    })) || [];

  // İşlem tipi bazlı grafik verileri
  const transactionChartData =
    reportData?.summary?.byTransactionType.map((item: any) => ({
      name: item.type,
      value: item._sum.quantity,
      count: item._count.id,
    })) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Envanter Raporu</CardTitle>
          <CardDescription>
            Envanter verilerinizi filtreleyerek detaylı raporlar oluşturun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Tüm kategoriler" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Tüm kategoriler</SelectItem>
                          {categories.map((category) => (
                            <SelectItem
                              key={category.value}
                              value={category.value}
                            >
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="seasonId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sezon</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Tüm sezonlar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Tüm sezonlar</SelectItem>
                          {seasons.map((season) => (
                            <SelectItem key={season.id} value={season.id}>
                              {season.name} {season.isActive && "(Aktif)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durum</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Tüm durumlar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Tüm durumlar</SelectItem>
                          <SelectItem value="AVAILABLE">Mevcut</SelectItem>
                          <SelectItem value="LOW_STOCK">Az Stok</SelectItem>
                          <SelectItem value="OUT_OF_STOCK">
                            Stokta Yok
                          </SelectItem>
                          <SelectItem value="EXPIRED">Süresi Dolmuş</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Başlangıç Tarihi</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: tr })
                              ) : (
                                <span>Tarih seçin</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Bitiş Tarihi</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: tr })
                              ) : (
                                <span>Tarih seçin</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Rapor Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <FileBarChart2 className="mr-2 h-4 w-4" />
                      Rapor Oluştur
                    </>
                  )}
                </Button>
                {reportData && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={exportReport}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Dışa Aktar (CSV)
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>Rapor Sonuçları</CardTitle>
            <CardDescription>
              {format(new Date(), "PPP", { locale: tr })} tarihinde oluşturulan
              rapor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="overview"
              value={activeTab}
              onValueChange={setActiveTab}
            >
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
                <TabsTrigger value="category">Kategori Analizi</TabsTrigger>
                <TabsTrigger value="status">Durum Analizi</TabsTrigger>
                <TabsTrigger value="transactions">İşlem Geçmişi</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Toplam Ürün
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {reportData.inventory.length}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Toplam Miktar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {reportData.inventory
                          .reduce(
                            (sum: number, item: any) =>
                              sum + item.totalQuantity,
                            0
                          )
                          .toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Son 30 Gün İşlem
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {reportData.recentTransactions.length}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">
                        Kategori Dağılımı
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryChartData}
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
                            {categoryChartData.map(
                              (entry: any, index: number) => (
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
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">
                        Durum Dağılımı
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusChartData}
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
                            {statusChartData.map(
                              (entry: any, index: number) => (
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
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="category" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Kategori Bazlı Envanter Dağılımı</CardTitle>
                  </CardHeader>
                  <CardContent className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="value"
                          name="Toplam Miktar"
                          fill="#8884d8"
                        />
                        <Bar
                          dataKey="count"
                          name="Ürün Sayısı"
                          fill="#82ca9d"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {reportData.summary.byCategory.map((category: any) => (
                    <Card key={category.category}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {getCategoryLabel(category.category)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Ürün Sayısı:
                            </span>
                            <span className="font-medium">
                              {category._count.id}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Toplam Miktar:
                            </span>
                            <span className="font-medium">
                              {category._sum.totalQuantity.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="status" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Durum Bazlı Envanter Dağılımı</CardTitle>
                  </CardHeader>
                  <CardContent className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="value"
                          name="Toplam Miktar"
                          fill="#8884d8"
                        />
                        <Bar
                          dataKey="count"
                          name="Ürün Sayısı"
                          fill="#82ca9d"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {reportData.summary.byStatus.map((status: any) => (
                    <Card key={status.status}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {getStatusLabel(status.status)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Ürün Sayısı:
                            </span>
                            <span className="font-medium">
                              {status._count.id}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Toplam Miktar:
                            </span>
                            <span className="font-medium">
                              {status._sum.totalQuantity.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="transactions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Son 30 Gün İşlem Analizi</CardTitle>
                  </CardHeader>
                  <CardContent className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={transactionChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="value"
                          name="Toplam Miktar"
                          fill="#8884d8"
                        />
                        <Bar
                          dataKey="count"
                          name="İşlem Sayısı"
                          fill="#82ca9d"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Son İşlemler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {reportData.recentTransactions
                        .slice(0, 10)
                        .map((transaction: any) => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between border-b pb-2"
                          >
                            <div>
                              <p className="font-medium">
                                {transaction.inventory.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {transaction.type} -{" "}
                                {format(
                                  new Date(transaction.date),
                                  "dd.MM.yyyy"
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {transaction.quantity.toFixed(2)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {transaction.inventory.category}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setActiveTab("transactions-all")}
                    >
                      Tüm İşlemleri Görüntüle
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
