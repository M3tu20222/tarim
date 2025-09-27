import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import HarvestForm from "@/components/harvest/harvest-form";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface EditHarvestPageProps {
  params: Promise<{ id: string }>;
}

async function getHarvest(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const harvest = await prisma.harvest.findUnique({
      where: { id },
      include: {
        field: {
          select: {
            id: true,
            name: true,
            location: true
          }
        },
        crop: {
          select: {
            id: true,
            name: true,
            cropType: true
          }
        },
        season: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!harvest) {
      return null;
    }

    // Kullanıcının erişim yetkisini kontrol et
    if (user.role !== 'ADMIN') {
      const ownership = await prisma.fieldOwnership.findFirst({
        where: {
          fieldId: harvest.fieldId,
          userId: user.id
        }
      });

      if (!ownership) {
        throw new Error("Forbidden");
      }
    }

    return harvest;
  } catch (error) {
    console.error("Error fetching harvest:", error);
    return null;
  }
}

export default async function EditHarvestPage({ params }: EditHarvestPageProps) {
  const { id } = await params;
  const harvest = await getHarvest(id);

  if (!harvest) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hasat Kaydını Düzenle</h1>
          <p className="text-muted-foreground">
            {harvest.crop.name} - {harvest.field.name}
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Form yükleniyor...</span>
          </div>
        }
      >
        <HarvestForm mode="edit" initialData={harvest} />
      </Suspense>
    </div>
  );
}