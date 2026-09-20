import type { Prisma } from "@prisma/client";

import { prisma } from "@/app/lib/prisma";
import { PRODUCTOS_POR_PAGINA } from "@/app/lib/catalogo";
import {
  SUGERENCIAS_MAXIMAS,
  filtrarProductos,
  type ResultadoBusqueda,
} from "@/app/lib/search";

/**
 * Datos de la vidriera publica.
 *
 * Vive aca y no dentro de los componentes para que la tienda tenga un unico
 * lugar donde se decide que ve el cliente: solo productos activos, y los
 * Decimal de Prisma ya convertidos a number (no cruzan a un Client Component).
 */

export type StoreProduct = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  stock: number;
  /** Todas las fotos; la primera es la portada. Puede venir vacio. */
  images: string[];
  /** Lo marco el dueno en el panel: sube a la vidriera de la home. */
  isFeatured: boolean;
  categoryId: string;
  categoryName: string;
};

/** Portada del producto, o null si todavia no le cargaron fotos. */
export const portada = (producto: { images: string[] }): string | null =>
  producto.images[0] ?? null;

export type StoreCategory = {
  id: string;
  name: string;
  /** Cuantos productos activos tiene: las categorias vacias no se muestran. */
  productCount: number;
};

/**
 * El orden de la tienda, uno solo para todas las consultas.
 *
 * 1. Los destacados arriba (en Postgres false < true, asi que `desc` los sube).
 * 2. Entre ellos, el ultimo que el dueno tildo va primero: por eso ordena por
 *    featuredAt y no por createdAt. Los no destacados tienen featuredAt null y
 *    empatan entre si, asi que caen a los criterios de abajo.
 * 3. Despues lo que se puede comprar: los agotados al final.
 * 4. `id` desempata al final. No es decorativo: sin un orden total, un mismo
 *    producto puede aparecer en dos paginas distintas o faltar en las dos.
 */
const ORDEN_TIENDA = [
  { isFeatured: "desc" },
  { featuredAt: "desc" },
  { stock: "desc" },
  { title: "asc" },
  { id: "asc" },
] satisfies Prisma.ProductOrderByWithRelationInput[];

/* Todas las consultas de la tienda traen el rubro: la tarjeta lo muestra y el
   buscador lo usa como texto a matchear. */
const conCategoria = {
  category: { select: { id: true, name: true } },
} satisfies Prisma.ProductInclude;

type ProductoDeLaBase = Prisma.ProductGetPayload<{
  include: typeof conCategoria;
}>;

const aStoreProduct = (product: ProductoDeLaBase): StoreProduct => ({
  id: product.id,
  title: product.title,
  description: product.description,
  price: Number(product.price),
  stock: product.stock,
  images: product.images,
  isFeatured: product.isFeatured,
  categoryId: product.categoryId,
  categoryName: product.category.name,
});

/**
 * Las categorias que se ofrecen como filtro.
 *
 * Sale aparte del catalogo porque la barra de categorias del Navbar tambien
 * vive en la ficha de producto, donde traer todos los productos seria al pedo.
 */
export async function getStoreCategories(): Promise<StoreCategory[]> {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });

  /* Una categoria sin productos activos seria un filtro que no devuelve
     nada: no se ofrece. */
  return categories
    .filter((category) => category._count.products > 0)
    .map((category) => ({
      id: category.id,
      name: category.name,
      productCount: category._count.products,
    }));
}

export type CatalogoPaginado = {
  products: StoreProduct[];
  /** La pagina que efectivamente se devolvio, ya acotada al rango valido. */
  page: number;
  totalPages: number;
  /** Productos activos en total, no los de esta pagina. */
  total: number;
};

/**
 * Una pagina del catalogo completo.
 *
 * La home no baja los miles de productos de una: pide de a
 * PRODUCTOS_POR_PAGINA y se mueve con `?page=` en la URL. Que el numero de
 * pagina viaje en la URL (y no en un estado de React) es lo que hace que la
 * pagina 3 se pueda compartir, marcar y volver con el boton "atras".
 *
 * `page` llega crudo desde la URL: se acota al rango real antes de consultar,
 * asi un `?page=999` escrito a mano devuelve la ultima pagina en vez de una
 * grilla vacia.
 */
export async function getCatalogPage(
  page: number,
  porPagina = PRODUCTOS_POR_PAGINA,
): Promise<CatalogoPaginado> {
  const where = { isActive: true } satisfies Prisma.ProductWhereInput;

  /* El total va primero porque define cual es la ultima pagina, y sin eso no
     se sabe que `skip` pedir cuando el numero viene fuera de rango. */
  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / porPagina));
  const paginaActual = Math.min(Math.max(1, page), totalPages);

  const products = await prisma.product.findMany({
    where,
    include: conCategoria,
    orderBy: ORDEN_TIENDA,
    skip: (paginaActual - 1) * porPagina,
    take: porPagina,
  });

  return {
    products: products.map(aStoreProduct),
    page: paginaActual,
    totalPages,
    total,
  };
}

export async function getStoreCatalog(): Promise<{
  products: StoreProduct[];
  categories: StoreCategory[];
}> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: conCategoria,
      orderBy: ORDEN_TIENDA,
    }),
    getStoreCategories(),
  ]);

  return { products: products.map(aStoreProduct), categories };
}

/**
 * Sugerencias para el desplegable del buscador.
 *
 * Matchea con el mismo filtrarProductos que el catalogo, asi el desplegable y
 * la grilla nunca discrepan. Por eso trae los activos y filtra aca en vez de
 * pedirle a Postgres un `contains`: ese no ignora tildes, y "cuchilleria" no
 * encontraria "Cuchillería". Es la misma lectura que ya hace /productos en cada
 * visita; si el catalogo crece a miles, esto pasa a una busqueda en la base.
 */
export async function buscarEnTienda(
  consulta: string,
  limite = SUGERENCIAS_MAXIMAS,
): Promise<ResultadoBusqueda> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: conCategoria,
    orderBy: ORDEN_TIENDA,
  });

  const encontrados = filtrarProductos(products.map(aStoreProduct), consulta);

  return {
    total: encontrados.length,
    products: encontrados.slice(0, limite).map((product) => ({
      id: product.id,
      title: product.title,
      price: product.price,
      stock: product.stock,
      categoryName: product.categoryName,
      imagen: portada(product),
    })),
  };
}

/**
 * Un producto para su pagina de detalle, con los relacionados de su rubro.
 * Devuelve null si no existe o si esta despublicado: la ficha de un producto
 * que el dueno saco de la tienda no deberia seguir siendo visitable.
 */
export async function getStoreProduct(id: string): Promise<{
  product: StoreProduct;
  related: StoreProduct[];
} | null> {
  const product = await prisma.product.findFirst({
    where: { id, isActive: true },
    include: conCategoria,
  });

  if (!product) return null;

  const related = await prisma.product.findMany({
    where: { isActive: true, categoryId: product.categoryId, id: { not: id } },
    include: conCategoria,
    orderBy: ORDEN_TIENDA,
    take: 4,
  });

  return {
    product: aStoreProduct(product),
    related: related.map(aStoreProduct),
  };
}
