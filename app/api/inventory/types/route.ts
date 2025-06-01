import { NextResponse } from "next/server";
import { InventoryCategory } from "@prisma/client";

export async function GET() {
  try {
    // InventoryCategory enum'ının tüm değerlerini al
    const categories = Object.values(InventoryCategory);
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching inventory categories:", error);
    return NextResponse.json(
      { error: "Envanter kategorileri getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
