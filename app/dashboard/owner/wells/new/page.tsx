import type { Metadata } from "next";
import { WellForm } from "@/components/wells/well-form";

export const metadata: Metadata = {
  title: "Yeni Kuyu Ekle | Tarım Yönetim Sistemi",
  description: "Çiftliğinize yeni bir kuyu ekleyin",
};

export default function NewWellPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Yeni Kuyu Ekle</h1>
      </div>
      <WellForm />
    </div>
  );
}
