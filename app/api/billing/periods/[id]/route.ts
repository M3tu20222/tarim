import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Season } from "@prisma/client"; // Gerekli türü içe aktarabiliriz
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"; // Prisma hata türünü içe aktar

// Belirli bir sezonu getir (Fatura dönemi yerine)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // Sadece admin ve sahip kullanıcılar sezonları görebilir (Yetkilendirme projeye göre ayarlanabilir)
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const id = params.id;

    // Sezonu getir
    const season = await prisma.season.findUnique({
      where: { id },
      include: {
        fieldExpenses: { // wellBills -> fieldExpenses
          include: {
            field: { // İlişkili tarla
              select: { id: true, name: true },
            },
            processCost: { // İlişkili işlem maliyeti
              select: { id: true, totalCost: true },
            },
          },
        },
        // İsteğe bağlı olarak diğer ilişkili veriler de eklenebilir (processes, fields, crops vb.)
      },
    });

    if (!season) {
      return NextResponse.json(
        { error: "Sezon bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json(season);
  } catch (error) {
    console.error("Error fetching season:", error);
    return NextResponse.json(
      { error: "Sezon getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Sezonu güncelle
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // Sadece admin ve sahip kullanıcılar sezonu güncelleyebilir (Yetkilendirme projeye göre ayarlanabilir)
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const id = params.id;
    // Season modelinde description alanı da var, onu da ekleyebiliriz
    const { name, startDate, endDate, isActive, description } = await request.json();

    // Veri doğrulama
    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Ad, başlangıç tarihi ve bitiş tarihi zorunludur" },
        { status: 400 }
      );
    }

    // Tarih kontrolü
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return NextResponse.json(
        { error: "Başlangıç tarihi bitiş tarihinden önce olmalıdır" },
        { status: 400 }
      );
    }

    // Çakışan sezon kontrolü (kendisi hariç)
    const overlappingSeason = await prisma.season.findFirst({
      where: {
        AND: [
          { id: { not: id } }, // Kendisi hariç
          {
            OR: [
              {
                startDate: { lte: end },
                endDate: { gte: start },
              },
            ],
          },
        ],
      },
    });

    if (overlappingSeason) {
      return NextResponse.json(
        { error: "Bu tarih aralığında başka bir sezon bulunmaktadır" },
        { status: 400 }
      );
    }

    // Sezonu güncelle
    const updatedSeason = await prisma.season.update({
      where: { id },
      data: {
        name,
        startDate: start,
        endDate: end,
        isActive: isActive ?? true,
        description: description, // Açıklamayı da güncelle
      },
    });

    return NextResponse.json(updatedSeason);
  } catch (error) {
    console.error("Error updating season:", error);
    return NextResponse.json(
      { error: "Sezon güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Sezonu sil
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: "Kullanıcı ID'si veya rolü eksik" },
        { status: 401 }
      );
    }

    // Sadece admin ve sahip kullanıcılar sezonu silebilir (Yetkilendirme projeye göre ayarlanabilir)
    if (userRole !== "ADMIN" && userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    const id = params.id;

    // İlişkili tarla giderlerini kontrol et (veya diğer ilişkili kayıtları)
    const relatedFieldExpensesCount = await prisma.fieldExpense.count({
      where: { seasonId: id }, // billingPeriodId -> seasonId
    });

    // Not: Sezona bağlı başka kritik veriler (processes, fields, crops vb.) varsa,
    // onların da kontrol edilmesi veya silme işleminin cascade davranışı ile yönetilmesi gerekebilir.
    // Şimdilik sadece FieldExpense kontrolü yapılıyor.

    if (relatedFieldExpensesCount > 0) {
      return NextResponse.json(
        {
          error:
            "Bu sezona ait tarla giderleri bulunmaktadır. Silme işlemi yapılamaz.",
        },
        { status: 400 }
      );
    }

    // Sezonu sil
    await prisma.season.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Sezon başarıyla silindi." });
  } catch (error: unknown) { // error türünü unknown olarak belirt
    console.error("Error deleting season:", error);
    // Prisma'nın bilinen silme kısıtlama hatasını yakala
    // error'ın PrismaClientKnownRequestError olup olmadığını kontrol et
     if (error instanceof PrismaClientKnownRequestError && error.code === 'P2014') {
         return NextResponse.json(
             { error: `Bu sezonla ilişkili başka kayıtlar (örn: işlemler, tarlalar) olduğu için silinemiyor. Hata kodu: ${error.code}` },
             { status: 400 }
         );
     }
    return NextResponse.json(
      { error: "Sezon silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
