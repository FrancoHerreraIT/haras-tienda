/**
 * Piezas comunes de los mails de pedido.
 *
 * Hay tres avisos y los tres hablan del mismo pedido: el del alias
 * (transferEmail.ts), el de pago exitoso de Mercado Pago (paidEmail.ts) y el
 * de listo para retirar (pickupEmail.ts). El numero corto, el formato de
 * plata y el escapado del HTML tienen que dar igual en los tres — si el mail
 * del alias dice "Pedido #A1B2C3D4" y el siguiente dice otra cosa, el comprador
 * cree que son dos compras distintas.
 *
 * Aca viven las piezas puras (numeros, textos, filas de tabla). La cascara del
 * mail — logo, tarjeta, footer — esta en emailLayout.ts, que lee del disco y
 * por eso corre solo en el servidor.
 */

/** Numero de pedido corto y legible, derivado del uuid. */
export function numeroDePedido(orderId: string): string {
  return orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export const formatearPesos = (monto: number): string =>
  monto.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  });

/** Escapa lo que va dentro del HTML: el nombre lo escribio el comprador. */
export const escaparHtml = (valor: string): string =>
  valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Paleta y tipografia de los mails.
 *
 * Vive aca, junto a las filas de tabla, para que no haya dos listas de colores
 * que se puedan desincronizar: emailLayout.ts arma la tarjeta con estos mismos
 * valores. Es una paleta de grises neutros (no la stone de la web) porque en la
 * bandeja de entrada el mail compite con el fondo blanco del cliente de correo,
 * no con el diseno del sitio.
 */
export const COLORES_MAIL = {
  fondo: "#f3f4f6",
  tarjeta: "#ffffff",
  texto: "#1f2937",
  secundario: "#4b5563",
  apagado: "#6b7280",
  borde: "#e5e7eb",
  /** El marron de la marca, el mismo de la web. */
  marca: "#8B5A2B",
  /** Fondo de los bloques destacados (datos bancarios, sucursal). */
  destacado: "#F7F5F0",
  /** Verde del descuento: lo que el comprador se ahorra. */
  ahorro: "#15803d",
} as const;

/* Sin fuentes de sistema ni webfonts: un stack corto que existe en todos los
   clientes de correo, incluidos los de escritorio. */
export const FUENTE_MAIL = "Helvetica, Arial, sans-serif";

/**
 * Fila "etiqueta / valor" de las tablas del mail.
 *
 * Va con estilos en linea y no con clases porque Gmail y Outlook tiran el
 * <style> del <head>: lo unico que sobrevive en todos los clientes es el
 * atributo style de cada celda.
 *
 * `label` se inserta tal cual (lo escribimos nosotros, a veces con HTML
 * adentro); `valor` siempre se escapa.
 */
export const filaDato = (label: string, valor: string, mono = false): string =>
  `<tr>
      <td style="padding:8px 0;font-family:${FUENTE_MAIL};color:${COLORES_MAIL.apagado};font-size:13px;line-height:1.5;">${label}</td>
      <td style="padding:8px 0;font-family:${
        mono ? "Consolas, Menlo, monospace" : FUENTE_MAIL
      };text-align:right;color:${
        COLORES_MAIL.texto
      };font-size:13px;line-height:1.5;">${escaparHtml(valor)}</td>
    </tr>`;

/** Una linea del detalle, como la guarda el pedido. */
export interface LineaDeMail {
  title: string;
  quantity: number;
  priceAtPurchase: number;
}

/** Las filas del detalle de productos, ya escapadas. */
export const filasDelDetalle = (items: ReadonlyArray<LineaDeMail>): string =>
  items
    .map((item) =>
      filaDato(
        `${item.quantity} x ${escaparHtml(item.title)}`,
        formatearPesos(item.priceAtPurchase * item.quantity),
      ),
    )
    .join("");

/** El mismo detalle para la version de texto plano. */
export const lineasDelDetalle = (
  items: ReadonlyArray<LineaDeMail>,
): string[] =>
  items.map(
    (item) =>
      `${item.quantity} x ${item.title} — ${formatearPesos(
        item.priceAtPurchase * item.quantity,
      )}`,
  );

/** Subtotal, descuento y total de un pedido, en pesos. */
export interface DesgloseDeMail {
  /** Suma de las lineas a precio de lista, sin descuento. */
  subtotal: number;
  /** Lo descontado. Positivo, o 0 si no hubo descuento. */
  descuento: number;
  /** `subtotal - descuento`: lo que el comprador paga. */
  total: number;
}

/** Redondeo a centavos: los importes llegan como pesos con decimales. */
const redondearPesos = (monto: number): number => Math.round(monto * 100) / 100;

/**
 * Rearma el desglose de un pedido ya guardado.
 *
 * La base guarda un solo importe (`totalAmount`, con el descuento ya
 * aplicado), asi que el subtotal se recalcula sumando las lineas a su precio
 * de compra y el descuento es la diferencia. Es lo que permite que los tres
 * mails muestren el mismo bloque de detalle, aunque solo el primero reciba el
 * desglose armado desde el checkout.
 *
 * El descuento sale de los importes reales del pedido y no de la constante de
 * hoy: si manana cambia el porcentaje, un mail de un pedido viejo sigue
 * mostrando lo que efectivamente se le descontó.
 */
export function desgloseDelPedido(
  items: ReadonlyArray<LineaDeMail>,
  total: number,
): DesgloseDeMail {
  const subtotal = redondearPesos(
    items.reduce((suma, item) => suma + item.priceAtPurchase * item.quantity, 0),
  );

  return {
    subtotal,
    /* Nunca negativo: un total mayor que el subtotal (un pedido raro, un
       ajuste a mano) no tiene que imprimir un "descuento" al reves. */
    descuento: Math.max(0, redondearPesos(subtotal - total)),
    total,
  };
}
