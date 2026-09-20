import { DollarSign, Package, ShoppingBag, Tags } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import { formatARS } from "@/components/admin/ui";
import { ESTADOS_COBRADOS } from "@/components/admin/orderStatus";

/** Estados en los que un pedido cuenta como venta concretada. */
const ESTADOS_VENDIDOS = [...ESTADOS_COBRADOS];

async function getStats() {
  const inicioDeMes = new Date();
  inicioDeMes.setDate(1);
  inicioDeMes.setHours(0, 0, 0, 0);

  const [activos, ventasDelMes, pendientes, categorias, sinStock] =
    await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: { in: ESTADOS_VENDIDOS },
          createdAt: { gte: inicioDeMes },
        },
      }),
      prisma.order.count({ where: { status: "pending" } }),
      prisma.category.count(),
      prisma.product.count({ where: { isActive: true, stock: 0 } }),
    ]);

  return {
    activos,
    /* Decimal de Prisma: se convierte antes de formatear. */
    ventasDelMes: Number(ventasDelMes._sum.totalAmount ?? 0),
    pendientes,
    categorias,
    sinStock,
  };
}

export default async function AdminDashboardPage() {
  const [session, stats] = await Promise.all([auth(), getStats()]);
  const firstName = session?.user?.name?.split(" ")[0] ?? "Administrador";

  const cards = [
    {
      label: "Productos Activos",
      value: String(stats.activos),
      /* Con cero activos la tienda no muestra nada: conviene decirlo aca y
         no dejar un "Todos con stock" que no explica el catalogo vacio. */
      hint:
        stats.activos === 0
          ? "La tienda no muestra ninguno"
          : stats.sinStock > 0
            ? `${stats.sinStock} sin stock`
            : "Todos con stock",
      icon: Package,
    },
    {
      label: "Ventas del Mes",
      value: formatARS(stats.ventasDelMes),
      hint: "Pedidos pagados",
      icon: DollarSign,
    },
    {
      label: "Pedidos Pendientes",
      value: String(stats.pendientes),
      hint: "Esperando el pago",
      icon: ShoppingBag,
    },
    {
      label: "Categorias",
      value: String(stats.categorias),
      hint: "Rubros cargados",
      icon: Tags,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-stone-200 pb-6">
        <span className="text-[10px] font-semibold tracking-wide text-[#8B5A2B]">
          Backoffice
        </span>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-stone-900 sm:text-3xl md:text-4xl">
          Panel de Control - Haras del Este
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Hola {firstName}, desde aca gestionas el inventario, las categorias y
          los pedidos de la tienda.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:mt-8 sm:gap-5 xl:grid-cols-4">
        {cards.map(({ label, value, hint, icon: Icon }) => (
          <article
            key={label}
            className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold tracking-wide text-stone-500">
                {label}
              </p>
              <span className="rounded-lg bg-[#8B5A2B]/10 p-2 text-[#8B5A2B]">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-4 font-[family-name:var(--font-display)] text-2xl text-stone-900 sm:text-3xl">
              {value}
            </p>
            <p className="mt-1 text-xs text-stone-400">{hint}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
