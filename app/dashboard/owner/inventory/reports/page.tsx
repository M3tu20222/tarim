import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { InventoryReport } from "@/components/inventory/inventory-report";

export const metadata: Metadata = {
  title: "Envanter Raporları | Tarım Yönetim Sistemi",
  description: "Envanter raporları ve analizleri",
};

export default function InventoryReportsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/owner/inventory">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Envanter Raporları
        </h1>
      </div>

      <InventoryReport />
    </div>
  );
}
