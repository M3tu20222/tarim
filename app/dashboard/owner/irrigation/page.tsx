import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { IrrigationList } from "@/components/irrigation/irrigation-list";
import { IrrigationListSkeleton } from "@/components/irrigation/irrigation-list-skeleton";
import { CalendarDateRangePicker } from "@/components/date-range-picker"; // DateRangePicker -> CalendarDateRangePicker

export const metadata: Metadata = {
  title: "Sulama Kayıtları | Tarım Yönetim Sistemi",
  description: "Tarla sulama kayıtlarını görüntüle ve yönet",
};

export default function IrrigationPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Sulama Kayıtları</h1>
        <Button asChild>
          <Link href="/dashboard/owner/irrigation/new">
            <Plus className="mr-2 h-4 w-4" />
            Yeni Sulama Kaydı
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CalendarDateRangePicker /> 
      </div>

      <Suspense fallback={<IrrigationListSkeleton />}>
        <IrrigationList />
      </Suspense>
    </div>
  );
}
