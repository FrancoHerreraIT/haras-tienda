import type { DefaultSession } from "next-auth";

/* Auth.js no conoce nuestro campo `role`: lo sumamos a la sesion y al JWT. */
declare module "next-auth" {
  interface User {
    role?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role?: string | null;
    } & DefaultSession["user"];
  }
}

/* `next-auth/jwt` solo reexporta el core, asi que el augment tiene que
   apuntar al modulo donde vive la interfaz JWT. */
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role?: string | null;
  }
}
