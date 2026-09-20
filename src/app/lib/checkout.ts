/**
 * Contrato entre el carrito (cliente) y POST /api/checkout (servidor).
 *
 * El cliente manda **solo referencias**: `productId` y `quantity`. Nada de
 * precios ni titulos. Todo lo que define cuanto se cobra sale de la base de
 * datos dentro del endpoint, porque cualquier campo que viaje desde el
 * navegador es editable por el comprador.
 *
 * No hay secretos aca: este modulo si puede importarse desde el cliente.
 */
import type { CartItem } from "@/store/useCartStore";

/** Una linea del pedido tal como la ve el servidor. */
export interface CheckoutLine {
  productId: string;
  quantity: number;
}

/**
 * Condiciones frente al IVA que acepta el checkout.
 *
 * La clave es lo que se guarda en `Order.customerTaxCondition`; el texto es
 * lo que se lee en el formulario y en el panel.
 */
export const TAX_CONDITIONS = {
  consumidor_final: "Consumidor Final",
  monotributo: "Monotributo",
  responsable_inscripto: "Responsable Inscripto",
  exento: "Exento",
} as const;

export type TaxCondition = keyof typeof TAX_CONDITIONS;

/* hasOwnProperty y no `in`: "toString" in TAX_CONDITIONS tambien da true.
   Tampoco Object.hasOwn, que este modulo corre en navegadores viejos. */
export const esCondicionIva = (valor: unknown): valor is TaxCondition =>
  typeof valor === "string" &&
  Object.prototype.hasOwnProperty.call(TAX_CONDITIONS, valor);

/**
 * Deja un DNI o CUIT en solo digitos ("20-12.345.678-6" -> "20123456786").
 *
 * Devuelve null si trae algo que no sea numeros, espacios, puntos o guiones:
 * limpiar a ciegas convertiria "abc123" en un "123" que parece valido.
 */
export function normalizarDocumento(valor: string): string | null {
  const limpio = valor.trim();
  if (!/^[\d\s.-]+$/.test(limpio)) return null;
  return limpio.replace(/\D/g, "");
}

export const esDni = (digitos: string) => /^\d{7,8}$/.test(digitos);

/** CUIT/CUIL de 11 digitos con el digito verificador de AFIP (modulo 11). */
export function esCuit(digitos: string): boolean {
  if (!/^\d{11}$/.test(digitos)) return false;

  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((acc, peso, i) => acc + peso * Number(digitos[i]), 0);
  const resto = 11 - (suma % 11);

  /* 11 se escribe 0; 10 no existe como verificador (AFIP cambia el prefijo a
     23 justamente para evitarlo). */
  const verificador = resto === 11 ? 0 : resto;
  return verificador !== 10 && verificador === Number(digitos[10]);
}

/**
 * Por que el documento de facturacion no sirve, o null si esta bien.
 *
 * Consumidor Final puede facturar con DNI; el resto de las condiciones son
 * contribuyentes inscriptos y la factura sale contra el CUIT.
 */
export function errorDocumentoFacturacion(
  documento: string,
  condicion: TaxCondition,
): string | null {
  if (documento.trim() === "") return "Ingresá tu DNI o CUIT.";

  const digitos = normalizarDocumento(documento);

  if (digitos === null || (!esDni(digitos) && digitos.length !== 11)) {
    return "Revisá el documento: el DNI tiene 7 u 8 números y el CUIT, 11.";
  }

  if (digitos.length === 11 && !esCuit(digitos)) {
    return "El CUIT no es válido: revisá los números.";
  }

  if (condicion !== "consumidor_final" && !esCuit(digitos)) {
    return `Para ${TAX_CONDITIONS[condicion]} necesitamos el CUIT, no el DNI.`;
  }

  return null;
}

/** Prefijos de CUIT/CUIL de personas; 30, 33 y 34 son empresas. */
const PREFIJOS_PERSONA = ["20", "23", "24", "27"];

export interface DatosRetiro {
  firstName: string;
  lastName: string;
  dni: string;
}

/**
 * Arma "quien retira" con los datos de facturacion, para cuando el comprador
 * pasa a buscar el pedido en persona.
 *
 * Devuelve el motivo si no se puede: un nombre de una sola palabra no tiene
 * apellido, y una razon social con CUIT de empresa no tiene DNI que mostrar
 * en el mostrador.
 *
 * El nombre se parte igual que para Mercado Pago: la primera palabra es el
 * nombre y el resto el apellido. "Juan Carlos Perez" queda "Juan" + "Carlos
 * Perez": imperfecto, pero en el mostrador se lee el nombre completo igual.
 */
export function retiroDelComprador(
  nombre: string,
  documento: string,
): DatosRetiro | string {
  const [firstName = "", ...resto] = nombre.trim().split(/\s+/);
  const lastName = resto.join(" ");

  if (!firstName || !lastName) {
    return "Para retirar vos, completá nombre y apellido en los datos de facturación.";
  }

  const digitos = normalizarDocumento(documento) ?? "";

  if (esDni(digitos)) {
    return { firstName, lastName, dni: digitos };
  }

  /* El CUIL de una persona es prefijo + DNI + verificador. */
  if (esCuit(digitos) && PREFIJOS_PERSONA.includes(digitos.slice(0, 2))) {
    return {
      firstName,
      lastName,
      dni: digitos.slice(2, 10).replace(/^0+/, ""),
    };
  }

  return "Con el CUIT de una empresa no se puede retirar en persona: indicá quién pasa a buscar el pedido.";
}

/**
 * Datos del comprador que carga el formulario del checkout.
 *
 * Los tipos quedan opcionales porque lo que llega por la red no se da por
 * bueno: el formulario exige todo y el servidor lo vuelve a validar en
 * `parsearCliente` con las mismas reglas de este modulo.
 *
 * Son dos personas distintas: quien factura (`name`, `taxId`,
 * `taxCondition`, contacto) y quien retira (`pickup*`). Si retira el mismo
 * comprador, el formulario completa los `pickup*` con `retiroDelComprador`.
 *
 * No hay direccion: la tienda no despacha a domicilio, el cliente elige en
 * que sucursal retira (`pickupBranch`).
 */
export interface CheckoutCustomer {
  /** Nombre y apellido, o razon social: como sale en la factura. */
  name?: string;
  email?: string;
  phone?: string;
  /** DNI o CUIT de facturacion. Tambien va al antifraude de MP. */
  taxId?: string;
  taxCondition?: TaxCondition;
  pickupFirstName?: string;
  pickupLastName?: string;
  /** DNI de quien retira: lo presenta en la sucursal. */
  pickupDni?: string;
  /**
   * Id de la sucursal de retiro (ver PICKUP_BRANCHES en lib/branches).
   *
   * El formulario lo exige, pero el tipo lo deja opcional porque el servidor
   * lo revalida igual: lo que llega por la red no se da por bueno.
   */
  pickupBranch?: string;
}

export interface CheckoutRequestBody {
  items: CheckoutLine[];
  customer?: CheckoutCustomer;
}

/** Respuesta feliz: solo la URL del Checkout Pro. */
export interface CheckoutResponse {
  init_point: string;
}

/** Respuesta de error, tanto de validacion (400) como de MP (502). */
export interface CheckoutErrorResponse {
  error: string;
}

export const CHECKOUT_ENDPOINT = "/api/checkout";

/** Tope defensivo: un carrito mas largo que esto es un bug o un abuso. */
export const MAX_ITEMS_CHECKOUT = 50;

/**
 * Pasa el carrito de Zustand al body del checkout.
 *
 * Se descarta todo lo demas (precio, titulo, foto, stock): son datos de
 * presentacion, el servidor los vuelve a leer de la base.
 */
export function cartItemsToCheckoutLines(items: CartItem[]): CheckoutLine[] {
  return items.map((item) => ({
    productId: item.id,
    quantity: item.quantity,
  }));
}
