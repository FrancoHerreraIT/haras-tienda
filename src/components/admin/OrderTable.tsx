"use client";

import { useState } from "react";
import { Mail, Phone, Receipt, ShoppingBag } from "lucide-react";

import Modal from "./Modal";
import { btnGhost, btnSecondary, cardClass, formatARS, formatDate } from "./ui";
import { statusMeta } from "./orderStatus";

export type OrderItemRow = {
  id: string;
  title: string;
  quantity: number;
  priceAtPurchase: number;
};

export type OrderStatusLogRow = {
  id: string;
  status: string;
  notes: string | null;
  createdAt: string;
};

export type OrderRow = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: string;
  totalAmount: number;
  mpPreferenceId: string | null;
  createdAt: string;
  items: OrderItemRow[];
  statusLogs: OrderStatusLogRow[];
};

function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta(status);
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export default function OrderTable({ rows }: { rows: OrderRow[] }) {
  const [detail, setDetail] = useState<OrderRow | null>(null);

  return (
    <>
      <div className={`${cardClass} overflow-hidden`}>
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-stone-300" />
            <p className="mt-3 text-sm text-stone-500">
              Todavia no entro ningun pedido.
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Los pedidos los genera el checkout de la tienda, no se cargan a
              mano.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: tarjetas. Siete columnas no entran en un telefono. */}
            <ul className="divide-y divide-stone-100 lg:hidden">
              {rows.map((row) => (
                <li key={row.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-800">
                        {row.customerName}
                      </p>
                      <p className="truncate text-xs text-stone-400">
                        {row.customerEmail}
                      </p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div className="text-xs text-stone-500">
                      <p className="font-mono">#{row.id.slice(0, 8)}</p>
                      <p className="mt-0.5">{formatDate(row.createdAt)}</p>
                      <p className="mt-0.5">
                        {row.items.reduce((acc, i) => acc + i.quantity, 0)}{" "}
                        item(s)
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-stone-900">
                      {formatARS(row.totalAmount)}
                    </p>
                  </div>

                  <div className="mt-3 border-t border-stone-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setDetail(row)}
                      className={btnGhost}
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      Ver detalle
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: la tabla completa */}
            <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50/80">
                <tr className="text-[11px] tracking-wide text-stone-500">
                  <th className="px-4 py-3 font-semibold">Pedido</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 text-right font-semibold">Items</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="sticky right-0 bg-stone-50 px-4 py-3 text-right font-semibold shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((row) => (
                  <tr key={row.id} className="group hover:bg-stone-50/60">
                    <td className="px-4 py-4 font-mono text-xs text-stone-500">
                      #{row.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-stone-800">
                        {row.customerName}
                      </p>
                      <p className="text-xs text-stone-400">
                        {row.customerEmail}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-stone-500">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-4 text-right text-stone-600">
                      {row.items.reduce((acc, item) => acc + item.quantity, 0)}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-stone-800">
                      {formatARS(row.totalAmount)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    {/* sticky: mantiene el acceso al detalle aunque la tabla
                        tenga que scrollear de costado. */}
                    <td className="sticky right-0 bg-white px-4 py-4 text-right shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)] group-hover:bg-stone-50">
                      <button
                        type="button"
                        onClick={() => setDetail(row)}
                        className={btnGhost}
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `Pedido #${detail.id.slice(0, 8)}` : "Pedido"}
        description={detail ? formatDate(detail.createdAt) : undefined}
        size="lg"
        footer={
          <button
            type="button"
            onClick={() => setDetail(null)}
            className={btnSecondary}
          >
            Cerrar
          </button>
        }
      >
        {detail && (
          <div className="space-y-7">
            {/* Cliente */}
            <section>
              <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-stone-900">
                    {detail.customerName}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{detail.customerEmail}</span>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-stone-500">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {detail.customerPhone}
                  </p>
                </div>
                <StatusBadge status={detail.status} />
              </div>

              {detail.mpPreferenceId && (
                <p className="mt-3 break-all font-mono text-[11px] text-stone-400">
                  Mercado Pago: {detail.mpPreferenceId}
                </p>
              )}
            </section>

            {/* Items comprados */}
            <section>
              <h3 className="mb-3 text-[11px] font-semibold tracking-wide text-stone-500">
                Productos
              </h3>
              <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-stone-100">
                    {detail.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-stone-700">
                          {item.title}
                          <span className="ml-2 text-xs text-stone-400">
                            x{item.quantity}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 text-right text-stone-500 sm:table-cell">
                          {formatARS(item.priceAtPurchase)} c/u
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-stone-800">
                          {formatARS(item.priceAtPurchase * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-stone-200 bg-stone-50">
                    <tr>
                      <td
                        colSpan={2}
                        className="px-4 py-3 text-[11px] font-semibold tracking-wide text-stone-500"
                      >
                        Total
                      </td>
                      <td className="px-4 py-3 text-right text-base font-semibold text-stone-900">
                        {formatARS(detail.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="mt-2 text-xs text-stone-400">
                Los precios son los del momento de la compra, no los actuales
                del catalogo.
              </p>
            </section>

            {/* Historial de estados */}
            {detail.statusLogs.length > 0 && (
              <section>
                <h3 className="mb-3 text-[11px] font-semibold tracking-wide text-stone-500">
                  Historial
                </h3>
                <ol className="space-y-4 border-l border-stone-200 pl-5">
                  {detail.statusLogs.map((log) => (
                    <li key={log.id} className="relative">
                      <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-[#8B5A2B]" />
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={log.status} />
                        <span className="text-xs text-stone-400">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                      {log.notes && (
                        <p className="mt-1 text-sm text-stone-600">
                          {log.notes}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
