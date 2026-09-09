/**
 * Crea (o actualiza) el usuario dueno de la tienda.
 *   node prisma/create-admin.mjs dueno@harasdeleste.com "MiClaveSegura" "Nombre Apellido"
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const [email, password, name] = process.argv.slice(2);

if (!email || !password) {
  console.error('Uso: node prisma/create-admin.mjs <email> <password> [nombre]');
  process.exit(1);
}

const hashed = await bcrypt.hash(password, 10);

const user = await prisma.user.upsert({
  where: { email: email.toLowerCase().trim() },
  update: { password: hashed, role: "ADMIN" },
  create: {
    email: email.toLowerCase().trim(),
    password: hashed,
    name: name ?? "Administrador",
    role: "ADMIN",
  },
});

console.log(`Admin listo: ${user.email} (${user.id})`);
await prisma.$disconnect();
