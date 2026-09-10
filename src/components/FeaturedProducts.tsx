import Link from "next/link";
import { ArrowRight, PackageSearch } from "lucide-react";

import ProductCard from "./ProductCard";
import { RUTA_CATALOGO } from "@/app/lib/search";
import type { StoreProduct } from "@/app/lib/storeData";

/**
 * Vidriera de la home.
 *
 * Muestra un recorte del catalogo y manda a /productos, que es donde viven los
 * filtros, el orden y la busqueda. La home no repite esa maquinaria: si la
 * grilla completa estuviera en las dos, elegir un rubro desde la portada
 * cambiaria el contenido debajo de los pies en vez de llevar a algun lado.
 *
 * Es un Server Component: no lee la URL ni tiene estado, asi que no necesita
 * "use client" ni el Suspense que si pide ProductGrid.
 */

/** Cuantos productos entran en la vidriera. Multiplo de 4: la grilla llega a
    cuatro columnas en 2xl, y un sobrante dejaria una fila coja. */
const CUANTOS = 8;

type FeaturedProductsProps = {
  products: StoreProduct[];
};

export default function FeaturedProducts({ products }: FeaturedProductsProps) {
  /* Catalogo vacio: no es un filtro sin resultados, es que todavia no hay
     productos activos cargados en el panel. */
  if (products.length === 0) {
    return (
      <section className="w-full px-4 md:px-12 lg:px-24 xl:px-32 py-16 md:py-24 text-center">
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

  /* Vienen ordenados por stock y titulo desde getStoreCatalog: se corta la
     cabeza de esa lista, no se reordena nada aca. */
  const vidriera = products.slice(0, CUANTOS);
  const hayMas = products.length > vidriera.length;

  return (
    <section className="w-full px-4 md:px-12 lg:px-24 xl:px-32 py-10 md:py-16">
      <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-stone-800">
        Destacados
      </h2>
      <span className="block w-12 h-px bg-[#8B5A2B] mt-2 mb-8" />

      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
        {vidriera.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Con el catalogo entero a la vista el boton no lleva a nada nuevo. */}
      {hayMas && (
        <div className="mt-10 text-center">
          <Link
            href={RUTA_CATALOGO}
            className="inline-flex items-center gap-2 rounded-lg bg-[#8B5A2B] px-7 py-3 text-[12px] font-semibold tracking-wide text-[#F7F5F0] transition-colors hover:bg-[#6b4421]"
          >
            Ver todo el catálogo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  );
}
