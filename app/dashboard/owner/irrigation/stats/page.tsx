import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { IrrigationStats } from "@/components/irrigation/irrigation-stats";

export const metadata: Metadata = {
  title: "Sulama İstatistikleri | Tarım Yönetim Sistemi",
  description: "Sulama istatistikleri ve analizleri",
};

export default function IrrigationStatsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/owner/irrigation">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            Sulama İstatistikleri
          </h1>
        </div>
      </div>

      <IrrigationStats />
    </div>
  );
}
