/**
 * Armado del aviso con los datos para transferir.
 *
 * Todo lo que el cliente necesita para pagar tiene que estar en este mail:
 * numero de pedido, cuanto transferir, a que alias y donde retira. Si tiene
 * que volver a la web a buscar el alias, la mitad no vuelve.
 *
 * El importe va desglosado (subtotal, descuento, total) y no solo el total:
 * este es el unico flujo con descuento, asi que el numero que el comprador
 * tiene que transferir es mas bajo que el que sumo en el carrito. Sin la
 * linea del descuento a la vista, eso se lee como un error del sitio.
 *
 * Sale al crear la orden, con la orden todavia en `pending`. Es el primero de
 * los tres mails que recibe el que paga por transferencia: este dice
 * "recibimos tu pedido, transferí"; despues viene el de paidEmail.ts cuando
 * el admin da por buena la transferencia, y al final el de pickupEmail.ts
 * cuando el pedido queda listo para retirar.
 *
 * Por eso el asunto y el cuerpo de aca no pueden dar la compra por cerrada:
 * "pedido recibido" no es "pago recibido". El que confirma el cobro es el
 * segundo mail, y este mail promete que va a llegar.
 *
 * La maqueta (logo, tarjeta, footer) y el bloque de detalle salen de
 * emailLayout.ts: son los mismos que usan los otros dos avisos.
 */
import { BANK_TRANSFER } from "@/app/lib/paymentConfig";
import { nombreSucursal } from "@/app/lib/branches";
import {
  bloqueDestacado,
  detalleHtml,
  detalleTexto,
  envolverMail,
  FIRMA_TEXTO,
} from "@/app/lib/emailLayout";
import {
  COLORES_MAIL,
  escaparHtml,
  filaDato,
  formatearPesos,
  FUENTE_MAIL,
  numeroDePedido,
  type LineaDeMail,
} from "@/app/lib/orderEmail";

export interface DatosMailTransferencia {
  orderId: string;
  customerName: string;
  /** Suma de las lineas a precio de lista, sin descuento. */
  subtotal: number;
  /** Lo que se le descuenta por pagar transfiriendo. Positivo. */
  descuento: number;
  /** `subtotal - descuento`: el importe exacto que tiene que transferir. */
  total: number;
  pickupBranch: string | null;
  items: LineaDeMail[];
}

/** Lo que el comprador todavia no pago: el total es "a transferir". */
const ROTULO_TOTAL = "Total a transferir";

export function armarMailTransferencia(datos: DatosMailTransferencia) {
  const numero = numeroDePedido(datos.orderId);
  const total = formatearPesos(datos.total);
  const sucursal = nombreSucursal(datos.pickupBranch);
  const { comprobante } = BANK_TRANSFER;
  const c = COLORES_MAIL;

  /* El desglose llega armado desde el checkout, que es el que aplico el
     descuento: no se recalcula aca para que el mail diga exactamente lo que se
     guardo en el pedido. */
  const desglose = {
    subtotal: datos.subtotal,
    descuento: datos.descuento,
    total: datos.total,
  };

  const text = [
    `Hola ${datos.customerName},`,
    "",
    `Recibimos tu pedido #${numero}. Queda reservado hasta que recibamos la transferencia.`,
    "",
    ...detalleTexto({ items: datos.items, desglose, totalLabel: ROTULO_TOTAL }),
    "",
    "DATOS PARA TRANSFERIR",
    `  Banco: ${BANK_TRANSFER.banco}`,
    `  Titular: ${BANK_TRANSFER.titular}`,
    `  Alias: ${BANK_TRANSFER.alias}`,
    ...(BANK_TRANSFER.cvu ? [`  CVU: ${BANK_TRANSFER.cvu}`] : []),
    "",
    `Poné "${numero}" como referencia de la transferencia y mandanos el comprobante por WhatsApp al ${comprobante.telefono}.`,
    "",
    `RETIRO: ${sucursal}`,
    "Te avisamos por mail apenas acreditemos la transferencia, y de nuevo cuando el pedido esté listo para retirar.",
    "",
    ...FIRMA_TEXTO,
  ].join("\n");

  const parrafo = `margin:20px 0 0;font-family:${FUENTE_MAIL};font-size:14px;line-height:1.6;color:${c.secundario};`;

  const html = envolverMail({
    titulo: "Pedido recibido",
    intro: `Hola ${escaparHtml(datos.customerName)}, recibimos tu pedido
                  <strong>#${numero}</strong> y queda reservado hasta que recibamos la transferencia.`,
    contenido: `${detalleHtml({
      items: datos.items,
      desglose,
      totalLabel: ROTULO_TOTAL,
    })}

                <div style="margin-top:28px;">
                  ${bloqueDestacado(
                    "DATOS PARA TRANSFERIR",
                    /* El alias arriba es lo que se pega en el homebanking; el
                       titular y el banco son de control. */
                    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
            ${filaDato("Alias", BANK_TRANSFER.alias, true)}
            ${BANK_TRANSFER.cvu ? filaDato("CVU", BANK_TRANSFER.cvu, true) : ""}
            ${filaDato("Titular", BANK_TRANSFER.titular)}
            ${filaDato("Banco", BANK_TRANSFER.banco)}
          </table>`,
                  )}
                </div>

                <p style="${parrafo}">
                  Usá <strong>${numero}</strong> como referencia y mandanos el comprobante por WhatsApp al
                  <a href="https://wa.me/${comprobante.whatsapp}" style="color:${c.marca};font-weight:700;">${escaparHtml(comprobante.telefono)}</a>.
                </p>

                <p style="${parrafo}padding-top:16px;border-top:1px solid ${c.borde};">
                  <strong>Retirás en:</strong> ${escaparHtml(sucursal)}<br />
                  Te avisamos por mail apenas acreditemos la transferencia, y de nuevo cuando el pedido esté listo para retirar.
                </p>`,
  });

  return {
    subject: `Pedido #${numero} recibido — transferí ${total} para confirmarlo`,
    text,
    html,
  };
}
