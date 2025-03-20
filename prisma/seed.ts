import {
  PrismaClient,
  Role,
  Status,
  PaymentMethod,
  DebtStatus,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Create users
  const adminPassword = await bcrypt.hash("admin123", 10);
  const userAPassword = await bcrypt.hash("userA123", 10);
  const userBPassword = await bcrypt.hash("userB123", 10);
  const userCPassword = await bcrypt.hash("userC123", 10);

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

  const userA = await prisma.user.upsert({
    where: { email: "userA@example.com" },
    update: {},
    create: {
      name: "A Ortağı",
      email: "userA@example.com",
      password: userAPassword,
      role: Role.OWNER,
      status: Status.ACTIVE,
    },
  });

  const userB = await prisma.user.upsert({
    where: { email: "userB@example.com" },
    update: {},
    create: {
      name: "B Ortağı",
      email: "userB@example.com",
      password: userBPassword,
      role: Role.OWNER,
      status: Status.ACTIVE,
    },
  });

  const userC = await prisma.user.upsert({
    where: { email: "userC@example.com" },
    update: {},
    create: {
      name: "C Ortağı",
      email: "userC@example.com",
      password: userCPassword,
      role: Role.OWNER,
      status: Status.ACTIVE,
    },
  });

  console.log({ admin, userA, userB, userC });

  // Örnek 1: Kendi Ödemesi (A Ortağı 200 Çuval Alır)
  // A, 200 çuval amonyum sülfat satın alır ve nakit ile peşin öder.
  const purchase1 = await prisma.purchase.create({
    data: {
      product: "Amonyum Sülfat",
      quantity: 200,
      unitPrice: 50,
      totalCost: 10000,
      paymentMethod: PaymentMethod.CASH,
      contributors: {
        create: [
          {
            userId: userA.id,
            contribution: 10000, // Tam ödedi
            isCreditor: false,
          },
        ],
      },
    },
  });

  // Stok ekleme
  const inventory1 = await prisma.inventory.create({
    data: {
      name: "Amonyum Sülfat",
      category: "FERTILIZER",
      totalQuantity: 200,
      unit: "çuval",
      ownerships: {
        create: {
          userId: userA.id,
          shareQuantity: 200,
        },
      },
    },
  });

  console.log({ purchase1, inventory1 });

  // Örnek 2: Ortak Alış ve Borç (C Ortağı 300 Çuval Alır, A ve B Borçlu)
  // C, 300 çuval potasyum sülfat alır.
  // A ve B, C'ye 3 ay vadeli kredi ile 15000 TL'lik borcu alır.
  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() + 3); // 3 ay sonra

  const purchase2 = await prisma.purchase.create({
    data: {
      product: "Potasyum Sülfat",
      quantity: 300,
      unitPrice: 50,
      totalCost: 15000,
      paymentMethod: PaymentMethod.CREDIT,
      dueDate: dueDate,
      contributors: {
        create: [
          // C, kredi veren (borcun sahibi)
          {
            userId: userC.id,
            contribution: 15000, // Tam ödedi
            isCreditor: true, // Kredi veren
          },
          // A ve B, borcu alıyor
          {
            userId: userA.id,
            contribution: 0, // Kredi alıyor
            isCreditor: false,
          },
          {
            userId: userB.id,
            contribution: 0,
            isCreditor: false,
          },
        ],
      },
    },
  });

  // Borçlar ekleme
  const debtA = await prisma.debt.create({
    data: {
      amount: 7500, // 15000 / 2 (A ve B)
      dueDate: purchase2.dueDate!,
      status: DebtStatus.PENDING,
      creditorId: userC.id,
      debtorId: userA.id,
      purchaseId: purchase2.id,
    },
  });

  const debtB = await prisma.debt.create({
    data: {
      amount: 7500,
      dueDate: purchase2.dueDate!,
      status: DebtStatus.PENDING,
      creditorId: userC.id,
      debtorId: userB.id,
      purchaseId: purchase2.id,
    },
  });

  // Stok ekleme ve paylar
  const inventory2 = await prisma.inventory.create({
    data: {
      name: "Potasyum Sülfat",
      category: "FERTILIZER",
      totalQuantity: 300,
      unit: "çuval",
      ownerships: {
        create: [
          // A ve B paylaşıyor
          {
            userId: userA.id,
            shareQuantity: 150, // 300 / 2
          },
          {
            userId: userB.id,
            shareQuantity: 150, // 300 / 2
          },
        ],
      },
    },
  });

  console.log({ purchase2, debtA, debtB, inventory2 });

  // Örnek 3: Borç Ödemesi
  // A, C'ye borçlu olduğu 7500 TL'yi 3 ay sonra ödüyor.
  const paymentDate = new Date(debtA.dueDate);

  const updatedDebtA = await prisma.debt.update({
    where: { id: debtA.id },
    data: {
      status: DebtStatus.PAID,
      paymentDate: paymentDate,
    },
  });

  // Bildirim ekleme
  const notification = await prisma.notification.create({
    data: {
      title: "Borç Ödendi",
      message: `${userA.name}, ${userC.name}'ye ait 7500 TL borcunu ödedi.`,
      type: "DEBT",
      receiverId: userC.id,
      senderId: userA.id,
    },
  });

  console.log({ updatedDebtA, notification });

  // Örnek 4: Stok Kullanımı
  // A, 50 çuval Amonyum Sülfat kullanıyor
  const inventoryUsage = await prisma.inventoryUsage.create({
    data: {
      inventoryId: inventory1.id,
      usedQuantity: 50,
      usageType: "FERTILIZING",
      usedById: userA.id,
      // Tarla ve işlem bağlantısı opsiyonel
    },
  });

  // Stok payını güncelle
  const updatedOwnership = await prisma.inventoryOwnership.updateMany({
    where: {
      inventoryId: inventory1.id,
      userId: userA.id,
    },
    data: {
      shareQuantity: 150, // 200 - 50
    },
  });

  // Toplam stok miktarını güncelle
  const updatedInventory = await prisma.inventory.update({
    where: { id: inventory1.id },
    data: {
      totalQuantity: 150, // 200 - 50
    },
  });

  console.log({ inventoryUsage, updatedOwnership, updatedInventory });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
