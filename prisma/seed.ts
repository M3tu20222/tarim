import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Seed işlemi başlıyor...");

    // 1. Kullanıcıları oluştur
    console.log("Kullanıcılar oluşturuluyor...");
    const adminPassword = await hash("admin123", 10);
    const ownerPassword = await hash("owner123", 10);
    const workerPassword = await hash("worker123", 10);

    const admin = await prisma.user.create({
      data: {
        name: "Admin User",
        email: "admin@example.com",
        password: adminPassword,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    const owner = await prisma.user.create({
      data: {
        name: "Owner User",
        email: "owner@example.com",
        password: ownerPassword,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    const worker = await prisma.user.create({
      data: {
        name: "Worker User",
        email: "worker@example.com",
        password: workerPassword,
        role: "WORKER",
        status: "ACTIVE",
      },
    });

    console.log("Kullanıcılar oluşturuldu:", {
      admin: admin.id,
      owner: owner.id,
      worker: worker.id,
    });

    // 2. Sezon oluştur
    console.log("Sezon oluşturuluyor...");
    const season = await prisma.season.create({
      data: {
        name: "2023-2024 Sezonu",
        startDate: new Date("2023-09-01"),
        endDate: new Date("2024-08-31"),
        description: "2023-2024 Tarım Sezonu",
        isActive: true,
        creatorId: owner.id,
      },
    });
    console.log("Sezon oluşturuldu:", season.id);

    // 3. Tarla oluştur
    console.log("Tarla oluşturuluyor...");
    const field = await prisma.field.create({
      data: {
        name: "Örnek Tarla",
        location: "Örnek Lokasyon",
        size: 100,
        status: "ACTIVE",
        seasonId: season.id,
      },
    });
    console.log("Tarla oluşturuldu:", field.id);

    // 4. Tarla sahipliği oluştur
    console.log("Tarla sahipliği oluşturuluyor...");
    const fieldOwnership = await prisma.fieldOwnership.create({
      data: {
        fieldId: field.id,
        userId: owner.id,
      },
    });
    console.log("Tarla sahipliği oluşturuldu:", fieldOwnership.id);

    // 5. İşçi atama
    console.log("İşçi ataması yapılıyor...");
    const workerAssignment = await prisma.fieldWorkerAssignment.create({
      data: {
        fieldId: field.id,
        userId: worker.id,
      },
    });
    console.log("İşçi ataması yapıldı:", workerAssignment.id);

    // 6. Envanter oluştur
    console.log("Envanter oluşturuluyor...");
    const inventory = await prisma.inventory.create({
      data: {
        name: "Örnek Gübre",
        category: "FERTILIZER",
        totalQuantity: 1000,
        unit: "KG",
        status: "AVAILABLE",
      },
    });
    console.log("Envanter oluşturuldu:", inventory.id);

    // 7. Envanter sahipliği oluştur
    console.log("Envanter sahipliği oluşturuluyor...");
    const inventoryOwnership = await prisma.inventoryOwnership.create({
      data: {
        inventoryId: inventory.id,
        userId: owner.id,
        shareQuantity: 1000,
      },
    });
    console.log("Envanter sahipliği oluşturuldu:", inventoryOwnership.id);

    console.log("Seed işlemi başarıyla tamamlandı!");
  } catch (error) {
    console.error("Seed işlemi sırasında hata:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("Seed işlemi başarısız:", e);
    process.exit(1);
  })
  .finally(async () => {
    console.log("Veritabanı bağlantısı kapatılıyor...");
    await prisma.$disconnect();
  });
