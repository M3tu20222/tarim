import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { Suspense } from "react";
import ProcessTable from "@/components/processes/process-table";

export const metadata: Metadata = {
  title: "Tarla İşlemleri | Tarım Yönetim Sistemi",
  description: "Tarla işlemlerini yönetin",
};

export default function ProcessesPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tarla İşlemleri</h1>
        <Button asChild>
          <Link href="/dashboard/owner/processes/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            Yeni İşlem
          </Link>
        </Button>
      </div>
      <Suspense fallback={<div>Yükleniyor...</div>}>
        <ProcessTable />
      </Suspense>
    </div>
  );
}
