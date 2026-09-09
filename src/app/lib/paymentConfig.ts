/**
 * Datos de cobro de la tienda.
 *
 * ⚠ LOS VALORES DE ABAJO SON DE EJEMPLO. Reemplazalos por los reales antes
 * de publicar: si quedan asi, los clientes transfieren a una cuenta que no
 * existe. Es el unico lugar del proyecto donde estan, cambialos aca y se
 * actualizan el checkout y cualquier pantalla que los use.
 */
export const BANK_TRANSFER = {
  banco: "Banco de la Nacion Argentina",
  titular: "Haras del Este S.R.L.",
  cuit: "30-71234567-8",
  tipoCuenta: "Cuenta Corriente en pesos",
  cbu: "0110599520000012345678",
  alias: "HARAS.DEL.ESTE",
  /** Numero al que el cliente manda el comprobante. */
  comprobante: {
    telefono: "+54 9 351 000-0000",
    /** Solo digitos, para el link de WhatsApp. */
    whatsapp: "5493510000000",
    aNombreDe: "Franco Herrera",
  },
} as const;

export type PaymentMethod = "mercadopago" | "transferencia";

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
    hint: "Transferis por home banking y nos mandas el comprobante.",
  },
};
