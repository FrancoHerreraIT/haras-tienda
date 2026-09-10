"use client";

import { useState } from "react";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";

import { useCartStore } from "@/store/useCartStore";
import { portada, type StoreProduct } from "@/app/lib/storeData";

/**
 * Compra desde la ficha: a diferencia del listado, aca se elige cuantas
 * unidades llevar antes de sumar al carrito.
 */
export default function AddToCartButton({
  product,
}: {
  product: StoreProduct;
}) {
  const addToCart = useCartStore((state) => state.addToCart);
  const [cantidad, setCantidad] = useState(1);
  const [sumado, setSumado] = useState(false);

  const agotado = product.stock <= 0;

  function sumar() {
    /* El store suma de a uno y respeta el stock. */
    for (let i = 0; i < cantidad; i++) {
      addToCart({
        id: product.id,
        title: product.title,
        price: product.price,
        imageUrl: portada(product),
        categoryName: product.categoryName,
        stock: product.stock,
      });
    }
    setSumado(true);
    setTimeout(() => setSumado(false), 2000);
  }

  if (agotado) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-lg bg-stone-200 py-4 text-sm font-semibold tracking-wide text-stone-400"
      >
        Sin stock
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="flex items-center justify-between rounded-lg border border-stone-300 sm:justify-start">
        <button
          type="button"
          onClick={() => setCantidad((c) => Math.max(1, c - 1))}
          disabled={cantidad <= 1}
          aria-label="Restar una unidad"
          className="flex h-12 w-12 items-center justify-center rounded-lg text-stone-600 transition-colors hover:text-amber-800 disabled:text-stone-300"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-10 text-center text-sm font-bold tabular-nums">
          {cantidad}
        </span>
        <button
          type="button"
          onClick={() => setCantidad((c) => Math.min(product.stock, c + 1))}
          disabled={cantidad >= product.stock}
          aria-label="Sumar una unidad"
          className="flex h-12 w-12 items-center justify-center rounded-lg text-stone-600 transition-colors hover:text-amber-800 disabled:text-stone-300"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={sumar}
        className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-4 text-sm font-semibold tracking-wide text-[#F7F5F0] transition-all active:scale-[0.99] ${
          sumado ? "bg-emerald-700" : "bg-[#8B5A2B] hover:bg-[#6b4421]"
        }`}
      >
        {sumado ? (
          <>
            <Check className="h-4 w-4" />
            Agregado al carrito
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" />
            Sumar al carrito
          </>
        )}
      </button>
    </div>
  );
}
