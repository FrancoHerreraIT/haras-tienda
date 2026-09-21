/**
 * El aviso de "pedido entregado". Corre **solo** en el servidor.
 *
 * Es el mail que cierra la compra: lo dispara el Server Action de
 * /admin/pedidos cuando el pedido pasa a `delivered`, o sea cuando la
 * mercaderia ya salio del mostrador y la persona se fue con la bolsa.
 *
 * A diferencia de los otros tres avisos, este no promete nada ni pide nada.
 * "Pedido recibido" deja pendiente la transferencia, "pago exitoso" deja
 * pendiente la preparacion y "listo para retirar" deja pendiente el retiro:
 * los tres cierran con un proximo paso. Aca la historia termina, asi que el
 * cuerpo es corto — se agradece, queda la constancia de lo que se llevo y se
 * dice como reclamar si algo no estaba bien.
 *
 * `delivered` es un estado final (ver TRANSICIONES_MANUALES): no se puede
 * volver atras, asi que el mail sale una sola vez por pedido. Lo que lo
 * garantiza no esta aca sino en el Server Action, que solo notifica cuando la
 * transaccion devolvio "actualizado" — un segundo click sobre un pedido ya
 * entregado cae en "sin_cambios" y no manda nada.
 *
 * Igual que paidEmail y pickupEmail: se llama despues de que la transaccion
 * cerro (esperar a un SMTP con el lock de la fila tomado bloquea el pedido) y
 * nunca lanza (el pedido ya se entrego; un SMTP caido no puede hacer que el
 * admin vea un error sobre algo que si paso).
 */
import { prisma } from "@/app/lib/prisma";
import { enviarMail } from "@/app/lib/mail";
import { nombreSucursal } from "@/app/lib/branches";
import { STORE_CONTACT } from "@/app/lib/contacto";
import {
  bloqueDestacado,
  detalleHtml,
  detalleTexto,
  envolverMail,
  FIRMA_TEXTO,
} from "@/app/lib/emailLayout";
import {
  COLORES_MAIL,
  desgloseDelPedido,
  escaparHtml,
  FUENTE_MAIL,
  numeroDePedido,
  type LineaDeMail,
} from "@/app/lib/orderEmail";
import { ESTADO_ENTREGADO } from "@/app/lib/orders";

export interface DatosMailPedidoEntregado {
  orderId: string;
  customerName: string;
  /** Lo que se cobro, con el descuento aplicado. Va como constancia. */
  total: number;
  pickupBranch: string | null;
  items: LineaDeMail[];
}

/** El pedido esta cobrado y entregado: es el comprobante de la compra. */
const ROTULO_TOTAL = "Total pagado";

export function armarMailPedidoEntregado(datos: DatosMailPedidoEntregado) {
  const numero = numeroDePedido(datos.orderId);
  const sucursal = nombreSucursal(datos.pickupBranch);
  const c = COLORES_MAIL;

  /* Igual que en los otros dos: de la orden guardada solo sale el total, el
     subtotal se rearma sumando las lineas y el descuento es la diferencia.
     Este es el mail que el comprador archiva, asi que el desglose importa. */
  const desglose = desgloseDelPedido(datos.items, datos.total);

  const text = [
    `Hola ${datos.customerName},`,
    "",
    `Confirmamos que retiraste tu pedido #${numero} por ${sucursal}. ¡Gracias por elegirnos!`,
    "",
    ...detalleTexto({ items: datos.items, desglose, totalLabel: ROTULO_TOTAL }),
    "",
    "Guardá este mail: es la constancia de tu compra.",
    "",
    `Si algo no estaba como esperabas, escribinos a ${STORE_CONTACT.email} o por WhatsApp al ${STORE_CONTACT.whatsapp.display} y lo resolvemos.`,
    "",
    ...FIRMA_TEXTO,
  ].join("\n");

  const html = envolverMail({
    titulo: "¡Gracias por tu compra!",
    intro: `Hola ${escaparHtml(datos.customerName)}, confirmamos que retiraste tu pedido
                  <strong>#${numero}</strong>. Gracias por elegirnos.`,
    contenido: `${bloqueDestacado(
      "RETIRADO EN",
      `<p style="margin:0;font-family:${FUENTE_MAIL};font-size:15px;line-height:1.6;color:${c.texto};">${escaparHtml(sucursal)}</p>
          <p style="margin:8px 0 0;font-family:${FUENTE_MAIL};font-size:14px;line-height:1.6;color:${c.secundario};">
            Guardá este mail: es la constancia de tu compra.
          </p>`,
    )}

                <div style="margin-top:28px;">
                  ${detalleHtml({
                    items: datos.items,
                    desglose,
                    totalLabel: ROTULO_TOTAL,
                  })}
                </div>

                <p style="margin:20px 0 0;padding-top:16px;border-top:1px solid ${c.borde};font-family:${FUENTE_MAIL};font-size:14px;line-height:1.6;color:${c.secundario};">
                  ¿Algo no estaba como esperabas? Escribinos a
                  <a href="mailto:${STORE_CONTACT.email}" style="color:${c.marca};">${escaparHtml(STORE_CONTACT.email)}</a>
                  o por WhatsApp al
                  <a href="${STORE_CONTACT.whatsapp.url}" style="color:${c.marca};">${escaparHtml(STORE_CONTACT.whatsapp.display)}</a>
                  y lo resolvemos.
                </p>`,
  });

  return {
    subject: `¡Gracias por tu compra! — pedido #${numero}`,
    text,
    html,
  };
}

/**
 * Manda el aviso de pedido entregado.
 *
 * Nunca lanza, por el mismo motivo que los otros dos: el pedido ya quedo en
 * `delivered` y devolverle un error al admin por un SMTP caido lo llevaria a
 * apretar el boton de nuevo sobre algo que si se hizo — y como `delivered` es
 * final, el segundo intento ni siquiera lo dejaria reintentar el mail. Lo que
 * no salio queda anotado en el historial del pedido.
 *
 * Devuelve si el mail efectivamente salio.
 */
export async function notificarPedidoEntregado(
  orderId: string,
): Promise<boolean> {
  try {
    const orden = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        totalAmount: true,
        pickupBranch: true,
        items: {
          select: {
            quantity: true,
            priceAtPurchase: true,
            product: { select: { title: true } },
          },
        },
      },
    });

    if (!orden) {
      console.error("[mail entregado] no existe el pedido a notificar", {
        orderId,
      });
      return false;
    }

    const mail = armarMailPedidoEntregado({
      orderId: orden.id,
      customerName: orden.customerName,
      total: Number(orden.totalAmount),
      pickupBranch: orden.pickupBranch,
      items: orden.items.map((item) => ({
        title: item.product.title,
        quantity: item.quantity,
        priceAtPurchase: Number(item.priceAtPurchase),
      })),
    });

    const enviado = await enviarMail({ to: orden.customerEmail, ...mail });

    if (!enviado) {
      await prisma.orderStatusLog
        .create({
          data: {
            orderId: orden.id,
            status: ESTADO_ENTREGADO,
            notes:
              "No se pudo enviar el mail de pedido entregado. " +
              "Avisarle al cliente a mano.",
          },
        })
        .catch((e) => {
          console.error(
            "[mail entregado] no se pudo anotar el fallo del mail",
            e,
          );
        });
    }

    return enviado;
  } catch (e) {
    /* Ni siquiera se llego a intentar (base caida, timeout). El pedido esta
       entregado igual: esto es solo el aviso de cortesia. */
    console.error("[mail entregado] no se pudo notificar la entrega", {
      orderId,
      e,
    });
    return false;
  }
}
