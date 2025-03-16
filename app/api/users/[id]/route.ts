"use server"
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcrypt";

// Belirli bir kullanıcıyı getir
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        ownedFields: {
          select: {
            id: true,
            name: true,
            location: true,
            size: true,
            status: true,
          },
        },
        fieldAssignments: {
          select: {
            //          id: true, // FieldWorker'ın id'si
            //          name: true, // HATA: FieldWorker'da name yok
            //          location: true,
            //          size: true,
            //          status: true,
            field: {
              // field ilişkisi üzerinden
              select: {
                id: true,
                name: true,
                location: true,
                size: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Kullanıcı getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Kullanıcıyı güncelle
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name, email, password, role, status } = await request.json();

    // Kullanıcıyı kontrol et
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    // Güncelleme verilerini hazırla
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Kullanıcıyı güncelle
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Kullanıcı güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Kullanıcıyı sil
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Kullanıcıyı kontrol et
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    // Kullanıcıyı sil
    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Kullanıcı başarıyla silindi" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Kullanıcı silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
