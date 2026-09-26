/**
 * POST /api/webhooks/mp
 *
 * Notificaciones (webhooks / IPN) de Mercado Pago. Es la unica fuente
 * confiable del estado de un pago: la vuelta del comprador por
 * /checkout/success es cosmetica, se puede falsear escribiendo la URL a mano
 * y ni siquiera ocurre si cierra la pestaña.
 *
 * Reglas del canal:
 *  - Se responde 200 siempre que la notificacion sea autentica, incluso si no
 *    la usamos. Cualquier otro codigo hace que MP reintente con backoff y, si
 *    se repite, desactive la URL.
 *  - La notificacion solo trae el id. El estado se consulta a la API con
 *    nuestro token, nunca se lee del body.
 *  - Llegan duplicadas, desordenadas y en paralelo: todo lo que se hace aca
 *    tiene que ser idempotente.
 *
 * El puente con nuestro pedido es `payment.external_reference`, que
 * POST /api/checkout carga con el `Order.id`.
 */
import {
  InvalidWebhookSignatureError,
  MercadoPagoError,
  Payment,
  WebhookSignatureValidator,
} from "mercadopago";
import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getMercadoPagoClient } from "@/app/lib/mercadopago";
import {
  CLIENTE_SIN_IDENTIFICAR,
  ESTADO_CANCELADO,
  ESTADO_PAGADO,
  ESTADO_PENDIENTE,
  esContactoSinCompletar,
  estadoDesdePago,
} from "@/app/lib/orders";
import {
  ESTADOS_COBRADOS,
  esEstadoCobrado,
} from "@/components/admin/orderStatus";
import {
  StockInsuficienteError,
  descontarStockDelPedido,
} from "@/app/lib/stock";
import { notificarPagoConfirmado } from "@/app/lib/paidEmail";

export const dynamic = "force-dynamic";

/** Lo poco que garantiza el body de una notificacion. */
interface MpWebhookBody {
  /** Formato webhooks: "payment", "merchant_order", ... */
  type?: string;
  /** Formato IPN viejo, mismo significado que `type`. */
  topic?: string;
  action?: string;
  data?: { id?: string | number };
}

/** El pago tal como lo devuelve el SDK, sin importar tipos internos. */
type PagoMP = Awaited<ReturnType<Payment["get"]>>;

/** La orden con lo minimo para acreditarla. */
interface OrdenParaAcreditar {
  id: string;
  status: string;
  totalAmount: unknown;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{ productId: string; quantity: number }>;
}

/** 200 sin cuerpo: MP no lee la respuesta, solo el codigo. */
const ok = () => new Response(null, { status: 200 });

/**
 * Arma los datos de contacto a partir del comprador de Mercado Pago.
 *
 * Solo devuelve los campos que valen la pena pisar: si el formulario del
 * checkout ya cargo un mail, ese queda. Lo que MP no informa, tampoco.
 */
function datosDelComprador(
  pago: PagoMP,
  orden: OrdenParaAcreditar,
): Partial<{
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}> {
  const payer = pago.payer;
  if (!payer) return {};

  const datos: Partial<{
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }> = {};

  const nombre = [payer.first_name, payer.last_name]
    .filter((parte): parte is string => Boolean(parte?.trim()))
    .join(" ")
    .trim();

  if (
    nombre &&
    esContactoSinCompletar(
      orden.customerName,
      CLIENTE_SIN_IDENTIFICAR.customerName,
    )
  ) {
    datos.customerName = nombre;
  }

  const email = payer.email?.trim();

  if (
    email &&
    esContactoSinCompletar(
      orden.customerEmail,
      CLIENTE_SIN_IDENTIFICAR.customerEmail,
    )
  ) {
    datos.customerEmail = email;
  }

  /* MP parte el telefono en prefijo y numero; la tabla guarda uno solo. */
  const telefono = [payer.phone?.area_code, payer.phone?.number]
    .filter((parte): parte is string => Boolean(parte?.trim()))
    .join(" ")
    .trim();

  if (
    telefono &&
    esContactoSinCompletar(
      orden.customerPhone,
      CLIENTE_SIN_IDENTIFICAR.customerPhone,
    )
  ) {
    datos.customerPhone = telefono;
  }

  return datos;
}

/**
 * Como se referencia el pago en el historial del pedido.
 *
 * Solo el numero de operacion: es el unico dato del payload que le sirve a
 * quien lee el historial, porque es con el que se busca el pago en el panel
 * de Mercado Pago. Lo demas que traia antes esta nota — `status_detail`,
 * `payment_method_id`, el importe y el documento del pagador — era el payload
 * crudo pegado al final, ilegible en la UI y, en el caso del documento, un
 * dato personal a la vista de cualquiera que abriera el pedido.
 *
 * El importe ya esta en la orden y el medio de pago en `Order.paymentMethod`:
 * nada de eso se pierde por sacarlo de aca. El documento del pagador, si
 * alguna vez hace falta cruzarlo, esta en Mercado Pago contra este numero.
 */
const referenciaDelPago = (pago: PagoMP): string =>
  `N° de operación: ${pago.id}.`;

type ResultadoAcreditacion = "acreditado" | "ya_procesado" | "sin_stock";

/**
 * Marca el pedido como pagado y descuenta la mercaderia, todo o nada.
 *
 * La idempotencia no se apoya en el `select` previo sino en el `updateMany`
 * con `status: { notIn: ESTADOS_COBRADOS }`: dos avisos simultaneos del mismo
 * pago entran los dos al `if`, pero solo uno actualiza la fila. El otro recibe
 * count 0 y se va sin tocar el stock.
 *
 * Es `notIn` de todos los cobrados y no solo `not: "paid"`: si el admin ya lo
 * paso a "Listo para retirar", un aviso repetido no puede devolverlo a pagado.
 * Y aunque llegue (un pedido cancelado despues de cobrado), el descuento no se
 * repite: descontarStockDelPedido mira si ya tiene su salida por venta.
 */
async function acreditarPedido(
  orden: OrdenParaAcreditar,
  pago: PagoMP,
): Promise<ResultadoAcreditacion> {
  try {
    return await prisma.$transaction(async (tx) => {
      const marcada = await tx.order.updateMany({
        where: { id: orden.id, status: { notIn: [...ESTADOS_COBRADOS] } },
        data: {
          status: ESTADO_PAGADO,
          ...datosDelComprador(pago, orden),
        },
      });

      if (marcada.count === 0) {
        /* Otro aviso del mismo pago gano la carrera y ya descontó el stock. */
        return "ya_procesado" as const;
      }

      const descontado = await descontarStockDelPedido(
        tx,
        orden.id,
        orden.items,
      );

      await tx.orderStatusLog.create({
        data: {
          orderId: orden.id,
          status: ESTADO_PAGADO,
          notes:
            `Pago acreditado correctamente. ${referenciaDelPago(pago)}` +
            (descontado
              ? ""
              : " El stock ya se había descontado antes para este pedido: no se volvió a descontar."),
        },
      });

      return "acreditado" as const;
    });
  } catch (e) {
    if (e instanceof StockInsuficienteError) {
      /* La transaccion volvio atras: ni estado ni stock quedaron tocados. */
      console.error("[webhook mp] pago aprobado sin stock para cubrirlo", {
        orderId: orden.id,
        productId: e.productId,
        pedido: e.pedido,
      });
      return "sin_stock";
    }

    throw e;
  }
}

/**
 * Sobreventa: el pago entro pero la mercaderia no alcanza.
 *
 * La plata ya es nuestra, asi que el pedido igual pasa a "paid" (dejarlo en
 * pendiente haria creer que no se cobro). Lo que no se toca es el stock: el
 * ajuste lo hace una persona, con el aviso a la vista en el historial.
 */
async function marcarPagadoSinStock(orden: OrdenParaAcreditar, pago: PagoMP) {
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orden.id },
      data: {
        status: ESTADO_PAGADO,
        ...datosDelComprador(pago, orden),
      },
    }),
    prisma.orderStatusLog.create({
      data: {
        orderId: orden.id,
        status: ESTADO_PAGADO,
        notes: `Pago acreditado SIN stock suficiente: revisar a mano antes de despachar. ${referenciaDelPago(pago)}`,
      },
    }),
  ]);
}

/** Cambios de estado que no mueven mercaderia (rechazos, pendientes, etc.). */
async function actualizarEstado(
  orden: OrdenParaAcreditar,
  pago: PagoMP,
  nuevoEstado: string,
  nota: string,
) {
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orden.id },
      data: {
        status: nuevoEstado,
        ...datosDelComprador(pago, orden),
      },
    }),
    prisma.orderStatusLog.create({
      data: { orderId: orden.id, status: nuevoEstado, notes: nota },
    }),
  ]);
}

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  /* El body puede venir vacio: hay notificaciones que mandan todo por query. */
  let body: MpWebhookBody | null = null;

  try {
    body = (await request.json()) as MpWebhookBody;
  } catch {
    body = null;
  }

  const tipo =
    body?.type ??
    body?.topic ??
    searchParams.get("type") ??
    searchParams.get("topic");

  /* El id viaja en `data.id` (webhooks) o en `id` / `data.id` de la query
     (IPN y los reintentos manuales del panel de MP). */
  const paymentId =
    (body?.data?.id != null ? String(body.data.id) : null) ??
    searchParams.get("data.id") ??
    searchParams.get("id");

  /* Nos interesan los pagos. `merchant_order`, `plan`, `subscription` y demas
     se aceptan y se descartan antes de mirar la firma: MP no firma todos los
     canales (el IPN viejo y los avisos de QR llegan sin x-signature), y
     contestarles 401 termina con la URL desactivada por "fallas". */
  if (tipo !== "payment") {
    return ok();
  }

  if (!paymentId) {
    /* Sin data.id tampoco se puede armar el manifiesto de la firma. */
    console.warn("[webhook mp] aviso de pago sin id", {
      tipo,
      action: body?.action,
    });
    return ok();
  }

  /* --- Autenticidad ---
     Con MP_WEBHOOK_SECRET seteada se verifica el HMAC del header x-signature.
     Sin esa clave, cualquiera que conozca la URL puede inventar avisos de
     pago aprobado y llevarse mercaderia: no salgas a produccion sin
     configurarla en Tus Integraciones. */
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();

  if (secret) {
    try {
      WebhookSignatureValidator.validate({
        xSignature: request.headers.get("x-signature"),
        xRequestId: request.headers.get("x-request-id"),
        dataId: paymentId,
        secret,
        /* Ventana corta para que un aviso viejo no se pueda reenviar. */
        toleranceSeconds: 300,
      });
    } catch (e) {
      const motivo =
        e instanceof InvalidWebhookSignatureError ? e.reason : "Unknown";

      console.warn("[webhook mp] firma invalida", { motivo, paymentId });

      /* Unico caso en que NO se devuelve 200: no vino de Mercado Pago. */
      return new Response(null, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    /* En produccion no se procesa nada sin firma: sin la clave no hay forma
       de saber si el aviso vino de Mercado Pago. MP reintenta durante dias,
       asi que los avisos rechazados mientras falte la variable se procesan
       solos cuando se configure. Por eso es error y no warning: mientras
       esto aparezca en el log, ningun pago se acredita solo. */
    console.error(
      "[webhook mp] MP_WEBHOOK_SECRET sin configurar: aviso rechazado. Cargala en las variables de entorno de Vercel.",
    );
    return new Response(null, { status: 401 });
  }

  /* Todo lo que sigue se espera antes de responder a proposito: en serverless
     el proceso se congela al devolver la respuesta, asi que un "responder y
     seguir en background" se corta a mitad de camino y el pedido queda sin
     acreditar. MP espera hasta 22 s, de sobra para una consulta y una
     transaccion. */
  try {
    /* ---------- 1. El estado real, preguntado a MP ---------- */
    const payment = new Payment(getMercadoPagoClient());
    const pago = await payment.get({ id: paymentId });

    const referencia = pago.external_reference?.trim();

    console.info("[webhook mp] pago consultado", {
      id: pago.id,
      status: pago.status,
      statusDetail: pago.status_detail,
      externalReference: referencia,
      monto: pago.transaction_amount,
    });

    if (!referencia) {
      /* Un pago sin external_reference no salio de nuestro checkout (o salio
         de una preferencia vieja, anterior a la refactorizacion). */
      console.warn("[webhook mp] pago sin external_reference", {
        paymentId: pago.id,
      });
      return ok();
    }

    /* ---------- 2. El pedido ---------- */
    const orden = await prisma.order.findUnique({
      where: { id: referencia },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        items: { select: { productId: true, quantity: true } },
      },
    });

    if (!orden) {
      console.error("[webhook mp] no existe el pedido del pago", {
        paymentId: pago.id,
        externalReference: referencia,
      });
      return ok();
    }

    /* El pago tiene que cubrir lo que facturamos, en pesos. La tienda no
       suma envio ni recargos, asi que un pago aprobado por menos (o en otra
       moneda) no es una venta normal: no se acredita ni se descuenta stock,
       y queda anotado para que alguien lo mire en Mercado Pago. Por mas
       tampoco deberia pasar, pero la plata alcanza: se acredita y se avisa. */
    const totalOrden = Number(orden.totalAmount);
    const pagado = pago.transaction_amount;
    const cubreElPedido =
      pago.currency_id === "ARS" &&
      pagado != null &&
      pagado >= totalOrden - 0.01;

    if (pagado != null && Math.abs(pagado - totalOrden) > 0.01) {
      console.warn("[webhook mp] el monto pagado no coincide con el pedido", {
        orderId: orden.id,
        pagado,
        moneda: pago.currency_id,
        esperado: totalOrden,
      });
    }

    /* ---------- 3. Mapeo de estados ---------- */
    const nuevoEstado = estadoDesdePago(pago.status);

    if (!nuevoEstado) {
      console.warn("[webhook mp] estado de pago desconocido, no se toca nada", {
        orderId: orden.id,
        status: pago.status,
      });
      return ok();
    }

    /* ---------- 4. Idempotencia ---------- */
    if (
      orden.status === nuevoEstado ||
      (nuevoEstado === ESTADO_PAGADO && esEstadoCobrado(orden.status))
    ) {
      /* El caso tipico: el tercer aviso de un pago ya acreditado, o uno que
         llega cuando el admin ya lo paso a "Listo para retirar" o
         "Entregado". Nada que hacer, y sobre todo nada de volver a descontar
         stock ni de retroceder el estado. */
      console.info("[webhook mp] el pedido ya estaba cobrado", {
        orderId: orden.id,
        status: orden.status,
      });
      return ok();
    }

    if (nuevoEstado === ESTADO_PENDIENTE && esEstadoCobrado(orden.status)) {
      /* Un pago acreditado que vuelve a "en proceso" o entra en mediacion.
         No se retrocede el pedido: un "pendiente" invitaria a marcarlo pagado
         otra vez desde el panel. Queda asentado para que alguien lo mire. */
      await prisma.orderStatusLog.create({
        data: {
          orderId: orden.id,
          status: orden.status,
          notes: `Mercado Pago informa el pago como "${pago.status}" sobre un pedido ya cobrado: revisar en Mercado Pago. ${referenciaDelPago(pago)}`,
        },
      });

      console.warn("[webhook mp] pago cobrado que volvio a pendiente", {
        orderId: orden.id,
        status: pago.status,
      });

      return ok();
    }

    /* ---------- 5. Acreditacion o cambio de estado ---------- */
    if (nuevoEstado === ESTADO_PAGADO && !cubreElPedido) {
      const nota =
        `Mercado Pago aprobó un pago de ${pagado ?? "?"} ${pago.currency_id ?? ""} ` +
        `pero el pedido es de ${totalOrden.toFixed(2)} ARS: NO se acreditó ni se descontó stock. ` +
        `Revisar en Mercado Pago. ${referenciaDelPago(pago)}`;

      /* MP repite los avisos: la nota se escribe una sola vez. */
      const yaAnotado = await prisma.orderStatusLog.findFirst({
        where: { orderId: orden.id, notes: nota },
        select: { id: true },
      });

      if (!yaAnotado) {
        await prisma.orderStatusLog.create({
          data: { orderId: orden.id, status: orden.status, notes: nota },
        });
      }

      console.error("[webhook mp] pago aprobado que no cubre el pedido", {
        orderId: orden.id,
        pagado,
        moneda: pago.currency_id,
        esperado: totalOrden,
      });

      return ok();
    }

    if (nuevoEstado === ESTADO_PAGADO) {
      const resultado = await acreditarPedido(orden, pago);

      if (resultado === "sin_stock") {
        await marcarPagadoSinStock(orden, pago);
      }

      /* El mail de pago confirmado sale aca y en ningun otro lado del flujo
         de MP: recien ahora la orden esta en `paid` y el stock descontado.

         Va fuera de la transaccion, y solo si esta notificacion fue la que
         acredito el pedido: en "ya_procesado" gano otro aviso del mismo pago
         y ese ya mando el mail. Mandarlo igual le duplicaria el correo al
         comprador cada vez que MP reintenta, que es siempre.

         Tambien sale en "sin_stock": el cliente pago y la plata entro; que
         nos falte mercaderia es un problema nuestro, ya anotado en el
         historial para que alguien lo resuelva. */
      if (resultado !== "ya_procesado") {
        await notificarPagoConfirmado(orden.id);
      }

      console.info("[webhook mp] pedido acreditado", {
        orderId: orden.id,
        resultado,
      });

      return ok();
    }

    if (
      nuevoEstado === ESTADO_CANCELADO &&
      esEstadoCobrado(orden.status) &&
      pago.status !== "refunded" &&
      pago.status !== "charged_back"
    ) {
      /* Un rechazo sobre un pedido ya cobrado no revierte nada: es otro
         intento de pago de la misma preferencia (la tarjeta que fallo antes
         de la que funciono), cuyo aviso llego tarde o repetido. Si se tomara
         como reversion, un pedido pagado quedaria cancelado. Solo una
         devolucion o un contracargo le sacan la plata a un pedido cobrado. */
      console.info("[webhook mp] rechazo de otro intento sobre un pedido cobrado, se ignora", {
        orderId: orden.id,
        paymentId: pago.id,
        status: pago.status,
      });

      return ok();
    }

    if (nuevoEstado === ESTADO_CANCELADO && esEstadoCobrado(orden.status)) {
      /* Devolucion o contracargo de algo ya cobrado. El stock NO se repone
         solo: la mercaderia puede estar entregada, y decidir eso es trabajo
         de una persona con el pedido a la vista. */
      await actualizarEstado(
        orden,
        pago,
        ESTADO_CANCELADO,
        `Pago revertido (${pago.status}). El stock NO se repuso: revisar a mano. ${referenciaDelPago(pago)}`,
      );

      console.warn("[webhook mp] pago revertido sobre un pedido ya cobrado", {
        orderId: orden.id,
        status: pago.status,
      });

      return ok();
    }

    await actualizarEstado(
      orden,
      pago,
      nuevoEstado,
      `Estado actualizado desde Mercado Pago (${pago.status}). ${referenciaDelPago(pago)}`,
    );

    console.info("[webhook mp] estado del pedido actualizado", {
      orderId: orden.id,
      de: orden.status,
      a: nuevoEstado,
    });

    return ok();
  } catch (e) {
    /* El error se traga: devolver 500 haria que MP reintente, que es lo que
       queremos si la falla fue transitoria... pero tambien si el pago no
       existe, y ahi reintenta para siempre. Queda en el log para revisar. */
    if (e instanceof MercadoPagoError) {
      console.error("[webhook mp] no se pudo consultar el pago", {
        paymentId,
        status: e.status,
        error: e.error,
      });
    } else {
      console.error("[webhook mp] error inesperado procesando el aviso", {
        paymentId,
        e,
      });
    }
  }

  return ok();
}

/**
 * MP prueba la URL con un GET desde el panel ("Simular notificacion" y el
 * chequeo al guardar la configuracion). Sin esto contesta 405 y el panel
 * marca la integracion como caida.
 */
export async function GET() {
  return ok();
}
