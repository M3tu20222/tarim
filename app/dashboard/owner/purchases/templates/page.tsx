import type { Metadata } from "next";
import Link from "next/link";
import { PlusCircle, LayoutTemplateIcon as Template } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PurchaseTemplateList } from "@/components/purchases/purchase-template-list";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const metadata: Metadata = {
  title: "Alış Şablonları | Tarım Yönetim Sistemi",
  description: "Alış şablonları yönetim sayfası",
};

export default function PurchaseTemplatesPage() {
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
              <BreadcrumbPage>Şablonlar</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/owner/purchases">Alışlara Dön</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/owner/purchases/templates/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Yeni Şablon
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-purple-500/30 bg-background/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Template className="h-5 w-5" />
            Alış Şablonları
          </CardTitle>
          <CardDescription>
            Sık kullandığınız alış şablonlarını yönetin ve yeni alışlar
            oluşturun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PurchaseTemplateList />
        </CardContent>
      </Card>
    </div>
  );
}
