/**
 * Reglas de la portada: cuantos productos entran y como se navega el catalogo.
 *
 * Vive aparte de storeData.ts porque de aca tambien lee el panel, que es un
 * Client Component: storeData importa el cliente de Prisma y arrastrarlo al
 * bundle del navegador revienta en tiempo de ejecucion. Este modulo son
 * numeros y strings, no toca la base.
 */

/** Cuantos productos entran en una pagina del catalogo de la home. */
export const PRODUCTOS_POR_PAGINA = 12;

/** Nombre del parametro donde viaja la pagina del catalogo de la home. */
export const PAGE_PARAM = "page";

/**
 * Ancla de la grilla del catalogo.
 *
 * Los links de paginacion apuntan aca: sin esto, pasar a la pagina 2 devuelve
 * al visitante arriba de todo, con el carrusel y los destacados de nuevo
 * delante y la grilla que estaba mirando fuera de pantalla.
 */
export const ANCLA_CATALOGO = "catalogo";

/**
 * Lee el `?page=` de la URL como numero de pagina.
 *
 * Cualquier cosa que no sea un entero positivo (vacio, "abc", "-2", o el
 * array que Next arma cuando el parametro viene repetido) cae en la primera.
 */
export function parsePagina(valor: string | string[] | undefined): number {
  const crudo = Array.isArray(valor) ? valor[0] : valor;
  const numero = Number(crudo);
  return Number.isInteger(numero) && numero > 0 ? numero : 1;
}

/**
 * URL de una pagina del catalogo de la home.
 *
 * La primera pagina es `/` a secas: `?page=1` seria una segunda direccion
 * para la portada, que no aporta nada y duplica la home para los buscadores.
 */
export function hrefPagina(pagina: number): string {
  const destino = pagina <= 1 ? "/" : `/?${PAGE_PARAM}=${pagina}`;
  return `${destino}#${ANCLA_CATALOGO}`;
}
