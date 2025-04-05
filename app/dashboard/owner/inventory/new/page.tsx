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
import { InventoryForm } from "@/components/inventory/inventory-form";

export default function NewInventoryPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/owner/inventory">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Yeni Envanter</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Envanter Bilgileri</CardTitle>
          <CardDescription>
            Yeni bir envanter kaydı oluşturmak için aşağıdaki formu doldurun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InventoryForm />
        </CardContent>
      </Card>
    </div>
  );
}
