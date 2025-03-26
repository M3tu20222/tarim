import {
  PrismaClient,
  Role,
  Status,
  FieldStatus,
  CropStatus,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Kullanıcılar oluştur
  const adminPassword = await bcrypt.hash("admin123", 10);
  const ownerPassword = await bcrypt.hash("owner123", 10);
  const workerPassword = await bcrypt.hash("worker123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin Kullanıcı",
      email: "admin@example.com",
      password: adminPassword,
      role: Role.ADMIN,
      status: Status.ACTIVE,
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: {},
    create: {
      name: "Tarla Sahibi",
      email: "owner@example.com",
      password: ownerPassword,
      role: Role.OWNER,
      status: Status.ACTIVE,
    },
  });

  const worker = await prisma.user.upsert({
    where: { email: "worker@example.com" },
    update: {},
    create: {
      name: "Tarla İşçisi",
      email: "worker@example.com",
      password: workerPassword,
      role: Role.WORKER,
      status: Status.ACTIVE,
    },
  });

  console.log({ admin, owner, worker });

  // Örnek tarlalar oluştur
  const field1 = await prisma.field.create({
    data: {
      name: "Merkez Tarla",
      location: "Adana, Merkez",
      size: 120,
      status: FieldStatus.ACTIVE,
      owners: {
        connect: { id: owner.id },
      },
      workerAssignments: {
        create: [{ userId: worker.id }],
      },
    },
  });

  const field2 = await prisma.field.create({
    data: {
      name: "Doğu Tarla",
      location: "Adana, Ceyhan",
      size: 85,
      status: FieldStatus.ACTIVE,
      owners: {
        connect: { id: owner.id },
      },
      workerAssignments: {
        create: [{ userId: worker.id }],
      },
    },
  });

  console.log({ field1, field2 });

  // Örnek ürünler oluştur
  const crop1 = await prisma.crop.create({
    data: {
      name: "Buğday",
      plantedDate: new Date("2023-10-15"),
      status: CropStatus.GROWING,
      field: {
        connect: { id: field1.id },
      },
    },
  });

  const crop2 = await prisma.crop.create({
    data: {
      name: "Mısır",
      plantedDate: new Date("2023-09-20"),
      status: CropStatus.GROWING,
      field: {
        connect: { id: field2.id },
      },
    },
  });

  console.log({ crop1, crop2 });

  // Örnek sulama kayıtları oluştur
  const irrigationLog1 = await prisma.irrigationLog.create({
    data: {
      date: new Date("2023-11-01"),
      amount: 5000,
      duration: 2.5,
      method: "Damla Sulama",
      field: {
        connect: { id: field1.id },
      },
      worker: {
        connect: { id: worker.id },
      },
    },
  });

  const irrigationLog2 = await prisma.irrigationLog.create({
    data: {
      date: new Date("2023-10-25"),
      amount: 4500,
      duration: 2.0,
      method: "Yağmurlama",
      field: {
        connect: { id: field2.id },
      },
      worker: {
        connect: { id: worker.id },
      },
    },
  });

  console.log({ irrigationLog1, irrigationLog2 });

  // Örnek envanter oluştur
  const inventory1 = await prisma.inventory.create({
    data: {
      name: "NPK Gübre",
      category: "FERTILIZER",
      totalQuantity: 500,
      unit: "KG",
      purchaseDate: new Date("2023-09-01"),
      status: "AVAILABLE",
      ownerships: {
        connect: { id: owner.id },
      },
    },
  });

  const inventory2 = await prisma.inventory.create({
    data: {
      name: "Tohum - Buğday",
      category: "SEED",
      totalQuantity: 200,
      unit: "KG",
      purchaseDate: new Date("2023-08-15"),
      status: "AVAILABLE",
      ownerships: {
        connect: { id: owner.id },
      },
    },
  });

  console.log({ inventory1, inventory2 });

  // Örnek bildirimler oluştur
  const notification1 = await prisma.notification.create({
    data: {
      title: "Sulama Hatırlatması",
      message: "Merkez Tarla için sulama zamanı yaklaşıyor.",
      type: "IRRIGATION",
      receiver: {
        connect: { id: owner.id },
      },
      sender: {
        connect: { id: admin.id },
      },
    },
  });

  const notification2 = await prisma.notification.create({
    data: {
      title: "Gübre Stok Uyarısı",
      message: "NPK Gübre stoğu azalıyor. Yeniden sipariş vermeyi düşünün.",
      type: "INVENTORY",
      receiver: {
        connect: { id: owner.id },
      },
      sender: {
        connect: { id: admin.id },
      },
    },
  });

  console.log({ notification1, notification2 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
