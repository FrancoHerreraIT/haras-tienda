import Link from "next/link";
import { Great_Vibes } from "next/font/google";
import { CircleCheckBig, CircleX, Clock, type LucideIcon } from "lucide-react";

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export type CheckoutStatusVariant = "success" | "pending" | "failure";

interface Estilo {
  icono: LucideIcon;
  colorIcono: string;
  fondoIcono: string;
  titulo: string;
  detalle: string;
  /* Adonde conviene mandarlo segun como termino el pago. */
  accion: { href: string; label: string };
}

const ESTILOS: Record<CheckoutStatusVariant, Estilo> = {
  success: {
    icono: CircleCheckBig,
    colorIcono: "text-emerald-700",
    fondoIcono: "bg-emerald-50 border-emerald-100",
    titulo: "¡Gracias por tu compra!",
    detalle:
      "Recibimos tu pago. Te enviamos el detalle del pedido por correo y te avisamos apenas esté listo para retirar.",
    accion: { href: "/productos", label: "Seguir comprando" },
  },
  pending: {
    icono: Clock,
    colorIcono: "text-amber-700",
    fondoIcono: "bg-amber-50 border-amber-100",
    titulo: "Tu pago está en proceso",
    detalle:
      "Mercado Pago todavía no confirmó la operación. Suele tardar unos minutos, y si pagaste en efectivo puede demorar hasta 48 h hábiles. Te avisamos por correo en cuanto se acredite.",
    accion: { href: "/", label: "Volver al inicio" },
  },
  failure: {
    icono: CircleX,
    colorIcono: "text-red-700",
    fondoIcono: "bg-red-50 border-red-100",
    titulo: "No pudimos procesar el pago",
    detalle:
      "El pago fue rechazado y no se hizo ningún cargo. Tu carrito sigue como lo dejaste: podés intentar con otro medio de pago.",
    accion: { href: "/checkout", label: "Volver a intentar" },
  },
};

export interface CheckoutStatusProps {
  variant: CheckoutStatusVariant;
  /** `payment_id` que agrega Mercado Pago al volver, si vino. */
  paymentId?: string | null;
  /** `status` del pago informado en la URL de retorno. */
  status?: string | null;
  /** Nuestra referencia de la compra (`external_reference`). */
  externalReference?: string | null;
}

/**
 * Pantalla de retorno del Checkout Pro.
 *
 * Lo que se muestra viene de la query string, que el comprador puede editar:
 * sirve para orientarlo, no como confirmacion. El estado real del pedido lo
 * fija el webhook (/api/webhooks/mp).
 */
export default function CheckoutStatus({
  variant,
  paymentId,
  status,
  externalReference,
}: CheckoutStatusProps) {
  const estilo = ESTILOS[variant];
  const Icono = estilo.icono;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <header className="bg-[#1C1A19] text-stone-100">
        <div className="w-full px-4 md:px-12 lg:px-24 xl:px-32 py-4 sm:py-5">
          <Link href="/" className="shrink-0 leading-none">
            <span
              className={`${greatVibes.className} block text-2xl md:text-3xl text-stone-50`}
            >
              Haras del Este
            </span>
          </Link>
        </div>
      </header>

      <main className="w-full px-4 py-12 sm:py-16 md:py-24 flex justify-center">
        <div className="w-full max-w-xl bg-white border border-stone-200 rounded-xl shadow-sm shadow-stone-200/50 p-6 sm:p-10 text-center">
          <span
            className={`inline-flex items-center justify-center w-16 h-16 rounded-full border ${estilo.fondoIcono} mb-6`}
          >
            <Icono className={`w-8 h-8 ${estilo.colorIcono}`} strokeWidth={1.5} />
          </span>

          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-stone-900 mb-3">
            {estilo.titulo}
          </h1>
          <span className="block w-14 h-px bg-amber-800 mx-auto mb-6" />

          <p className="text-[15px] leading-relaxed text-stone-600">
            {estilo.detalle}
          </p>

          {(paymentId || externalReference) && (
            <dl className="mt-8 border-t border-stone-200 pt-6 space-y-2 text-left text-[13px]">
              {paymentId && (
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500">Nº de operación</dt>
                  <dd className="font-semibold text-stone-800 tabular-nums">
                    {paymentId}
                  </dd>
                </div>
              )}
              {status && (
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500">Estado informado</dt>
                  <dd className="font-semibold text-stone-800">{status}</dd>
                </div>
              )}
              {externalReference && (
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500">Referencia</dt>
                  <dd className="font-mono text-[11px] text-stone-600 break-all">
                    {externalReference}
                  </dd>
                </div>
              )}
            </dl>
          )}

          <Link
            href={estilo.accion.href}
            className="inline-block mt-8 bg-[#8B5A2B] hover:bg-[#6b4421] active:scale-[0.99] text-[#F7F5F0] font-semibold tracking-wide text-sm px-8 py-3.5 rounded-lg transition-all shadow-sm"
          >
            {estilo.accion.label}
          </Link>
        </div>
      </main>
    </div>
  );
}
