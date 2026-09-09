/** Estados posibles de un pedido y como se pintan en el panel. */
export const ORDER_STATUS = {
  pending: {
    label: "Pendiente",
    className: "bg-amber-50 text-amber-800 border-amber-200",
    hint: "Esperando confirmacion de pago.",
  },
  paid: {
    label: "Pagado",
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
    hint: "Pago acreditado, listo para preparar.",
  },
  shipped: {
    label: "Enviado",
    className: "bg-sky-50 text-sky-800 border-sky-200",
    hint: "Despachado al domicilio del cliente.",
  },
  delivered: {
    label: "Entregado",
    className: "bg-stone-800 text-stone-50 border-stone-800",
    hint: "Recibido por el cliente.",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-red-50 text-red-700 border-red-200",
    hint: "Anulado antes de completarse.",
  },
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS;

export function statusMeta(status: string) {
  return (
    ORDER_STATUS[status as OrderStatus] ?? {
      label: status,
      className: "bg-stone-100 text-stone-600 border-stone-200",
      hint: "Estado no reconocido.",
    }
  );
}
