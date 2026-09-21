"use server";

/**
 * Cambios de estado de un pedido hechos a mano desde el panel.
 *
 * Recorre el ciclo de retiro en sucursal: pendiente -> pagado -> listo para
 * retirar -> entregado, con la cancelacion posible antes de entregar. Las
 * transiciones validas estan en TRANSICIONES_MANUALES (orderStatus.ts).
 *
 * El pase a pagado a mano es el caso de la transferencia: no hay webhook que
 * avise, asi que es el dueno el que mira el comprobante.
 *
 * Marcar como pagado mueve mercaderia, y por eso sigue las mismas reglas que
 * el webhook de Mercado Pago:
 *  - Estado y stock van en una sola transaccion: o cambia todo o nada.
 *  - El pase a pagado es un update condicional contra el estado leido: si
 *    entre la lectura y la escritura el webhook (u otra pestaña del panel) ya
 *    lo movio, el update no encuentra la fila y el stock no se toca.
 *  - El descuento sale de lib/stock, el mismo codigo que usa el webhook.
 *
 * Del panel salen tres de los cuatro mails de la tienda, uno por cada paso
 * que el cliente esta esperando:
 *  - `paid` -> "¡Pago exitoso!" (lib/paidEmail), el mismo que manda el
 *    webhook de Mercado Pago. Aca es el cierre del flujo de transferencia: el
 *    cliente transfirio a ciegas y este es el mail que le dice que la plata
 *    llego. Por eso se manda aunque el webhook use la misma plantilla — los
 *    dos caminos son excluyentes, una orden se acredita por uno o por otro.
 *  - `ready_for_pickup` -> "¡Tu pedido está listo!" (lib/pickupEmail).
 *  - `delivered` -> "¡Gracias por tu compra!" (lib/deliveredEmail), el que
 *    cierra la compra con la constancia de lo que se llevo.
 * Los ultimos dos solo pueden salir de aca: no hay nada automatico que sepa
 * que el pedido esta armado en el mostrador, ni que la persona ya se lo
 * llevo. El cuarto, "pedido recibido" con el alias, sale al crear la orden
 * (checkout/actions.ts). Cancelado no manda nada: quien cancela ya se entero
 * por donde venia hablando.
 */
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/app/lib/prisma";
import {
  ESTADO_CANCELADO,
  ESTADO_ENTREGADO,
  ESTADO_LISTO_PARA_RETIRAR,
  ESTADO_PAGADO,
} from "@/app/lib/orders";
import {
  StockInsuficienteError,
  descontarStockDelPedido,
} from "@/app/lib/stock";
import { notificarPedidoEntregado } from "@/app/lib/deliveredEmail";
import { notificarPagoConfirmado } from "@/app/lib/paidEmail";
import { notificarPedidoListo } from "@/app/lib/pickupEmail";
import {
  TRANSICIONES_MANUALES,
  esEstadoCobrado,
  puedePasarA,
  statusMeta,
} from "@/components/admin/orderStatus";

export type ActionResult = { error?: string };

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("No autorizado");
  }
  return session;
}

/* Las transiciones permitidas viven en TRANSICIONES_MANUALES
   (components/admin/orderStatus), junto a los estados: el modal las usa para
   decidir que botones mostrar y aca se hacen cumplir. */
const esDestinoManual = (valor: unknown): valor is string =>
  typeof valor === "string" &&
  Object.prototype.hasOwnProperty.call(TRANSICIONES_MANUALES, valor);

type Resultado =
  | { tipo: "actualizado" }
  | { tipo: "sin_cambios" }
  | { tipo: "no_existe" }
  | { tipo: "transicion_invalida"; actual: string }
  | { tipo: "carrera" };

function revalidarPedidos() {
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  /* Pagar descuenta stock: la grilla de productos tiene que mostrarlo. */
  revalidatePath("/admin/productos");
}

export async function actualizarEstadoPedido(
  orderId: string,
  nuevoEstado: string,
): Promise<ActionResult> {
  const session = await requireAdmin();

  /* Los argumentos de un Server Action viajan por la red: el tipo no
     garantiza nada en runtime. */
  if (typeof orderId !== "string" || orderId.trim() === "") {
    return { error: "Pedido inválido." };
  }

  if (!esDestinoManual(nuevoEstado)) {
    return { error: "Ese estado no se puede asignar desde el panel." };
  }

  const quien = session.user?.email
    ? `El administrador (${session.user.email})`
    : "El administrador";

  let resultado: Resultado;

  try {
    resultado = await prisma.$transaction(async (tx): Promise<Resultado> => {
      const orden = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          status: true,
          items: { select: { productId: true, quantity: true } },
        },
      });

      if (!orden) return { tipo: "no_existe" };

      /* Doble click, o dos pestañas: ya esta donde el admin lo queria. No se
         repite el log y, sobre todo, no se vuelve a descontar stock. */
      if (orden.status === nuevoEstado) return { tipo: "sin_cambios" };

      if (!puedePasarA(orden.status, nuevoEstado)) {
        return { tipo: "transicion_invalida", actual: orden.status };
      }

      /* La idempotencia real esta aca y no en el `if` de arriba: el update
         solo pisa la fila si sigue en el estado que se leyo. Si el webhook
         la acredito en el medio, Postgres re-evalua el WHERE al soltar el
         lock, count da 0 y se sale sin tocar stock. */
      const marcada = await tx.order.updateMany({
        where: { id: orderId, status: orden.status },
        data: { status: nuevoEstado },
      });

      if (marcada.count === 0) return { tipo: "carrera" };

      let notas = `${quien} actualizó el pedido a ${statusMeta(nuevoEstado).label}.`;

      /* Solo el pase a pagado mueve mercaderia. Listo para retirar y
         entregado son pasos de logistica: el stock ya salio al cobrar. */
      if (nuevoEstado === ESTADO_PAGADO) {
        const descontado = await descontarStockDelPedido(
          tx,
          orderId,
          orden.items,
        );
        notas += descontado
          ? " Se descontó el stock de los productos."
          : " El stock ya se había descontado antes para este pedido: no se volvió a descontar.";
      } else if (
        nuevoEstado === ESTADO_CANCELADO &&
        esEstadoCobrado(orden.status)
      ) {
        notas +=
          " El stock NO se repuso: si la mercadería vuelve al depósito, ajustalo a mano.";
      }

      await tx.orderStatusLog.create({
        data: { orderId, status: nuevoEstado, notes: notas },
      });

      return { tipo: "actualizado" };
    });
  } catch (e) {
    if (e instanceof StockInsuficienteError) {
      /* La transaccion volvio atras: el pedido sigue pendiente y ningun
         producto perdio unidades. A diferencia del webhook, aca hay una
         persona mirando: se le explica y decide (cargar stock o cancelar). */
      const producto = await prisma.product
        .findUnique({
          where: { id: e.productId },
          select: { title: true, stock: true },
        })
        .catch(() => null);

      return {
        error: producto
          ? `No hay stock suficiente de "${producto.title}": el pedido lleva ${e.pedido} y quedan ${producto.stock}. Actualizá el stock o cancelá el pedido.`
          : "Uno de los productos del pedido no tiene stock suficiente.",
      };
    }

    console.error("[admin pedidos] no se pudo actualizar el estado", {
      orderId,
      nuevoEstado,
      e,
    });
    return { error: "No se pudo actualizar el pedido. Intentá de nuevo." };
  }

  switch (resultado.tipo) {
    case "no_existe":
      return { error: "El pedido ya no existe." };

    case "transicion_invalida":
      revalidarPedidos();
      return {
        error: `Un pedido ${statusMeta(resultado.actual).label.toLowerCase()} no se puede pasar a ${statusMeta(nuevoEstado).label.toLowerCase()}.`,
      };

    case "carrera":
      /* Se revalida igual: el panel tiene que mostrar el estado nuevo. */
      revalidarPedidos();
      return {
        error:
          "El pedido cambió de estado mientras lo actualizabas (puede haber llegado el pago de Mercado Pago). Revisalo y probá de nuevo.",
      };

    case "sin_cambios":
      revalidarPedidos();
      return {};

    case "actualizado":
      /* Los avisos al cliente van despues de que la transaccion cerro:
         esperar a un SMTP con el lock de la fila tomado bloquea el pedido
         para el webhook. Y solo en "actualizado", nunca en "sin_cambios":
         ese es el doble click del admin sobre un pedido que ya estaba en ese
         estado, y el mail correspondiente ya salio. Repetirlo seria avisar
         dos veces del mismo pago, o mandar a la sucursal a alguien que quizas
         ya retiro.

         Ninguna de las tres funciones lanza: si el correo no sale, el pedido
         igual quedo pagado/preparado/entregado y el fallo queda en el
         historial. Lo contrario (devolverle un error al admin por algo que si
         se hizo) lo llevaria a apretar el boton de nuevo.

         `delivered` es estado final: ese mail se manda una sola vez y no hay
         reintento posible desde el panel, porque el pedido ya no se puede
         volver a mover. */
      if (nuevoEstado === ESTADO_PAGADO) {
        await notificarPagoConfirmado(orderId);
      } else if (nuevoEstado === ESTADO_LISTO_PARA_RETIRAR) {
        await notificarPedidoListo(orderId);
      } else if (nuevoEstado === ESTADO_ENTREGADO) {
        await notificarPedidoEntregado(orderId);
      }

      revalidarPedidos();
      return {};
  }
}
