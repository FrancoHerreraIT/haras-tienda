import { prisma } from "@/app/lib/prisma";

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

export async function getStoreCatalog(): Promise<{
  products: StoreProduct[];
  categories: StoreCategory[];
}> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: { category: { select: { id: true, name: true } } },
      /* Primero lo que se puede comprar: los agotados van al final. */
      orderBy: [{ stock: "desc" }, { title: "asc" }],
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    }),
  ]);

  return {
    products: products.map((product) => ({
      id: product.id,
      title: product.title,
      description: product.description,
      price: Number(product.price),
      stock: product.stock,
      images: product.images,
      categoryId: product.categoryId,
      categoryName: product.category.name,
    })),
    /* Una categoria sin productos activos seria un filtro que no devuelve
       nada: no se ofrece. */
    categories: categories
      .filter((category) => category._count.products > 0)
      .map((category) => ({
        id: category.id,
        name: category.name,
        productCount: category._count.products,
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
    include: { category: { select: { id: true, name: true } } },
  });

  if (!product) return null;

  const related = await prisma.product.findMany({
    where: { isActive: true, categoryId: product.categoryId, id: { not: id } },
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ stock: "desc" }, { title: "asc" }],
    take: 4,
  });

  const aStoreProduct = (p: (typeof related)[number]): StoreProduct => ({
    id: p.id,
    title: p.title,
    description: p.description,
    price: Number(p.price),
    stock: p.stock,
    images: p.images,
    categoryId: p.categoryId,
    categoryName: p.category.name,
  });

  return {
    product: aStoreProduct(product),
    related: related.map(aStoreProduct),
  };
}
