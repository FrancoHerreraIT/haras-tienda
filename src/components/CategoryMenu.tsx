"use client";

import { TODAS_LAS_CATEGORIAS } from "@/app/lib/search";
import { useCategoryNav } from "@/app/lib/useCategoryNav";
import type { StoreCategory } from "@/app/lib/storeData";

/**
 * Categorias que despliega "Productos" en el Navbar.
 *
 * En escritorio se reparten en columnas de POR_COLUMNA: llenada la primera,
 * la siguiente arranca a la derecha. Lo resuelve `grid-flow-col` con las filas
 * calculadas a partir de cuantas opciones hay, asi que agregar o sacar rubros
 * en el panel reacomoda el menu solo, sin tocar nada aca.
 *
 * En el telefono no hay ancho para columnas: se apilan en una lista de blancos
 * grandes. El minimo tactil va en px y no en rem a proposito — es una medida
 * del dedo, no del texto, y no tiene que encoger con la escala tipografica.
 *
 * Los nombres se muestran como estan cargados en el panel ("Cocina de
 * Hierro"), igual que en el resto de la tienda.
 */

/** Cuantas opciones entran en una columna antes de abrir la siguiente. */
const POR_COLUMNA = 5;

type CategoryMenuProps = {
  categories: StoreCategory[];
  /** "grilla" arma columnas (escritorio); "lista" apila (telefono). */
  variante: "grilla" | "lista";
  /** Cierra el panel desplegado despues de elegir. */
  onSelected?: () => void;
  className?: string;
};

export default function CategoryMenu({
  categories,
  variante,
  onSelected,
  className = "",
}: CategoryMenuProps) {
  const { activa, hrefDe, elegir } = useCategoryNav();

  const opciones = [
    { id: TODAS_LAS_CATEGORIAS, name: "Todos" },
    ...categories.map((categoria) => ({
      id: categoria.id,
      name: categoria.name,
    })),
  ];

  const enGrilla = variante === "grilla";

  /* Con menos opciones que una columna entera no se reservan filas de mas,
     que dejarian el panel alto y vacio. */
  const filas = Math.min(POR_COLUMNA, opciones.length);

  return (
    <ul
      className={`text-[14px] text-stone-700 ${
        enGrilla ? "grid grid-flow-col gap-x-8" : ""
      } ${className}`}
      style={
        enGrilla
          ? { gridTemplateRows: `repeat(${filas}, minmax(0, auto))` }
          : undefined
      }
    >
      {opciones.map((opcion) => {
        const seleccionada = opcion.id === activa;
        return (
          <li key={opcion.id}>
            <a
              href={hrefDe(opcion.id)}
              onClick={(evento) => {
                elegir(evento, opcion.id);
                onSelected?.();
              }}
              aria-current={seleccionada ? "true" : undefined}
              className={
                enGrilla
                  ? `block whitespace-nowrap rounded px-3 py-2 transition-colors ${
                      seleccionada
                        ? "bg-[#8B5A2B]/10 font-semibold text-amber-800"
                        : "hover:bg-stone-100 hover:text-amber-800"
                    }`
                  : /* El borde izquierdo va siempre, transparente cuando no
                       esta elegida: si apareciera recien al activarse, el
                       renglon se correria al pasar de uno a otro. */
                    `flex min-h-[44px] items-center border-l-2 px-4 transition-colors ${
                      seleccionada
                        ? "border-[#8B5A2B] bg-[#8B5A2B]/5 font-semibold text-amber-800"
                        : "border-transparent hover:border-stone-300 hover:bg-stone-50 hover:text-amber-800"
                    }`
              }
            >
              {opcion.name}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
