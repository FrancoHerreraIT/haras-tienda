"use client";

import { use, useEffect } from "react";
import { useCartStore } from "@/store/useCartStore";
import CheckoutStatus from "@/components/CheckoutStatus";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** MP puede repetir un parametro; nos alcanza el primer valor. */
function primero(valor: string | string[] | undefined): string | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

/**
 * Retorno exitoso del Checkout Pro (back_urls.success).
 *
 * Es un componente cliente porque tiene que tocar localStorage: el carrito
 * persistido de Zustand se vacia recien aca, cuando el pago volvio aprobado.
 * Si se limpiara antes de redirigir a MP, el que abandona el pago perderia la
 * seleccion.
 */
export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  /* En el App Router los searchParams de una pagina son una promesa; en un
     componente cliente se desenvuelven con use(). */
  const params = use(searchParams);

  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    /* Idempotente: si el comprador refresca la pantalla, vuelve a vaciar un
       carrito que ya esta vacio y no pasa nada. */
    clearCart();
  }, [clearCart]);

  return (
    <CheckoutStatus
      variant="success"
      paymentId={primero(params.payment_id) ?? primero(params.collection_id)}
      status={primero(params.status) ?? primero(params.collection_status)}
      externalReference={primero(params.external_reference)}
    />
  );
}
