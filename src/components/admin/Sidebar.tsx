"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Great_Vibes } from "next/font/google";
import {
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingBag,
  Store,
  Tags,
} from "lucide-react";

import { logoutAction } from "@/app/admin/actions";

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const navItems = [
  { label: "Inicio", href: "/admin", icon: LayoutDashboard },
  { label: "Productos", href: "/admin/productos", icon: Package },
  { label: "Categorias", href: "/admin/categorias", icon: Tags },
  { label: "Pedidos", href: "/admin/pedidos", icon: ShoppingBag },
] as const;

type SidebarProps = {
  userName: string;
  userEmail: string;
};

export default function Sidebar({ userName, userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[#1C1A19] text-stone-300 md:flex">
      {/* Cabecera: firma de estancia */}
      <div className="border-b border-white/5 px-6 py-6">
        <Link href="/admin" className="block leading-none group">
          <span
            className={`${greatVibes.className} block text-3xl text-stone-50 group-hover:text-amber-100 transition-colors leading-[1.1]`}
          >
            Haras del Este
          </span>
          <span className="mt-1.5 block pl-1 text-[9px] uppercase tracking-[0.42em] text-amber-700/90">
            Backoffice
          </span>
        </Link>
      </div>

      {/* Navegacion */}
      <nav className="flex-1 space-y-1 px-3 py-6">
        {navItems.map(({ label, href, icon: Icon }) => {
          /* /admin solo esta activo en su propia ruta; el resto por prefijo. */
          const isActive =
            href === "/admin" ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-[#8B5A2B] text-stone-50 font-semibold"
                  : "text-stone-400 hover:bg-white/5 hover:text-stone-100"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}

        {/* Salida a la vidriera publica */}
        <div className="mt-4 border-t border-white/5 pt-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm text-stone-400 transition-colors hover:bg-white/5 hover:text-amber-100"
          >
            <Store className="h-4 w-4 shrink-0" />
            Ver la Tienda
          </Link>
        </div>
      </nav>

      {/* Usuario + cerrar sesion */}
      <div className="border-t border-white/5 px-3 py-4">
        <div className="px-3.5 pb-3">
          <p className="truncate text-sm font-semibold text-stone-100">
            {userName}
          </p>
          <p className="truncate text-xs text-stone-500">{userEmail}</p>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm text-stone-400 transition-colors hover:bg-red-900/30 hover:text-red-300"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Cerrar Sesion
          </button>
        </form>
      </div>
    </aside>

    {/* Version compacta para mobile: misma paleta, barra superior */}
    <div className="sticky top-0 z-40 bg-[#1C1A19] text-stone-300 pt-safe md:hidden">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <Link href="/admin" className="min-w-0 leading-none">
          <span
            className={`${greatVibes.className} block truncate text-2xl text-stone-50 leading-tight`}
          >
            Haras del Este
          </span>
          <span className="block truncate text-[10px] text-stone-500">
            {userEmail}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
        <Link
          href="/"
          aria-label="Ver la tienda"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-white/5 hover:text-amber-100"
        >
          <Store className="h-4 w-4" />
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Cerrar sesion"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-red-900/30 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
        </div>
      </div>
      {/* Cuatro columnas iguales, con el icono arriba del texto: asi entra
          en 320px sin scroll horizontal y ninguna seccion queda cortada. */}
      <nav className="grid grid-cols-4 border-t border-white/5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === "/admin" ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2.5 transition-colors ${
                isActive
                  ? "bg-[#8B5A2B] text-stone-50"
                  : "text-stone-400 active:bg-white/5"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span
                className={`w-full truncate text-center text-[11px] leading-tight ${
                  isActive ? "font-semibold" : ""
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
    </>
  );
}
