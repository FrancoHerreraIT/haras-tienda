/**
 * Reglas de checkout que corren **solo** en el servidor.
 *
 * No se importa desde un Client Component: toca Prisma.
 *
 * Viven aca y no dentro de un endpoint porque hay dos caminos de compra
 * (Mercado Pago y transferencia) y los dos tienen que cobrar igual: del body
 * se leen `productId` y `quantity`, y el precio se relee con Prisma. Si cada
 * flujo tuviera su propia copia, alcanzaria con tocar uno para que por el
 * otro se pueda comprar una silla de montar a $1.
 */
import { prisma } from "@/app/lib/prisma";
import {
  MAX_ITEMS_CHECKOUT,
  errorDocumentoFacturacion,
  esCondicionIva,
  esDni,
  esEmail,
  esTelefono,
  normalizarDocumento,
  type CheckoutLine,
} from "@/app/lib/checkout";
import { CLIENTE_SIN_IDENTIFICAR } from "@/app/lib/orders";
import { buscarSucursal, type PickupBranch } from "@/app/lib/branches";
import { superaLimite } from "@/app/lib/rateLimit";

/** Linea pedida por el cliente, con la forma ya verificada en runtime. */
export type LineaPedida = CheckoutLine;

/** Linea resuelta contra la base: esto es lo que se cobra. */
export interface LineaResuelta {
  productId: string;
  title: string;
  /** Categoria, para que MP muestre algo mas que el titulo. */
  description: string | null;
  pictureUrl: string | null;
  quantity: number;
  /**
   * Precio unitario en centavos.
   *
   * La plata se suma en enteros: con floats, el total puede terminar a un
   * centavo de la suma de las lineas y MP rechaza la preferencia.
   */
  unitPriceCents: number;
}

/**
 * Valida la forma del body. Llega de la red, asi que en runtime puede ser
 * cualquier cosa por mas que el tipo diga otra cosa.
 *
 * Devuelve las lineas agrupadas por producto, o un mensaje de error.
 */
export function parsearLineas(payload: unknown): LineaPedida[] | string {
  if (typeof payload !== "object" || payload === null) {
    return "El body tiene que ser un objeto JSON.";
  }

  const { items } = payload as { items?: unknown };

  if (!Array.isArray(items) || items.length === 0) {
    return "Mandá al menos un item en `items`.";
  }

  if (items.length > MAX_ITEMS_CHECKOUT) {
    return `No se aceptan mas de ${MAX_ITEMS_CHECKOUT} items por compra.`;
  }

  /* Agrupado por id: si el carrito manda el mismo producto en dos lineas,
     findMany lo devuelve una sola vez y el control de stock se haria contra
     la cantidad equivocada. */
  const porProducto = new Map<string, number>();

  for (const crudo of items as Array<Record<string, unknown>>) {
    const { productId, quantity } = crudo ?? {};

    if (typeof productId !== "string" || productId.trim() === "") {
      return "Cada item necesita un `productId`.";
    }

    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return `El item ${productId} tiene una \`quantity\` invalida.`;
    }

    const id = productId.trim();
    porProducto.set(id, (porProducto.get(id) ?? 0) + quantity);
  }

  return [...porProducto].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

/** Recorta un texto que vino de la red; null si no trajo nada util. */
const texto = (valor: unknown) =>
  typeof valor === "string" && valor.trim() !== "" ? valor.trim() : null;

/** Tope de largo para los textos libres: nombres y razones sociales. */
const MAX_TEXTO = 120;

/** Tope para el domicilio: calle, numero, piso, localidad y provincia. */
const MAX_DOMICILIO = 200;

/**
 * Revisa lo que el formulario exige de facturacion y de retiro.
 *
 * Son las mismas reglas que corre el checkout en el navegador (vienen de
 * lib/checkout), repetidas aca porque un POST directo se saltea el formulario.
 */
function errorDatosCliente(datos: {
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  documento: string | null;
  condicion: unknown;
  domicilio: string | null;
  retiroNombre: string | null;
  retiroApellido: string | null;
  retiroDni: string | null;
}): string | null {
  if (!datos.nombre) return "Ingresá el nombre y apellido o la razón social.";
  if (!datos.email) return "Ingresá tu email.";
  /* Una sola direccion: a este mail le escribe la casilla de la tienda, y
     una lista separada por comas la convertiria en un relay de spam. */
  if (!esEmail(datos.email)) {
    return "Revisá el email: no parece una dirección válida.";
  }
  if (!datos.telefono) return "Ingresá un teléfono de contacto.";
  if (!esTelefono(datos.telefono)) {
    return "Revisá el teléfono: solo números, con o sin código de área.";
  }

  if (!esCondicionIva(datos.condicion)) {
    return "Elegí tu condición frente al IVA.";
  }

  const errorDocumento = errorDocumentoFacturacion(
    datos.documento ?? "",
    datos.condicion,
  );
  if (errorDocumento) return errorDocumento;

  if (!datos.domicilio) return "Ingresá el domicilio de facturación.";
  if (datos.domicilio.length > MAX_DOMICILIO) {
    return `El domicilio no puede superar los ${MAX_DOMICILIO} caracteres.`;
  }

  if (!datos.retiroNombre || !datos.retiroApellido) {
    return "Indicá el nombre y apellido de quién retira el pedido.";
  }

  if (!esDni(normalizarDocumento(datos.retiroDni ?? "") ?? "")) {
    return "Revisá el DNI de quién retira: tiene 7 u 8 números.";
  }

  const largos = [datos.nombre, datos.retiroNombre, datos.retiroApellido];
  if (largos.some((valor) => valor.length > MAX_TEXTO)) {
    return `Los nombres no pueden superar los ${MAX_TEXTO} caracteres.`;
  }

  return null;
}

/**
 * Toma los datos del comprador del body y los reparte en tres destinos.
 *
 * Lo que manda el formulario no se cobra ni decide plata: es texto de
 * contacto, facturacion y retiro. Igual se recorta, se descarta lo vacio y se
 * valida con las reglas de lib/checkout, porque de aca sale la factura y a
 * quien se le entrega la mercaderia en el mostrador. Si algo no cierra,
 * `error` trae el motivo y quien llama no tiene que crear la orden.
 *
 * La sucursal va aparte: se valida contra PICKUP_BRANCHES y queda en
 * `sucursal`, que cada flujo revisa con su propio mensaje.
 */
export function parsearCliente(payload: unknown) {
  const { customer } = (payload ?? {}) as { customer?: Record<string, unknown> };

  const nombreCompleto = texto(customer?.name);
  const email = texto(customer?.email);
  const telefono = texto(customer?.phone);
  const documento = texto(customer?.taxId);
  const condicion = customer?.taxCondition;
  const domicilio = texto(customer?.billingAddress);
  const retiroNombre = texto(customer?.pickupFirstName);
  const retiroApellido = texto(customer?.pickupLastName);
  const retiroDni = texto(customer?.pickupDni);
  const sucursal = buscarSucursal(texto(customer?.pickupBranch));

  const error = errorDatosCliente({
    nombre: nombreCompleto,
    email,
    telefono,
    documento,
    condicion,
    domicilio,
    retiroNombre,
    retiroApellido,
    retiroDni,
  });

  /* Solo digitos: "20-12.345.678-6" y "20123456786" son el mismo CUIT, y el
     panel y MP los esperan limpios. */
  const taxId = documento ? normalizarDocumento(documento) : null;
  const pickupDni = retiroDni ? normalizarDocumento(retiroDni) : null;

  /* MP pide nombre y apellido por separado; el formulario manda uno solo. El
     primer token es el nombre y el resto el apellido, que para "Juan Carlos
     Perez" da "Juan" + "Carlos Perez": imperfecto pero nunca vacio. */
  const [primerNombre, ...resto] = (nombreCompleto ?? "").split(/\s+/);
  const apellido = resto.join(" ");

  return {
    /** Motivo por el que no se puede crear el pedido, o null si esta todo. */
    error,
    /* Lo que guarda la tabla Order. */
    orden: {
      customerName: nombreCompleto ?? CLIENTE_SIN_IDENTIFICAR.customerName,
      customerEmail: email ?? CLIENTE_SIN_IDENTIFICAR.customerEmail,
      customerPhone: telefono ?? CLIENTE_SIN_IDENTIFICAR.customerPhone,
      customerTaxId: taxId,
      customerTaxCondition: esCondicionIva(condicion) ? condicion : null,
      customerBillingAddress: domicilio,
      pickupFirstName: retiroNombre,
      pickupLastName: retiroApellido,
      pickupDni,
      pickupBranch: sucursal?.id ?? null,
    },
    /* Lo que se le adelanta a Mercado Pago: le evita al comprador volver a
       tipear todo y le da material al antifraude, que con el pagador vacio
       rechaza mas seguido. Sin address: no hay envio que declarar. */
    payer: {
      ...(primerNombre ? { name: primerNombre } : {}),
      ...(apellido ? { surname: apellido } : {}),
      ...(email ? { email } : {}),
      ...(telefono ? { phone: { number: telefono } } : {}),
      ...(taxId
        ? {
            identification: {
              type: taxId.length === 11 ? "CUIT" : "DNI",
              number: taxId,
            },
          }
        : {}),
    },
    /** La sucursal elegida, ya validada, o null si no vino ninguna valida. */
    sucursal: sucursal as PickupBranch | null,
  };
}

/**
 * Cruza lo pedido con la base y arma las lineas a cobrar.
 *
 * Devuelve un string si algo no cierra: producto inexistente, dado de baja o
 * sin stock suficiente. Todos esos casos son 400, no 500: lo que llego es
 * invalido, el servidor esta sano.
 */
export async function resolverLineas(
  pedidas: LineaPedida[],
): Promise<LineaResuelta[] | string> {
  const productos = await prisma.product.findMany({
    where: {
      id: { in: pedidas.map((linea) => linea.productId) },
      /* Un producto despublicado no se puede vender aunque siga en un carrito
         viejo guardado en el localStorage. */
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      price: true,
      stock: true,
      images: true,
      category: { select: { name: true } },
    },
  });

  const porId = new Map(productos.map((producto) => [producto.id, producto]));
  const resueltas: LineaResuelta[] = [];

  for (const linea of pedidas) {
    const producto = porId.get(linea.productId);

    if (!producto) {
      return "Uno de los productos del carrito ya no está disponible. Actualizá la página e intentá de nuevo.";
    }

    if (producto.stock < linea.quantity) {
      return producto.stock === 0
        ? `Nos quedamos sin stock de "${producto.title}".`
        : `Solo quedan ${producto.stock} unidades de "${producto.title}".`;
    }

    /* price es Decimal(10,2): pasarlo a centavos es exacto. */
    const unitPriceCents = Math.round(Number(producto.price) * 100);

    if (!Number.isFinite(unitPriceCents) || unitPriceCents <= 0) {
      /* Dato corrupto en la base, no culpa del cliente: que no se cobre $0. */
      console.error("[checkout] producto con precio invalido", {
        productId: producto.id,
        price: producto.price,
      });
      return `No pudimos calcular el precio de "${producto.title}".`;
    }

    resueltas.push({
      productId: producto.id,
      title: producto.title,
      description: producto.category?.name ?? null,
      /* La portada es la primera imagen (ver el comentario del schema). */
      pictureUrl: producto.images[0] ?? null,
      quantity: linea.quantity,
      unitPriceCents,
    });
  }

  return resueltas;
}

/** Mensaje para quien crea pedidos mas rapido de lo que compra una persona. */
export const ERROR_DEMASIADOS_PEDIDOS =
  "Registramos varios pedidos seguidos desde tu conexión. Esperá unos minutos y volvé a intentar.";

/**
 * Si hay que frenar la creacion de un pedido por exceso de intentos.
 *
 * Cada pedido escribe en la base y, por transferencia, manda un mail desde la
 * casilla de la tienda al email que escribio el comprador. Sin tope, un bot
 * llena el panel de pedidos falsos o usa la casilla para mandar spam hasta
 * que Gmail la suspenda. Los topes dejan de sobra lugar a una persona que se
 * equivoca y reintenta:
 *  - por IP: 10 pedidos cada 15 minutos;
 *  - por email: 5 pedidos por hora, para que nadie pueda llenarle la bandeja
 *    a un tercero con avisos de la tienda.
 */
export async function superaLimiteDePedidos(
  ip: string,
  email: string | null,
): Promise<boolean> {
  if (await superaLimite(`pedido:ip:${ip}`, 10, 15 * 60)) return true;

  return email
    ? superaLimite(`pedido:email:${email.toLowerCase()}`, 5, 60 * 60)
    : false;
}

/** Total del pedido en centavos. */
export const totalEnCentavos = (lineas: LineaResuelta[]): number =>
  lineas.reduce((total, linea) => total + linea.unitPriceCents * linea.quantity, 0);
