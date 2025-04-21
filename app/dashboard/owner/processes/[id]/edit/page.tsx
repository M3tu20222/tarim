import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProcessForm } from "@/components/processes/process-form";

export const metadata: Metadata = {
  title: "İşlem Düzenle",
  description: "Tarla işlemini düzenleyin",
};

async function getProcess(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const response = await fetch(`${baseUrl}/api/processes/${id}`, {
      headers: {
        "x-user-id": "user_id_placeholder", // Bu değerler sunucu tarafında middleware ile değiştirilecek
        "x-user-role": "OWNER",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error("Failed to fetch process");
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching process:", error);
    throw new Error("Failed to fetch process");
  }
}

export default async function EditProcessPage({
  params,
}: {
  params: { id: string };
}) {
  const process = await getProcess(params.id);

  if (!process) {
    notFound();
  }

  // Form için gerekli verileri hazırla
  const formData = {
    id: process.id,
    fieldId: process.fieldId,
    type: process.type,
    date: new Date(process.date),
    workerId: process.workerId,
    processedPercentage: process.processedPercentage || 100,
    description: process.description || "",
    equipmentId: process.equipmentId || "",
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <Button variant="outline" size="sm" className="mb-2" asChild>
          <a href={`/dashboard/owner/processes/${params.id}`}>
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
