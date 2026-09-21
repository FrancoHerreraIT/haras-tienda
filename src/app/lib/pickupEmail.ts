/**
 * El aviso de "listo para retirar". Corre **solo** en el servidor.
 *
 * Es el ultimo mail del flujo y el unico que sale del panel: lo dispara el
 * Server Action de /admin/pedidos cuando el pedido pasa a `ready_for_pickup`,
 * nunca antes. Los dos primeros mails prometen exactamente esto ("te avisamos
 * apenas este listo"), asi que este es el que cierra esa promesa.
 *
 * Lo que tiene que quedar claro es donde, cuando y con que se pasa a buscar la
 * compra: cuando este mail sale el pedido ya esta cobrado (a
 * `ready_for_pickup` solo se llega desde `paid`, ver TRANSICIONES_MANUALES),
 * asi que el importe va como constancia y no como algo a pagar. Repite el
 * mismo bloque de detalle que los otros dos avisos — es el ultimo mail de la
 * compra y el que el comprador guarda: tiene que cerrar con lo que pago y con
 * el descuento que se le hizo, no con una lista de productos sin importes.
 *
 * Igual que paidEmail, se llama **despues** de que la transaccion del cambio
 * de estado cerro: esperar a un SMTP con el lock de la fila tomado bloquea el
 * pedido, y un rollback posterior dejaria al cliente yendo a la sucursal a
 * buscar algo que la base no dio por preparado.
 */
import { prisma } from "@/app/lib/prisma";
import { enviarMail } from "@/app/lib/mail";
import { buscarSucursal, nombreSucursal } from "@/app/lib/branches";
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
import { ESTADO_LISTO_PARA_RETIRAR } from "@/app/lib/orders";

export interface DatosMailListoParaRetirar {
  orderId: string;
  customerName: string;
  /** Lo que ya se cobro, con el descuento aplicado. Va como constancia. */
  total: number;
  pickupBranch: string | null;
  /** Quien pasa a buscarlo, si el checkout cargo a otra persona. */
  pickupName: string | null;
  items: LineaDeMail[];
}

/** El pedido ya esta cobrado: es una constancia, no un importe a pagar. */
const ROTULO_TOTAL = "Total pagado";

export function armarMailListoParaRetirar(datos: DatosMailListoParaRetirar) {
  const numero = numeroDePedido(datos.orderId);
  const sucursal = nombreSucursal(datos.pickupBranch);
  const c = COLORES_MAIL;

  /* Igual que en paidEmail: de la orden guardada solo sale el total, el
     subtotal se rearma sumando las lineas y el descuento es la diferencia. */
  const desglose = desgloseDelPedido(datos.items, datos.total);

  /* El horario solo existe si el id sigue siendo una de nuestras sucursales;
     para un pedido viejo con un id que ya no esta, se omite la linea en vez
     de inventar un horario. */
  const horario = buscarSucursal(datos.pickupBranch)?.horario ?? null;

  /* El que retira puede no ser el comprador (una empresa que manda a alguien,
     un regalo): si el checkout cargo un nombre, se lo nombra para que en el
     mostrador sepan a quien esperar. */
  const retira = datos.pickupName?.trim() || null;

  const text = [
    `Hola ${datos.customerName},`,
    "",
    `¡Tu pedido #${numero} ya está listo! Podés pasar a buscarlo por la sucursal que elegiste.`,
    "",
    `RETIRÁS EN: ${sucursal}`,
    ...(horario ? [`Horarios: ${horario}`] : []),
    "",
    "QUÉ LLEVAR",
    "  - Tu DNI. Es lo único que necesitás: no hace falta el número de pedido.",
    ...(retira ? [`  - Lo puede retirar ${retira} presentando su DNI.`] : []),
    "",
    ...detalleTexto({ items: datos.items, desglose, totalLabel: ROTULO_TOTAL }),
    "",
    `¿No podés pasar estos días? Escribinos a ${STORE_CONTACT.email} o por WhatsApp al ${STORE_CONTACT.whatsapp.display} y lo coordinamos.`,
    "",
    ...FIRMA_TEXTO,
  ].join("\n");

  const html = envolverMail({
    titulo: "¡Tu pedido está listo!",
    intro: `Hola ${escaparHtml(datos.customerName)}, tu pedido <strong>#${numero}</strong>
                  ya está preparado. Pasá a buscarlo por la sucursal que elegiste.`,
    contenido: `${bloqueDestacado(
      "RETIRÁS EN",
      `<p style="margin:0;font-family:${FUENTE_MAIL};font-size:15px;line-height:1.6;color:${c.texto};">${escaparHtml(sucursal)}</p>
          ${
            horario
              ? `<p style="margin:4px 0 0;font-family:${FUENTE_MAIL};font-size:14px;line-height:1.6;color:${c.secundario};">${escaparHtml(horario)}</p>`
              : ""
          }
          <p style="margin:12px 0 0;font-family:${FUENTE_MAIL};font-size:14px;line-height:1.6;color:${c.secundario};">
            Alcanza con que presentes tu <strong>DNI</strong>: no hace falta el
            número de pedido.${
              retira
                ? ` Lo puede retirar <strong>${escaparHtml(retira)}</strong> presentando su DNI.`
                : ""
            }
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
                  ¿No podés pasar estos días? Escribinos a
                  <a href="mailto:${STORE_CONTACT.email}" style="color:${c.marca};">${escaparHtml(STORE_CONTACT.email)}</a>
                  o por WhatsApp al
                  <a href="${STORE_CONTACT.whatsapp.url}" style="color:${c.marca};">${escaparHtml(STORE_CONTACT.whatsapp.display)}</a>
                  y lo coordinamos.
                </p>`,
  });

  return {
    subject: `¡Tu pedido #${numero} está listo para retirar!`,
    text,
    html,
  };
}

/**
 * Manda el aviso de pedido listo.
 *
 * Nunca lanza, por el mismo motivo que notificarPagoConfirmado: el pedido ya
 * quedo en `ready_for_pickup` y devolverle un error al admin por un SMTP
 * caido lo llevaria a apretar el boton de nuevo sobre algo que si se hizo. Lo
 * que no salio queda anotado en el historial del pedido, que es donde alguien
 * lo va a buscar.
 *
 * Devuelve si el mail efectivamente salio.
 */
export async function notificarPedidoListo(orderId: string): Promise<boolean> {
  try {
    const orden = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        totalAmount: true,
        pickupBranch: true,
        pickupFirstName: true,
        pickupLastName: true,
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
      console.error("[mail listo] no existe el pedido a notificar", { orderId });
      return false;
    }

    const pickupName =
      [orden.pickupFirstName, orden.pickupLastName]
        .filter((parte): parte is string => Boolean(parte?.trim()))
        .join(" ")
        .trim() || null;

    const mail = armarMailListoParaRetirar({
      orderId: orden.id,
      customerName: orden.customerName,
      total: Number(orden.totalAmount),
      pickupBranch: orden.pickupBranch,
      pickupName,
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
            status: ESTADO_LISTO_PARA_RETIRAR,
            notes:
              "No se pudo enviar el mail de pedido listo para retirar. " +
              "Avisarle al cliente a mano.",
          },
        })
        .catch((e) => {
          console.error("[mail listo] no se pudo anotar el fallo del mail", e);
        });
    }

    return enviado;
  } catch (e) {
    /* Ni siquiera se llego a intentar (base caida, timeout). El pedido esta
       preparado igual: esto es solo el aviso. */
    console.error("[mail listo] no se pudo notificar el pedido listo", {
      orderId,
      e,
    });
    return false;
  }
}
