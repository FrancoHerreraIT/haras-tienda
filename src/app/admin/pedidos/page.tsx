import { prisma } from "@/app/lib/prisma";
import OrderTable from "@/components/admin/OrderTable";
import { ORDER_STATUS } from "@/components/admin/orderStatus";
import { headingClass } from "@/components/admin/ui";

export default async function PedidosPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { product: { select: { title: true } } } },
      statusLogs: { orderBy: { createdAt: "asc" } },
    },
  });

  /* Decimal y Date no cruzan a un Client Component: se normalizan aca. */
  const rows = orders.map((order) => ({
    id: order.id,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    mpPreferenceId: order.mpPreferenceId,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      title: item.product.title,
      quantity: item.quantity,
      priceAtPurchase: Number(item.priceAtPurchase),
    })),
    statusLogs: order.statusLogs.map((log) => ({
      id: log.id,
      status: log.status,
      notes: log.notes,
      createdAt: log.createdAt.toISOString(),
    })),
  }));

  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-stone-200 pb-6">
        <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#8B5A2B]">
          Backoffice
        </span>
        <h1 className={`${headingClass} mt-2 text-2xl sm:text-3xl`}>Pedidos</h1>
        <p className="mt-2 text-sm text-stone-500">
          Seguimiento y estados de las ventas. {rows.length} pedido(s) en total.
        </p>
      </header>

      {/* Resumen por estado */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(ORDER_STATUS).map(([key, meta]) => (
          <div
            key={key}
            className="rounded-xl border border-stone-200 bg-white px-4 py-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
              {meta.label}
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl text-stone-900 sm:text-2xl">
              {counts[key] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <OrderTable rows={rows} />
      </div>
    </div>
  );
}
