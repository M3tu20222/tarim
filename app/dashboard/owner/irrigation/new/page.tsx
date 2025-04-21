import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { IrrigationForm } from "@/components/irrigation/irrigation-form";

export const metadata: Metadata = {
  title: "Yeni Sulama Kaydı | Tarım Yönetim Sistemi",
  description: "Yeni bir sulama kaydı oluştur",
};

export default function NewIrrigationPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/owner/irrigation">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Yeni Sulama Kaydı</h1>
      </div>

      <div className="grid gap-4">
        <IrrigationForm />
      </div>
    </div>
  );
}
