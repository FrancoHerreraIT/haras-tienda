"use client";

import { useEffect } from "react";
import { useCartStore } from "@/store/useCartStore";

/**
 * Vacia el carrito al montar.
 *
 * El carrito vive en localStorage, asi que solo se puede tocar desde el
 * cliente: una pantalla de confirmacion que es Server Component monta esto
 * para soltarlo. Es idempotente — si el comprador refresca, vuelve a vaciar
 * un carrito que ya esta vacio y no pasa nada.
 */
export default function ClearCartOnMount() {
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return null;
}
