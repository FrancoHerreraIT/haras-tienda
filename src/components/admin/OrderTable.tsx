"use client";

import { useState } from "react";
import {
  Ban,
  Check,
  CircleDollarSign,
  MapPin,
  Mail,
  PackageCheck,
  Phone,
  Receipt,
  ShoppingBag,
  UserCheck,
} from "lucide-react";

import { nombreSucursal } from "@/app/lib/branches";
import { TAX_CONDITIONS, esCondicionIva } from "@/app/lib/checkout";
import {
  METODO_MERCADOPAGO,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/app/lib/paymentConfig";
import { actualizarEstadoPedido } from "@/app/admin/pedidos/actions";

import ConfirmDialog from "./ConfirmDialog";
import Modal from "./Modal";
import {
  btnDanger,
  btnGhost,
  btnPrimary,
  btnSecondary,
  cardClass,
  formatARS,
  formatDate,
} from "./ui";
import {
  FLUJO_DE_ESTADOS,
  ORDER_STATUS,
  esEstadoCobrado,
  puedePasarA,
  statusMeta,
  type OrderStatus,
} from "./orderStatus";

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
  /** DNI o CUIT de facturacion, solo digitos. Null en pedidos viejos. */
  customerTaxId: string | null;
  /** Clave de TAX_CONDITIONS. Null en pedidos viejos. */
  customerTaxCondition: string | null;
  pickupFirstName: string | null;
  pickupLastName: string | null;
  pickupDni: string | null;
  status: string;
  totalAmount: number;
  /** Id de la sucursal donde retira; null en pedidos previos al retiro. */
  pickupBranch: string | null;
  /** "mercadopago" | "transferencia". */
  paymentMethod: string;
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

/** "20123456786" -> "20-12345678-6"; un DNI queda con puntos. */
function formatDocumento(digitos: string) {
  if (digitos.length === 11) {
    return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
  }
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Un dato del detalle: etiqueta chica arriba, valor abajo. */
function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold tracking-wide text-stone-400">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm text-stone-800">{children}</dd>
    </div>
  );
}

/**
 * Lo que dispara cada boton de estado del modal.
 *
 * Que boton aparece lo decide TRANSICIONES_MANUALES (via puedePasarA); aca
 * solo vive como se ve y que dice la confirmacion. El orden de las claves es
 * el orden de los botones: el avance primero, cancelar al final.
 */
const ACCIONES_DE_ESTADO = {
  paid: {
    boton: "Marcar como pagado",
    icono: CircleDollarSign,
    className: btnPrimary,
    titulo: "Marcar el pedido como pagado",
    confirmar: "Sí, está pagado",
    tono: "default",
  },
  ready_for_pickup: {
    boton: "Marcar listo para retirar",
    icono: PackageCheck,
    className: btnPrimary,
    titulo: "Pedido listo para retirar",
    confirmar: "Sí, está listo",
    tono: "default",
  },
  delivered: {
    boton: "Marcar como entregado",
    icono: UserCheck,
    className: btnPrimary,
    titulo: "Entregar el pedido",
    confirmar: "Sí, lo retiró",
    tono: "default",
  },
  cancelled: {
    boton: "Cancelar pedido",
    icono: Ban,
    className: btnDanger,
    titulo: "Cancelar el pedido",
    confirmar: "Sí, cancelar",
    tono: "danger",
  },
} as const satisfies Partial<Record<OrderStatus, unknown>>;

type AccionDeEstado = keyof typeof ACCIONES_DE_ESTADO;

/** El texto de confirmacion: lo que va a pasar con el stock, sin sorpresas. */
function mensajeConfirmacion(accion: AccionDeEstado, pedido: OrderRow) {
  switch (accion) {
    case "paid":
      return (
        <>
          <p>
            Se va a <strong>descontar del stock</strong> la mercadería del
            pedido y va a quedar pendiente de preparar.
          </p>
          {pedido.paymentMethod === METODO_MERCADOPAGO && (
            <p className="mt-2 font-semibold text-stone-700">
              Este pedido es de Mercado Pago, que lo acredita solo cuando entra
              el pago. Marcalo a mano solo si confirmaste el cobro.
            </p>
          )}
        </>
      );

    case "ready_for_pickup":
      return (
        <p>
          El pedido queda preparado en{" "}
          <strong>{nombreSucursal(pedido.pickupBranch)}</strong>, esperando que
          el cliente lo pase a buscar. El stock no cambia.
        </p>
      );

    case "delivered":
      return (
        <>
          <p>Confirmá que el pedido se entregó en el mostrador.</p>
          {pedido.pickupDni && (
            <p className="mt-2">
              Tiene que retirarlo{" "}
              <strong>
                {pedido.pickupFirstName} {pedido.pickupLastName}
              </strong>
              , DNI{" "}
              <strong className="font-mono">
                {formatDocumento(pedido.pickupDni)}
              </strong>
              .
            </p>
          )}
          <p className="mt-2">Es un estado final: después no se puede cambiar.</p>
        </>
      );

    case "cancelled":
      return esEstadoCobrado(pedido.status) ? (
        <p>
          El pedido ya estaba pagado. Se va a cancelar, pero{" "}
          <strong>el stock no se repone solo</strong>: si la mercadería vuelve
          al depósito, ajustalo desde Productos. La devolución del dinero se
          hace aparte.
        </p>
      ) : (
        <p>
          El pedido se va a cancelar. El stock no se toca: todavía no se había
          descontado.
        </p>
      );
  }
}

/**
 * Estado actual y botones para avanzarlo. Va arriba de todo en el detalle,
 * y no en el pie del modal, para que sea lo primero que se ve al abrirlo.
 */
function PanelDeEstado({
  pedido,
  acciones,
  onAccion,
}: {
  pedido: OrderRow;
  acciones: AccionDeEstado[];
  onAccion: (accion: AccionDeEstado) => void;
}) {
  const cancelado = pedido.status === "cancelled";
  const pasoActual = FLUJO_DE_ESTADOS.indexOf(pedido.status as OrderStatus);

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold tracking-wide text-stone-500">
          Estado del pedido
        </h3>
        <p className="text-[11px] tracking-wide text-stone-400">
          Pago:{" "}
          {PAYMENT_METHODS[pedido.paymentMethod as PaymentMethod]?.label ??
            pedido.paymentMethod}
        </p>
      </div>

      {/* Linea de tiempo del retiro. Un cancelado no la recorre: se muestra
          el aviso en su lugar. */}
      {cancelado ? (
        <p className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <Ban className="h-4 w-4 shrink-0" />
          Pedido cancelado. No admite más cambios.
        </p>
      ) : (
        <ol className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
          {FLUJO_DE_ESTADOS.map((estado, i) => {
            const hecho = pasoActual >= 0 && i < pasoActual;
            const actual = i === pasoActual;
            return (
              <li
                key={estado}
                aria-current={actual ? "step" : undefined}
                className="flex items-center gap-2"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                    actual
                      ? "border-[#8B5A2B] bg-[#8B5A2B] text-white"
                      : hecho
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-stone-300 bg-white text-stone-400"
                  }`}
                >
                  {hecho ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span
                  className={`text-xs leading-tight ${
                    actual
                      ? "font-semibold text-stone-900"
                      : hecho
                        ? "text-stone-600"
                        : "text-stone-400"
                  }`}
                >
                  {ORDER_STATUS[estado].label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-3 text-xs text-stone-500">
        {statusMeta(pedido.status).hint}
      </p>

      {pedido.mpPreferenceId && (
        <p className="mt-1 break-all font-mono text-[11px] text-stone-400">
          Mercado Pago: {pedido.mpPreferenceId}
        </p>
      )}

      {/* Solo los cambios que el servidor va a aceptar desde el estado
          actual. */}
      {acciones.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-stone-100 pt-4 sm:flex-row sm:flex-wrap">
          {acciones.map((destino) => {
            const meta = ACCIONES_DE_ESTADO[destino];
            const Icono = meta.icono;
            return (
              <button
                key={destino}
                type="button"
                onClick={() => onAccion(destino)}
                className={`${meta.className} ${
                  destino === "cancelled" ? "sm:ml-auto" : ""
                }`}
              >
                <Icono className="h-3.5 w-3.5" />
                {meta.boton}
              </button>
            );
          })}
        </div>
      ) : (
        pedido.status === "delivered" && (
          <p className="mt-4 border-t border-stone-100 pt-4 text-xs text-stone-400">
            Pedido entregado: es un estado final.
          </p>
        )
      )}
    </section>
  );
}

export default function OrderTable({ rows }: { rows: OrderRow[] }) {
  /* Se guarda el id y no la fila: al cambiar el estado, revalidatePath trae
     `rows` nuevas y el modal abierto se actualiza con ellas. Con una copia de
     la fila seguiria mostrando el estado viejo. */
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = rows.find((row) => row.id === detailId) ?? null;
  const [accion, setAccion] = useState<AccionDeEstado | null>(null);

  const setDetail = (row: OrderRow | null) => {
    setDetailId(row?.id ?? null);
    /* Una confirmacion a medio abrir no puede reaparecer en otro pedido. */
    setAccion(null);
  };

  const accionesDisponibles = detail
    ? (Object.keys(ACCIONES_DE_ESTADO) as AccionDeEstado[]).filter((destino) =>
        puedePasarA(detail.status, destino),
      )
    : [];

  const condicionIva = detail?.customerTaxCondition
    ? esCondicionIva(detail.customerTaxCondition)
      ? TAX_CONDITIONS[detail.customerTaxCondition]
      : detail.customerTaxCondition
    : null;

  /* Mismo DNI, o el DNI que va adentro del CUIL de una persona. */
  const retiraElComprador =
    detail?.pickupDni != null &&
    detail.customerTaxId != null &&
    (detail.customerTaxId === detail.pickupDni ||
      (detail.customerTaxId.length === 11 &&
        detail.customerTaxId.slice(2, 10).replace(/^0+/, "") ===
          detail.pickupDni));

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
        /* Con la confirmacion encima, Escape tiene que cerrar solo esa. */
        dismissible={accion === null}
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
            <PanelDeEstado
              pedido={detail}
              acciones={accionesDisponibles}
              onAccion={setAccion}
            />

            {/* Facturacion: a nombre de quien sale la factura */}
            <section>
              <h3 className="mb-3 text-[11px] font-semibold tracking-wide text-stone-500">
                Datos de facturación
              </h3>
              <div className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="text-base font-semibold text-stone-900">
                  {detail.customerName}
                </p>
                <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Dato
                    label={
                      detail.customerTaxId?.length === 11 ? "CUIT" : "DNI / CUIT"
                    }
                  >
                    {detail.customerTaxId ? (
                      <span className="font-mono">
                        {formatDocumento(detail.customerTaxId)}
                      </span>
                    ) : (
                      <span className="text-stone-400">Sin cargar</span>
                    )}
                  </Dato>
                  <Dato label="Condición frente al IVA">
                    {condicionIva ?? (
                      <span className="text-stone-400">Sin cargar</span>
                    )}
                  </Dato>
                  <Dato label="Email">
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                      <span className="truncate">
                        {detail.customerEmail || "—"}
                      </span>
                    </span>
                  </Dato>
                  <Dato label="Teléfono">
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                      {detail.customerPhone || "—"}
                    </span>
                  </Dato>
                </dl>
              </div>
            </section>

            {/* Retiro: lo que se chequea en el mostrador */}
            <section>
              <h3 className="mb-3 text-[11px] font-semibold tracking-wide text-stone-500">
                Retiro
              </h3>
              <div className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-800">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-800" />
                  {nombreSucursal(detail.pickupBranch)}
                </p>
                {detail.pickupDni ? (
                  <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Dato label="Quién retira">
                      {detail.pickupFirstName} {detail.pickupLastName}
                      {retiraElComprador && (
                        <span className="ml-1.5 text-xs text-stone-400">
                          (el mismo comprador)
                        </span>
                      )}
                    </Dato>
                    <Dato label="DNI">
                      <span className="font-mono">
                        {formatDocumento(detail.pickupDni)}
                      </span>
                    </Dato>
                  </dl>
                ) : (
                  <p className="mt-2 text-xs text-stone-400">
                    Pedido anterior a la carga de quién retira.
                  </p>
                )}
              </div>
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

      {/* layer "top": se apila sobre el detalle, que queda abierto detras
          y se refresca solo con el estado nuevo. */}
      {detail && accion && (
        <ConfirmDialog
          open
          layer="top"
          onClose={() => setAccion(null)}
          title={ACCIONES_DE_ESTADO[accion].titulo}
          message={mensajeConfirmacion(accion, detail)}
          confirmLabel={ACCIONES_DE_ESTADO[accion].confirmar}
          cancelLabel="Volver"
          tone={ACCIONES_DE_ESTADO[accion].tono}
          onConfirm={async () => {
            /* Un throw (sesion vencida, red caida) dejaria el dialogo
               trabado en "cargando": se convierte en mensaje. */
            try {
              const result = await actualizarEstadoPedido(detail.id, accion);
              return result.error;
            } catch {
              return "No se pudo actualizar el pedido. Revisá la sesión y probá de nuevo.";
            }
          }}
        />
      )}
    </>
  );
}
