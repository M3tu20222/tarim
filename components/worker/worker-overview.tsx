"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Droplet,
  FileText,
  AlertTriangle,
  ChevronRight,
  Plus,
} from "lucide-react";
import { WorkerFieldsList } from "./worker-fields-list";

interface WorkerOverviewProps {
  assignedWell: any | null;
  fields: any[];
  recentProcesses: any[];
  recentIrrigations: any[];
  stats: {
    assignedWell: any | null;
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
  const [activeTab, setActiveTab] = useState("fields");

  if (!assignedWell) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Atanmış kuyu bulunamadı</AlertTitle>
        <AlertDescription>
          Henüz bir kuyuya atanmamışsınız. İşlemlere başlamak için lütfen
          ayarlar sayfasından bir kuyu seçin.
          <div className="mt-4">
            <Link href="/dashboard/worker/settings">
              <Button>Ayarlara Git</Button>
            </Link>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Atanmış Kuyu
            </CardTitle>
            <CardDescription className="text-lg font-bold">
              {assignedWell.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Kapasite: {assignedWell.capacity} m³/saat</p>
            <p className="text-sm">Derinlik: {assignedWell.depth} metre</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tarlalar
            </CardTitle>
            <CardDescription className="text-lg font-bold">
              {stats.fieldCount}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Toplam atanmış tarla sayısı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              İşlemler (30 gün)
            </CardTitle>
            <CardDescription className="text-lg font-bold">
              {stats.processCount}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Son 30 günde yapılan işlem sayısı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sulamalar (30 gün)
            </CardTitle>
            <CardDescription className="text-lg font-bold">
              {stats.irrigationCount}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Son 30 günde yapılan sulama sayısı</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Link href="/dashboard/worker/processes/new">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Yeni İşlem
          </Button>
        </Link>
        <Link href="/dashboard/worker/irrigation/new">
          <Button variant="outline" size="sm">
            <Droplet className="h-4 w-4 mr-2" />
            Yeni Sulama
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="fields">Tarlalar</TabsTrigger>
          <TabsTrigger value="processes">Son İşlemler</TabsTrigger>
          <TabsTrigger value="irrigations">Son Sulamalar</TabsTrigger>
        </TabsList>
        <TabsContent value="fields">
          <WorkerFieldsList fields={fields} />
        </TabsContent>
        <TabsContent value="processes">
          <Card>
            <CardHeader>
              <CardTitle>Son İşlemler</CardTitle>
              <CardDescription>Son yapılan tarla işlemleri</CardDescription>
            </CardHeader>
            <CardContent>
              {recentProcesses.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Henüz işlem kaydı bulunmamaktadır.</p>
                  <Link href="/dashboard/worker/processes/new">
                    <Button variant="link" className="mt-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Yeni İşlem Ekle
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentProcesses.map((process) => (
                    <div
                      key={process.id}
                      className="flex justify-between items-center border-b pb-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {process.field?.name || "Bilinmeyen Tarla"}
                          </h3>
                          <Badge variant="outline">
                            {process.type === "PLOWING" && "Sürme"}
                            {process.type === "SEEDING" && "Ekim"}
                            {process.type === "FERTILIZING" && "Gübreleme"}
                            {process.type === "PESTICIDE" && "İlaçlama"}
                            {process.type === "HARVESTING" && "Hasat"}
                            {process.type === "OTHER" && "Diğer"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(process.date), "d MMMM yyyy", {
                            locale: tr,
                          })}
                        </p>
                        {process.description && (
                          <p className="text-sm mt-1 line-clamp-1">
                            {process.description}
                          </p>
                        )}
                      </div>
                      <Link href={`/dashboard/worker/processes/${process.id}`}>
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="irrigations">
          <Card>
            <CardHeader>
              <CardTitle>Son Sulamalar</CardTitle>
              <CardDescription>Son yapılan sulama işlemleri</CardDescription>
            </CardHeader>
            <CardContent>
              {recentIrrigations.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Henüz sulama kaydı bulunmamaktadır.</p>
                  <Link href="/dashboard/worker/irrigation/new">
                    <Button variant="link" className="mt-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Yeni Sulama Ekle
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentIrrigations.map((irrigation) => (
                    <div
                      key={irrigation.id}
                      className="flex justify-between items-center border-b pb-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {irrigation.well?.name || "Bilinmeyen Kuyu"}
                          </h3>
                          <Badge variant="outline">
                            {irrigation.duration} dakika
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(
                            new Date(irrigation.startDateTime),
                            "d MMMM yyyy",
                            { locale: tr }
                          )}
                        </p>
                        <p className="text-sm mt-1">
                          {irrigation.fieldUsages.length} tarla,{" "}
                          {irrigation.fieldUsages
                            .map((u) => u.field.name)
                            .join(", ")}
                        </p>
                      </div>
                      <Link
                        href={`/dashboard/worker/irrigation/${irrigation.id}`}
                      >
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
