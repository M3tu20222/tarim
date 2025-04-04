import type { Metadata } from "next"; // Baştaki '020' kaldırıldı
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PlusIcon,
  MapPinIcon,
  Award,
  // DropletIcon, // API'de yok
  // SproutIcon as SeedlingIcon, // API'de yok
  // CloudRainIcon, // API'de yok
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
// import { Progress } from "@/components/ui/progress"; // API'de yok
import { getServerSideSession } from "@/lib/session"; // Oturum fonksiyonunu import et
import { headers } from "next/headers"; // headers fonksiyonunu import et
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export const metadata: Metadata = {
  title: "Tarlalarım | Tarım Yönetim Sistemi",
  description: "Tarım Yönetim Sistemi tarla yönetimi",
};

// API'den gelen tarla verisi için tip tanımı
interface Field {
  id: string;
  name: string;
  location: string;
  size: number;
  status: string;
  // API'den gelen ilişkili veriler (isteğe bağlı olabilir)
  owners?: { user: { id: string; name: string; email: string }; percentage: number }[];
  season?: { id: string; name: string };
  wells?: any[]; // Well tipini detaylandırmak gerekebilir
  crops?: { name: string }[]; // Ekin bilgisi için crops ilişkisini ekleyelim
  createdAt: string;
  updatedAt: string;
  // API'de olmayan alanlar:
  // progress?: number;
  // lastIrrigation?: string;
  // nextIrrigation?: string;
  // soilMoisture?: number;
}

// getFields fonksiyonu kaldırıldı, mantık doğrudan component içine taşınacak
// async function getFields(): Promise<Field[] | { error: string }> {
  // const session = await getServerSideSession(); // Gerekirse hala kullanılabilir
  // if (!session?.id || !session?.role) {
    // Oturum yoksa veya eksikse, middleware zaten yönlendirme yapmalı,
    // ancak burada da kontrol etmek iyi bir pratiktir.
    // console.error("FieldsPage: Oturum bilgisi alınamadı.");
    // return { error: "Oturum bulunamadı veya geçersiz. Lütfen tekrar giriş yapın." };
  // }

//   try {
//     // headers() fonksiyonunu burada çağırıyoruz
//     const cookieHeader = headers().get('cookie');
//     if (!cookieHeader) {
//       // Bu durumun olmaması gerekir çünkü middleware kontrol ediyor, ama yine de...
//       console.error("getFields: Cookie başlığı bulunamadı.");
//       // Middleware yönlendirme yapacağı için burada hata döndürmek yerine boş dizi döndürebiliriz
//       // veya istemciye özel bir hata mesajı verebiliriz.
//       return { error: "Kimlik doğrulama bilgisi eksik. Middleware kontrolü başarısız oldu." };
//     }

//     // Ortam değişkeninden API URL'sini al, yoksa localhost kullan
//     const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

//     const response = await fetch(`${apiUrl}/api/fields`, {
//       headers: {
//         'Cookie': cookieHeader, // Doğrudan alınan cookie'yi kullan
//         // x-user-id ve x-user-role'ü middleware ekleyecek.
//       },
//        next: { revalidate: 0 } // Cache kullanma
//     });

//     if (!response.ok) {
//       let errorData;
//       try {
//         errorData = await response.json();
//       } catch (e) {
//         // JSON parse hatası olursa
//         errorData = { error: `API isteği başarısız: ${response.status} ${response.statusText}` };
//       }
//       console.error("API Error:", response.status, errorData);
//       throw new Error(errorData?.error || `API isteği başarısız: ${response.status}`);
//     }

//     const data: Field[] = await response.json();
//     return data;
//   } catch (error: any) {
//     console.error("Failed to fetch fields:", error);
//     return { error: error.message || "Tarlalar yüklenirken bir sunucu hatası oluştu." };
//   }
// } // Eksik kapanış parantezi eklendi


export default async function FieldsPage() { // Component'i async yap
  let fieldsResult: Field[] | { error: string };

  try {
    // headers() fonksiyonunu await olmadan tekrar deneyelim
    const requestHeaders = await headers();
    const cookieHeader = requestHeaders.get('cookie');
    if (!cookieHeader) {
      // Middleware zaten yönlendirmeli, ama yine de kontrol edelim
      throw new Error("Kimlik doğrulama bilgisi bulunamadı.");
    }

    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/fields`, {
      headers: {
        'Cookie': cookieHeader,
      },
      next: { revalidate: 0 } // Cache kullanma
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `API isteği başarısız: ${response.status} ${response.statusText}` };
      }
      console.error("API Error:", response.status, errorData);
      throw new Error(errorData?.error || `API isteği başarısız: ${response.status}`);
    }
    fieldsResult = await response.json();

  } catch (error: any) {
    console.error("FieldsPage fetch error:", error);
    fieldsResult = { error: error.message || "Tarlalar yüklenirken bir hata oluştu." };
  }

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

      {/* Hata Durumu */}
      {typeof fieldsResult === 'object' && 'error' in fieldsResult && (
         <Alert variant="destructive">
           <Terminal className="h-4 w-4" />
           <AlertTitle>Hata!</AlertTitle>
           <AlertDescription>{fieldsResult.error}</AlertDescription>
         </Alert>
      )}

       {/* Başarılı Durum - Veri Yok */}
      {Array.isArray(fieldsResult) && fieldsResult.length === 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center">
            <h2 className="text-lg font-medium">Henüz Tarla Eklenmemiş</h2>
            <p className="text-sm text-muted-foreground mb-4">
                İlk tarlanızı ekleyerek yönetmeye başlayın.
            </p>
            <Button asChild>
                <Link href="/dashboard/owner/fields/new">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Yeni Tarla Ekle
                </Link>
            </Button>
        </div>
      )}

      {/* Başarılı Durum - Veri Var */}
      {Array.isArray(fieldsResult) && fieldsResult.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {fieldsResult.map((field) => (
            <Card key={field.id} className="overflow-hidden flex flex-col">
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg truncate" title={field.name}>{field.name}</CardTitle>
                  <Badge
                    variant={field.status === "ACTIVE" ? "default" : "secondary"}
                    className={`whitespace-nowrap ${field.status === "ACTIVE" ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" : ""}`}
                  >
                    {field.status === "ACTIVE" ? "Aktif" : field.status}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-1 pt-1">
                  <MapPinIcon className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate" title={field.location}>{field.location}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 flex-grow">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                   <div>
                     <p className="text-muted-foreground">Ekin</p>
                     {/* API'de 'crops' ilişkisi var, ilk ekinin adını gösterelim */}
                     <p className="font-medium">{field.crops?.[0]?.name || "-"}</p>
                   </div>
                   <div>
                     <p className="text-muted-foreground">Alan</p>
                     <p className="font-medium">{field.size} dönüm</p>
                   </div>
                   {/* API'den gelmeyen diğer alanlar kaldırıldı */}
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/10 p-2">
                <div className="flex w-full items-center justify-between">
                  <Button variant="ghost" size="sm" asChild className="flex-1 justify-start text-left">
                    <Link href={`/dashboard/owner/fields/${field.id}`}>
                      Detaylar
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="flex-1 justify-end text-right">
                    <Link href={`/dashboard/owner/fields/${field.id}/edit`}>
                      Düzenle
                    </Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
