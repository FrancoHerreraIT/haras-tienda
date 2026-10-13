import { prisma } from "@/app/lib/prisma";
import { contar } from "@/app/lib/plural";
import CategoryTable from "@/components/admin/CategoryTable";
import { headingClass } from "@/components/admin/ui";

export default async function CategoriasPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    /* Los productos eliminados (archivados por tener ventas) no cuentan. */
    include: {
      _count: { select: { products: { where: { deletedAt: null } } } },
    },
  });

  const rows = categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    productCount: category._count.products,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-stone-200 pb-6">
        <span className="text-[10px] font-semibold tracking-wide text-[#8B5A2B]">
          Backoffice
        </span>
        <h1 className={`${headingClass} mt-2 text-2xl sm:text-3xl`}>Categorías</h1>
        <p className="mt-2 text-sm text-stone-500">
          Rubros para agrupar el catálogo. {contar(rows.length, "cargada")}.
        </p>
      </header>

      <div className="mt-8">
        <CategoryTable rows={rows} />
      </div>
    </div>
  );
}
