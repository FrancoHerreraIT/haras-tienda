import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/app/lib/prisma";
import { ipDelCliente, superaLimite } from "@/app/lib/rateLimit";

/** Llega al formulario de login como `result.code` (ver LoginForm). */
class DemasiadosIntentos extends CredentialsSignin {
  code = "demasiados_intentos";
}

/* Lo que guardamos en el JWT. El augment de src/types/next-auth.d.ts apunta a
   "@auth/core/jwt", que desde nodemailer 10 queda anidado dentro de next-auth
   (su peer pide nodemailer 7-8) y el augment no lo alcanza: se tipa aca. */
type TokenPropio = { id?: string; role?: string | null };

/* Ventana de los topes del login: 15 minutos. */
const VENTANA_LOGIN = 15 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  /* Credenciales exige JWT: no hay adapter de base de datos para la sesion. */
  session: {
    strategy: "jwt",
    /* Se renueva con cada visita al panel: es el tiempo sin uso tras el que
       hay que volver a entrar. 12 h y no los 30 dias por defecto, porque la
       cookie da acceso a los datos de todos los clientes. */
    maxAge: 12 * 60 * 60,
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contrasena", type: "password" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const emailLimpio = email.toLowerCase().trim();

        /* Antes de comparar la clave: sin tope, un bot prueba contraseñas
           en bucle. Por IP frena al que ataca desde una maquina; por email,
           al que reparte el ataque entre muchas contra la cuenta del dueño.
           Se cuentan todos los intentos, buenos y malos: un tope que solo
           cuenta fallos le dice al atacante cuando acerto. */
        const ip = ipDelCliente(request.headers);

        if (
          (await superaLimite(`login:ip:${ip}`, 20, VENTANA_LOGIN)) ||
          (await superaLimite(`login:email:${emailLimpio}`, 8, VENTANA_LOGIN))
        ) {
          throw new DemasiadosIntentos();
        }

        const user = await prisma.user.findUnique({
          where: { email: emailLimpio },
        });

        /* Usuario inexistente: igual comparamos contra un hash dummy para
           que el tiempo de respuesta no delate que el email no existe. */
        if (!user) {
          await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        /* Backoffice privado: solo entra el dueno. */
        if (user.role !== "ADMIN") return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    /* El token viaja en la cookie: le colgamos id y rol una sola vez, al login. */
    async jwt({ token: tokenCrudo, user }) {
      const token = tokenCrudo as typeof tokenCrudo & TokenPropio;

      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        return token;
      }

      /* En cada request se confirma que el usuario sigue existiendo y sigue
         siendo ADMIN. Sin esto, borrarlo o cambiarle el rol no lo saca del
         panel: la cookie seguiria valida hasta vencer. Devolver null cierra
         la sesion. Es una consulta por clave primaria, y solo corre cuando
         hay una sesion abierta: al visitante anonimo no le cuesta nada. */
      if (!token.id) return null;

      const vigente = await prisma.user.findUnique({
        where: { id: token.id },
        select: { role: true },
      });

      if (vigente?.role !== "ADMIN") return null;

      token.role = vigente.role;
      return token;
    },
    session({ session, token }) {
      const propio = token as TokenPropio;

      if (session.user) {
        session.user.id = propio.id ?? "";
        session.user.role = propio.role;
      }
      return session;
    },
  },
});
