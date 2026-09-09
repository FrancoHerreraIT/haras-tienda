/**
 * Diagnostica un login sin pasar por el navegador: repite exactamente los
 * pasos de `authorize()` en src/auth.ts y dice cual falla.
 *
 *   node prisma/check-login.mjs dueno@harasdeleste.com "MiClave"
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const [emailArg, password] = process.argv.slice(2);

if (!emailArg || !password) {
  console.error('Uso: node prisma/check-login.mjs <email> <password>');
  process.exit(1);
}

const email = emailArg.toLowerCase().trim();
const user = await prisma.user.findUnique({ where: { email } });

if (!user) {
  console.log(`FALLA: no existe ningun usuario con el email "${email}".`);
  const all = await prisma.user.findMany({ select: { email: true } });
  console.log("Emails cargados en la base:");
  for (const u of all) console.log(`  - ${u.email}`);
} else if (!(await bcrypt.compare(password, user.password))) {
  console.log(`FALLA: el email "${email}" existe, pero la contrasena no coincide.`);
  console.log("Reseteala con: npm run admin:create -- \"" + email + "\" \"TuNuevaClave\"");
} else if (user.role !== "ADMIN") {
  console.log(`FALLA: credenciales correctas, pero el rol es "${user.role}" y se exige "ADMIN".`);
} else {
  console.log(`OK: ${user.email} puede ingresar al panel (rol ${user.role}).`);
}

await prisma.$disconnect();
