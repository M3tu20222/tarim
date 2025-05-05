"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Droplet,
  AlertCircle,
  Calendar,
  Clock,
  FileText,
  MapPin,
  Tractor,
  Eye,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { WorkerFieldsList } from "./worker-fields-list";

interface WorkerOverviewProps {
  assignedWell: {
    id: string;
    name: string;
  } | null;
  fields: any[];
  recentProcesses: any[];
  recentIrrigations: any[];
  stats: {
    assignedWell: any;
    fieldCount: number;
    processCount: number;
    irrigationCount: number;
  };
}

export function WorkerOverview({
  assignedWell,
  fields,
  recentProcesses,
  recentIrrigations,
  stats,
}: WorkerOverviewProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      {!assignedWell && (
        <Alert variant="default"> {/* Changed from warning to default */}
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Kuyu Ataması Yapılmamış</AlertTitle>
          <AlertDescription>
            Henüz size atanmış bir kuyu bulunmamaktadır. Lütfen ayarlar
            sayfasından bir kuyu seçin veya yöneticinize başvurun.
            <div className="mt-2">
              <Link href="/dashboard/worker/settings">
                <Button variant="outline" size="sm">
                  Ayarlara Git
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="fields">Tarlalar</TabsTrigger>
          <TabsTrigger value="activities">Aktiviteler</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Atanmış Kuyu
                </CardTitle>
                <Droplet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {assignedWell ? assignedWell.name : "Atanmamış"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {assignedWell ? "Aktif" : "Pasif"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  İlişkili Tarlalar
                </CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.fieldCount}</div>
                <p className="text-xs text-muted-foreground">
                  Kuyuya bağlı tarlalar
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  İşlemler (30 gün)
                </CardTitle>
                <Tractor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.processCount}</div>
                <p className="text-xs text-muted-foreground">
                  Son 30 günde yapılan işlemler
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sulamalar (30 gün)
                </CardTitle>
                <Droplet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.irrigationCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Son 30 günde yapılan sulamalar
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Son İşlemler</CardTitle>
                <CardDescription>
                  Son yaptığınız tarla işlemleri
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentProcesses.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Henüz işlem kaydı bulunmamaktadır
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentProcesses.map((process) => (
                      <div
                        key={process.id}
                        className="flex items-start space-x-4 border-b pb-4 last:border-0"
                      >
                        <div className="bg-primary/10 p-2 rounded-full">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <p className="font-medium text-sm">
                              {getProcessTypeName(process.type)}
                            </p>
                            <Badge variant="outline" className="ml-2">
                              {process.field?.name || "Tarla silinmiş"}
                            </Badge>
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(process.date), "dd MMM yyyy", {
                              locale: tr,
                            })}
                            <Clock className="h-3 w-3 ml-2 mr-1" />
                            {format(new Date(process.date), "HH:mm", {
                              locale: tr,
                            })}
                          </div>
                          <div className="flex justify-end">
                            <Link
                              href={`/dashboard/worker/processes/${process.id}`}
                            >
                              <Button variant="ghost" size="sm">
                                <Eye className="h-3 w-3 mr-1" />
                                Detay
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Son Sulamalar</CardTitle>
                <CardDescription>
                  Son yaptığınız sulama işlemleri
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentIrrigations.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Henüz sulama kaydı bulunmamaktadır
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentIrrigations.map((irrigation) => (
                      <div
                        key={irrigation.id}
                        className="flex items-start space-x-4 border-b pb-4 last:border-0"
                      >
                        <div className="bg-blue-50 p-2 rounded-full">
                          <Droplet className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <p className="font-medium text-sm">
                              {irrigation.well?.name || "Kuyu silinmiş"}
                            </p>
                            <Badge variant="outline" className="ml-2">
                              {irrigation.fieldUsages?.[0]?.field?.name ||
                                "Tarla silinmiş"}
                              {irrigation.fieldUsages?.length > 1 &&
                                ` +${irrigation.fieldUsages.length - 1}`}
                            </Badge>
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(
                              new Date(irrigation.startDateTime),
                              "dd MMM yyyy",
                              { locale: tr }
                            )}
                            <Clock className="h-3 w-3 ml-2 mr-1" />
                            {format(
                              new Date(irrigation.startDateTime),
                              "HH:mm",
                              { locale: tr }
                            )}
                          </div>
                          <div className="flex justify-end">
                            <Link
                              href={`/dashboard/worker/irrigation/${irrigation.id}`}
                            >
                              <Button variant="ghost" size="sm">
                                <Eye className="h-3 w-3 mr-1" />
                                Detay
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fields">
          <Card>
            <CardHeader>
              <CardTitle>Tarlalar</CardTitle>
              <CardDescription>Atanmış kuyunuza bağlı tarlalar</CardDescription>
            </CardHeader>
            <CardContent>
              {!assignedWell ? (
                <div className="text-center py-4 text-muted-foreground">
                  Henüz size atanmış bir kuyu bulunmamaktadır
                </div>
              ) : fields.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Atanmış kuyunuza bağlı tarla bulunmamaktadır
                </div>
              ) : (
                <WorkerFieldsList fields={fields} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>Aktiviteler</CardTitle>
              <CardDescription>
                Tüm işlem ve sulama kayıtlarınız
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end space-x-2 mb-4">
                <Link href="/dashboard/worker/processes/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni İşlem
                  </Button>
                </Link>
                <Link href="/dashboard/worker/irrigation/new">
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Sulama
                  </Button>
                </Link>
              </div>

              <Tabs defaultValue="processes">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="processes">İşlemler</TabsTrigger>
                  <TabsTrigger value="irrigations">Sulamalar</TabsTrigger>
                </TabsList>

                <TabsContent value="processes" className="space-y-4">
                  {recentProcesses.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Henüz işlem kaydı bulunmamaktadır
                    </div>
                  ) : (
                    <div className="space-y-4 mt-4">
                      {recentProcesses.map((process) => (
                        <div
                          key={process.id}
                          className="flex items-start space-x-4 border-b pb-4 last:border-0"
                        >
                          <div className="bg-primary/10 p-2 rounded-full">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">
                                  {getProcessTypeName(process.type)}
                                </p>
                                <Badge variant="outline">
                                  {process.field?.name || "Tarla silinmiş"}
                                </Badge>
                              </div>
                              <Link
                                href={`/dashboard/worker/processes/${process.id}`}
                              >
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Detay
                                </Button>
                              </Link>
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(process.date), "dd MMM yyyy", {
                                locale: tr,
                              })}
                              <Clock className="h-3 w-3 ml-2 mr-1" />
                              {format(new Date(process.date), "HH:mm", {
                                locale: tr,
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="irrigations" className="space-y-4">
                  {recentIrrigations.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Henüz sulama kaydı bulunmamaktadır
                    </div>
                  ) : (
                    <div className="space-y-4 mt-4">
                      {recentIrrigations.map((irrigation) => (
                        <div
                          key={irrigation.id}
                          className="flex items-start space-x-4 border-b pb-4 last:border-0"
                        >
                          <div className="bg-blue-50 p-2 rounded-full">
                            <Droplet className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">
                                  {irrigation.well?.name || "Kuyu silinmiş"}
                                </p>
                                <Badge variant="outline">
                                  {irrigation.fieldUsages?.[0]?.field?.name ||
                                    "Tarla silinmiş"}
                                  {irrigation.fieldUsages?.length > 1 &&
                                    ` +${irrigation.fieldUsages.length - 1}`}
                                </Badge>
                              </div>
                              <Link
                                href={`/dashboard/worker/irrigation/${irrigation.id}`}
                              >
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Detay
                                </Button>
                              </Link>
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(
                                new Date(irrigation.startDateTime),
                                "dd MMM yyyy",
                                { locale: tr }
                              )}
                              <Clock className="h-3 w-3 ml-2 mr-1" />
                              {format(
                                new Date(irrigation.startDateTime),
                                "HH:mm",
                                { locale: tr }
                              )}
                              <div className="ml-2 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {Math.floor(irrigation.duration / 60)}s{" "}
                                {irrigation.duration % 60}dk
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function to convert process type to readable name
function getProcessTypeName(type: string): string {
  const processTypes: Record<string, string> = {
    PLOWING: "Sürme",
    SEEDING: "Ekim",
    FERTILIZING: "Gübreleme",
    PESTICIDE: "İlaçlama",
    HARVESTING: "Hasat",
    OTHER: "Diğer",
  };

  return processTypes[type] || type;
}
