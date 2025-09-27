import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import HarvestForm from "@/components/harvest/harvest-form";

export default function NewHarvestPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Yeni Hasat Kaydı</h1>
          <p className="text-muted-foreground">
            Yeni bir hasat kaydı oluşturun
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Form yükleniyor...</span>
          </div>
        }
      >
        <HarvestForm mode="create" />
      </Suspense>
    </div>
  );
}