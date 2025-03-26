import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcrypt";
import { headers } from "next/headers";

// Get a specific user
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const headersList = await headers(); // headers() Promise döndüğü için await ekliyoruz
    const userRole = headersList.get("x-user-role");
    const requestingUserId = headersList.get("x-user-id");
    const targetUserId = params.id;

    console.log("API isteği alındı - Kullanıcı Detayı");
    console.log("İstenen Kullanıcı ID:", targetUserId);
    console.log("İstek Yapan Kullanıcı ID:", requestingUserId);
    console.log("İstek Yapan Kullanıcı Rolü:", userRole);

    // Only allow users to view their own profile or admins to view any profile
    if (requestingUserId !== targetUserId && userRole !== "ADMIN") {
      console.log("Yetkisiz erişim denemesi");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      console.log("Kullanıcı bulunamadı");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("Kullanıcı bulundu:", user.id);
    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// Update a user
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const headersList = await headers(); // await ekliyoruz
    const userRole = headersList.get("x-user-role");
    const requestingUserId = headersList.get("x-user-id");
    const targetUserId = params.id;

    console.log("API isteği alındı - Kullanıcı Güncelleme");
    console.log("Güncellenecek Kullanıcı ID:", targetUserId);
    console.log("İstek Yapan Kullanıcı ID:", requestingUserId);
    console.log("İstek Yapan Kullanıcı Rolü:", userRole);

    // Only allow users to update their own profile or admins to update any profile
    if (requestingUserId !== targetUserId && userRole !== "ADMIN") {
      console.log("Yetkisiz erişim denemesi");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, email, password, role, status } = await request.json();

    // Prepare update data
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    // Only allow admins to update role and status
    if (userRole === "ADMIN") {
      if (role) updateData.role = role;
      if (status) updateData.status = status;
    }

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    console.log("Kullanıcı güncellendi:", user.id);
    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// Delete a user
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const headersList = await headers(); // await ekliyoruz
    const userRole = headersList.get("x-user-role");
    const requestingUserId = headersList.get("x-user-id");
    const targetUserId =await params.id;

    console.log("API isteği alındı - Kullanıcı Silme");
    console.log("Silinecek Kullanıcı ID:", targetUserId);
    console.log("İstek Yapan Kullanıcı ID:", requestingUserId);
    console.log("İstek Yapan Kullanıcı Rolü:", userRole);

    // Only admins can delete users
    if (!userRole || userRole !== "ADMIN") {
      console.log("Yetkisiz erişim denemesi");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      console.log("Kullanıcı bulunamadı:", targetUserId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: targetUserId },
    });

    console.log("Kullanıcı silindi:", targetUserId);
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
