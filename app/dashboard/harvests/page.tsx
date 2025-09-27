import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import HarvestList from "@/components/harvest/harvest-list";

export default function HarvestsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Hasat kayıtları yükleniyor...</span>
          </div>
        }
      >
        <HarvestList />
      </Suspense>
    </div>
  );
}