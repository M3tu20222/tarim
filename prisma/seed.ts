import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Create a default user
  const owner = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: {},
    create: {
      email: "owner@example.com",
      name: "Owner User",
      password: "password123", // In real app, hash this!
    },
  });

  const inventory1 = await prisma.inventory.create({
    data: {
      name: "NPK Gübre",
      category: "FERTILIZER",
      totalQuantity: 500,
      unit: "KG",
      purchaseDate: new Date("2023-09-01"),
      status: "AVAILABLE",
      // Use create nested operation for ownerships
      ownerships: {
        create: [
          {
            user: { connect: { id: owner.id } },
            shareQuantity: 500, // This is required - set to match totalQuantity or your business logic
          },
        ],
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
        create: [
          {
            user: { connect: { id: owner.id } },
            shareQuantity: 200,
          },
        ],
      },
    },
  });

  // If you have more inventory items, follow the same pattern
  const field = await prisma.field.create({
    data: {
      name: "Ana Tarla",
      location: "Çiftlik Merkez",
      size: 50,
      status: "ACTIVE",
      // Sahiplik ilişkisi
      owners: {
        create: [
          {
            user: { connect: { id: owner.id } },
          },
        ],
      },
    },
  });

  console.log({ owner, inventory1, inventory2, field });
  // Instead of using connect for ownerships:
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
