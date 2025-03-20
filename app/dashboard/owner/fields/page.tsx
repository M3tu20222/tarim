import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PlusIcon,
  MapPinIcon,
  DropletIcon,
  SproutIcon as SeedlingIcon,
  CloudRainIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const metadata: Metadata = {
  title: "Tarlalarım | Tarım Yönetim Sistemi",
  description: "Tarım Yönetim Sistemi tarla yönetimi",
};

// Örnek tarla verileri
const fields = [
  {
    id: "field-1",
    name: "Merkez Tarla",
    location: "Merkez Köyü",
    size: 12.5,
    crop: "Buğday",
    status: "active",
    progress: 65,
    lastIrrigation: "2023-06-15",
    nextIrrigation: "2023-06-22",
    soilMoisture: 42,
  },
  {
    id: "field-2",
    name: "Dere Kenarı",
    location: "Aşağı Mahalle",
    size: 8.3,
    crop: "Mısır",
    status: "active",
    progress: 30,
    lastIrrigation: "2023-06-18",
    nextIrrigation: "2023-06-25",
    soilMoisture: 58,
  },
  {
    id: "field-3",
    name: "Tepe Tarla",
    location: "Yukarı Köy",
    size: 15.0,
    crop: "Arpa",
    status: "active",
    progress: 80,
    lastIrrigation: "2023-06-10",
    nextIrrigation: "2023-06-20",
    soilMoisture: 35,
  },
  {
    id: "field-4",
    name: "Çayır",
    location: "Dere Köyü",
    size: 5.2,
    crop: "Yonca",
    status: "active",
    progress: 45,
    lastIrrigation: "2023-06-12",
    nextIrrigation: "2023-06-19",
    soilMoisture: 62,
  },
];

export default function FieldsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tarlalarım</h1>
        <Button asChild>
          <Link href="/dashboard/owner/fields/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            Yeni Tarla
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {fields.map((field) => (
          <Card key={field.id} className="overflow-hidden">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{field.name}</CardTitle>
                <Badge
                  variant="outline"
                  className="bg-green-500/10 text-green-500"
                >
                  Aktif
                </Badge>
              </div>
              <CardDescription className="flex items-center gap-1">
                <MapPinIcon className="h-3 w-3" />
                {field.location}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Ekin</p>
                  <p className="font-medium">{field.crop}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Alan</p>
                  <p className="font-medium">{field.size} dönüm</p>
                </div>
                <div>
                  <p className="text-muted-foreground">İlerleme</p>
                  <div className="flex items-center gap-2">
                    <Progress value={field.progress} className="h-2" />
                    <span className="text-xs">%{field.progress}</span>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Nem</p>
                  <div className="flex items-center gap-1">
                    <DropletIcon className="h-3 w-3 text-blue-500" />
                    <span>%{field.soilMoisture}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md bg-muted p-2 text-xs">
                <div className="flex items-center gap-1">
                  <CloudRainIcon className="h-3 w-3" />
                  <span>
                    Son Sulama:{" "}
                    {new Date(field.lastIrrigation).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <SeedlingIcon className="h-3 w-3" />
                  <span>
                    Sonraki:{" "}
                    {new Date(field.nextIrrigation).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/50 p-2">
              <div className="flex w-full items-center justify-between">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/owner/fields/${field.id}`}>
                    Detaylar
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/owner/fields/${field.id}/edit`}>
                    Düzenle
                  </Link>
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
