import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt"; // bcrypt'i tekrar import et


// PrismaClient örneğini oluştur
const prismaClientSingleton = () => {
  const client = new PrismaClient({
    // İşlem zaman aşımını artır
    transactionOptions: {
      maxWait: 30000, // default is 2000ms
      timeout: 30000, // default is 5000ms
    },
  }).$extends({
    query: {
      user: {
        create: async ({ args, query }) => {
          if (args.data.password && args.data.password.startsWith("$2b$")) {
            console.log("Şifre zaten hash'lenmiş, tekrar hash'lenmiyor...");
          } else if (args.data.password) {
            console.log("Password mevcut, hash'leniyor...");
            try {
              args.data.password = await bcrypt.hash(args.data.password, 10);
              console.log("Hash'lenmiş şifre:", args.data.password);
            } catch (hashError) {
              console.error("Error hashing password:", hashError);
              throw new Error("Password hashing failed");
            }
          }
          return query(args);
        },
      },
    },
  });
  return client;
};

// Global değişken olarak tanımla
declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Geliştirme ortamında her sıcak yeniden yüklemede yeni bir Prisma Client örneği oluşturmamak için
export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
