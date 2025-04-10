import type { Metadata } from "next";
import Link from 'next/link'; // Düzeltildi: @/next/link -> next/link
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { Suspense } from "react";
import FieldsList from "@/components/fields/fields-list";

export const metadata: Metadata = {
  title: "Tarlalar | Tarım Yönetim Sistemi",
  description: "Tarla listesi ve yönetimi",
};

export default function FieldsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tarlalar</h1>
        <Button asChild>
          <Link href="/dashboard/owner/fields/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            Yeni Tarla
          </Link>
        </Button>
      </div>
      <Suspense fallback={<div>Yükleniyor...</div>}>
        <FieldsList />
      </Suspense>
    </div>
  );
}
