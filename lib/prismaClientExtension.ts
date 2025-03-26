// lib/prismaClientExtension.ts
import { Prisma, PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

export const extendedPrismaClient = new PrismaClient().$extends({
  query: {
    user: {
      async create({ args, query }) {
        console.log("Client Extension - User create tetiklendi!"); // EKLENDİ
        console.log("args:", args); // EKLENDİ
        if (args.data.password) {
          console.log("Password mevcut, hash'leniyor..."); // EKLENDİ
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(
            args.data.password,
            saltRounds
          );
          args.data.password = hashedPassword;
          console.log("Hash'lenmiş şifre:", hashedPassword); // EKLENDİ
        } else {
          console.log("Password alanı yok!"); // EKLENDİ
        }
        return query(args);
      },
      async update({ args, query }) {
        console.log("Client Extension - User update tetiklendi!"); // EKLENDİ
        console.log("args:", args); // EKLENDİ
        if (args.data.password && typeof args.data.password === "string") {
          console.log("Password güncelleniyor, hash'leniyor..."); // EKLENDİ
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(
            args.data.password,
            saltRounds
          );
          args.data.password = { set: hashedPassword };
          console.log("Hash'lenmiş şifre:", hashedPassword); // EKLENDİ
        } else {
          console.log("Password alanı güncellenmiyor veya string değil!"); // EKLENDİ
        }
        return query(args);
      },
      async upsert({ args, query }) {
        console.log("Client Extension - User upsert tetiklendi!"); // EKLENDİ
        console.log("args:", args); // EKLENDİ
        if (args.create.password) {
          console.log("Password (create) mevcut, hash'leniyor..."); // EKLENDİ
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(
            args.create.password,
            saltRounds
          );
          args.create.password = hashedPassword;
          console.log("Hash'lenmiş şifre (create):", hashedPassword); // EKLENDİ
        }
        if (args.update.password && typeof args.update.password === "string") {
          console.log("Password (update) güncelleniyor, hash'leniyor..."); // EKLENDİ
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(
            args.update.password,
            saltRounds
          );
          args.update.password = { set: hashedPassword };
          console.log("Hash'lenmiş şifre (update):", hashedPassword); // EKLENDİ
        } else {
          console.log(
            "Password (update) alanı güncellenmiyor veya string değil!" // EKLENDİ
          );
        }
        return query(args);
      },
    },
  },
});
