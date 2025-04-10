// lib/prismaMiddleware.ts
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";

export const hashPasswordMiddleware: Prisma.Middleware = async (
  params,
  next
) => {
 

  if (params.model === "User" && params.action === "create") {
    const user = params.args.data;
    console.log("User data (create):", user); // Create için
    if (user.password) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(user.password, saltRounds);
      params.args.data.password = hashedPassword;
      console.log("Hash'lenmiş şifre:", hashedPassword);
    } else {
      console.log("Password alanı yok!");
    }
  }
  if (
    params.model === "User" &&
    (params.action === "update" || params.action === "upsert")
  ) {
    const user = params.args.data;
    console.log("User data (update/upsert):", user); // Update/Upsert için
    if (user.password?.set) {
      console.log("Password güncelleniyor, hash'leniyor...");
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(user.password.set, saltRounds);
      params.args.data.password.set = hashedPassword;
      console.log("Hash'lenmiş şifre:", hashedPassword);
    } else {
      console.log("Password alanı güncellenmiyor!");
    }
  }

  console.log("Middleware next çağrılıyor...");
  return next(params);
};
