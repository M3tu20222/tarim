import { IrrigationForm } from "@/components/irrigation/irrigation-form";

export default function NewIrrigationPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Yeni Sulama Kaydı</h1>
      <IrrigationForm />
    </div>
  );
}
