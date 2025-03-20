import type { Metadata } from "next";
import Link from "next/link";
import { EnhancedPurchaseForm } from "@/components/purchases/enhanced-purchase-form";
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
import { ArrowLeft, LayoutTemplateIcon as Template } from "lucide-react";

export const metadata: Metadata = {
  title: "Yeni Alış Şablonu | Tarım Yönetim Sistemi",
  description: "Yeni alış şablonu oluşturma sayfası",
};

export default function NewPurchaseTemplatePage() {
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
              <BreadcrumbLink href="/dashboard/owner/purchases/templates">
                Şablonlar
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Yeni Şablon</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button variant="outline" asChild>
          <Link href="/dashboard/owner/purchases/templates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Geri Dön
          </Link>
        </Button>
      </div>

      <Card className="border-purple-500/30 bg-background/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Template className="h-5 w-5" />
            Yeni Alış Şablonu Oluştur
          </CardTitle>
          <CardDescription>
            Sık kullandığınız alış bilgilerini şablon olarak kaydedin ve
            gelecekte tekrar kullanın.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnhancedPurchaseForm />
        </CardContent>
      </Card>
    </div>
  );
}
