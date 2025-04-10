import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { Suspense } from "react";
import { InventoryTable } from "@/components/inventory/inventory-table"; // Düzeltilmiş import
import { InventoryTableSkeleton } from "@/components/inventory/inventory-table-skeleton"; // Düzeltilmiş import

export const metadata: Metadata = {
  title: "Envanter Yönetimi | Tarım Yönetim Sistemi",
  description: "Tarım Yönetim Sistemi envanter yönetimi",
};

export default function InventoryPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Envanter Yönetimi</h1>
        <Button asChild>
          <Link href="/dashboard/owner/inventory/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            Yeni Envanter
          </Link>
        </Button>
      </div>
      <Suspense fallback={<InventoryTableSkeleton />}>
        <InventoryTable />
      </Suspense>
    </div>
  );
}
