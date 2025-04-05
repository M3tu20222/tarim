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
import { ProcessForm } from "@/components/processes/process-form";

export const metadata: Metadata = {
  title: "Yeni Tarla İşlemi | Tarım Yönetim Sistemi",
  description: "Yeni tarla işlemi ekleyin",
};

export default function NewProcessPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/owner/processes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Yeni Tarla İşlemi</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>İşlem Bilgileri</CardTitle>
          <CardDescription>
            Yeni bir tarla işlemi kaydı oluşturmak için aşağıdaki formu
            doldurun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProcessForm />
        </CardContent>
      </Card>
    </div>
  );
}
