/**
 * La cascara comun de los tres mails transaccionales. Corre **solo** en el
 * servidor: lee el logo del disco.
 *
 * Los tres avisos (transferEmail, paidEmail, pickupEmail) son el mismo mail
 * con distinto contenido: mismo fondo, misma tarjeta blanca, mismo logo arriba
 * y mismo footer. Si cada uno se maqueta aparte, a la tercera edicion dejan de
 * parecer de la misma tienda — y el comprador recibe los tres, uno detras del
 * otro.
 *
 * Todo el CSS va en linea y la estructura va en `<table>`: Gmail tira el
 * `<style>` del `<head>` y Outlook (motor de Word) no centra un div con
 * `margin:0 auto`. Lo unico que se ve igual en todos los clientes es un
 * atributo `style` por celda dentro de una tabla.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { STORE_CONTACT } from "@/app/lib/contacto";
import {
  COLORES_MAIL,
  escaparHtml,
  filasDelDetalle,
  formatearPesos,
  FUENTE_MAIL,
  lineasDelDetalle,
  type DesgloseDeMail,
  type LineaDeMail,
} from "@/app/lib/orderEmail";

/**
 * El `cid` con el que se referencia el logo desde el HTML.
 *
 * Va como adjunto inline y no como `<img src="https://...">` a proposito:
 * Gmail y Outlook bloquean las imagenes remotas hasta que el destinatario
 * aprieta "mostrar imagenes", y el primer mail que ve de una tienda que no
 * conoce llega con el encabezado roto.
 */
export const LOGO_CID = "logo";

/**
 * El logo de la tienda, en su version para mail.
 *
 * Es `public/logo-haras.png` reducido a 300px de ancho (el doble de los 150
 * con que se muestra, para las pantallas retina): 13 KB en vez de 746 KB. El
 * original mide 2172px y viaja en **cada** mail, asi que adjuntarlo tal cual
 * es mandar 1 MB por aviso — peso que penaliza la entrega y que en el
 * encabezado no se ve.
 *
 * Si se cambia el logo de la web hay que regenerar este archivo: 300px de
 * ancho y fondo blanco puro (#ffffff). El blanco importa — el original tiene
 * fondo solido, no transparencia, y si al reescalar queda en 253 se ve un
 * recuadro gris alrededor del logo contra la tarjeta blanca del mail.
 */
const LOGO_RUTA = path.join(process.cwd(), "public", "logo-haras-mail.png");

/** Un adjunto como lo espera nodemailer. */
export interface AdjuntoMail {
  filename: string;
  content: Buffer;
  cid: string;
  contentType: string;
  /* Sin esto, varios clientes muestran el clip de "1 archivo adjunto" al pie
     de un mail cuya unica imagen ya esta embebida arriba. */
  contentDisposition: "inline";
}

/* El logo son unos KB y es el mismo en cada mail: se lee una vez por proceso.
   Se cachea la promesa y no el Buffer para que dos mails en paralelo no
   disparen dos lecturas. */
let logoPendiente: Promise<Buffer | null> | undefined;

function leerLogo(): Promise<Buffer | null> {
  logoPendiente ??= readFile(LOGO_RUTA).catch((e) => {
    console.warn(
      "[mail] no se pudo leer el logo, el mail sale sin el encabezado grafico",
      { ruta: LOGO_RUTA, e },
    );
    /* No se cachea el fallo: si fue algo transitorio, el proximo mail
       reintenta en vez de quedarse sin logo hasta el siguiente deploy. */
    logoPendiente = undefined;
    return null;
  });

  return logoPendiente;
}

/**
 * Los adjuntos que toda la plantilla necesita: hoy, el logo.
 *
 * Si el archivo no esta, devuelve una lista vacia en vez de lanzar. El mail
 * sale igual y el cliente ve el texto alternativo: un logo que falta no puede
 * hacer que alguien no reciba el alias para pagar.
 */
export async function adjuntosDeLaPlantilla(): Promise<AdjuntoMail[]> {
  const logo = await leerLogo();
  if (!logo) return [];

  return [
    {
      filename: "logo-haras.png",
      content: logo,
      cid: LOGO_CID,
      contentType: "image/png",
      contentDisposition: "inline",
    },
  ];
}

/**
 * Envuelve el contenido de un mail en la tarjeta de la tienda.
 *
 * `titulo` es el encabezado visible ("Pedido recibido", "¡Pago exitoso!") y
 * tambien el `<title>` del documento. `intro` es el parrafo que lo sigue.
 * Los dos llegan como HTML ya armado por el llamador: lo que escribio el
 * comprador (su nombre) tiene que venir escapado desde alla.
 */
export function envolverMail({
  titulo,
  intro,
  contenido,
}: {
  titulo: string;
  intro: string;
  contenido: string;
}): string {
  const c = COLORES_MAIL;

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escaparHtml(titulo)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${c.fondo};font-family:${FUENTE_MAIL};color:${c.texto};-webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${c.fondo};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${c.tarjeta};border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);">
            <tr>
              <td style="padding:40px 36px;font-family:${FUENTE_MAIL};color:${c.texto};">

                <!-- Encabezado: logo centrado, como adjunto inline (cid) -->
                <div style="text-align:center;padding-bottom:24px;border-bottom:1px solid ${c.borde};">
                  <img src="cid:${LOGO_CID}" alt="Haras del Este" width="150" style="display:inline-block;width:150px;max-width:150px;height:auto;border:0;outline:none;text-decoration:none;" />
                </div>

                <h1 style="margin:28px 0 12px;font-family:${FUENTE_MAIL};font-size:22px;line-height:1.3;font-weight:700;color:${c.texto};">
                  ${titulo}
                </h1>
                <p style="margin:0 0 28px;font-family:${FUENTE_MAIL};font-size:15px;line-height:1.6;color:${c.secundario};">
                  ${intro}
                </p>

                ${contenido}

                <!-- Footer -->
                <p style="margin:32px 0 0;padding-top:20px;border-top:1px solid ${c.borde};font-family:${FUENTE_MAIL};font-size:12px;line-height:1.6;color:${c.apagado};text-align:center;">
                  Haras del Este. Si tenés dudas, escribinos a
                  <a href="mailto:${STORE_CONTACT.email}" style="color:${c.apagado};text-decoration:underline;">${escaparHtml(STORE_CONTACT.email)}</a>.
                </p>

              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** La misma firma del footer, para la version en texto plano. */
export const FIRMA_TEXTO = [
  "Gracias por tu compra.",
  "Haras del Este",
  `Si tenés dudas, escribinos a ${STORE_CONTACT.email}.`,
];

/**
 * Un bloque destacado (datos bancarios, sucursal de retiro).
 *
 * `titulo` es el rotulo en mayusculas y `contenido` el HTML de adentro.
 */
export function bloqueDestacado(titulo: string, contenido: string): string {
  const c = COLORES_MAIL;

  return `<div style="background-color:${c.destacado};border:1px solid rgba(139,90,43,.25);border-radius:8px;padding:20px;">
        <h2 style="margin:0 0 10px;font-family:${FUENTE_MAIL};font-size:12px;letter-spacing:.06em;font-weight:700;color:${c.marca};">${titulo}</h2>
        ${contenido}
      </div>`;
}

/**
 * Como se rotula el descuento, con el porcentaje que salio de los importes
 * reales del pedido.
 *
 * Se deriva del desglose y no de la constante de hoy (DESCUENTO_TRANSFERENCIA)
 * para que un pedido viejo, hecho con otro porcentaje, no se rotule con el
 * nuevo: el comprador que abre el mail de "listo para retirar" tiene que leer
 * lo mismo que leyo en el primero.
 */
function etiquetaDescuento({ subtotal, descuento }: DesgloseDeMail): string {
  const porcentaje = subtotal > 0 ? Math.round((descuento / subtotal) * 100) : 0;

  return porcentaje > 0
    ? `Descuento por transferencia (${porcentaje}%)`
    : "Descuento por transferencia";
}

/**
 * El bloque DETALLE: los items, el subtotal, el descuento si hubo, y el total.
 *
 * Es el mismo en los tres mails a proposito. El comprador recibe hasta tres
 * avisos del mismo pedido y compara: si el primero desglosa el descuento y el
 * segundo solo muestra un total mas bajo que lo que sumo en el carrito, ese
 * total se lee como un error de la tienda.
 *
 * `totalLabel` es lo unico que cambia entre mails ("Total a transferir" cuando
 * todavia no pago, "Total pagado" cuando ya se acredito).
 */
export function detalleHtml({
  items,
  desglose,
  totalLabel,
}: {
  items: ReadonlyArray<LineaDeMail>;
  desglose: DesgloseDeMail;
  totalLabel: string;
}): string {
  const c = COLORES_MAIL;

  const celdaResumen = `padding:8px 0;font-family:${FUENTE_MAIL};font-size:13px;line-height:1.5;`;

  /* El subtotal abre el resumen: la linea de arriba lo separa de los
     productos para que no se lea como un item mas. */
  const filaSubtotal = `<tr>
          <td style="${celdaResumen}border-top:1px solid ${c.borde};color:${c.apagado};">Subtotal</td>
          <td style="${celdaResumen}border-top:1px solid ${c.borde};text-align:right;color:${c.texto};">${escaparHtml(
            formatearPesos(desglose.subtotal),
          )}</td>
        </tr>`;

  /* Sin descuento (Mercado Pago) no se imprime un "-$0,00", que solo hace
     dudar de si faltaba aplicarlo. */
  const filaDescuento =
    desglose.descuento > 0
      ? `<tr>
          <td style="${celdaResumen}color:${c.ahorro};">${etiquetaDescuento(desglose)}</td>
          <td style="${celdaResumen}text-align:right;color:${c.ahorro};font-weight:700;">-${escaparHtml(
            formatearPesos(desglose.descuento),
          )}</td>
        </tr>`
      : "";

  return `<h2 style="margin:0 0 4px;font-family:${FUENTE_MAIL};font-size:12px;letter-spacing:.06em;font-weight:700;color:${c.apagado};">DETALLE</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        ${filasDelDetalle(items)}
        ${filaSubtotal}
        ${filaDescuento}
      </table>
      <p style="margin:12px 0 0;padding-top:12px;border-top:2px solid ${c.borde};font-family:${FUENTE_MAIL};font-size:18px;line-height:1.4;font-weight:700;color:${c.texto};text-align:right;">
        ${totalLabel}: ${escaparHtml(formatearPesos(desglose.total))}
      </p>`;
}

/** El mismo bloque DETALLE para la version en texto plano. */
export function detalleTexto({
  items,
  desglose,
  totalLabel,
}: {
  items: ReadonlyArray<LineaDeMail>;
  desglose: DesgloseDeMail;
  totalLabel: string;
}): string[] {
  return [
    "DETALLE",
    ...lineasDelDetalle(items).map((linea) => `  - ${linea}`),
    `  Subtotal: ${formatearPesos(desglose.subtotal)}`,
    ...(desglose.descuento > 0
      ? [
          `  ${etiquetaDescuento(desglose)}: -${formatearPesos(
            desglose.descuento,
          )}`,
        ]
      : []),
    `  ${totalLabel.toUpperCase()}: ${formatearPesos(desglose.total)}`,
  ];
}
