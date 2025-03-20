import type { Metadata } from "next";
import Link from "next/link";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PurchasesTable } from "@/components/purchases/purchases-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const metadata: Metadata = {
  title: "Alışlar | Tarım Yönetim Sistemi",
  description: "Alışlar yönetim sayfası",
};

export default function PurchasesPage() {
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
              <BreadcrumbPage>Alışlar</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button asChild>
          <Link href="/dashboard/owner/purchases/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Yeni Alış
          </Link>
        </Button>
      </div>

      <Card className="border-purple-500/30 bg-background/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Alışlar</CardTitle>
          <CardDescription>
            Tüm alışlarınızı görüntüleyin ve yönetin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">Tümü</TabsTrigger>
              <TabsTrigger value="paid">Ödenenler</TabsTrigger>
              <TabsTrigger value="pending">Bekleyenler</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <PurchasesTable filter="all" />
            </TabsContent>
            <TabsContent value="paid">
              <PurchasesTable filter="paid" />
            </TabsContent>
            <TabsContent value="pending">
              <PurchasesTable filter="pending" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
