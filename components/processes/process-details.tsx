"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface ProcessDetailsProps {
  process: any;
}

export function ProcessDetails({ process }: ProcessDetailsProps) {
  const [activeTab, setActiveTab] = useState("inventory");

  // Birim formatını Türkçe'ye çevir
  const formatUnit = (unit: string) => {
    const unitMap: Record<string, string> = {
      KG: "kg",
      TON: "ton",
      LITRE: "litre",
      ADET: "adet",
      CUVAL: "çuval",
      BIDON: "bidon",
      PAKET: "paket",
      METRE: "metre",
      METREKARE: "m²",
      DIGER: "birim",
    };
    return unitMap[unit] || unit;
  };

  // Envanter kategorilerini Türkçe'ye çevir
  const translateCategory = (category: string) => {
    const categoryMap: Record<string, string> = {
      PESTICIDE: "İlaç",
      FERTILIZER: "Gübre",
      SEED: "Tohum",
      FUEL: "Yakıt",
      EQUIPMENT_PART: "Ekipman Parçası",
      OTHER: "Diğer",
    };
    return categoryMap[category] || category;
  };

  return (
    <Card className="card-cyberpunk text-foreground"> {/* Apply cyberpunk card style and text color */}
      <CardHeader>
        <CardTitle className="text-primary">Kullanılan Kaynaklar</CardTitle> {/* Adjust title color */}
        <CardDescription className="text-muted-foreground">
          Bu işlemde kullanılan envanter, ekipman ve maliyet bilgileri
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="inventory"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 border border-border rounded-md p-1"> {/* Styled TabsList */}
            <TabsTrigger
              value="inventory"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:neon-glow-cyan data-[state=active]:border-cyan-500/50 transition-all duration-300" // Styled TabsTrigger
            >
              Envanter
              {process.inventoryUsages?.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {process.inventoryUsages.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="equipment"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:neon-glow-purple data-[state=active]:border-purple-500/50 transition-all duration-300" // Styled TabsTrigger
            >
              Ekipman
              {process.equipmentUsages?.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {process.equipmentUsages.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="costs"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:neon-glow-pink data-[state=active]:border-pink-500/50 transition-all duration-300" // Styled TabsTrigger
            >
              Maliyetler
              {process.processCosts?.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {process.processCosts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4 mt-4"> {/* Added mt-4 for spacing */}
            {process.inventoryUsages?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead>Sahip</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {process.inventoryUsages.map((usage: any) => (
                    <TableRow key={usage.id}>
                      <TableCell className="font-medium">
                        {usage.inventory.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {translateCategory(usage.inventory.category)} {/* Translate category */}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {usage.usedQuantity || usage.quantity} {formatUnit(usage.inventory.unit)}
                      </TableCell>
                      <TableCell>
                        {usage.inventory.ownerships && usage.inventory.ownerships.length > 0
                          ? usage.inventory.ownerships.map((ownership: any, index: number) => (
                              <span key={ownership.id}>
                                {ownership.user.name}
                                {index < usage.inventory.ownerships.length - 1 ? ", " : ""}
                              </span>
                            ))
                          : "Belirtilmemiş"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Bu işlemde kullanılan envanter kaydı bulunmuyor.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="equipment" className="space-y-4">
            {process.equipmentUsages?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ekipman</TableHead>
                    <TableHead>Tipi</TableHead>
                    <TableHead>Yakıt Tüketimi</TableHead>
                    <TableHead>Kullanım Süresi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {process.equipmentUsages.map((usage: any) => (
                    <TableRow key={usage.id}>
                      <TableCell className="font-medium">
                        {usage.equipment.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{usage.equipment.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {usage.fuelUsed
                          ? `${usage.fuelUsed} litre`
                          : "Belirtilmemiş"}
                      </TableCell>
                      <TableCell>
                        {usage.duration
                          ? `${usage.duration} saat`
                          : "Belirtilmemiş"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Bu işlemde kullanılan ekipman kaydı bulunmuyor.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="costs" className="space-y-4">
            {process.processCosts?.length > 0 ? (
              <div className="space-y-6">
                {/* Tarla Giderleri */}
                {process.processCosts.some(
                  (cost: any) => cost.fieldExpenses?.length > 0
                ) && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium">
                      Tarla Giderleri
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Açıklama</TableHead>
                          <TableHead>Tutar</TableHead>
                          <TableHead>Tarih</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {process.processCosts.flatMap(
                          (cost: any) =>
                            cost.fieldExpenses?.map((expense: any) => (
                              <TableRow key={expense.id}>
                                <TableCell className="font-medium">
                                  {expense.description || "Genel Gider"}
                                </TableCell>
                                <TableCell>
                                  {expense.totalCost != null // Check if totalCost is not null or undefined
                                    ? expense.totalCost.toLocaleString("tr-TR", {
                                        style: "currency",
                                        currency: "TRY",
                                      })
                                    : "Tutar Belirtilmemiş"}
                                </TableCell>
                                <TableCell>
                                  {format(new Date(expense.createdAt), "PPP", {
                                    locale: tr,
                                  })}
                                </TableCell>
                              </TableRow>
                            )) || []
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Sahip Giderleri */}
                {process.processCosts.some(
                  (cost: any) => cost.ownerExpenses?.length > 0
                ) && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium">
                      Sahip Giderleri
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sahip</TableHead>
                          <TableHead>Açıklama</TableHead>
                          <TableHead>Tutar</TableHead>
                          <TableHead>Tarih</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {process.processCosts.flatMap(
                          (cost: any) =>
                            cost.ownerExpenses?.map((expense: any) => (
                              <TableRow key={expense.id}>
                                <TableCell>
                                  {expense.fieldOwnership?.user?.name ||
                                    "Belirtilmemiş"}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {expense.description || "Genel Gider"}
                                </TableCell>
                                <TableCell>
                                  {expense.amount != null // Check if amount is not null or undefined
                                    ? expense.amount.toLocaleString("tr-TR", {
                                        style: "currency",
                                        currency: "TRY",
                                      })
                                    : "Tutar Belirtilmemiş"}
                                </TableCell>
                                <TableCell>
                                  {format(new Date(expense.createdAt), "PPP", {
                                    locale: tr,
                                  })}
                                </TableCell>
                              </TableRow>
                            )) || []
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Toplam Maliyet */}
                <div className="rounded-md bg-muted p-4">
                  <div className="flex justify-between">
                    <span className="font-medium">Toplam Maliyet:</span>
                    <span className="font-bold">
                      {(() => {
                          // Tarla giderleri toplamı - Bu, toplam maliyeti temsil eder
                          const fieldExpensesTotal = process.processCosts.reduce((total, cost) => {
                            const costTotal = cost.fieldExpenses?.reduce(
                              (sum, exp) => sum + (exp.totalCost ?? 0),
                              0
                            ) || 0;
                            return total + costTotal;
                          }, 0);

                          // NOT: Sahip giderleri, tarla giderlerinin sahipler arasında dağıtılmış halidir
                          // Bu nedenle toplam maliyete eklemiyoruz, çünkü bu çift sayım olur

                          // Toplam maliyet sadece tarla giderleridir
                          const totalCost = fieldExpensesTotal;

                          return totalCost.toLocaleString("tr-TR", {
                            style: "currency",
                            currency: "TRY",
                          });
                        })()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Bu işlemle ilgili maliyet kaydı bulunmuyor.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
