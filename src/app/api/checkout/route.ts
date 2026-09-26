/**
 * POST /api/checkout
 *
 * Crea el pedido y la preferencia de Checkout Pro, y devuelve el `init_point`
 * para que el front redirija.
 *
 * Dos reglas que no se negocian:
 *
 *  1. **El precio lo pone la base, no el navegador.** Del body solo se leen
 *     `productId` y `quantity`; titulo, precio y stock se releen con Prisma.
 *     Si se confiara en el `unit_price` del carrito, cualquiera edita el
 *     localStorage (o el POST directo) y compra una silla de montar a $1.
 *
 *  2. **Primero la orden, despues el cobro.** La `Order` se crea antes de la
 *     preferencia y su `id` viaja como `external_reference`. Es lo unico que
 *     le permite al webhook saber que pedido acreditar: sin ese puente, un
 *     pago aprobado llega sin nada que actualizar.
 */
import { NextResponse } from "next/server";
import { MercadoPagoError, Preference } from "mercadopago";
import { prisma } from "@/app/lib/prisma";
import {
  esAlcanzableDesdeInternet,
  getAppBaseUrl,
  getMercadoPagoClient,
} from "@/app/lib/mercadopago";
import {
  type CheckoutErrorResponse,
  type CheckoutResponse,
} from "@/app/lib/checkout";
import {
  ERROR_DEMASIADOS_PEDIDOS,
  parsearCliente,
  parsearLineas,
  resolverLineas,
  superaLimiteDePedidos,
  totalEnCentavos,
  type LineaResuelta,
} from "@/app/lib/checkoutServer";
import { ESTADO_CANCELADO, ESTADO_PENDIENTE } from "@/app/lib/orders";
import { METODO_MERCADOPAGO } from "@/app/lib/paymentConfig";
import { nombreSucursal } from "@/app/lib/branches";
import { ipDelCliente } from "@/app/lib/rateLimit";

/* Usa el access token y escribe en la base: nunca puede quedar cacheado. */
export const dynamic = "force-dynamic";

function error(mensaje: string, status: number) {
  return NextResponse.json<CheckoutErrorResponse>({ error: mensaje }, { status });
}

export async function POST(request: Request) {
  /* ---------- 1. Body ---------- */
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return error("El body no es JSON valido.", 400);
  }

  const pedidas = parsearLineas(payload);

  if (typeof pedidas === "string") {
    return error(pedidas, 400);
  }

  /* ---------- 2. Precios reales, traidos de la base ---------- */
  let lineas: LineaResuelta[];

  try {
    const resueltas = await resolverLineas(pedidas);

    if (typeof resueltas === "string") {
      return error(resueltas, 400);
    }

    lineas = resueltas;
  } catch (e) {
    console.error("[checkout] fallo la consulta de productos", e);
    return error("No pudimos validar tu carrito. Intentá de nuevo.", 500);
  }

  /* Sin descuento, a proposito: el DESCUENTO_TRANSFERENCIA% es solo del flujo
     de transferencia (checkout/actions.ts), que es donde la tienda se ahorra
     la comision de la pasarela. Aca el total es el subtotal, y tiene que
     coincidir con la suma de los `unit_price` que se le mandan a Mercado Pago
     mas abajo: si se descontara el total sin tocar las lineas, MP rechaza la
     preferencia por inconsistente. */
  const totalCents = totalEnCentavos(lineas);

  /* ---------- 3. Orden en estado pendiente ---------- */
  const cliente = parsearCliente(payload);

  /* Facturacion y retiro: el formulario ya los exige, esto cubre el POST
     directo. */
  if (cliente.error) {
    return error(cliente.error, 400);
  }

  /* La sucursal es obligatoria: sin ella el pedido queda sin saber donde se
     entrega. El formulario ya la exige; esto cubre el POST directo. */
  if (!cliente.sucursal) {
    return error("Elegí la sucursal donde vas a retirar el pedido.", 400);
  }

  /* Recien aca, con todo validado: un formulario mal cargado no gasta
     intentos, solo los pedidos que de verdad se iban a crear. */
  if (
    await superaLimiteDePedidos(
      ipDelCliente(request.headers),
      cliente.orden.customerEmail,
    )
  ) {
    return error(ERROR_DEMASIADOS_PEDIDOS, 429);
  }

  let orden: { id: string };

  try {
    orden = await prisma.order.create({
      data: {
        ...cliente.orden,
        status: ESTADO_PENDIENTE,
        paymentMethod: METODO_MERCADOPAGO,
        /* Decimal se pasa como string para no meter un float en el medio. */
        totalAmount: (totalCents / 100).toFixed(2),
        items: {
          create: lineas.map((linea) => ({
            productId: linea.productId,
            quantity: linea.quantity,
            /* Congela el precio del momento de la compra: si manana sube, el
               pedido viejo sigue valiendo lo que se cobro. */
            priceAtPurchase: (linea.unitPriceCents / 100).toFixed(2),
          })),
        },
        statusLogs: {
          create: {
            status: ESTADO_PENDIENTE,
            notes:
              "Pedido creado desde el checkout con Mercado Pago, esperando el pago. " +
              `Retira en: ${nombreSucursal(cliente.orden.pickupBranch)}.`,
          },
        },
      },
      select: { id: true },
    });
  } catch (e) {
    /* El create anida items y log, y Prisma lo resuelve en una transaccion:
       o entra todo o no entra nada. No queda una orden a medio armar. */
    console.error("[checkout] no se pudo crear el pedido", e);
    return error("No pudimos registrar tu pedido. Intentá de nuevo.", 500);
  }

  /* ---------- 4. Preferencia de Mercado Pago ---------- */
  const baseUrl = getAppBaseUrl();
  const publica = esAlcanzableDesdeInternet(baseUrl);

  try {
    const preference = new Preference(getMercadoPagoClient());

    const respuesta = await preference.create({
      body: {
        items: lineas.map((linea) => ({
          id: linea.productId,
          title: linea.title,
          description: linea.description ?? undefined,
          picture_url: linea.pictureUrl ?? undefined,
          quantity: linea.quantity,
          unit_price: linea.unitPriceCents / 100,
          currency_id: "ARS",
        })),
        /* Solo se manda si el formulario cargo algo: un payer con campos
           vacios es peor que no mandarlo. */
        ...(Object.keys(cliente.payer).length > 0
          ? { payer: cliente.payer }
          : {}),
        back_urls: {
          success: `${baseUrl}/checkout/success`,
          pending: `${baseUrl}/checkout/pending`,
          failure: `${baseUrl}/checkout/failure`,
        },
        /* MP valida que las back_urls sean publicas antes de aceptar
           auto_return y notification_url: en localhost se omiten o la
           preferencia responde 400 (ver esAlcanzableDesdeInternet). */
        ...(publica ? { auto_return: "approved" } : {}),
        ...(publica ? { notification_url: `${baseUrl}/api/webhooks/mp` } : {}),
        /* El puente con nuestro pedido: es lo que lee el webhook. */
        external_reference: orden.id,
        metadata: { order_id: orden.id },
        statement_descriptor: "HARASDELESTE",
      },
      /* Si el front reintenta el POST de esta misma orden, MP devuelve la
         preferencia ya creada en vez de duplicarla. */
      requestOptions: { idempotencyKey: orden.id },
    });

    const initPoint = respuesta.init_point;

    if (!initPoint) {
      throw new Error("Mercado Pago no devolvió un init_point.");
    }

    /* Se guarda para cruzar el pedido con el panel de MP y para los avisos de
       merchant_order. Si este update falla, el pago igual se puede acreditar
       por external_reference: no aborta el checkout. */
    await prisma.order
      .update({
        where: { id: orden.id },
        data: { mpPreferenceId: respuesta.id },
      })
      .catch((e) => {
        console.error("[checkout] no se pudo guardar el mpPreferenceId", {
          orderId: orden.id,
          e,
        });
      });

    return NextResponse.json<CheckoutResponse>({ init_point: initPoint });
  } catch (e) {
    /* El detalle de MP (que campo rechazo) se queda en el log: al cliente no
       le sirve y puede filtrar datos de la cuenta. */
    if (e instanceof MercadoPagoError) {
      console.error("[checkout] Mercado Pago rechazó la preferencia", {
        orderId: orden.id,
        status: e.status,
        error: e.error,
        causes: e.causes,
      });
    } else {
      console.error("[checkout] error inesperado al crear la preferencia", {
        orderId: orden.id,
        e,
      });
    }

    /* La orden existe y ya no va a cobrarse nunca: se cancela en el mismo
       request para no dejar pendientes fantasma en el panel. */
    await prisma.order
      .update({
        where: { id: orden.id },
        data: {
          status: ESTADO_CANCELADO,
          statusLogs: {
            create: {
              status: ESTADO_CANCELADO,
              notes: "No se pudo generar el link de pago de Mercado Pago.",
            },
          },
        },
      })
      .catch((errorCancelacion) => {
        console.error("[checkout] tampoco se pudo cancelar el pedido", {
          orderId: orden.id,
          errorCancelacion,
        });
      });

    return error("No pudimos iniciar el pago. Intentá de nuevo.", 502);
  }
}
