import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { cookies } from "next/headers";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProcessForm } from "@/components/processes/process-form";

export const metadata: Metadata = {
  title: "İşlem Düzenle",
  description: "Tarla işlemini düzenleyin",
};

// Fonksiyonu tekrar id: string alacak şekilde geri döndür
async function getProcess(id: string) {
  // id kontrolü burada tekrar yapılabilir veya çağıran yerde yapılır
  if (!id) {
    console.error("getProcess içinde İşlem ID'si eksik");
    return null;
  }
  try {
    // Cookie'den token'ı al
    const cookieStore = await cookies(); // Dinamik fonksiyon
    const token = cookieStore.get("token")?.value;

    if (!token) {
      console.error("Token bulunamadı");
      return null;
    }

    // Server-side API çağrısı: relative path kullan (localhost problemi yok)
    const response = await fetch(`/api/processes/${id}`, {
      headers: {
        Cookie: `token=${token}`,
        "Cache-Control": "no-store",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.error(
        `API yanıtı başarısız: ${response.status} ${response.statusText}`
      );
      if (response.status === 404) {
        return null;
      }
      throw new Error(`API yanıtı başarısız: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("İşlem getirilirken hata oluştu:", error);
    throw new Error("İşlem getirilirken hata oluştu");
  }
}

export default async function EditProcessPage({
  params,
}: {
  params: { id: string };
}) {
  // params nesnesini await ile bekle (Dinamik fonksiyonlardan sonra erişim için)
  const awaitedParams = await params;

  // awaitedParams.id'yi kontrol et
  if (!awaitedParams?.id) {
    console.error("İşlem ID'si bulunamadı (await sonrası)");
    notFound();
  }

  const processId = awaitedParams.id; // Beklenmiş params'tan id'yi al
  const process = await getProcess(processId); // id'yi string olarak geç

  if (!process) {
    // Hata mesajında processId kullan
    console.error(`ID: ${processId} ile işlem bulunamadı`);
    notFound();
  }

  // Form için gerekli verileri hazırla
  const formData = {
    id: process.id,
    fieldId: process.fieldId,
    type: process.type,
    date: new Date(process.date),
    workerId: process.workerId,
    seasonId: process.seasonId || "", // seasonId eklendi
    processedArea: process.processedArea || 0,
    processedPercentage: process.processedPercentage || 100,
    description: process.description || "",
    // Ekipman ID'sini equipmentUsages'dan çıkar (varsa ilk elemanı al)
    equipmentId: process.equipmentUsages?.[0]?.equipmentId || null,
    inventoryUsages: process.inventoryUsages || [], // Bu ProcessForm'da işlenecek
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <Button variant="outline" size="sm" className="mb-2" asChild>
          {/* Linkte processId kullan (veya process?.id) */}
          <a href={`/dashboard/owner/processes/${processId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            İşlem Detaylarına Dön
          </a>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">İşlem Düzenle</h1>
        <p className="text-muted-foreground">
          Tarla işlem bilgilerini güncelleyin
        </p>
      </div>

      <Separator />

      <div>
        <ProcessForm initialData={formData} />
      </div>
    </div>
  );
}
