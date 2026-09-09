import type { StoreProduct } from "@/app/lib/storeData";

/**
 * Busqueda de la tienda.
 *
 * La consulta viaja en la URL (`/?q=cuchillo`) y el filtrado se resuelve en el
 * cliente: el listado ya tiene el catalogo completo en memoria, asi que no
 * hace falta volver al servidor por cada tecla.
 */

/** Nombre del parametro donde viaja la consulta. */
export const SEARCH_PARAM = "q";

/* Las tildes que `normalize("NFD")` deja sueltas como caracteres aparte.
   Va como cadena y no como literal /[...]/ porque son caracteres invisibles:
   escritos asi se ve que dice. (\p{Diacritic} pediria target ES2018.) */
const DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

/**
 * Deja el texto comparable: sin mayusculas y sin acentos. Nadie escribe
 * "cuchillería" con tilde en un buscador, y el producto si la lleva.
 */
export const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(DIACRITICOS, "").toLowerCase();

/**
 * Filtra por titulo, descripcion y categoria.
 *
 * Cada palabra de la consulta tiene que aparecer en alguna parte, en cualquier
 * orden: "tabla quebracho" encuentra "Tabla de asado en quebracho".
 */
export function filtrarProductos(
  products: StoreProduct[],
  consulta: string,
): StoreProduct[] {
  const terminos = normalizar(consulta).split(/\s+/).filter(Boolean);
  if (terminos.length === 0) return products;

  return products.filter((product) => {
    const texto = normalizar(
      `${product.title} ${product.description ?? ""} ${product.categoryName}`,
    );
    return terminos.every((termino) => texto.includes(termino));
  });
}

/** URL de la tienda para una consulta dada; sin consulta, la home limpia. */
export function hrefBusqueda(consulta: string): string {
  const limpio = consulta.trim();
  return limpio ? `/?${SEARCH_PARAM}=${encodeURIComponent(limpio)}` : "/";
}
