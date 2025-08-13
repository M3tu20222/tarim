import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog"; // Import Dialog components
import { ProcessDetails } from "@/components/processes/process-details"; // Import ProcessDetails component as named export
import { DialogTitle } from "@/components/ui/dialog"; // Import DialogTitle

export const metadata: Metadata = {
  title: "Tarla Detayları | Tarım Yönetim Sistemi",
  description: "Tarla detayları sayfası",
};

interface FieldPageProps {
  params: {
    id: string;
  };
}

export default async function FieldPage({ params }: FieldPageProps) {
  const awaitedParams = await params;
  const { id } = awaitedParams;
  const field = await prisma.field.findUnique({
    where: { id: awaitedParams.id },
    include: {
      owners: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      season: true,
      crops: true,
      // wells: true, // Hatalı include kaldırıldı
      fieldWells: { // Doğru include eklendi
        include: {
          well: true, // İlişkili kuyu bilgilerini getir
        },
      },
      irrigationFieldUsages: { // 'irrigationLogs' yerine 'irrigationFieldUsages' kullanıldı
        take: 5,
        orderBy: {
          irrigationLog: { // İlişkili log'un tarihine göre sırala
            startDateTime: "desc",
          },
        },
        include: {
          irrigationLog: { // İlişkili sulama logunu dahil et
            include: {
              well: true, // Sulama logundaki kuyu bilgisini de alalım
              user: { // Sulamayı yapan kullanıcıyı alalım
                select: { name: true }
              }
            }
          },
        },
      },
      processes: { // Changed from processingLogs to processes
        take: 5,
        orderBy: {
          date: "desc",
        },
        include: {
          worker: {
            select: {
              name: true,
            },
          },
          inventoryUsages: {
            include: {
              inventory: true,
            },
          },
          equipmentUsages: {
            include: {
              equipment: true,
            },
          },
          processCosts: {
            include: {
              ownerExpenses: {
                include: {
                  fieldOwnership: {
                    include: {
                      user: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      fieldExpenses: { // YENİ: Tarla giderlerini dahil et
        take: 10,
        orderBy: {
          expenseDate: "desc",
        },
      },
    },
  });

  if (!field) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/owner/fields">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{field.name}</h1>
          <Badge variant="outline" className="ml-2">
            {field.status}
          </Badge>
        </div>
        <Button asChild>
          <Link href={`/dashboard/owner/fields/${field.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Düzenle
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tarla Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Konum</dt>
                <dd className="mt-1">{field.location}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Alan</dt>
                <dd className="mt-1">{field.size} dekar</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Sezon</dt>
                <dd className="mt-1">
                  {field.season?.name || "Belirtilmemiş"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Oluşturulma Tarihi
                </dt>
                <dd className="mt-1">{formatDate(field.createdAt)}</dd>
              </div>
              {field.coordinates && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">
                    Koordinatlar
                  </dt>
                  <dd className="mt-1">{field.coordinates}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sahiplik Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            {field.owners.length === 0 ? (
              <p className="text-sm text-gray-500">
                Sahiplik bilgisi bulunamadı.
              </p>
            ) : (
              <ul className="space-y-4">
                {field.owners.map((ownership) => (
                  <li
                    key={ownership.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{ownership.user.name}</p>
                      <p className="text-sm text-gray-500">
                        {ownership.user.email}
                      </p>
                    </div>
                    <Badge>%{ownership.percentage}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Ekinler</CardTitle>
            <CardDescription>Bu tarlada yetiştirilen ekinler</CardDescription>
          </CardHeader>
          <CardContent>
            {field.crops.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Bu tarlada henüz ekin bulunmuyor.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {field.crops.map((crop) => (
                  <div
                    key={crop.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{crop.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Ekim: {formatDate(crop.plantedDate)} | Hasat:{" "}
                        {crop.harvestDate
                          ? formatDate(crop.harvestDate)
                          : "Belirtilmemiş"}
                      </p>
                    </div>
                    <Badge variant="outline">{crop.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kuyular</CardTitle>
            <CardDescription>Bu tarlaya bağlı kuyular</CardDescription>
          </CardHeader>
          <CardContent>
            {field.fieldWells.length === 0 ? ( // field.wells -> field.fieldWells
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Bu tarlaya bağlı kuyu bulunmuyor.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {field.fieldWells.map((fieldWell) => ( // field.wells -> field.fieldWells
                  <div
                    key={fieldWell.well.id} // well.id -> fieldWell.well.id
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{fieldWell.well.name}</p> {/* well.name -> fieldWell.well.name */}
                      <p className="text-sm text-muted-foreground">
                        Derinlik: {fieldWell.well.depth}m | Kapasite: {fieldWell.well.capacity}{" "} {/* well.depth -> fieldWell.well.depth, etc. */}
                        lt/sa
                      </p>
                    </div>
                    <Badge variant="outline">{fieldWell.well.status}</Badge> {/* well.status -> fieldWell.well.status */}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Son Sulama Kayıtları</CardTitle> {/* Başlık güncellendi */}
          </CardHeader>
          <CardContent>
            {field.irrigationFieldUsages.length === 0 ? ( // 'irrigationLogs' -> 'irrigationFieldUsages'
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Bu tarlada henüz sulama kaydı bulunmuyor. {/* Mesaj güncellendi */}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {field.irrigationFieldUsages.map((usage) => ( // 'log' -> 'usage'
                  <div
                    key={usage.irrigationLog.id} // log.id -> usage.irrigationLog.id
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {formatDate(usage.irrigationLog.startDateTime)} {/* log.date -> usage.irrigationLog.startDateTime */}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Kuyu: {usage.irrigationLog.well.name} | Süre: {usage.irrigationLog.duration}{" "} {/* Miktar/Metod yerine Kuyu/Süre */}
                        dakika | Yapan: {usage.irrigationLog.user.name}
                      </p>
                      {usage.irrigationLog.notes && (
                         <p className="text-xs text-gray-500 pt-1">Not: {usage.irrigationLog.notes}</p>
                      )}
                    </div>
                     <Badge variant="secondary">{usage.percentage}%</Badge> {/* Tarla kullanım yüzdesi */}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Son İşlemler</CardTitle>
          </CardHeader>
          <CardContent>
            {field.processes.length === 0 ? ( // Changed from processingLogs to processes
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Bu tarlada henüz işlem yapılmamış.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {field.processes.map((process) => ( // Changed from log to process
                  <Dialog key={process.id}> {/* Wrap with Dialog */}
                    <DialogTrigger asChild>
                      <div className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-gray-100"> {/* Make it clickable */}
                        <div>
                          <p className="font-medium">{process.type} - {formatDate(process.date)}</p> {/* Display process type and date */}
                          {process.worker && (
                            <p className="text-sm text-muted-foreground">
                              Yapan: {process.worker.name} {/* Display worker name */}
                            </p>
                          )}
                          {process.description && (
                             <p className="text-sm text-muted-foreground">
                               Açıklama: {process.description} {/* Display description if available */}
                             </p>
                          )}
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]"> {/* Dialog content */}
                      <DialogTitle>İşlem Detayları</DialogTitle> {/* Add DialogTitle */}
                      <ProcessDetails process={process} /> {/* Render ProcessDetails component with the process object */}
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* YENİ: Tarla Giderleri Kartı */}
      <Card>
        <CardHeader>
          <CardTitle>Tarla Giderleri</CardTitle>
          <CardDescription>
            Bu tarlaya ait işlem maliyetleri ve faturalar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {field.fieldExpenses.length === 0 ? (
            <div className="flex h-24 items-center justify-center rounded-md border border-dashed">
              <p className="text-sm text-muted-foreground">
                Bu tarlaya ait gider kaydı bulunmuyor.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {field.fieldExpenses.map((expense) => (
                <li
                  key={expense.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    <p className="text-sm text-muted-foreground">
                      Tarih: {formatDate(expense.expenseDate)} | Tutar:{" "}
                      <span className="font-semibold">
                        {expense.totalCost.toLocaleString("tr-TR", {
                          style: "currency",
                          currency: "TRY",
                        })}
                      </span>
                    </p>
                  </div>
                  <Badge variant={expense.sourceType === 'WELL_BILL' ? 'default' : 'secondary'}>
                    {expense.sourceType === 'WELL_BILL' ? 'Kuyu Faturası' : 'İşlem Maliyeti'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
