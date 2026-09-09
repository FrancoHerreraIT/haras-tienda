"use client";

import { Suspense, useId, useState } from "react";
import Link from "next/link";
import { Search, ShoppingCart, X } from "lucide-react";
import { Great_Vibes } from "next/font/google";
import { useCartStore } from "@/store/useCartStore";
import AdminShortcut from "@/components/AdminShortcut";
import SearchBox from "@/components/SearchBox";
import { useHydrated } from "@/app/lib/useHydrated";

/* Firma de estancia para el logo */
const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const quickLinks = [
  { label: "Productos", href: "#productos" },
  { label: "Combos", href: "#combos" },
  { label: "Armá tu Kit", href: "#kit" },
];

export default function Navbar() {
  const openCart = useCartStore((state) => state.openCart);
  const totalItems = useCartStore((state) => state.getTotalItems());

  /* El carrito se hidrata desde localStorage: el badge solo se pinta
     despues del montaje para que el HTML del servidor coincida. */
  const mounted = useHydrated();

  /* En el telefono el buscador ocupaba demasiado ancho al lado del logo,
     asi que se despliega en su propia fila. En md+ siempre esta visible. */
  const [searchOpen, setSearchOpen] = useState(false);
  const searchId = useId();

  return (
    <header className="sticky top-0 z-40">
      {/* Franja superior: negro forja */}
      <div className="bg-[#1C1A19] text-stone-100 border-b border-white/5">
        <div className="w-full px-4 md:px-12 lg:px-24 xl:px-32 py-3 md:py-4 flex items-center justify-between gap-3 md:gap-6">
          {/* Logo — firma de estancia */}
          <Link href="/" className="min-w-0 shrink leading-none group">
            <span
              className={`${greatVibes.className} block truncate text-2xl sm:text-3xl md:text-4xl text-stone-50 group-hover:text-amber-100 transition-colors leading-[1.15]`}
            >
              Haras del Este
            </span>
            <span className="block truncate text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-[0.3em] sm:tracking-[0.42em] text-amber-700/90 mt-1 pl-0.5">
              Cocina · Campo · Hogar
            </span>
          </Link>

          {/* Buscador central (desktop) */}
          <div className="hidden md:flex flex-1 max-w-3xl">
            {/* SearchBox lee la consulta de la URL: el Suspense es lo que
                pide Next para useSearchParams. */}
            <Suspense fallback={<div className="h-[42px] w-full" />}>
              <SearchBox
                className="w-full"
                placeholder="Buscar tablas, cuchillos, sets de campo..."
              />
            </Suspense>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-1 sm:gap-3 md:gap-6 shrink-0">
            {/* Lupa que despliega la fila de busqueda (solo mobile) */}
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              aria-label={searchOpen ? "Cerrar buscador" : "Abrir buscador"}
              aria-expanded={searchOpen}
              aria-controls={`${searchId}-mobile-row`}
              className="md:hidden flex h-11 w-11 items-center justify-center rounded-full text-stone-100 hover:text-amber-600 transition-colors"
            >
              {searchOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>

            {/* Solo visible con sesion de admin activa */}
            <AdminShortcut />

            <button
              type="button"
              onClick={openCart}
              aria-label={
                mounted && totalItems > 0
                  ? `Abrir carrito, ${totalItems} producto(s)`
                  : "Abrir carrito"
              }
              className="relative flex h-11 w-11 items-center justify-center text-stone-100 hover:text-amber-600 transition-colors"
            >
              <ShoppingCart className="w-6 h-6" />
              {mounted && totalItems > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#8B5A2B] text-[11px] font-bold leading-none text-white">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Fila de busqueda desplegable (solo mobile) */}
        {searchOpen && (
          <div id={`${searchId}-mobile-row`} className="md:hidden px-4 pb-3">
            <Suspense fallback={<div className="h-[42px] w-full" />}>
              <SearchBox
                autoFocus
                placeholder="Buscar tablas, cuchillos..."
                onSubmitted={() => setSearchOpen(false)}
              />
            </Suspense>
          </div>
        )}
      </div>

      {/* Barra secundaria: crema.
          En mobile scrollea desde la izquierda (con justify-center los primeros
          items quedarian fuera de alcance); en md+ ya entra centrada. */}
      <div className="bg-[#F7F5F0] border-b border-stone-200 shadow-sm shadow-stone-200/50">
        <nav className="w-full px-4 md:px-12 lg:px-24 xl:px-32 py-3 flex justify-start md:justify-center gap-6 sm:gap-7 md:gap-12 text-[13px] sm:text-[14px] uppercase tracking-[0.12em] sm:tracking-[0.14em] text-stone-700 overflow-x-auto no-scrollbar">
          {quickLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="hover:text-amber-800 transition-colors whitespace-nowrap py-2.5"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
