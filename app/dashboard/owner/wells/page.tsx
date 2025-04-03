import type { Metadata } from "next";
import { WellList } from "@/components/wells/well-list";

export const metadata: Metadata = {
  title: "Kuyular | Tarım Yönetim Sistemi",
  description: "Kuyu listesi ve yönetimi",
};

export default async function WellsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Kuyular</h1>
      </div>
      <WellList />
    </div>
  );
}
