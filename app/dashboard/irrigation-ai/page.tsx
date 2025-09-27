import { IrrigationAIDashboard } from "@/components/irrigation/irrigation-ai-dashboard";

export default function IrrigationAIPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">🤖 Akıllı Sulama Asistanı</h2>
          <p className="text-muted-foreground">
            AI destekli sulama önerileri ve tarla analizi
          </p>
        </div>
      </div>

      <IrrigationAIDashboard />
    </div>
  );
}