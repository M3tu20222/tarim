import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DebtForm } from "@/components/debts/debt-form";

export const metadata: Metadata = {
  title: "Yeni Borç | Tarım Yönetim Sistemi",
  description: "Yeni borç ekleme sayfası",
};

export default function NewDebtPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/owner/debts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Yeni Borç</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Borç Bilgileri</CardTitle>
          <CardDescription>
            Yeni bir borç kaydı oluşturmak için aşağıdaki formu doldurun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DebtForm />
        </CardContent>
      </Card>
    </div>
  );
}
