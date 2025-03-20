import type { Metadata } from "next";
import Link from "next/link";
import { NewPurchaseForm } from "@/components/purchases/new-purchase-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Yeni Alış | Tarım Yönetim Sistemi",
  description: "Yeni alış oluşturma sayfası",
};

export default function NewPurchasePage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard/owner">Ana Sayfa</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard/owner/purchases">
                Alışlar
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Yeni Alış</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button variant="outline" asChild>
          <Link href="/dashboard/owner/purchases">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri Dön
          </Link>
        </Button>
      </div>

      <Card className="border-purple-500/30 bg-background/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Yeni Alış Oluştur</CardTitle>
          <CardDescription>
            Yeni bir alış kaydı oluşturmak için aşağıdaki formu doldurun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewPurchaseForm />
        </CardContent>
      </Card>
    </div>
  );
}
