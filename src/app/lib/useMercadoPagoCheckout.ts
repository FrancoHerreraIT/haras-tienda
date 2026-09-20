"use client";

import { useCallback, useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import {
  CHECKOUT_ENDPOINT,
  cartItemsToCheckoutLines,
  type CheckoutCustomer,
  type CheckoutErrorResponse,
  type CheckoutResponse,
} from "@/app/lib/checkout";

interface UseMercadoPagoCheckout {
  /**
   * Crea la preferencia y manda al comprador al Checkout Pro.
   *
   * `customer` lleva facturacion y retiro: el servidor los exige y responde
   * 400 con el motivo si falta algo, que se muestra en `error`.
   */
  handlePayment: (customer?: CheckoutCustomer) => Promise<void>;
  isLoading: boolean;
  /** Mensaje para mostrar al usuario, o null si no hubo falla. */
  error: string | null;
}

/**
 * Arranca el pago con Mercado Pago desde el carrito o el checkout.
 *
 * Lo unico que viaja son los `productId` con su cantidad: el precio, el
 * pedido y la preferencia se arman en el servidor. Lo unico que vuelve es el
 * `init_point`.
 */
export function useMercadoPagoCheckout(): UseMercadoPagoCheckout {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = useCallback(async (customer?: CheckoutCustomer) => {
    /* Se lee con getState() y no con el hook: asi el callback no se recrea en
       cada cambio del carrito y siempre ve el contenido del momento del
       click, no el del render. */
    const items = useCartStore.getState().items;

    if (items.length === 0) {
      setError("Tu carrito está vacío.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const respuesta = await fetch(CHECKOUT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        /* Del carrito solo ids y cantidades: el precio lo resuelve el
           servidor. Los datos de contacto si viajan, porque no hay de donde
           sacarlos de otro lado. */
        body: JSON.stringify({
          items: cartItemsToCheckoutLines(items),
          ...(customer ? { customer } : {}),
        }),
      });

      const datos = (await respuesta.json().catch(() => null)) as
        | CheckoutResponse
        | CheckoutErrorResponse
        | null;

      if (!respuesta.ok || !datos || !("init_point" in datos)) {
        throw new Error(
          datos && "error" in datos
            ? datos.error
            : "No pudimos iniciar el pago.",
        );
      }

      /* Checkout Pro es un dominio de Mercado Pago: se sale de la app, asi
         que va window.location y no el router de Next. El carrito NO se vacia
         todavia; eso pasa al volver por /checkout/success, para no perderlo
         si el comprador abandona el pago. */
      window.location.href = datos.init_point;

      /* A proposito no se apaga isLoading: la pestaña ya esta navegando y
         reactivar el boton solo invita a un segundo click. */
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No pudimos iniciar el pago. Intentá de nuevo.",
      );
      setIsLoading(false);
    }
  }, []);

  return { handlePayment, isLoading, error };
}
