import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
// EditPurchaseForm importunu doğru path'e göre güncelleyin
import { EditPurchaseForm } from "@/components/purchases/edit-purchase-form";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ArrowLeft } from "lucide-react";

// Metadata tanımlamasını ekleyebilirsiniz
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Alış Düzenle #${id.substring(0, 6)} | Tarım Yönetim Sistemi`,
    description: "Mevcut bir alış kaydını düzenleme sayfası",
  };
}

export default async function EditPurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: purchaseId } = await params;

  if (!purchaseId) {
    notFound();
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      contributors: {
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      },
      season: true,
    },
  });

  if (!purchase) {
    notFound();
  }

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
              <BreadcrumbPage>Alış Düzenle</BreadcrumbPage>
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
          <CardTitle>Alış Düzenle</CardTitle>
          <CardDescription>
            Mevcut alış kaydının bilgilerini güncelleyin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditPurchaseForm purchase={purchase} />
        </CardContent>
      </Card>
    </div>
  );
}