"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, PackageSearch, SearchX, X } from "lucide-react";
import ProductCard from "./ProductCard";
import { SEARCH_PARAM, filtrarProductos } from "@/app/lib/search";
import type { StoreCategory, StoreProduct } from "@/app/lib/storeData";

type SortOption = "destacados" | "menor-precio" | "mayor-precio";

/** Filtro "sin filtro": no es una categoria de la base, es el estado inicial. */
const ALL = "todos";

type ProductGridProps = {
  products: StoreProduct[];
  categories: StoreCategory[];
};

export default function ProductGrid({ products, categories }: ProductGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [sortOption, setSortOption] = useState<SortOption>("destacados");

  /* Lo que se escribio en el buscador del Navbar. Viaja por la URL, no por
     props, para que se pueda compartir el link del resultado. */
  const searchParams = useSearchParams();
  const consulta = (searchParams.get(SEARCH_PARAM) ?? "").trim();
  const buscando = consulta.length > 0;

  /* Una busqueda nueva empieza mirando todo el catalogo: si quedara puesta la
     categoria anterior, lo encontrado fuera de ella no se veria. Se ajusta
     durante el render, que es mas barato que un efecto que dispare un
     segundo render (react.dev, "You Might Not Need an Effect"). */
  const [ultimaConsulta, setUltimaConsulta] = useState(consulta);
  if (ultimaConsulta !== consulta) {
    setUltimaConsulta(consulta);
    setActiveCategory(ALL);
  }

  const activeName = buscando
    ? "Resultados"
    : activeCategory === ALL
      ? "Destacados"
      : (categories.find((c) => c.id === activeCategory)?.name ?? "Destacados");

  const visible = useMemo(() => {
    let list = filtrarProductos(products, consulta);

    if (activeCategory !== ALL) {
      list = list.filter((p) => p.categoryId === activeCategory);
    }

    if (sortOption === "menor-precio") {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortOption === "mayor-precio") {
      list = [...list].sort((a, b) => b.price - a.price);
    }

    return list;
  }, [products, consulta, activeCategory, sortOption]);

  /* Vuelve a la home sin `q`. replaceState y no un Link porque no hace falta
     ir al servidor: el filtrado es local. */
  const limpiarBusqueda = () => window.history.replaceState(null, "", "/");

  /* Se muestra debajo del titulo, en las dos variantes de encabezado. */
  const chipBusqueda = buscando ? (
    <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-stone-600">
      <span>
        Buscaste{" "}
        <span className="font-semibold text-stone-800">“{consulta}”</span>
      </span>
      <button
        type="button"
        onClick={limpiarBusqueda}
        className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-[13px] text-stone-600 transition-colors hover:border-[#8B5A2B] hover:text-amber-800"
      >
        <X className="h-3.5 w-3.5" />
        Limpiar
      </button>
    </div>
  ) : null;

  /* Catalogo vacio: no es un filtro sin resultados, es que todavia no hay
     productos activos cargados en el panel. */
  if (products.length === 0) {
    return (
      <section
        id="productos"
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

  const categoryOptions = [
    { id: ALL, name: "Todos" },
    ...categories.map((c) => ({ id: c.id, name: c.name })),
  ];

  return (
    <section
      id="productos"
      className="w-full px-4 md:px-12 lg:px-24 xl:px-32 py-10 md:py-16 flex gap-10 xl:gap-16"
    >
      {/* Sidebar Izquierdo (solo desktop) */}
      <aside className="hidden lg:block w-60 xl:w-64 shrink-0">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-stone-800 mb-2">
          {activeName}
        </h2>
        <span className="block w-12 h-px bg-[#8B5A2B] mb-8" />
        {chipBusqueda}
        <p className="text-[11px] uppercase tracking-[0.28em] text-amber-800 font-semibold mb-5">
          Categorías
        </p>
        <ul className="space-y-3 text-[15px] text-stone-600">
          {categoryOptions.map((cat) => (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`text-left w-full py-1 transition-colors ${
                  activeCategory === cat.id
                    ? "text-amber-800 font-semibold"
                    : "hover:text-amber-800"
                }`}
              >
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Área de Productos */}
      <div className="flex-1 min-w-0">
        {/* Encabezado y filtro para mobile/tablet: abajo de lg el sidebar no
            se muestra, asi que las categorias tienen que vivir aca. */}
        <div className="lg:hidden mb-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-stone-800">
            {activeName}
          </h2>
          <span className="block w-12 h-px bg-[#8B5A2B] mt-2 mb-5" />
          {chipBusqueda}

          {/* Chips scrolleables: entran todas las categorias sin romper el ancho */}
          <div
            className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar pb-1"
            role="group"
            aria-label="Filtrar por categoría"
          >
            {categoryOptions.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  aria-pressed={isActive}
                  className={`shrink-0 rounded-full border px-4 py-2.5 text-[13px] whitespace-nowrap transition-colors ${
                    isActive
                      ? "border-[#8B5A2B] bg-[#8B5A2B] text-[#F7F5F0] font-semibold"
                      : "border-stone-300 bg-white text-stone-600 hover:border-[#8B5A2B] hover:text-amber-800"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center mb-6 md:mb-8 gap-4 border-b border-stone-200 pb-4">
          <p className="text-sm text-stone-500">
            {visible.length} producto{visible.length === 1 ? "" : "s"}
          </p>

          <div className="flex items-center gap-3 ml-auto">
            <label
              htmlFor="orden"
              className="text-sm text-stone-500 whitespace-nowrap"
            >
              Ordenar por
            </label>
            <div className="relative">
              <select
                id="orden"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="appearance-none bg-transparent text-stone-700 text-sm py-2.5 pr-6 focus:outline-none border-b border-stone-300 cursor-pointer"
              >
                <option value="destacados">Destacados</option>
                <option value="menor-precio">Menor precio</option>
                <option value="mayor-precio">Mayor precio</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-stone-500 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {visible.length > 0 ? (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : buscando ? (
          <div className="py-12 text-center">
            <SearchX
              className="mx-auto h-9 w-9 text-stone-300"
              strokeWidth={1.25}
            />
            <p className="mt-3 text-sm text-stone-500">
              No encontramos nada para{" "}
              <span className="font-semibold text-stone-700">“{consulta}”</span>.
            </p>
            <button
              type="button"
              onClick={limpiarBusqueda}
              className="mt-4 rounded-lg bg-[#8B5A2B] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#F7F5F0] transition-colors hover:bg-[#6b4421]"
            >
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <p className="text-stone-500 text-sm py-12 text-center">
            No hay productos disponibles en esta categoría todavía.
          </p>
        )}
      </div>
    </section>
  );
}
