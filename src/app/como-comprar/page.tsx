import type { Metadata } from "next";
import {
  CreditCard,
  IdCard,
  PackageCheck,
  ShoppingCart,
  Store,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { getStoreCategories } from "@/app/lib/storeData";
import { DESCUENTO_TRANSFERENCIA } from "@/app/lib/paymentConfig";

/* La barra de rubros del Navbar sale de la base, igual que en /contacto. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cómo comprar | Haras del Este",
  description:
    "El paso a paso para comprar en Haras del Este: elegí tus productos, pagá con Mercado Pago o transferencia y retirá tu pedido en sucursal presentando tu DNI.",
};

/**
 * La serif de los titulos. Igual que en /contacto: NO es `font-serif`, que
 * el @theme de globals.css no mapea a Playfair.
 */
const SERIF = "font-[family-name:var(--font-display)]";

/** Cuerpo de texto de las tarjetas. */
const CUERPO = "text-sm leading-relaxed text-stone-600";

/** Aviso resaltado, el mismo recuadro que usa /contacto. */
const AVISO = "mt-5 rounded-xl border border-orange-100 bg-orange-50/50 p-4";

const PASOS: {
  icono: typeof ShoppingCart;
  titulo: string;
  contenido: React.ReactNode;
}[] = [
  {
    icono: ShoppingCart,
    titulo: "Elegí tus productos",
    contenido: (
      <p className={CUERPO}>
        Agregá los artículos o combos que quieras al carrito. Podés revisar el
        total en cualquier momento.
      </p>
    ),
  },
  {
    icono: CreditCard,
    titulo: "Elegí cómo pagar",
    contenido: (
      <>
        <p className={CUERPO}>
          Al finalizar tu carrito, vas a poder elegir entre dos opciones de
          pago:
        </p>
        <ul className="mt-4 space-y-3">
          <li className={`${CUERPO} border-l-2 border-[#8B5A2B]/30 pl-4`}>
            <span className="font-semibold text-stone-800">Mercado Pago:</span>{" "}
            aboná de forma segura con tarjeta de crédito, débito o dinero en
            cuenta.
          </li>
          <li className={`${CUERPO} border-l-2 border-[#8B5A2B]/30 pl-4`}>
            <span className="font-semibold text-stone-800">
              Transferencia bancaria:
            </span>{" "}
            accedé a un{" "}
            <span className="font-medium text-green-700">
              {DESCUENTO_TRANSFERENCIA}% de descuento
            </span>{" "}
            sobre el total de tu compra.
          </li>
        </ul>
        <div className={AVISO}>
          <h3 className="mb-1 text-sm font-semibold text-orange-900">
            Si pagás por transferencia
          </h3>
          <p className="text-sm leading-relaxed text-orange-800/80">
            Tenés un plazo máximo de <strong>24 horas</strong> para enviar el
            comprobante. De lo contrario, el pedido se cancela para liberar el
            stock.
          </p>
        </div>
      </>
    ),
  },
  {
    icono: PackageCheck,
    titulo: "Confirmación y preparación",
    contenido: (
      <p className={CUERPO}>
        Una vez acreditado el pago, vas a recibir un correo de confirmación.
        Nuestro equipo comenzará a preparar tu pedido inmediatamente.
      </p>
    ),
  },
  {
    icono: Store,
    titulo: "Retiro en sucursal",
    contenido: (
      <>
        <p className={CUERPO}>
          Cuando tu pedido esté empaquetado, te va a llegar un mail avisando que
          ya está “Listo para retirar” en la sucursal que elegiste.
        </p>
        {/* Dentro del ultimo paso: es lo que mas se pregunta en el mostrador. */}
        <div className={`${AVISO} flex gap-3`}>
          <IdCard
            className="mt-0.5 h-4 w-4 shrink-0 text-orange-900"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <div>
            <h3 className="mb-1 text-sm font-semibold text-orange-900">
              Importante
            </h3>
            <p className="text-sm leading-relaxed text-orange-800/80">
              Para entregar el paquete, la persona que retira solo debe
              acercarse a la sucursal y presentar su DNI (o el de la persona que
              realizó la compra). No es necesario presentar códigos de
              seguimiento.
            </p>
          </div>
        </div>
      </>
    ),
  },
];

/**
 * Guia de compra: los cuatro pasos desde el carrito hasta el retiro.
 *
 * Misma jerarquia tipografica que /contacto: versalitas arriba del titulo,
 * titulo en serif, cuerpo en text-sm. Los pasos van en una lista ordenada de
 * tarjetas, una debajo de la otra: es texto para leer de arriba a abajo.
 */
export default async function ComoComprarPage() {
  const categories = await getStoreCategories();

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F7F5F0] text-stone-800">
      <Navbar categories={categories} />

      {/* max-w en px por el :root al 67% (ver /contacto). */}
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 py-12 md:px-8">
        <header className="mb-16 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
            Guía de compra
          </p>
          <h1 className={`${SERIF} mt-4 text-4xl text-stone-900`}>
            Cómo comprar y retirar tu pedido
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-stone-600">
            Te explicamos el paso a paso para que tengas tus productos de Haras
            del Este de forma rápida y segura.
          </p>
        </header>

        <ol className="space-y-6">
          {PASOS.map(({ icono: Icono, titulo, contenido }, i) => (
            <li
              key={titulo}
              className="flex flex-col gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:gap-6 md:p-8"
            >
              {/* En mobile el numero va arriba y el texto usa todo el ancho;
                  desde sm pasa a una columna a la izquierda. */}
              <div className="flex shrink-0 items-center gap-3 sm:flex-col">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8B5A2B] font-sans text-lg font-semibold text-white">
                  {i + 1}
                </span>
                <Icono
                  className="h-6 w-6 text-[#8B5A2B]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  Paso {i + 1}
                </p>
                <h2 className={`${SERIF} mt-2 mb-4 text-2xl text-stone-900`}>
                  {titulo}
                </h2>
                {contenido}
              </div>
            </li>
          ))}
        </ol>
      </main>

      <Footer />
      <CartDrawer />
    </div>
  );
}
