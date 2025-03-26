import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

// PrismaClient örneğini oluştur
const prismaClientSingleton = () => {
  return new PrismaClient().$extends({
    query: {
      user: {
        create: async ({ args, query }) => {
          // Eğer şifre zaten hash'lenmişse tekrar hash'leme
          if (args.data.password && args.data.password.startsWith("$2b$")) {
            console.log("Şifre zaten hash'lenmiş, tekrar hash'lenmiyor...");
          } else if (args.data.password) {
            console.log("Password mevcut, hash'leniyor...");
            args.data.password = await bcrypt.hash(args.data.password, 10);
            console.log("Hash'lenmiş şifre:", args.data.password);
          }
          return query(args);
        },
      },
    },
  });
};

// Global değişken olarak tanımla
declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Geliştirme ortamında her sıcak yeniden yüklemede yeni bir Prisma Client örneği oluşturmamak için
export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
