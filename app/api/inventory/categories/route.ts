import { NextResponse } from "next/server";
import { InventoryCategory } from "@prisma/client";

// Envanter kategorilerini getir
export async function GET(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // Kategorileri enum değerlerinden al
    const categories = Object.values(InventoryCategory).map((category) => ({
      value: category,
      label: getCategoryLabel(category),
    }));

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching inventory categories:", error);
    return NextResponse.json(
      { error: "Envanter kategorileri getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Kategori enum değerlerini Türkçe etiketlere dönüştür
function getCategoryLabel(category: InventoryCategory): string {
  const labels: Record<InventoryCategory, string> = {
    SEED: "Tohum",
    FERTILIZER: "Gübre",
    PESTICIDE: "İlaç",
    EQUIPMENT: "Ekipman",
    FUEL: "Yakıt",
    OTHER: "Diğer",
  };
  return labels[category] || category;
}
