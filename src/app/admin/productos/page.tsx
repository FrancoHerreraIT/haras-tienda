import { prisma } from "@/app/lib/prisma";
import ProductTable from "@/components/admin/ProductTable";
import { headingClass } from "@/components/admin/ui";

export default async function ProductosPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ isActive: "desc" }, { title: "asc" }],
      include: {
        category: { select: { name: true } },
        _count: { select: { orderItems: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  /* Prisma.Decimal no es serializable hacia un Client Component:
     se convierte aca, del lado del servidor. */
  const rows = products.map((product) => ({
    id: product.id,
    title: product.title,
    description: product.description,
    price: Number(product.price),
    stock: product.stock,
    images: product.images,
    isActive: product.isActive,
    categoryId: product.categoryId,
    categoryName: product.category.name,
    orderItemCount: product._count.orderItems,
  }));

  const activeCount = rows.filter((row) => row.isActive).length;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-stone-200 pb-6">
        <span className="text-[10px] font-semibold tracking-wide text-[#8B5A2B]">
          Backoffice
        </span>
        <h1 className={`${headingClass} mt-2 text-2xl sm:text-3xl`}>Productos</h1>
        <p className="mt-2 text-sm text-stone-500">
          {rows.length} producto(s) en el catalogo, {activeCount} activo(s).
        </p>
      </header>

      <div className="mt-8">
        <ProductTable rows={rows} categories={categories} />
      </div>
    </div>
  );
}
