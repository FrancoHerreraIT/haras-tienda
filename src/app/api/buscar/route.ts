import type { NextRequest } from "next/server";

import { SEARCH_PARAM, type ResultadoBusqueda } from "@/app/lib/search";
import { buscarEnTienda } from "@/app/lib/storeData";

/* Nadie busca con un parrafo: el tope evita que una URL armada a mano haga
   comparar textos enormes contra todo el catalogo. */
const LARGO_MAXIMO = 100;

/**
 * Sugerencias del buscador: `/api/buscar?q=tab`.
 *
 * Publico a proposito, igual que la tienda: solo devuelve productos activos
 * y los mismos datos que ya se ven en la vidriera.
 */
export async function GET(request: NextRequest) {
  const consulta = (request.nextUrl.searchParams.get(SEARCH_PARAM) ?? "")
    .trim()
    .slice(0, LARGO_MAXIMO);

  const resultado: ResultadoBusqueda = consulta
    ? await buscarEnTienda(consulta)
    : { products: [], total: 0 };

  return Response.json(resultado);
}
