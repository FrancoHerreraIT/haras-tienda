import type { StoreProduct } from "@/app/lib/storeData";

/**
 * Busqueda de la tienda.
 *
 * La consulta viaja en la URL (`/productos?q=cuchillo`) y el filtrado se
 * resuelve en el cliente: el listado ya tiene el catalogo completo en memoria,
 * asi que no hace falta volver al servidor por cada tecla.
 */

/**
 * Donde vive el catalogo.
 *
 * Filtrar y buscar llevan aca. Antes las dos cosas reescribian la home y
 * scrolleaban hasta la grilla: se cambiaba el contenido debajo de los pies sin
 * cambiar de pagina, y no habia URL propia del catalogo para compartir ni para
 * que el boton "atras" distinguiera de la portada.
 */
export const RUTA_CATALOGO = "/productos";

/** Nombre del parametro donde viaja la consulta. */
export const SEARCH_PARAM = "q";

/**
 * Endpoint de las sugerencias del buscador.
 *
 * Fuera del catalogo no hay productos en el cliente para filtrar, asi que el
 * desplegable se los pide al servidor mientras se escribe.
 */
export const RUTA_SUGERENCIAS = "/api/buscar";

/** Cuantos productos entran en el desplegable; el resto se ve en el catalogo. */
export const SUGERENCIAS_MAXIMAS = 6;

/** Lo minimo para pintar un renglon del desplegable. */
export type Sugerencia = {
  id: string;
  title: string;
  price: number;
  stock: number;
  categoryName: string;
  /** Portada, o null si el producto todavia no tiene fotos. */
  imagen: string | null;
};

export type ResultadoBusqueda = {
  products: Sugerencia[];
  /** Todo lo que matcheo, no solo lo que entro en el desplegable. */
  total: number;
};

/** Nombre del parametro donde viaja la categoria elegida. */
export const CATEGORY_PARAM = "cat";

/**
 * Filtro "sin filtro". No es una categoria de la base sino el estado inicial,
 * y por eso no se escribe en la URL: `/` ya significa "todo el catalogo".
 */
export const TODAS_LAS_CATEGORIAS = "todos";

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

/** URL del catalogo para una consulta dada; sin consulta, el catalogo entero. */
export function hrefBusqueda(consulta: string): string {
  const limpio = consulta.trim();
  return limpio
    ? `${RUTA_CATALOGO}?${SEARCH_PARAM}=${encodeURIComponent(limpio)}`
    : RUTA_CATALOGO;
}

/**
 * URL de la tienda filtrada por categoria.
 *
 * Conserva la busqueda activa (se puede acotar un resultado a un rubro) y
 * omite el parametro cuando la categoria es "todos", asi `/productos` queda
 * limpio en vez de arrastrar un `?cat=todos` que no filtra nada.
 *
 * `params` se tipa por su forma y no como URLSearchParams para poder recibir
 * tambien el ReadonlyURLSearchParams que devuelve useSearchParams.
 */
export function hrefCategoria(
  categoriaId: string,
  params?: { get(nombre: string): string | null } | null,
): string {
  const query = new URLSearchParams();

  const consulta = params?.get(SEARCH_PARAM)?.trim();
  if (consulta) query.set(SEARCH_PARAM, consulta);

  if (categoriaId !== TODAS_LAS_CATEGORIAS) {
    query.set(CATEGORY_PARAM, categoriaId);
  }

  const cadena = query.toString();
  return cadena ? `${RUTA_CATALOGO}?${cadena}` : RUTA_CATALOGO;
}
