/**
 * Estados posibles de un pedido y como se pintan en el panel.
 *
 * La tienda no hace envios: todo se retira en sucursal. Por eso despues de
 * "Pagado" viene "Listo para retirar" y no un "Enviado".
 *
 * El orden de las claves es el del ciclo de vida: las tarjetas de resumen de
 * /admin/pedidos se pintan en este orden.
 */
export const ORDER_STATUS = {
  pending: {
    label: "Pendiente",
    className: "bg-amber-50 text-amber-800 border-amber-200",
    hint: "Esperando confirmación de pago.",
  },
  paid: {
    label: "Pagado",
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
    hint: "Pago acreditado, falta preparar el pedido.",
  },
  ready_for_pickup: {
    label: "Listo para retirar",
    className: "bg-sky-50 text-sky-800 border-sky-200",
    hint: "Preparado en la sucursal, esperando al cliente.",
  },
  delivered: {
    label: "Entregado",
    className: "bg-stone-800 text-stone-50 border-stone-800",
    hint: "Retirado por el cliente.",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-red-50 text-red-700 border-red-200",
    hint: "Anulado antes de completarse.",
  },
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS;

/** El camino feliz de un pedido, en orden. Cancelado queda afuera. */
export const FLUJO_DE_ESTADOS: readonly OrderStatus[] = [
  "pending",
  "paid",
  "ready_for_pickup",
  "delivered",
];

/**
 * Estados de un pedido ya cobrado, que por lo tanto ya descontó stock.
 *
 * Los usa el webhook de Mercado Pago para no "re-acreditar" un pedido que el
 * admin ya avanzo: un aviso repetido de un pago aprobado sobre un pedido
 * listo para retirar no puede volver a descontar mercaderia. Tambien entra
 * aca el panel de control, para sumar las ventas del mes.
 */
export const ESTADOS_COBRADOS: readonly OrderStatus[] = [
  "paid",
  "ready_for_pickup",
  "delivered",
];

export const esEstadoCobrado = (status: string) =>
  (ESTADOS_COBRADOS as readonly string[]).includes(status);

/**
 * Estados que el admin puede asignar a mano, y desde cuales se llega a cada
 * uno. La usan el Server Action (que la hace cumplir) y el modal del pedido
 * (que solo muestra los botones que van a funcionar).
 *
 * - Cada paso avanza de a uno: pendiente -> pagado -> listo -> entregado. No
 *   se saltea "Pagado" porque es el paso que descuenta el stock.
 * - Cancelado desde cualquier estado previo a entregado. Si ya estaba pagado
 *   el stock NO se repone: decidir si la mercaderia vuelve al deposito es
 *   trabajo de una persona (mismo criterio que el webhook con devoluciones).
 * - Entregado y cancelado son finales.
 * - Pagado solo desde pendiente: un cancelado que "revive" tendria que volver
 *   a reservar stock que quizas ya se vendio.
 */
export const TRANSICIONES_MANUALES: Partial<
  Record<OrderStatus, readonly OrderStatus[]>
> = {
  paid: ["pending"],
  ready_for_pickup: ["paid"],
  delivered: ["ready_for_pickup"],
  cancelled: ["pending", "paid", "ready_for_pickup"],
};

/** Si el panel puede pasar un pedido de `actual` a `destino`. */
export function puedePasarA(actual: string, destino: string): boolean {
  /* hasOwnProperty: sin esto "toString" devuelve la funcion del prototipo. */
  if (!Object.prototype.hasOwnProperty.call(TRANSICIONES_MANUALES, destino)) {
    return false;
  }
  const desde: readonly string[] =
    TRANSICIONES_MANUALES[destino as OrderStatus] ?? [];
  return desde.includes(actual);
}

export function statusMeta(status: string) {
  return (
    ORDER_STATUS[status as OrderStatus] ?? {
      label: status,
      className: "bg-stone-100 text-stone-600 border-stone-200",
      hint: "Estado no reconocido.",
    }
  );
}
