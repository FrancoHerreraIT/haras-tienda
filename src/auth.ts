import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/app/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  /* Credenciales exige JWT: no hay adapter de base de datos para la sesion. */
  session: { strategy: "jwt" },

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
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
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
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
