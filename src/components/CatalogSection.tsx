import Link from "next/link";
import { ArrowRight, PackageSearch } from "lucide-react";

import ProductCard from "./ProductCard";
import Pagination from "./Pagination";
import { ANCLA_CATALOGO } from "@/app/lib/catalogo";
import { RUTA_CATALOGO } from "@/app/lib/search";
import type { CatalogoPaginado } from "@/app/lib/storeData";

/**
 * La grilla de la home: el catalogo entero, de a una pagina.
 *
 * No es una vidriera aparte de los destacados. Es una sola lista con todos los
 * productos, donde los tildados en el panel suben a la cabeza (ver
 * ORDEN_TIENDA en storeData). Separarlos en dos secciones los mostraba dos
 * veces y dejaba la de arriba vacia hasta que el dueno tildara algo.
 *
 * La grilla se arma en el servidor con los 12 productos que trajo la consulta,
 * no con el catalogo entero filtrado en el cliente: esa es la diferencia con
 * ProductGrid, que vive en /productos y necesita el catalogo completo en
 * memoria para filtrar y buscar sin volver al servidor. Aca no hay filtros, y
 * por eso tampoco hace falta bajar mil productos para mostrar doce.
 *
 * Para filtrar por rubro, buscar u ordenar por precio se sigue yendo a
 * /productos: repetir esa maquinaria en la portada haria que elegir un rubro
 * cambie el contenido debajo de los pies en vez de llevar a algun lado.
 */

type CatalogSectionProps = {
  catalogo: CatalogoPaginado;
};

export default function CatalogSection({ catalogo }: CatalogSectionProps) {
  const { products, page, totalPages, total } = catalogo;

  /* Catalogo vacio: no es un filtro sin resultados, es que todavia no hay
     productos activos cargados en el panel. */
  if (total === 0) {
    return (
      <section
        id={ANCLA_CATALOGO}
        className="w-full px-4 md:px-12 lg:px-24 xl:px-32 py-16 md:py-24 text-center"
      >
        <PackageSearch
          className="mx-auto h-10 w-10 text-stone-300"
          strokeWidth={1.25}
        />
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-2xl text-stone-800">
          Estamos preparando el catálogo
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-stone-500">
          Muy pronto vas a poder ver acá nuestras tablas, cuchillería y
          artículos de campo.
        </p>
      </section>
    );
  }

  /* scroll-mt: el ancla queda por debajo del Navbar fijo, o el salto de
     pagina deja la primera fila tapada por la barra. */
  return (
    <section
      id={ANCLA_CATALOGO}
      className="w-full scroll-mt-24 px-4 md:px-12 lg:px-24 xl:px-32 py-10 md:py-16"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-stone-800">
            Destacados
          </h2>
          <span className="block w-12 h-px bg-[#8B5A2B] mt-2" />
        </div>

        {/* Los filtros y el buscador viven en /productos. */}
        <Link
          href={RUTA_CATALOGO}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-amber-800 transition-colors hover:text-[#6b4421]"
        >
          Buscar y filtrar por rubro
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <p className="mt-4 mb-8 text-sm text-stone-500">
        {total} producto{total === 1 ? "" : "s"} en el catálogo
        {totalPages > 1 && ` — página ${page} de ${totalPages}`}
      </p>

      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} />
    </section>
  );
}
