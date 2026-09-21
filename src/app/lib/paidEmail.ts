/**
 * El aviso de "¡Pago exitoso!". Corre **solo** en el servidor.
 *
 * Sale cuando la orden pasa a `paid`, no antes. Mientras esta pendiente no se
 * manda nada, porque un "pago exitoso" en la bandeja de entrada de alguien
 * cuyo pago todavia esta en proceso (o que todavia no transfirio) es
 * exactamente el mail que despues hay que explicar por telefono.
 *
 * Hay dos caminos que acreditan un pedido y los dos terminan aca:
 *  a) el webhook de Mercado Pago, despues de descontar el stock;
 *  b) el boton "Marcar como pagado" del panel (el caso de la transferencia,
 *     donde no hay webhook que avise y es el dueno el que mira el
 *     comprobante).
 * Son excluyentes: una orden se acredita por uno o por el otro, asi que la
 * misma plantilla en dos llamadores no duplica nada.
 *
 * Los dos llaman a `notificarPagoConfirmado` **despues** de que la transaccion
 * cerro. Mandar el mail adentro del $transaction seria tener el lock de la
 * fila tomado mientras se espera a un servidor SMTP, y un rollback posterior
 * dejaria al cliente con un aviso de un pago que la base no registro.
 *
 * Es el mail del medio del flujo: antes viene "pedido recibido" (solo en
 * transferencia, lib/transferEmail) y despues "listo para retirar"
 * (lib/pickupEmail). Por eso el cuerpo promete ese ultimo aviso y no cierra
 * la historia.
 *
 * La maqueta (logo, tarjeta, footer) y el bloque de detalle salen de
 * emailLayout.ts: son los mismos que usan los otros dos avisos.
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
import { ESTADO_PAGADO } from "@/app/lib/orders";

export interface DatosMailPagoConfirmado {
  orderId: string;
  customerName: string;
  /** Lo que efectivamente se cobro, con el descuento ya aplicado. */
  total: number;
  pickupBranch: string | null;
  items: LineaDeMail[];
}

/** Ya esta cobrado: el total es "pagado", no "a pagar". */
const ROTULO_TOTAL = "Total pagado";

export function armarMailPagoConfirmado(datos: DatosMailPagoConfirmado) {
  const numero = numeroDePedido(datos.orderId);
  const sucursal = nombreSucursal(datos.pickupBranch);
  const c = COLORES_MAIL;

  /* De la orden guardada solo sale el total: el subtotal se rearma sumando las
     lineas y el descuento es la diferencia. Sin esto, el que pago por
     transferencia veria aca un total mas bajo que el que sumo en el carrito y
     sin la linea que lo explica — el descuento se lee como un cobro mal hecho. */
  const desglose = desgloseDelPedido(datos.items, datos.total);

  const text = [
    `Hola ${datos.customerName},`,
    "",
    `¡Pago exitoso! Recibimos el pago de tu pedido #${numero} y ya lo estamos preparando.`,
    "",
    ...detalleTexto({ items: datos.items, desglose, totalLabel: ROTULO_TOTAL }),
    "",
    `RETIRO: ${sucursal}`,
    "Te avisamos por este mismo mail cuando esté listo para retirar. Para retirarlo alcanza con el DNI: no hace falta llevar ningún número de pedido.",
    "",
    `¿Alguna duda? Escribinos a ${STORE_CONTACT.email} o por WhatsApp al ${STORE_CONTACT.whatsapp.display}.`,
    "",
    ...FIRMA_TEXTO,
  ].join("\n");

  const parrafo = `margin:20px 0 0;font-family:${FUENTE_MAIL};font-size:14px;line-height:1.6;color:${c.secundario};`;

  const html = envolverMail({
    titulo: "¡Pago exitoso!",
    intro: `Hola ${escaparHtml(datos.customerName)}, recibimos el pago de tu pedido
                  <strong>#${numero}</strong> y ya lo estamos preparando.`,
    contenido: `${detalleHtml({
      items: datos.items,
      desglose,
      totalLabel: ROTULO_TOTAL,
    })}

                <div style="margin-top:28px;">
                  ${bloqueDestacado(
                    "RETIRÁS EN",
                    `<p style="margin:0;font-family:${FUENTE_MAIL};font-size:15px;line-height:1.6;color:${c.texto};">${escaparHtml(sucursal)}</p>
          <p style="margin:8px 0 0;font-family:${FUENTE_MAIL};font-size:14px;line-height:1.6;color:${c.secundario};">
            Te avisamos por este mismo mail cuando esté listo para retirar.
            Para retirarlo alcanza con el <strong>DNI</strong>: no hace falta
            llevar ningún número de pedido.
          </p>`,
                  )}
                </div>

                <p style="${parrafo}padding-top:16px;border-top:1px solid ${c.borde};">
                  ¿Alguna duda? Escribinos a
                  <a href="mailto:${STORE_CONTACT.email}" style="color:${c.marca};">${escaparHtml(STORE_CONTACT.email)}</a>
                  o por WhatsApp al
                  <a href="${STORE_CONTACT.whatsapp.url}" style="color:${c.marca};">${escaparHtml(STORE_CONTACT.whatsapp.display)}</a>.
                </p>`,
  });

  return {
    subject: `¡Pago exitoso! — pedido #${numero}`,
    text,
    html,
  };
}

/**
 * Manda el aviso de pago confirmado de un pedido ya acreditado.
 *
 * Nunca lanza: el pago ya esta cobrado y el stock descontado, asi que un SMTP
 * caido no puede hacer fallar al webhook (responderia != 200 y MP reintentaria
 * un aviso ya aplicado) ni al boton del panel (el admin veria un error sobre
 * algo que si se hizo). Lo que no salio queda anotado en el historial del
 * pedido, que es donde alguien lo va a buscar.
 *
 * Devuelve si el mail efectivamente salio.
 */
export async function notificarPagoConfirmado(orderId: string): Promise<boolean> {
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
      console.error("[mail pago] no existe el pedido a notificar", { orderId });
      return false;
    }

    const mail = armarMailPagoConfirmado({
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
            status: ESTADO_PAGADO,
            notes:
              "No se pudo enviar el mail de pago confirmado. " +
              "Avisarle al cliente a mano.",
          },
        })
        .catch((e) => {
          console.error("[mail pago] no se pudo anotar el fallo del mail", e);
        });
    }

    return enviado;
  } catch (e) {
    /* Ni siquiera se llego a intentar (base caida, timeout). El pedido ya
       esta pagado igual: esto es solo el aviso. */
    console.error("[mail pago] no se pudo notificar el pago", { orderId, e });
    return false;
  }
}
