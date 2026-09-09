"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Devuelve `false` durante el render del servidor y el primer render del
 * cliente, y `true` una vez montado.
 *
 * Sirve para envolver cualquier cosa que dependa de estado persistido en
 * localStorage (el carrito de Zustand), donde el HTML del servidor no puede
 * coincidir con el del cliente y React tira `Hydration failed`.
 */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true, // cliente
    () => false // servidor
  );
}
