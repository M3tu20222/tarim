  import { PrismaClient } from "@prisma/client";
  import { hash } from "bcrypt";

  const prisma = new PrismaClient();

  async function main() {
    // Kullanıcıları oluştur
    const adminPassword = await hash("admin123", 10);
    const ownerPassword = await hash("owner123", 10);
    const workerPassword = await hash("worker123", 10);

    // Admin kullanıcısı
    const admin = await prisma.user.upsert({
      where: { email: "admin@example.com" },
      update: {},
      create: {
        name: "Admin User",
        email: "admin@example.com",
        password: adminPassword,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    // Sahip kullanıcısı
    const owner = await prisma.user.upsert({
      where: { email: "owner@example.com" },
      update: {},
      create: {
        name: "Owner User",
        email: "owner@example.com",
        password: ownerPassword,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    // İşçi kullanıcısı
    const worker = await prisma.user.upsert({
      where: { email: "worker@example.com" },
      update: {},
      create: {
        name: "Worker User",
        email: "worker@example.com",
        password: workerPassword,
        role: "WORKER",
        status: "ACTIVE",
      },
    });

    console.log("Kullanıcılar oluşturuldu:", { admin, owner, worker });

    // Önce sezon oluştur
    const season = await prisma.season.create({
      data: {
        name: "2023-2024 Sezonu",
        startDate: new Date("2023-09-01"),
        endDate: new Date("2024-08-31"),
        description: "2023-2024 Tarım Sezonu",
        isActive: true,
        creator: {
          connect: { id: owner.id },
        },
      },
    });

    console.log("Sezon oluşturuldu:", season);

    // Sonra tarla oluştur
    const field = await prisma.field.create({
      data: {
        name: "Örnek Tarla",
        location: "Örnek Lokasyon",
        size: 100,
        status: "ACTIVE",
        season: {
          connect: { id: season.id },
        },
      },
    });

    console.log("Tarla oluşturuldu:", field);

    // Tarla sahipliği oluştur
    const fieldOwnership = await prisma.fieldOwnership.create({
      data: {
        field: {
          connect: { id: field.id },
        },
        user: {
          connect: { id: owner.id },
        },
      },
    });

    console.log("Tarla sahipliği oluşturuldu:", fieldOwnership);

    // İşçi atama
    const workerAssignment = await prisma.fieldWorkerAssignment.create({
      data: {
        field: {
          connect: { id: field.id },
        },
        user: {
          connect: { id: worker.id },
        },
      },
    });

    console.log("İşçi ataması yapıldı:", workerAssignment);

    // Envanter oluştur
    const inventory = await prisma.inventory.create({
      data: {
        name: "Örnek Gübre",
        category: "FERTILIZER",
        totalQuantity: 1000,
        unit: "KG",
        status: "AVAILABLE",
        ownerships: {
          create: [
            {
              user: {
                connect: { id: owner.id },
              },
              shareQuantity: 1000,
            },
          ],
        },
      },
    });

    console.log("Envanter oluşturuldu:", inventory);
  }

  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
