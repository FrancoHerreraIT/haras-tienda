/**
 * Reglas de los pedidos compartidas entre el checkout y el webhook de pagos.
 *
 * Los dos endpoints escriben la misma tabla; si cada uno tuviera su propia
 * copia de los estados, alcanzaria con que uno escriba "PAID" y el otro
 * busque "paid" para que la idempotencia deje de funcionar en silencio.
 */
import type { OrderStatus } from "@/components/admin/orderStatus";

/* Los valores salen de src/components/admin/orderStatus.ts: el tipo
   `OrderStatus` obliga a que sigan siendo los que el panel sabe pintar. Un
   estado que no este ahi se muestra como "Estado no reconocido". */
export const ESTADO_PENDIENTE: OrderStatus = "pending";
export const ESTADO_PAGADO: OrderStatus = "paid";
export const ESTADO_LISTO_PARA_RETIRAR: OrderStatus = "ready_for_pickup";
export const ESTADO_ENTREGADO: OrderStatus = "delivered";
export const ESTADO_CANCELADO: OrderStatus = "cancelled";

/**
 * Datos del comprador cuando todavia no se conocen.
 *
 * Checkout Pro lo identifica del lado de Mercado Pago, asi que la orden nace
 * sin nombre y el webhook la completa con `payment.payer`.
 */
export const CLIENTE_SIN_IDENTIFICAR = {
  customerName: "Sin identificar",
  customerEmail: "",
  customerPhone: "",
} as const;

/**
 * Si un campo de contacto sigue teniendo el valor temporal.
 *
 * Sirve para que el webhook no pise datos buenos: si el formulario del
 * checkout ya mando el mail que el cliente escribio, ese gana sobre el de la
 * cuenta de Mercado Pago (pueden ser distintos).
 */
export function esContactoSinCompletar(
  valor: string | null | undefined,
  placeholder: string,
): boolean {
  const limpio = valor?.trim() ?? "";
  return limpio === "" || limpio === placeholder;
}

/* Convencion de StockMovement, que este proyecto estrena con la primera
   venta: `type` dice para donde va la mercaderia, `reason` por que se movio y
   `referenceId` contra que documento (el Order.id). */
export const MOVIMIENTO_SALIDA = "out";
export const MOTIVO_VENTA = "venta";

/**
 * Traduce el `status` de un pago de Mercado Pago al estado de nuestra orden.
 *
 * Devuelve null si MP manda un estado que no conocemos: en ese caso no se
 * toca nada y queda en el log, porque adivinar el estado de un pago es la
 * clase de error que termina despachando mercaderia no cobrada.
 *
 * @see https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/notifications/webhooks
 */
export function estadoDesdePago(
  statusPago: string | undefined | null,
): OrderStatus | null {
  switch (statusPago) {
    case "approved":
      return ESTADO_PAGADO;

    /* `authorized` es plata retenida pero NO acreditada: hasta que se capture
       sigue siendo un pendiente, no una venta. */
    case "authorized":
    case "pending":
    case "in_process":
    case "in_mediation":
      return ESTADO_PENDIENTE;

    /* `refunded` y `charged_back` llegan despues de un pago acreditado: la
       plata se fue. El pedido se cancela, pero el stock NO vuelve solo (ver
       el comentario en el webhook). */
    case "rejected":
    case "cancelled":
    case "refunded":
    case "charged_back":
      return ESTADO_CANCELADO;

    default:
      return null;
  }
}
