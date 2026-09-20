"use server";

/**
 * Confirmacion del pedido por transferencia bancaria.
 *
 * A diferencia de Mercado Pago no hay pasarela ni webhook: la orden nace
 * `pending` y se queda ahi hasta que alguien de la tienda mira el comprobante
 * y la marca `paid` desde el panel.
 *
 * Son tres los mails de este flujo, y mandan cosas distintas:
 *  1. Este, al crear la orden: "pedido recibido". Le deja por escrito el
 *     numero de pedido, el monto con el descuento ya aplicado y el alias. Sin
 *     el, el que cierra la pestaña de confirmacion sin anotar el numero se
 *     queda sin la referencia para transferir.
 *  2. El de "¡Pago exitoso!" (lib/paidEmail), que sale desde el panel cuando
 *     el dueno da por buena la transferencia y la orden pasa a `paid`.
 *  3. El de "listo para retirar" (lib/pickupEmail), tambien desde el panel,
 *     cuando el pedido queda preparado en la sucursal.
 *
 * Por eso este mail habla de un pedido *reservado*, no confirmado: el titulo
 * y el cuerpo tienen que dejar claro que todavia falta transferir, y que el
 * aviso del cobro llega despues.
 *
 * Tres reglas del flujo:
 *  1. El precio lo pone la base, no el navegador (ver lib/checkoutServer).
 *  2. El descuento tambien: pagar por transferencia lleva
 *     DESCUENTO_TRANSFERENCIA% menos, y ese porcentaje se vuelve a aplicar
 *     aca con `desglosarTotal` sobre el subtotal recalculado. Lo que el
 *     navegador mostro en el resumen no entra en la cuenta.
 *  3. Primero la orden, despues el aviso: si el mail falla, el pedido ya esta
 *     guardado y el comprador ve el alias en pantalla igual.
 */
import { prisma } from "@/app/lib/prisma";
import {
  parsearCliente,
  parsearLineas,
  resolverLineas,
  totalEnCentavos,
  type LineaResuelta,
} from "@/app/lib/checkoutServer";
import { ESTADO_PENDIENTE } from "@/app/lib/orders";
import {
  DESCUENTO_TRANSFERENCIA,
  METODO_TRANSFERENCIA,
  desglosarTotal,
} from "@/app/lib/paymentConfig";
import { nombreSucursal } from "@/app/lib/branches";
import { enviarMail } from "@/app/lib/mail";
import { formatearPesos } from "@/app/lib/orderEmail";
import { armarMailTransferencia } from "@/app/lib/transferEmail";
import type { CheckoutCustomer, CheckoutLine } from "@/app/lib/checkout";

export type ResultadoTransferencia =
  | { ok: true; orderId: string; emailEnviado: boolean }
  | { ok: false; error: string };

export async function confirmarPedidoPorTransferencia(input: {
  items: CheckoutLine[];
  customer: CheckoutCustomer;
}): Promise<ResultadoTransferencia> {
  /* El input de un Server Action viaja por la red igual que un body: se
     valida con los mismos parsers, no se confia en el tipo. */
  const pedidas = parsearLineas(input);

  if (typeof pedidas === "string") {
    return { ok: false, error: pedidas };
  }

  let lineas: LineaResuelta[];

  try {
    const resueltas = await resolverLineas(pedidas);

    if (typeof resueltas === "string") {
      return { ok: false, error: resueltas };
    }

    lineas = resueltas;
  } catch (e) {
    console.error("[transferencia] fallo la consulta de productos", e);
    return {
      ok: false,
      error: "No pudimos validar tu carrito. Intentá de nuevo.",
    };
  }

  const cliente = parsearCliente(input);

  /* Incluye el mail: es adonde va el aviso cuando el pago se acredite. */
  if (cliente.error) {
    return { ok: false, error: cliente.error };
  }

  if (!cliente.sucursal) {
    return {
      ok: false,
      error: "Elegí la sucursal donde vas a retirar el pedido.",
    };
  }

  /* El descuento se aplica aca y no se lee del navegador: el resumen del
     checkout muestra el mismo numero, pero lo que se guarda sale de recalcular
     contra los precios de la base con la misma funcion (lib/paymentConfig).
     Este flujo es siempre transferencia, asi que siempre lleva descuento; se
     pasa METODO_TRANSFERENCIA explicito igual, para que la regla quede en un
     solo lugar y no repetida como un `* 0.9` suelto. */
  const { subtotalCents, descuentoCents, totalCents } = desglosarTotal(
    totalEnCentavos(lineas),
    METODO_TRANSFERENCIA,
  );

  let orden: { id: string };

  try {
    orden = await prisma.order.create({
      data: {
        ...cliente.orden,
        status: ESTADO_PENDIENTE,
        paymentMethod: METODO_TRANSFERENCIA,
        /* El total ya viene con el descuento aplicado. Decimal se pasa como
           string para no meter un float en el medio. */
        totalAmount: (totalCents / 100).toFixed(2),
        items: {
          create: lineas.map((linea) => ({
            productId: linea.productId,
            quantity: linea.quantity,
            /* Congela el precio de lista del momento de la compra. El
               descuento NO se prorratea entre las lineas: es del pedido, y
               repartirlo dejaria precios unitarios que no coinciden con
               ningun precio publicado. Por eso la suma de los items es mayor
               que `totalAmount` en los pedidos por transferencia — el log de
               abajo deja escrita la diferencia para el que mire el panel. */
            priceAtPurchase: (linea.unitPriceCents / 100).toFixed(2),
          })),
        },
        statusLogs: {
          create: {
            status: ESTADO_PENDIENTE,
            notes:
              "Pedido confirmado por transferencia, esperando el comprobante. " +
              `Subtotal ${formatearPesos(subtotalCents / 100)}, ` +
              `descuento por transferencia (${DESCUENTO_TRANSFERENCIA}%) ` +
              `-${formatearPesos(descuentoCents / 100)}, ` +
              `total a transferir ${formatearPesos(totalCents / 100)}. ` +
              `Retira en: ${nombreSucursal(cliente.sucursal.id)}.`,
          },
        },
      },
      select: { id: true },
    });
  } catch (e) {
    /* El create anida items y log, y Prisma lo resuelve en una transaccion:
       o entra todo o no entra nada. No queda una orden a medio armar. */
    console.error("[transferencia] no se pudo crear el pedido", e);
    return {
      ok: false,
      error: "No pudimos registrar tu pedido. Intentá de nuevo.",
    };
  }

  /* El stock NO se descuenta aca: todavia no se cobro nada. Se descuenta
     cuando el pedido pasa a `paid`, igual que en el flujo de Mercado Pago, y
     recien ahi sale el mail de pago confirmado. */

  const mail = armarMailTransferencia({
    orderId: orden.id,
    customerName: cliente.orden.customerName,
    /* El mail repite el desglose entero y no solo el total: el que ve un
       importe mas bajo que lo que sumo en el carrito tiene que encontrar el
       descuento explicado, no dudar de si transfiere de mas o de menos. */
    subtotal: subtotalCents / 100,
    descuento: descuentoCents / 100,
    total: totalCents / 100,
    pickupBranch: cliente.sucursal.id,
    items: lineas.map((linea) => ({
      title: linea.title,
      quantity: linea.quantity,
      priceAtPurchase: linea.unitPriceCents / 100,
    })),
  });

  /* Si el SMTP esta caido no se pierde la venta: el pedido ya esta guardado y
     la pantalla de exito repite el numero y el alias. Solo queda anotado en el
     historial para que alguien le pase los datos a mano. */
  const emailEnviado = await enviarMail({
    to: cliente.orden.customerEmail,
    ...mail,
  });

  if (!emailEnviado) {
    await prisma.orderStatusLog
      .create({
        data: {
          orderId: orden.id,
          status: ESTADO_PENDIENTE,
          notes:
            "No se pudo enviar el mail con el numero de pedido y los datos " +
            "de transferencia. Contactar al cliente a mano.",
        },
      })
      .catch((e) => {
        console.error("[transferencia] no se pudo anotar el fallo del mail", e);
      });
  }

  return { ok: true, orderId: orden.id, emailEnviado };
}
