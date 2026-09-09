"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Landmark, Lock, Package, ShoppingBag } from "lucide-react";
import { Great_Vibes } from "next/font/google";
import { useCartStore } from "@/store/useCartStore";
import { useHydrated } from "@/app/lib/useHydrated";
import TransferPanel from "@/components/TransferPanel";
import { PAYMENT_METHODS, type PaymentMethod } from "@/app/lib/paymentConfig";

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const inputClass =
  "w-full bg-white border border-stone-300 rounded-lg px-4 py-3 text-[15px] text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/40 transition-all";

const labelClass =
  "block text-[11px] uppercase tracking-[0.18em] text-stone-500 font-semibold mb-2";

interface FieldProps
  extends Omit<React.ComponentPropsWithoutRef<"input">, "id" | "className"> {
  id: string;
  label: string;
  className?: string;
}

function Field({ id, label, className = "", ...inputProps }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input id={id} name={id} className={inputClass} {...inputProps} />
    </div>
  );
}

export default function CheckoutPage() {
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.getTotalPrice());
  /* Unidades, no lineas: dos veces el mismo producto cuentan como dos. */
  const totalUnidades = useCartStore((state) => state.getTotalItems());

  /* El store se rehidrata desde localStorage recién en el cliente */
  const mounted = useHydrated();

  const [metodoPago, setMetodoPago] = useState<PaymentMethod>("mercadopago");
  const esTransferencia = metodoPago === "transferencia";

  /* El envio no se cobra, asi que el total es el subtotal del carrito. */
  const total = mounted ? subtotal : 0;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      {/* Cabecera sobria del checkout */}
      <header className="bg-[#1C1A19] text-stone-100">
        <div className="w-full px-4 md:px-12 lg:px-24 xl:px-32 py-4 sm:py-5 flex items-center justify-between gap-3 sm:gap-6">
          <Link href="/" className="shrink-0 leading-none">
            <span
              className={`${greatVibes.className} block text-2xl md:text-3xl text-stone-50`}
            >
              Haras del Este
            </span>
          </Link>
          <span className="flex shrink-0 items-center gap-2 text-[10px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.24em] text-stone-400">
            <Lock className="w-3.5 h-3.5 shrink-0 text-amber-700" />
            <span className="hidden min-[380px]:inline">Compra protegida</span>
            <span className="min-[380px]:hidden">Segura</span>
          </span>
        </div>
      </header>

      <main className="w-full px-4 md:px-12 lg:px-24 xl:px-32 py-8 sm:py-10 md:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2 py-3 text-sm text-stone-500 hover:text-amber-800 transition-colors mb-5 sm:mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Seguir comprando
        </Link>

        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl md:text-4xl text-stone-900 mb-2">
          Finalizar compra
        </h1>
        <span className="block w-14 h-px bg-amber-800 mb-10" />

        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12 items-start">
          {/* ---------- Columna izquierda: formulario ---------- */}
          <form
            onSubmit={(e) => e.preventDefault()}
            className="w-full lg:flex-1 space-y-6"
          >
            {/* Datos de contacto */}
            <section className="bg-white border border-stone-200 rounded-xl shadow-sm shadow-stone-200/50 p-5 sm:p-6 md:p-8">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-stone-900 mb-1">
                Datos de contacto
              </h2>
              <p className="text-sm text-stone-500 mb-6">
                Te enviamos el seguimiento del pedido a este correo.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field
                  id="email"
                  label="Email"
                  type="email"
                  placeholder="tunombre@correo.com"
                  autoComplete="email"
                />
                <Field
                  id="telefono"
                  label="Teléfono"
                  type="tel"
                  placeholder="351 000 0000"
                  autoComplete="tel"
                />
              </div>
            </section>

            {/* Datos de envío */}
            <section className="bg-white border border-stone-200 rounded-xl shadow-sm shadow-stone-200/50 p-5 sm:p-6 md:p-8">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-stone-900 mb-1">
                Datos de envío
              </h2>
              <p className="text-sm text-stone-500 mb-6">
                Despachamos a todo el país en 3 a 7 días hábiles.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field
                  id="nombre"
                  label="Nombre"
                  placeholder="Juan"
                  autoComplete="given-name"
                />
                <Field
                  id="apellido"
                  label="Apellido"
                  placeholder="Pérez"
                  autoComplete="family-name"
                />
                <Field
                  id="dni"
                  label="DNI"
                  inputMode="numeric"
                  placeholder="30 123 456"
                />
                <Field
                  id="codigo-postal"
                  label="Código postal"
                  inputMode="numeric"
                  placeholder="5000"
                  autoComplete="postal-code"
                />
                <Field
                  id="direccion"
                  label="Dirección"
                  placeholder="Calle, número, piso / depto"
                  autoComplete="street-address"
                  className="sm:col-span-2"
                />
                <Field
                  id="ciudad"
                  label="Ciudad"
                  placeholder="Córdoba"
                  autoComplete="address-level2"
                  className="sm:col-span-2"
                />
              </div>
            </section>

            {/* Forma de pago */}
            <section className="bg-white border border-stone-200 rounded-xl shadow-sm shadow-stone-200/50 p-5 sm:p-6 md:p-8">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-stone-900 mb-1">
                Forma de pago
              </h2>
              <p className="text-sm text-stone-500 mb-6">
                Elegí cómo querés abonar tu pedido.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(
                  Object.keys(PAYMENT_METHODS) as PaymentMethod[]
                ).map((key) => {
                  const seleccionado = metodoPago === key;
                  return (
                    <label
                      key={key}
                      className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                        seleccionado
                          ? "border-[#8B5A2B] bg-[#8B5A2B]/5 ring-2 ring-[#8B5A2B]/20"
                          : "border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      <span className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="metodoPago"
                          value={key}
                          checked={seleccionado}
                          onChange={() => setMetodoPago(key)}
                          className="mt-0.5 h-5 w-5 shrink-0 accent-[#8B5A2B]"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-stone-800">
                            {PAYMENT_METHODS[key].label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">
                            {PAYMENT_METHODS[key].hint}
                          </span>
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              {esTransferencia && <TransferPanel />}
            </section>
          </form>

          {/* ---------- Columna derecha: resumen ---------- */}
          <aside className="w-full lg:w-[400px] xl:w-[440px] shrink-0 lg:sticky lg:top-8">
            <div className="bg-white border border-stone-200 rounded-xl shadow-sm shadow-stone-200/50 p-5 sm:p-6 md:p-8">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-stone-900 mb-6">
                Resumen de compra
              </h2>

              {!mounted ? (
                /* Placeholder mientras el store se hidrata */
                <div className="space-y-4" aria-hidden>
                  {[0, 1].map((i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                      <div className="w-16 h-16 rounded-lg bg-stone-100 shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 bg-stone-100 rounded w-3/4" />
                        <div className="h-3 bg-stone-100 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-10 text-stone-400">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3" strokeWidth={1} />
                  <p className="text-sm text-stone-500 mb-5">
                    Tu carrito está vacío.
                  </p>
                  <Link
                    href="/#productos"
                    className="inline-block bg-[#8B5A2B] hover:bg-[#6b4421] text-[#F7F5F0] font-semibold uppercase tracking-[0.14em] text-xs px-7 py-3 rounded-lg transition-colors"
                  >
                    Ver productos
                  </Link>
                </div>
              ) : (
                <>
                  <ul className="space-y-5 max-h-[340px] overflow-y-auto pr-1">
                    {items.map((item) => (
                      <li key={item.id} className="flex gap-4">
                        <div className="relative w-16 h-16 overflow-hidden rounded-lg bg-[#F7F5F0] border border-stone-100 flex items-center justify-center shrink-0">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.title}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          ) : (
                            <Package
                              className="w-7 h-7 text-stone-300"
                              strokeWidth={1}
                            />
                          )}
                          <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#8B5A2B] text-[11px] font-bold text-white leading-none">
                            {item.quantity}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-amber-800/80 font-semibold uppercase tracking-[0.2em]">
                            {item.categoryName}
                          </span>
                          <h3 className="text-sm text-stone-800 leading-snug line-clamp-2 mt-0.5">
                            {item.title}
                          </h3>
                          {/* Precio unitario x cantidad: sin esto el importe
                              de la derecha se leia como el de una sola unidad. */}
                          <p className="mt-1 text-xs text-stone-500 tabular-nums">
                            $ {item.price.toLocaleString("es-AR")} c/u
                            <span className="mx-1 text-stone-300">·</span>
                            <span className="font-semibold text-stone-600">
                              x {item.quantity}
                            </span>
                          </p>
                        </div>

                        <span className="text-sm font-semibold text-stone-900 whitespace-nowrap tabular-nums">
                          $ {(item.price * item.quantity).toLocaleString("es-AR")}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Totales */}
                  <div className="border-t border-stone-200 mt-6 pt-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">
                        Subtotal ({totalUnidades}{" "}
                        {totalUnidades === 1 ? "producto" : "productos"})
                      </span>
                      <span className="text-stone-800 tabular-nums">
                        $ {subtotal.toLocaleString("es-AR")}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline border-t border-stone-200 pt-4 mt-4">
                      <span className="text-[11px] uppercase tracking-[0.24em] text-stone-500 font-semibold">
                        Total
                      </span>
                      <span className="font-[family-name:var(--font-display)] text-3xl text-stone-900 tabular-nums">
                        $ {total.toLocaleString("es-AR")}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`w-full mt-7 active:scale-[0.99] text-white font-bold py-4 rounded-lg text-[15px] transition-all shadow-sm ${
                      esTransferencia
                        ? "bg-[#8B5A2B] hover:bg-[#6b4421]"
                        : "bg-[#009EE3] hover:bg-[#0089C7]"
                    }`}
                  >
                    {esTransferencia
                      ? "Confirmar pedido"
                      : "Pagar con Mercado Pago"}
                  </button>

                  <p className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400 mt-4">
                    {esTransferencia ? (
                      <>
                        <Landmark className="w-3 h-3" />
                        Reservamos tu pedido hasta recibir el comprobante
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        Pago procesado de forma segura
                      </>
                    )}
                  </p>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
