import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Great_Vibes } from "next/font/google";

import { auth } from "@/auth";
import LoginForm from "@/components/admin/LoginForm";

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ingreso al Panel | Haras del Este",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  /* Si ya hay sesion no tiene sentido mostrar el formulario. */
  const session = await auth();
  if (session?.user) redirect("/admin");

  return (
    <main className="min-h-dvh bg-stone-900 flex items-center justify-center px-4 py-10 sm:py-12">
      <div className="w-full max-w-md">
        {/* Firma de estancia */}
        <div className="text-center mb-8">
          <span
            className={`${greatVibes.className} block text-4xl sm:text-5xl text-stone-50 leading-[1.15]`}
          >
            Haras del Este
          </span>
          <span className="block text-[9px] sm:text-[10px] tracking-wide text-amber-700/90 mt-2">
            Panel de Administracion
          </span>
        </div>

        {/* Tarjeta crema con filo de cuero */}
        <div className="rounded-2xl bg-[#F7F5F0] shadow-2xl shadow-black/40 border-t-4 border-[#8B5A2B] overflow-hidden">
          <div className="px-5 py-7 sm:px-8 sm:py-9">
            <h1 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">
              Bienvenido de nuevo
            </h1>
            <p className="mt-1.5 mb-7 text-sm text-stone-500">
              Ingresa tus credenciales para gestionar el inventario.
            </p>

            <LoginForm />
          </div>

          <div className="border-t border-stone-200 bg-stone-100/60 px-5 py-4 sm:px-8">
            <p className="text-center text-[11px] text-stone-500">
              Acceso exclusivo del administrador de la tienda.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] tracking-wide text-stone-600">
          Cocina · Campo · Hogar
        </p>
      </div>
    </main>
  );
}
