import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt"; // bcrypt'i tekrar import et


// PrismaClient örneğini oluştur
const prismaClientSingleton = () => {
  // $extends bloğunu geri ekliyoruz
  const client = new PrismaClient().$extends({
    query: {
      user: {
        create: async ({ args, query }) => {
          // Eğer şifre zaten hash'lenmişse tekrar hash'leme
          if (args.data.password && args.data.password.startsWith("$2b$")) {
            console.log("Şifre zaten hash'lenmiş, tekrar hash'lenmiyor...");
          } else if (args.data.password) {
            console.log("Password mevcut, hash'leniyor...");
            try { // Hata yakalama ekleyelim
              args.data.password = await bcrypt.hash(args.data.password, 10);
              console.log("Hash'lenmiş şifre:", args.data.password);
            } catch (hashError) {
              console.error("Error hashing password:", hashError);
              // Hata durumunda işlemi durdurabilir veya farklı bir aksiyon alabilirsiniz
              throw new Error("Password hashing failed");
            }
          }
          return query(args);
        },
      },
    },
  });
  return client; // Oluşturulan istemciyi döndür
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

