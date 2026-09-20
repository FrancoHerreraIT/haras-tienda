import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { hrefPagina } from "@/app/lib/catalogo";

/**
 * Controles "Anterior / Siguiente" del catalogo de la home.
 *
 * Son <Link>, no botones: la pagina vive en la URL, asi que cada una tiene
 * direccion propia, se puede compartir, y el boton "atras" del navegador
 * vuelve a la anterior en vez de salir de la tienda. Por lo mismo esto puede
 * ser un Server Component, sin estado ni "use client".
 *
 * En los extremos el link se reemplaza por un <span> apagado en lugar de
 * dejarlo navegable: un <a> deshabilitado no existe en HTML, y un link a la
 * pagina 0 seria una URL rota.
 */

type PaginationProps = {
  page: number;
  totalPages: number;
};

const base =
  "inline-flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-[13px] font-semibold tracking-wide transition-colors";

const activo = `${base} border-stone-300 bg-white text-stone-700 hover:border-[#8B5A2B] hover:text-amber-800`;

const apagado = `${base} border-stone-200 bg-stone-100 text-stone-400 cursor-default select-none`;

export default function Pagination({ page, totalPages }: PaginationProps) {
  /* Una sola pagina no se pagina. */
  if (totalPages <= 1) return null;

  const hayAnterior = page > 1;
  const haySiguiente = page < totalPages;

  return (
    <nav
      aria-label="Paginacion del catalogo"
      className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
    >
      {hayAnterior ? (
        <Link href={hrefPagina(page - 1)} rel="prev" className={activo}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Anterior
        </Link>
      ) : (
        <span className={apagado} aria-hidden="true">
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </span>
      )}

      {/* aria-current marca cual es la pagina en pantalla para un lector de
          pantalla, que no ve el resaltado. */}
      <span
        aria-current="page"
        className="text-sm text-stone-500 tabular-nums"
      >
        Pagina <span className="font-semibold text-stone-800">{page}</span> de{" "}
        {totalPages}
      </span>

      {haySiguiente ? (
        <Link href={hrefPagina(page + 1)} rel="next" className={activo}>
          Siguiente
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className={apagado} aria-hidden="true">
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
