"use client";

import { Suspense, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Search, ShoppingCart, X } from "lucide-react";
import { Great_Vibes } from "next/font/google";
import { useCartStore } from "@/store/useCartStore";
import AdminShortcut from "@/components/AdminShortcut";
import CategoryMenu from "@/components/CategoryMenu";
import SearchBox from "@/components/SearchBox";
import { useHydrated } from "@/app/lib/useHydrated";
import { RUTA_CATALOGO } from "@/app/lib/search";
import type { StoreCategory } from "@/app/lib/storeData";

/* Firma de estancia para el logo */
const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

/* "Inicio" va aparte de la lista: en el telefono se esconde (el logo ya lleva
   a la home) y ahi el lugar destacado se lo queda "Productos". */
const INICIO = { label: "Inicio", href: "/" };

/* "Productos" tampoco esta aca: es el boton que despliega las categorias, y va
   justo despues de "Inicio".
   `listo` es si la ruta ya tiene su page.tsx. Mientras esta en false el renglon
   se muestra igual pero no navega: la barra queda completa y nadie cae en un
   404. El destino ya esta escrito — al crear la pagina se cambia a true y el
   link se enciende solo. */
const linksRestantes = [
  { label: "Combos", href: "/combos", listo: false },
  { label: "Armá tu Kit", href: "/arma-tu-kit", listo: false },
  { label: "Nosotros", href: "/nosotros", listo: false },
  { label: "Contacto", href: "/contacto", listo: false },
];

/* Renglon comun de la barra. No lleva `display`: lo pone cada llamada, porque
   "Inicio" necesita `hidden md:inline-flex` y dos utilidades de display sin
   prefijo en el mismo elemento se resuelven por el orden en que Tailwind emite
   el CSS, no por el orden del string.
   El borde inferior va siempre, transparente cuando
   no es la pagina actual: si apareciera recien al activarse, el renglon se
   correria hacia arriba (mismo criterio que CategoryMenu).
   El minimo tactil va en px y no en rem — es una medida del dedo, no del
   texto, y no tiene que encoger con la escala del 67% de globals.css. */
const claseLink = (activo: boolean) =>
  `min-h-[40px] shrink-0 items-center whitespace-nowrap border-b-2 py-2.5 transition-colors md:min-h-0 ${
    activo
      ? "border-[#8B5A2B] font-semibold text-amber-800"
      : "border-transparent hover:border-stone-300 hover:text-amber-800"
  }`;

/* "Productos" es la entrada principal al catalogo. En el telefono, donde
   "Inicio" no esta, va en semibold y color cuero con el subrayado siempre
   puesto, para que se lea como la cabecera de la fila y no como uno mas de los
   cinco. En md+ se apaga y vuelve a comportarse como cualquier renglon: ahi la
   barra entera esta a la vista y no hace falta senalar por donde entrar. */
const claseProductos = (abierto: boolean) =>
  `inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-[#8B5A2B] py-2.5 font-semibold text-[#8B5A2B] transition-colors md:min-h-0 md:font-normal ${
    abierto
      ? "md:border-[#8B5A2B] md:text-amber-800"
      : "md:border-transparent md:text-stone-700 md:hover:border-stone-300 md:hover:text-amber-800"
  }`;

type NavbarProps = {
  /** Rubros con productos activos, para la barra que abre "Productos". */
  categories: StoreCategory[];
};

export default function Navbar({ categories }: NavbarProps) {
  /* La barra marca en que pagina se esta parado. usePathname no necesita
     Suspense, a diferencia de useSearchParams (que usa SearchBox). */
  const pathname = usePathname();
  const enInicio = pathname === "/";

  const openCart = useCartStore((state) => state.openCart);
  const totalItems = useCartStore((state) => state.getTotalItems());

  /* El carrito se hidrata desde localStorage: el badge solo se pinta
     despues del montaje para que el HTML del servidor coincida. */
  const mounted = useHydrated();

  /* En el telefono el buscador ocupaba demasiado ancho al lado del logo,
     asi que se despliega en su propia fila. En md+ siempre esta visible. */
  const [searchOpen, setSearchOpen] = useState(false);
  const searchId = useId();

  /* Las categorias se despliegan desde "Productos" en vez de ocupar una fila
     fija: en el telefono esa fila se comeria media pantalla antes del hero. */
  const [categoriasAbiertas, setCategoriasAbiertas] = useState(false);
  const categoriasId = useId();

  /* Sin categorias cargadas no hay nada que desplegar: "Productos" vuelve a
     ser el ancla al listado. */
  const hayCategorias = categories.length > 0;

  /* Envuelve al boton y a los dos paneles: lo de adentro no cuenta como
     "tocar afuera", asi el toggle del boton no se pelea con el cierre. */
  const barraRef = useRef<HTMLDivElement>(null);

  /* Escape y tocar afuera cierran el panel, como cualquier menu desplegable.
     En escritorio flota sobre el contenido, asi que dejarlo abierto al irse a
     otra parte de la pagina tapa lo que hay debajo. */
  useEffect(() => {
    if (!categoriasAbiertas) return;

    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setCategoriasAbiertas(false);
    };

    const alTocar = (evento: PointerEvent) => {
      const destino = evento.target;
      if (destino instanceof Node && !barraRef.current?.contains(destino)) {
        setCategoriasAbiertas(false);
      }
    };

    window.addEventListener("keydown", alPresionar);
    window.addEventListener("pointerdown", alTocar);
    return () => {
      window.removeEventListener("keydown", alPresionar);
      window.removeEventListener("pointerdown", alTocar);
    };
  }, [categoriasAbiertas]);

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
            <span className="block truncate text-[8px] sm:text-[9px] md:text-[10px] tracking-wide text-amber-700/90 mt-1 pl-0.5">
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
      <div
        ref={barraRef}
        className="relative bg-[#F7F5F0] border-b border-stone-200 shadow-sm shadow-stone-200/50"
      >
        {/* El scroll horizontal es solo del telefono: en md+ tiene que quedar
            visible o recortaria el menu que cuelga de "Productos". */}
        <nav className="w-full px-4 md:px-12 lg:px-24 xl:px-32 py-3 flex items-center justify-start md:justify-center gap-4 sm:gap-6 md:gap-12 text-[13px] sm:text-[14px] tracking-wide text-stone-700 overflow-x-auto md:overflow-x-visible no-scrollbar">
          {/* "Inicio" solo en escritorio. En el telefono la fila es angosta y
              scrollea: gastar el primer lugar en un link que el logo ya cubre
              empujaria "Productos" fuera de la vista. */}
          <Link
            href={INICIO.href}
            aria-current={enInicio ? "page" : undefined}
            className={`hidden md:inline-flex ${claseLink(enInicio)}`}
          >
            {INICIO.label}
          </Link>

          {hayCategorias ? (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setCategoriasAbiertas((abierto) => !abierto)}
                aria-expanded={categoriasAbiertas}
                aria-controls={`${categoriasId}-escritorio ${categoriasId}-movil`}
                className={claseProductos(categoriasAbiertas)}
              >
                Productos
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                    categoriasAbiertas ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              {/* Escritorio: cuelga del boton y flota sobre el contenido, que
                  no se mueve. El mt-3 compensa el py-3 del nav para que arranque
                  justo en el borde de la barra. */}
              {categoriasAbiertas && (
                <div
                  id={`${categoriasId}-escritorio`}
                  /* Crece con la cantidad de columnas en vez de tener un ancho
                     fijo, pero nunca mas alla del viewport. bg-white opaco:
                     detras queda el contenido de la pagina. */
                  className="hidden md:block absolute left-0 top-full z-50 mt-3 w-max min-w-64 max-w-[min(64rem,calc(100vw-3rem))] overflow-x-auto rounded-b-lg border border-t-0 border-stone-200 bg-white p-4 shadow-xl shadow-stone-400/25"
                >
                  <Suspense fallback={null}>
                    <CategoryMenu
                      categories={categories}
                      variante="grilla"
                      onSelected={() => setCategoriasAbiertas(false)}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          ) : (
            /* Sin rubros cargados no hay panel que abrir: mismo aspecto, pero
               entra derecho al catalogo sin filtro. */
            <Link href={RUTA_CATALOGO} className={claseProductos(false)}>
              Productos
            </Link>
          )}

          {linksRestantes.map((link) => {
            /* Todavia sin page.tsx: se pinta el renglon con su hover, pero
               no navega. */
            if (!link.listo) {
              return (
                <span
                  key={link.href}
                  aria-disabled="true"
                  className={`inline-flex cursor-default ${claseLink(false)}`}
                >
                  {link.label}
                </span>
              );
            }

            const activo = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={activo ? "page" : undefined}
                className={`inline-flex ${claseLink(activo)}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Telefono: cuelga de la barra y flota sobre la pagina, para que el
            hero no se corra hacia abajo al abrir ni pegue un salto al cerrar.
            inset-x-0 y no w-screen: asi toma el ancho del header sin contar la
            barra de scroll, que meteria scroll horizontal.
            Con muchos rubros scrollea el panel, no la pagina de atras
            (overscroll-contain corta el encadenado al body).
            Va fuera del <nav> porque ese scrollea en horizontal. */}
        {hayCategorias && categoriasAbiertas && (
          <div
            id={`${categoriasId}-movil`}
            className="md:hidden absolute inset-x-0 top-full z-50 max-h-[70dvh] overflow-y-auto overscroll-contain border-t border-stone-200/70 bg-white pb-2 shadow-xl shadow-stone-400/25"
          >
            <Suspense fallback={null}>
              <CategoryMenu
                categories={categories}
                variante="lista"
                onSelected={() => setCategoriasAbiertas(false)}
              />
            </Suspense>
          </div>
        )}
      </div>
    </header>
  );
}
