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
import { SeasonForm } from "@/components/seasons/season-form";

export const metadata: Metadata = {
  title: "Yeni Sezon | Tarım Yönetim Sistemi",
  description: "Yeni sezon oluşturma sayfası",
};

export default function NewSeasonPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/owner/seasons">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Yeni Sezon</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sezon Bilgileri</CardTitle>
          <CardDescription>
            Yeni bir sezon oluşturmak için aşağıdaki formu doldurun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SeasonForm />
        </CardContent>
      </Card>
    </div>
  );
}
