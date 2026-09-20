/**
 * Datos de cobro de la tienda y la regla de descuento por transferencia.
 *
 * Es el unico lugar del proyecto donde estan: cambialos aca y se actualizan el
 * checkout, la pagina de contacto y los mails.
 *
 * El telefono de comprobantes no se escribe aca: sale de STORE_CONTACT
 * (lib/contacto.ts), que es el unico lugar donde vive el WhatsApp de la
 * tienda. Si se duplicara, cambiar el numero dejaria la mitad de las
 * pantallas mandando comprobantes a un telefono viejo.
 *
 * No hay secretos: se puede importar desde un Client Component.
 */
import { STORE_CONTACT } from "@/app/lib/contacto";

/**
 * La cuenta a la que se transfiere.
 *
 * Es una cuenta de Mercado Pago, no un banco tradicional: por eso no hay CBU
 * ni tipo de cuenta, y el identificador largo es un CVU. Con el alias alcanza
 * para transferir desde cualquier billetera o home banking, asi que el CVU
 * queda vacio hasta que el cliente lo pase; mientras este vacio, las pantallas
 * y el mail simplemente no muestran ese renglon.
 */
export const BANK_TRANSFER = {
  banco: "Mercado Pago",
  titular: "Estela Cadario Irma",
  alias: "capricornio13.mp",
  /* `as string` a proposito: sin eso el `as const` le da el tipo literal ""
     y TypeScript da por muerta la rama que lo muestra. */
  cvu: "" as string,
  /** Numero al que el cliente manda el comprobante. */
  comprobante: {
    telefono: STORE_CONTACT.whatsapp.display,
    /** Solo digitos, para el link de WhatsApp. */
    whatsapp: STORE_CONTACT.whatsapp.numero,
  },
} as const;

export const METODO_MERCADOPAGO = "mercadopago";
export const METODO_TRANSFERENCIA = "transferencia";

export type PaymentMethod =
  | typeof METODO_MERCADOPAGO
  | typeof METODO_TRANSFERENCIA;

/**
 * Descuento por pagar con transferencia, en porcentaje entero.
 *
 * Transferir no tiene comision de pasarela: lo que la tienda se ahorra en
 * Mercado Pago vuelve como descuento. Solo aplica a `transferencia`; pagando
 * con MP el total es el subtotal.
 */
export const DESCUENTO_TRANSFERENCIA = 10;

/** Un pedido con el descuento ya repartido, todo en centavos enteros. */
export interface DesgloseTotal {
  subtotalCents: number;
  descuentoCents: number;
  totalCents: number;
}

/**
 * Reparte el subtotal en descuento + total segun el metodo de pago.
 *
 * Trabaja en centavos enteros y **calcula el descuento, no el total**:
 * `total = subtotal - descuento` en vez de `total = subtotal * 0.90`. Los dos
 * dan casi siempre lo mismo, pero no siempre. Con un subtotal de 1005
 * centavos, redondear el 90% da 905 y redondear el 10% da 101 -> 904: por el
 * primer camino el resumen de compra mostraria un descuento de $1,00 y un
 * total que no cierra con la resta. Calculando el descuento, la identidad
 * `subtotal - descuento === total` vale siempre, que es lo que el cliente
 * verifica con la calculadora del telefono y lo que tiene que cerrar entre la
 * pantalla, el mail y lo que se guarda en la base.
 *
 * La misma funcion corre en el navegador (resumen del checkout) y en el
 * servidor (Server Action que crea la orden). El numero de la pantalla y el
 * que se cobra salen del mismo lugar a proposito: el servidor no confia en el
 * del navegador, lo recalcula, pero si divergieran el cliente veria un precio
 * y pagaria otro.
 */
export function desglosarTotal(
  subtotalCents: number,
  metodo: PaymentMethod,
): DesgloseTotal {
  /* El subtotal sale de sumar centavos enteros, pero llega de un carrito en
     pesos con decimales: se normaliza antes de repartir. */
  const subtotal = Math.max(0, Math.round(subtotalCents));

  const descuentoCents =
    metodo === METODO_TRANSFERENCIA
      ? Math.round((subtotal * DESCUENTO_TRANSFERENCIA) / 100)
      : 0;

  return {
    subtotalCents: subtotal,
    descuentoCents,
    totalCents: subtotal - descuentoCents,
  };
}

export const PAYMENT_METHODS: Record<
  PaymentMethod,
  { label: string; hint: string }
> = {
  mercadopago: {
    label: "Mercado Pago",
    hint: "Tarjeta, dinero en cuenta o efectivo. Se acredita al instante.",
  },
  transferencia: {
    label: "Transferencia bancaria",
    hint: `${DESCUENTO_TRANSFERENCIA}% de descuento. Te mandamos el alias por mail y reservamos el pedido.`,
  },
};
