"use client";

import { IrrigationList } from "@/components/irrigation/irrigation-list";

export default function IrrigationPage() {
  return (
    <div className="space-y-8 cyberpunk-grid p-4 md:p-6">
      <h1 className="text-3xl md:text-4xl font-bold neon-text-purple animate-flicker">
        Sulama Kayıtları
      </h1>
      <IrrigationList />
    </div>
  );
}
