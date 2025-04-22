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

async function getProcess(id: string) {
  try {
    // Cookie'den token'ı al
    const cookieStore = await cookies(); // await eklendi
    const token = cookieStore.get("token")?.value;

    if (!token) {
      console.error("Token bulunamadı");
      return null;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const response = await fetch(`${baseUrl}/api/processes/${id}`, {
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
  // params.id'yi kullanmadan önce kontrol et
  if (!params?.id) {
    console.error("İşlem ID'si bulunamadı");
    notFound();
  }

  const processId = params.id;
  const process = await getProcess(processId);

  if (!process) {
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
    // Ekipman ve envanter kullanımları
    equipmentUsages: process.equipmentUsages || [],
    inventoryUsages: process.inventoryUsages || [],
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <Button variant="outline" size="sm" className="mb-2" asChild>
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
