"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

export default function CartDrawer() {
  const router = useRouter();
  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const totalPrice = useCartStore((state) => state.getTotalPrice());

  const goToCheckout = () => {
    closeCart();
    router.push("/checkout");
  };

  /* Escape cierra, y el fondo no scrollea mientras el panel esta abierto:
     en mobile el drawer ocupa toda la pantalla y sin esto se ve la pagina
     moverse por detras. */
  useEffect(() => {
    if (!isCartOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeCart();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isCartOpen, closeCart]);

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        onClick={closeCart}
        aria-label="Cerrar carrito"
        tabIndex={isCartOpen ? 0 : -1}
        className={`fixed inset-0 cursor-default bg-black/50 z-50 transition-opacity duration-300 ${
          isCartOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel lateral */}
      {/* h-dvh y no h-full: en mobile la barra del navegador cambia de alto y
          con 100vh el footer del carrito quedaba tapado. */}
      <aside
        className={`fixed top-0 right-0 h-dvh w-full sm:w-[420px] max-w-full bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal={isCartOpen}
        aria-label="Tu carrito"
        inert={!isCartOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-stone-200 shrink-0">
          <h2 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl text-stone-900">
            Tu Carrito
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Cerrar carrito"
            className="-mr-2 flex h-11 w-11 items-center justify-center text-stone-500 hover:text-amber-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-stone-400 gap-3">
              <ShoppingBag className="w-12 h-12" strokeWidth={1} />
              <p className="text-sm">Todavía no agregaste productos.</p>
            </div>
          ) : (
            <ul className="space-y-5">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4">
                  <div className="relative w-20 h-20 overflow-hidden rounded-lg bg-[#F7F5F0] border border-stone-100 flex items-center justify-center shrink-0">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <ShoppingBag
                        className="w-7 h-7 text-stone-300"
                        strokeWidth={1}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-stone-400 font-bold tracking-wide">
                      {item.categoryName}
                    </span>
                    <h4 className="text-sm font-medium text-stone-800 leading-snug line-clamp-2 mb-2">
                      {item.title}
                    </h4>

                    <div className="flex items-center justify-between">
                      {/* Area tocable de 40px: con 24px era muy dificil
                          acertar el boton desde el telefono. */}
                      <div className="flex items-center border border-stone-200 rounded-full">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label="Restar cantidad"
                          className="flex h-10 w-10 items-center justify-center rounded-full text-stone-600 hover:text-amber-800"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-bold w-6 text-center tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          aria-label="Sumar cantidad"
                          className="flex h-10 w-10 items-center justify-center rounded-full text-stone-600 hover:text-amber-800 disabled:text-stone-300 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <span className="font-bold text-stone-900 text-sm tabular-nums">
                        $ {(item.price * item.quantity).toLocaleString("es-AR")}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    aria-label="Eliminar producto"
                    className="-mt-2 -mr-2 flex h-10 w-10 shrink-0 items-center justify-center self-start text-stone-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer. El padding inferior suma el area segura en vez de
            reemplazarlo: con pb-safe solo, en telefonos sin barra gestual
            quedaba en 0 y el boton pegado al borde. */}
        {items.length > 0 && (
          <div className="shrink-0 border-t border-stone-200 px-4 sm:px-6 pt-4 sm:pt-5 pb-[calc(2rem_+_env(safe-area-inset-bottom,0px))] sm:pb-[calc(1.25rem_+_env(safe-area-inset-bottom,0px))] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-500">Total</span>
              <span className="font-[family-name:var(--font-display)] text-2xl text-stone-900">
                $ {totalPrice.toLocaleString("es-AR")}
              </span>
            </div>

            <button
              type="button"
              onClick={goToCheckout}
              className="w-full bg-[#8B5A2B] hover:bg-[#6b4421] active:scale-[0.98] text-[#F7F5F0] font-semibold tracking-wide py-4 rounded-lg text-sm transition-all shadow-sm"
            >
              Iniciar compra
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
