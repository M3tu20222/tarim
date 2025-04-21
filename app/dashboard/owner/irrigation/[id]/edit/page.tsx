import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { IrrigationForm } from "@/components/irrigation/irrigation-form";

export const metadata: Metadata = {
  title: "Sulama Kaydı Düzenle | Tarım Yönetim Sistemi",
  description: "Sulama kaydını düzenle",
};

interface EditIrrigationPageProps {
  params: {
    id: string;
  };
}

export default async function EditIrrigationPage({
  params,
}: EditIrrigationPageProps) {
  const irrigation = await prisma.irrigationLog.findUnique({
    where: { id: params.id },
    include: {
      field: true,
    },
  });

  if (!irrigation) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/owner/irrigation/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Sulama Kaydı Düzenle
        </h1>
      </div>

      <div className="grid gap-4">
        <IrrigationForm initialData={irrigation} />
      </div>
    </div>
  );
}
