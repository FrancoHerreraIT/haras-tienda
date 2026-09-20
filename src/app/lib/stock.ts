/**
 * Descuento de mercaderia por una venta. Corre **solo** en el servidor.
 *
 * Hay dos caminos que acreditan un pedido: el webhook de Mercado Pago y el
 * boton "Marcar como pagado" del panel (transferencias). Los dos pasan por
 * aca para que la regla sea una sola: si cada uno tuviera su copia, alcanzaria
 * con aflojar el control en uno para vender la ultima unidad dos veces.
 */
import type { Prisma } from "@prisma/client";
import { MOTIVO_VENTA, MOVIMIENTO_SALIDA } from "@/app/lib/orders";

/**
 * Corta la transaccion cuando un producto no tiene stock para cubrir la
 * venta. Hace rollback del descuento parcial: o baja todo, o no baja nada.
 */
export class StockInsuficienteError extends Error {
  constructor(
    readonly productId: string,
    readonly pedido: number,
  ) {
    super(`Sin stock para el producto ${productId} (faltan ${pedido} u.)`);
    this.name = "StockInsuficienteError";
  }
}

/**
 * Baja el stock de cada linea del pedido y deja el StockMovement de salida.
 *
 * Tiene que llamarse **dentro** de un `prisma.$transaction`, despues de haber
 * pasado el pedido a pagado con un update condicional. Ese update toma el
 * lock de la fila del pedido, asi que dos acreditaciones del mismo pedido no
 * llegan nunca juntas hasta aca: la segunda espera a que la primera confirme.
 *
 * Aun asi se chequea si el pedido ya tiene su salida por venta. El estado
 * solo no alcanza: un pedido pagado, cancelado por el admin y despues
 * "aprobado" otra vez por un aviso repetido de Mercado Pago vuelve a pasar
 * por aca, y la mercaderia ya se desconto la primera vez.
 *
 * Devuelve false si no desconto nada porque ya estaba descontado. Si falta
 * stock tira StockInsuficienteError y la transaccion entera vuelve atras.
 */
export async function descontarStockDelPedido(
  tx: Prisma.TransactionClient,
  orderId: string,
  items: ReadonlyArray<{ productId: string; quantity: number }>,
): Promise<boolean> {
  /* Con el lock del pedido tomado, esta lectura ya ve lo que haya confirmado
     cualquier otra transaccion sobre el mismo pedido. */
  const salidasPrevias = await tx.stockMovement.count({
    where: {
      referenceId: orderId,
      type: MOVIMIENTO_SALIDA,
      reason: MOTIVO_VENTA,
    },
  });

  if (salidasPrevias > 0) return false;

  for (const item of items) {
    /* El `gte` hace el control de stock y el descuento en una sola
       sentencia: entre un `findUnique` y un `update` separados entra otra
       venta y los dos pedidos se llevan la ultima unidad. */
    const descontado = await tx.product.updateMany({
      where: { id: item.productId, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });

    if (descontado.count === 0) {
      throw new StockInsuficienteError(item.productId, item.quantity);
    }

    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        type: MOVIMIENTO_SALIDA,
        quantity: item.quantity,
        reason: MOTIVO_VENTA,
        /* Contra que documento se movio: el pedido que lo consumio. */
        referenceId: orderId,
      },
    });
  }

  return true;
}
