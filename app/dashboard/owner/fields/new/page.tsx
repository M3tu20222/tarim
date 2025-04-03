import type { Metadata } from "next";
import { NewFieldForm } from "@/components/fields/new-field-form";

export const metadata: Metadata = {
  title: "Yeni Tarla Ekle | Tarım Yönetim Sistemi",
  description: "Çiftliğinize yeni bir tarla ekleyin",
};

export default function NewFieldPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Yeni Tarla Ekle</h1>
        <p className="text-muted-foreground">
          Çiftliğinize yeni bir tarla ekleyin.
        </p>
      </div>
      <NewFieldForm />
    </div>
  );
}
