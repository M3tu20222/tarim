import type { Metadata } from "next";
import { IrrigationList } from "@/components/irrigation/irrigation-list";

export const metadata: Metadata = {
  title: "Sulama Kayıtları | Tarım Yönetim Sistemi",
  description: "Tarla sulama kayıtlarını görüntüle ve yönet",
};

export default function IrrigationPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Sulama Kayıtları</h1>
      <IrrigationList />
    </div>
  );
}
