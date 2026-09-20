import { PackageX } from "lucide-react";

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
    isFeatured: product.isFeatured,
    categoryId: product.categoryId,
    categoryName: product.category.name,
    orderItemCount: product._count.orderItems,
  }));

  const activeCount = rows.filter((row) => row.isActive).length;
  const featuredCount = rows.filter((row) => row.isActive && row.isFeatured).length;

  /* Los que estan publicados y no se pueden vender. Un producto agotado pero
     inactivo no urge (no lo ve nadie); este es el que sigue en la vidriera y
     el cliente no puede comprar, asi que se cuenta aparte. */
  const sinStockCount = rows.filter(
    (row) => row.isActive && row.stock === 0,
  ).length;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-stone-200 pb-6">
        <span className="text-[10px] font-semibold tracking-wide text-[#8B5A2B]">
          Backoffice
        </span>
        <h1 className={`${headingClass} mt-2 text-2xl sm:text-3xl`}>Productos</h1>
        <p className="mt-2 text-sm text-stone-500">
          {rows.length} producto(s) en el catalogo, {activeCount} activo(s),{" "}
          {featuredCount} destacado(s) en la portada.
        </p>

        {/* `flex` y no `inline-flex`: en un telefono, un inline-flex se estira
            con el texto en una sola linea y desborda la pantalla. */}
        {sinStockCount > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-800">
            <PackageX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              {sinStockCount === 1
                ? "1 producto activo sin stock: está publicado y nadie lo puede comprar."
                : `${sinStockCount} productos activos sin stock: están publicados y nadie los puede comprar.`}
            </span>
          </p>
        )}
      </header>

      <div className="mt-8">
        <ProductTable rows={rows} categories={categories} />
      </div>
    </div>
  );
}
