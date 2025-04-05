import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { EquipmentForm } from "@/components/equipment/equipment-form";

export const metadata: Metadata = {
  title: "Yeni Ekipman | Tarım Yönetim Sistemi",
  description: "Yeni tarım ekipmanı ekleyin",
};

export default function NewEquipmentPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/owner/equipment">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Yeni Ekipman</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ekipman Bilgileri</CardTitle>
          <CardDescription>
            Yeni bir ekipman kaydı oluşturmak için aşağıdaki formu doldurun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EquipmentForm />
        </CardContent>
      </Card>
    </div>
  );
}
