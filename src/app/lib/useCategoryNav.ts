"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CATEGORY_PARAM,
  RUTA_CATALOGO,
  TODAS_LAS_CATEGORIAS,
  hrefCategoria,
} from "@/app/lib/search";

/**
 * Navegacion por categoria de la tienda.
 *
 * La categoria elegida vive en la URL (`/productos?cat=<id>`), igual que la
 * busqueda: asi el filtro se comparte por link, el boton "atras" vuelve al
 * rubro anterior y el Navbar y el listado leen el mismo estado sin pasarse
 * props entre hermanos.
 *
 * Elegir un rubro desde cualquier otra pagina navega al catalogo. Estando ya en
 * el catalogo se usa `history.pushState`, que Next engancha al router sin ir al
 * servidor (ver "Native History API" en la doc de navegacion): los productos ya
 * estan en el cliente, asi que el filtrado es instantaneo.
 *
 * Se comparte entre el menu del Navbar, la barra de chips y la lista del
 * sidebar para que todas las entradas al mismo filtro se comporten igual.
 */
export function useCategoryNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activa = searchParams.get(CATEGORY_PARAM) ?? TODAS_LAS_CATEGORIAS;
  const enCatalogo = pathname === RUTA_CATALOGO;

  /** Destino real del filtro; sirve como href de un `<a>` de verdad. */
  const hrefDe = (categoriaId: string) =>
    hrefCategoria(categoriaId, searchParams);

  const elegir = (
    evento: React.MouseEvent<HTMLAnchorElement>,
    categoriaId: string,
    /* Desde el sidebar del propio listado la grilla ya esta a la vista: mover
       la pagina seria un salto que nadie pidio. */
    { scroll = true }: { scroll?: boolean } = {},
  ) => {
    /* Ctrl/Cmd/shift click o boton del medio: es un "abrir en otra pestana",
       no un filtro. Se deja pasar al navegador. */
    if (
      evento.metaKey ||
      evento.ctrlKey ||
      evento.shiftKey ||
      evento.altKey ||
      evento.button !== 0
    ) {
      return;
    }

    evento.preventDefault();
    const destino = hrefCategoria(categoriaId, searchParams);

    if (enCatalogo) {
      window.history.pushState(null, "", destino);
      if (scroll) {
        document
          .getElementById("productos")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      /* Otra pagina: se navega al catalogo, que arranca arriba de todo. */
      router.push(destino);
    }
  };

  return { activa, hrefDe, elegir };
}
