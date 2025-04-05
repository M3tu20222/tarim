import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { Suspense } from "react";
import { EquipmentTable } from "@/components/equipment/equipment-table";

export const metadata: Metadata = {
  title: "Ekipman Yönetimi | Tarım Yönetim Sistemi",
  description: "Tarım ekipmanlarını yönetin",
};

export default function EquipmentPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Ekipman Yönetimi</h1>
        <Button asChild>
          <Link href="/dashboard/owner/equipment/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            Yeni Ekipman
          </Link>
        </Button>
      </div>
      <Suspense fallback={<div>Yükleniyor...</div>}>
        <EquipmentTable />
      </Suspense>
    </div>
  );
}
