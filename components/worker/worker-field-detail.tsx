"use client";

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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Droplet, FileText, Leaf, User, ChevronLeft, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface WorkerFieldDetailProps {
  field: any;
  irrigations: any[];
  well: any;
  userId: string;
}

export function WorkerFieldDetail({
  field,
  irrigations,
  well,
  userId,
}: WorkerFieldDetailProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{field.name}</h1>
          <Badge variant="outline">{field.size} dekar</Badge>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/worker/processes/new?fieldId=${field.id}`}>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Yeni İşlem
            </Button>
          </Link>
          <Link href={`/dashboard/worker/irrigation/new?fieldId=${field.id}`}>
            <Button variant="outline" size="sm">
              <Droplet className="h-4 w-4 mr-2" />
              Yeni Sulama
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tarla Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium">Konum</p>
              <p className="text-sm text-muted-foreground">
                {field.location || "Belirtilmemiş"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Durum</p>
              <Badge variant="outline">{field.status}</Badge>
            </div>
            {field.crops && field.crops.length > 0 && (
              <div>
                <p className="text-sm font-medium">Ekin</p>
                <div className="flex items-center gap-1">
                  <Leaf className="h-4 w-4 text-green-500" />
                  <span>{field.crops[0].name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ekim:{" "}
                  {format(new Date(field.crops[0].plantedDate), "d MMMM yyyy", {
                    locale: tr,
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sahipler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {field.owners &&
                field.owners.map((owner: any) => (
                  <div
                    key={owner.userId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{owner.user.name}</span>
                    </div>
                    <Badge variant="outline">{owner.percentage}%</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Kuyu Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium">Kuyu</p>
              <p className="text-sm">{well.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Kapasite</p>
              <p className="text-sm">{well.capacity} m³/saat</p>
            </div>
            <div>
              <p className="text-sm font-medium">Derinlik</p>
              <p className="text-sm">{well.depth} metre</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="processes">
        <TabsList>
          <TabsTrigger value="processes">Son İşlemler</TabsTrigger>
          <TabsTrigger value="irrigations">Son Sulamalar</TabsTrigger>
        </TabsList>
        <TabsContent value="processes">
          <Card>
            <CardHeader>
              <CardTitle>Son İşlemler</CardTitle>
              <CardDescription>Bu tarlada yapılan son işlemler</CardDescription>
            </CardHeader>
            <CardContent>
              {field.processes.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Bu tarlada henüz işlem kaydı bulunmamaktadır.</p>
                  <Link
                    href={`/dashboard/worker/processes/new?fieldId=${field.id}`}
                  >
                    <Button variant="link" className="mt-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Yeni İşlem Ekle
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {field.processes.map((process: any) => (
                    <div
                      key={process.id}
                      className="flex justify-between items-center border-b pb-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {process.type === "PLOWING" && "Sürme"}
                            {process.type === "SEEDING" && "Ekim"}
                            {process.type === "FERTILIZING" && "Gübreleme"}
                            {process.type === "PESTICIDE" && "İlaçlama"}
                            {process.type === "HARVESTING" && "Hasat"}
                            {process.type === "OTHER" && "Diğer"}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(process.date), "d MMMM yyyy", {
                              locale: tr,
                            })}
                          </p>
                        </div>
                        {process.description && (
                          <p className="text-sm mt-1">{process.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {process.processedArea} / {process.totalArea} dekar
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            %{process.processedPercentage}
                          </Badge>
                        </div>
                      </div>
                      <Link href={`/dashboard/worker/processes/${process.id}`}>
                        <Button variant="ghost" size="sm">
                          Detay
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
              <CardDescription>
                Bu tarlada yapılan son sulamalar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {irrigations.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Bu tarlada henüz sulama kaydı bulunmamaktadır.</p>
                  <Link
                    href={`/dashboard/worker/irrigation/new?fieldId=${field.id}`}
                  >
                    <Button variant="link" className="mt-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Yeni Sulama Ekle
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {irrigations.map((irrigation) => (
                    <div
                      key={irrigation.id}
                      className="flex justify-between items-center border-b pb-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {irrigation.duration} dakika
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            {format(
                              new Date(irrigation.startDateTime),
                              "d MMMM yyyy",
                              { locale: tr }
                            )}
                          </p>
                        </div>
                        {irrigation.notes && (
                          <p className="text-sm mt-1">{irrigation.notes}</p>
                        )}
                      </div>
                      <Link
                        href={`/dashboard/worker/irrigation/${irrigation.id}`}
                      >
                        <Button variant="ghost" size="sm">
                          Detay
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
