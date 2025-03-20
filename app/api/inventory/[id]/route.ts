import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// import { getServerSession } from "next-auth"; // Bunu sil
// import { authOptions } from "../../auth/[...nextauth]/route"; // Bunu sil
import { getSession } from "@/lib/session"; // Kendi session fonksiyonumuzu import et

// Get a specific inventory item
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // const session = await getServerSession(authOptions); // Bunu sil
    const session = await getSession(); // Kendi session fonksiyonumuzu kullan

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const inventory = await prisma.inventory.findUnique({
      where: { id: params.id },
      include: {
        ownerships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        usages: {
          include: {
            usedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            field: true,
            process: true,
          },
        },
      },
    });

    if (!inventory) {
      return NextResponse.json(
        { error: "Inventory not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

// Update an inventory item
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // const session = await getServerSession(authOptions); // Bunu sil
    const session = await getSession();

    if (
      !session ||
      (session.user.role !== "ADMIN" && session.user.role !== "OWNER")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const {
      name,
      category,
      totalQuantity,
      unit,
      purchaseDate,
      expiryDate,
      status,
      notes,
    } = await request.json();

    const inventory = await prisma.inventory.update({
      where: { id: params.id },
      data: {
        name,
        category,
        totalQuantity,
        unit,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        status,
        notes,
      },
    });

    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Error updating inventory:", error);
    return NextResponse.json(
      { error: "Failed to update inventory" },
      { status: 500 }
    );
  }
}

// Delete an inventory item
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // const session = await getServerSession(authOptions); //Bunu sil
    const session = await getSession();

    if (
      !session ||
      (session.user.role !== "ADMIN" && session.user.role !== "OWNER")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // First delete related ownerships and usages
    await prisma.inventoryOwnership.deleteMany({
      where: { inventoryId: params.id },
    });

    await prisma.inventoryUsage.deleteMany({
      where: { inventoryId: params.id },
    });

    // Then delete the inventory item
    await prisma.inventory.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Inventory deleted successfully" });
  } catch (error) {
    console.error("Error deleting inventory:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory" },
      { status: 500 }
    );
  }
}
