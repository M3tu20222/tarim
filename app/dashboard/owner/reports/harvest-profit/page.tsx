"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart,
  Calculator,
  Sprout,
  Truck,
  Fuel,
  Users,
  Download,
} from "lucide-react";

// Types
interface Field {
  id: string;
  name: string;
  size: number;
  location: string;
}

interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface CostBreakdown {
  seedingCosts: {
    seedCost: number;
    soilPreparation: number;
    plantingLabor: number;
    plantingEquipment: number;
    plantingFuel: number;
    subtotal: number;
  };
  maintenanceCosts: {
    fertilizerCost: number;
    pesticideCost: number;
    maintenanceLabor: number;
    maintenanceEquipment: number;
    maintenanceFuel: number;
    subtotal: number;
  };
  irrigationCosts: {
    electricityCost: number;
    irrigationLabor: number;
    irrigationEquipment: number;
    waterFee: number;
    subtotal: number;
  };
  harvestCosts: {
    harvesterRental: number;
    harvesterFuel: number;
    harvesterOperator: number;
    transportation: number;
    storage: number;
    subtotal: number;
  };
  taxes: {
    incomeTax: number;
    vat: number;
    socialSecurity: number;
    other: number;
    subtotal: number;
  };
  totalCost: number;
  costPerDecare: number;
}

interface Revenue {
  totalSalesRevenue: number;
  totalSupportsRevenue: number;
  totalRevenue: number;
  revenuePerDecare: number;
}

interface ProfitLossData {
  field: Field;
  season: Season;
  costs: CostBreakdown;
  revenues: Revenue;
  profitLoss: {
    grossProfit: number;
    grossProfitPerDecare: number;
    profitMargin: number;
    yieldPerDecare: number;
    costPerKg: number;
    revenuePerKg: number;
    profitPerKg: number;
  };
  benchmarks: {
    avgCostPerDecareInRegion: number;
    avgProfitPerDecareInRegion: number;
    performanceRating: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'BELOW_AVERAGE' | 'POOR';
  };
}

export default function HarvestProfitLossPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedField, setSelectedField] = useState<string>("");
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [reportData, setReportData] = useState<ProfitLossData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fieldsRes, seasonsRes] = await Promise.all([
          fetch("/api/fields?fetchAll=true"),
          fetch("/api/seasons")
        ]);
        
        if (fieldsRes.ok) {
          const fieldsData = await fieldsRes.json();
          setFields(fieldsData.data || []);
        }
        
        if (seasonsRes.ok) {
          const seasonsData = await seasonsRes.json();
          setSeasons(seasonsData.data || []);
        }
      } catch (error) {
        toast({
          title: "Hata",
          description: "Veriler yüklenirken hata oluştu",
          variant: "destructive",
        });
      }
    };
    fetchData();
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedField || !selectedSeason) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen tarla ve sezon seçin.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/fields/${selectedField}/profit-loss/${selectedSeason}`);
      
      if (!response.ok) {
        throw new Error("Rapor oluşturulamadı");
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'EXCELLENT': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'GOOD': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'AVERAGE': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'BELOW_AVERAGE': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'POOR': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getCostIcon = (category: string) => {
    switch (category) {
      case 'seeding': return <Sprout className="w-5 h-5" />;
      case 'maintenance': return <BarChart3 className="w-5 h-5" />;
      case 'irrigation': return <PieChart className="w-5 h-5" />;
      case 'harvest': return <Truck className="w-5 h-5" />;
      case 'taxes': return <Calculator className="w-5 h-5" />;
      default: return <DollarSign className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-8 cyberpunk-grid p-4 md:p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl md:text-4xl font-bold neon-text-purple animate-flicker">
          Hasat Kar/Zarar Analizi
        </h1>
        {reportData && (
          <Button variant="outline" className="btn-cyberpunk">
            <Download className="w-4 h-4 mr-2" />
            PDF İndir
          </Button>
        )}
      </div>

      {/* Filtreler */}
      <Card className="card-cyberpunk">
        <CardHeader>
          <CardTitle className="neon-text-cyan flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Rapor Filtreleri
          </CardTitle>
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
                    {field.name} ({field.size} dekar)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium neon-text-pink">
              Sezon Seçin
            </label>
            <Select onValueChange={setSelectedSeason} value={selectedSeason}>
              <SelectTrigger className="neon-border">
                <SelectValue placeholder="Bir sezon seçin..." />
              </SelectTrigger>
              <SelectContent className="bg-background/80 backdrop-blur-sm border-purple-500/30">
                {seasons.map((season) => (
                  <SelectItem
                    key={season.id}
                    value={season.id}
                    className="hover:bg-purple-500/20"
                  >
                    {season.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Button
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="btn-cyberpunk"
            >
              {isLoading ? "Hesaplanıyor..." : "Rapor Oluştur"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* Özet Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-background/80 backdrop-blur-sm border-green-500/30 neon-glow-green">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Toplam Gelir</p>
                    <p className="text-2xl font-bold neon-text-green">
                      {formatCurrency(reportData.revenues.totalRevenue)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(reportData.revenues.revenuePerDecare)}/dekar
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/80 backdrop-blur-sm border-red-500/30 neon-glow-red">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Toplam Gider</p>
                    <p className="text-2xl font-bold neon-text-red">
                      {formatCurrency(reportData.costs.totalCost)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(reportData.costs.costPerDecare)}/dekar
                    </p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-400" />
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-background/80 backdrop-blur-sm ${reportData.profitLoss.grossProfit >= 0 ? 'border-cyan-500/30 neon-glow-cyan' : 'border-orange-500/30 neon-glow-orange'}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Net Kar/Zarar</p>
                    <p className={`text-2xl font-bold ${reportData.profitLoss.grossProfit >= 0 ? 'neon-text-cyan' : 'neon-text-orange'}`}>
                      {formatCurrency(reportData.profitLoss.grossProfit)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(reportData.profitLoss.grossProfitPerDecare)}/dekar
                    </p>
                  </div>
                  <DollarSign className={`w-8 h-8 ${reportData.profitLoss.grossProfit >= 0 ? 'text-cyan-400' : 'text-orange-400'}`} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/80 backdrop-blur-sm border-purple-500/30 neon-glow-purple">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Kar Marjı</p>
                    <p className="text-2xl font-bold neon-text-purple">
                      %{reportData.profitLoss.profitMargin.toFixed(2)}
                    </p>
                    <Badge className={getPerformanceColor(reportData.benchmarks.performanceRating)}>
                      {reportData.benchmarks.performanceRating}
                    </Badge>
                  </div>
                  <Calculator className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Maliyet Dağılımı */}
          <Card className="card-cyberpunk">
            <CardHeader>
              <CardTitle className="neon-text-cyan flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Maliyet Dağılımı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="bg-background/50 border-cyan-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 neon-text-cyan">
                      {getCostIcon('seeding')}
                      Ekim Maliyetleri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tohum:</span>
                      <span className="font-mono">{formatCurrency(reportData.costs.seedingCosts.seedCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Toprak Hazırlığı:</span>
                      <span className="font-mono">{formatCurrency(reportData.costs.seedingCosts.soilPreparation)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>İşçilik:</span>
                      <span className="font-mono">{formatCurrency(reportData.costs.seedingCosts.plantingLabor)}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Toplam:</span>
                        <span className="font-mono neon-text-cyan">{formatCurrency(reportData.costs.seedingCosts.subtotal)}</span>
                      </div>
                    </div>
                    <Progress 
                      value={(reportData.costs.seedingCosts.subtotal / reportData.costs.totalCost) * 100} 
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card className="bg-background/50 border-green-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 neon-text-green">
                      {getCostIcon('maintenance')}
                      Bakım Maliyetleri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Gübre:</span>
                      <span className="font-mono">{formatCurrency(reportData.costs.maintenanceCosts.fertilizerCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>İlaç:</span>
                      <span className="font-mono">{formatCurrency(reportData.costs.maintenanceCosts.pesticideCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>İşçilik:</span>
                      <span className="font-mono">{formatCurrency(reportData.costs.maintenanceCosts.maintenanceLabor)}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Toplam:</span>
                        <span className="font-mono neon-text-green">{formatCurrency(reportData.costs.maintenanceCosts.subtotal)}</span>
                      </div>
                    </div>
                    <Progress 
                      value={(reportData.costs.maintenanceCosts.subtotal / reportData.costs.totalCost) * 100} 
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card className="bg-background/50 border-blue-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 neon-text-blue">
                      {getCostIcon('irrigation')}
                      Sulama Maliyetleri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Elektrik:</span>
                      <span className="font-mono">{formatCurrency(reportData.costs.irrigationCosts.electricityCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>İşçilik:</span>
                      <span className="font-mono">{formatCurrency(reportData.costs.irrigationCosts.irrigationLabor)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Ekipman:</span>
                      <span className="font-mono">{formatCurrency(reportData.costs.irrigationCosts.irrigationEquipment)}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Toplam:</span>
                        <span className="font-mono neon-text-blue">{formatCurrency(reportData.costs.irrigationCosts.subtotal)}</span>
                      </div>
                    </div>
                    <Progress 
                      value={(reportData.costs.irrigationCosts.subtotal / reportData.costs.totalCost) * 100} 
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card className="bg-background/50 border-yellow-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 neon-text-yellow">
                      {getCostIcon('harvest')}
                      Hasat Maliyetleri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Biçerdöver:</span>
                      <span className="font-mono">{formatCurrency(reportData.costs.harvestCosts.harvesterRental)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Nakliye:</span>
                      <span className="font-mono">{formatCurrency(reportData.costs.harvestCosts.transportation)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Depolama:</span>
                      <span className="font-mono">{formatCurrency(reportData.costs.harvestCosts.storage)}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Toplam:</span>
                        <span className="font-mono neon-text-yellow">{formatCurrency(reportData.costs.harvestCosts.subtotal)}</span>
                      </div>
                    </div>
                    <Progress 
                      value={(reportData.costs.harvestCosts.subtotal / reportData.costs.totalCost) * 100} 
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card className="bg-background/50 border-red-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 neon-text-red">
                      {getCostIcon('taxes')}
                      Vergi ve Kesintiler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Gelir Vergisi:</span>
                      <span className="font-mono">{formatCurrency(reportData.costs.taxes.incomeTax)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>KDV:</span>
                      <span className="font-mono">{formatCurrency(reportData.costs.taxes.vat)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>SGK:</span>
                      <span className="font-mono">{formatCurrency(reportData.costs.taxes.socialSecurity)}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Toplam:</span>
                        <span className="font-mono neon-text-red">{formatCurrency(reportData.costs.taxes.subtotal)}</span>
                      </div>
                    </div>
                    <Progress 
                      value={(reportData.costs.taxes.subtotal / reportData.costs.totalCost) * 100} 
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card className="bg-background/50 border-purple-500/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 neon-text-purple">
                      <BarChart3 className="w-4 h-4" />
                      Verimlilik Metrikleri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Verim:</span>
                      <span className="font-mono">{reportData.profitLoss.yieldPerDecare.toFixed(2)} kg/dekar</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Maliyet/Kg:</span>
                      <span className="font-mono">{formatCurrency(reportData.profitLoss.costPerKg)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Gelir/Kg:</span>
                      <span className="font-mono">{formatCurrency(reportData.profitLoss.revenuePerKg)}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Kar/Kg:</span>
                        <span className="font-mono neon-text-purple">{formatCurrency(reportData.profitLoss.profitPerKg)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Benchmark Karşılaştırma */}
          <Card className="card-cyberpunk">
            <CardHeader>
              <CardTitle className="neon-text-cyan flex items-center gap-2">
                <Users className="w-5 h-5" />
                Bölgesel Karşılaştırma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Maliyet Karşılaştırması</span>
                      <span className="text-sm text-muted-foreground">Dekar başına</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Sizin Maliyetiniz:</span>
                        <span className="font-mono neon-text-cyan">{formatCurrency(reportData.costs.costPerDecare)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bölge Ortalaması:</span>
                        <span className="font-mono">{formatCurrency(reportData.benchmarks.avgCostPerDecareInRegion)}</span>
                      </div>
                      <Progress 
                        value={(reportData.costs.costPerDecare / reportData.benchmarks.avgCostPerDecareInRegion) * 100}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Kar Karşılaştırması</span>
                      <span className="text-sm text-muted-foreground">Dekar başına</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Sizin Karınız:</span>
                        <span className="font-mono neon-text-green">{formatCurrency(reportData.profitLoss.grossProfitPerDecare)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bölge Ortalaması:</span>
                        <span className="font-mono">{formatCurrency(reportData.benchmarks.avgProfitPerDecareInRegion)}</span>
                      </div>
                      <Progress 
                        value={reportData.benchmarks.avgProfitPerDecareInRegion > 0 ? (reportData.profitLoss.grossProfitPerDecare / reportData.benchmarks.avgProfitPerDecareInRegion) * 100 : 0}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}