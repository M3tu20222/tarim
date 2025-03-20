import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { PurchasesTable } from "@/components/purchases/purchases-table";
import { PurchasesTableSkeleton } from "@/components/purchases/purchases-table-skeleton";

export default function PurchasesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Purchases</h2>
          <p className="text-muted-foreground">
            Manage your purchases and related debts.
          </p>
        </div>
        <Link href="/dashboard/purchases/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Purchase
          </Button>
        </Link>
      </div>

      <Suspense fallback={<PurchasesTableSkeleton />}>
        <PurchasesTable />
      </Suspense>
    </div>
  );
}
