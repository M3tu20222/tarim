import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { InventoryCategory } from "@prisma/client";

export async function PUT(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // Sadece admin ve sahip kullanıcılar kategori güncelleyebilir
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const { inventoryId, category } = await request.json();

    // Veri doğrulama
    if (!inventoryId || !category) {
      return NextResponse.json(
        { error: "Envanter ID ve kategori zorunludur" },
        { status: 400 }
      );
    }

    // Envanter kaydını güncelle
    const inventory = await prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        category: category as InventoryCategory,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Kategori başarıyla güncellendi",
      inventory,
    });
  } catch (error) {
    console.error("Error updating inventory category:", error);
    return NextResponse.json(
      { error: "Kategori güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
