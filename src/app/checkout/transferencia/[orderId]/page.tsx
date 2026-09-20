/**
 * Instrucciones para transferir, despues de registrar el pedido.
 *
 * Repite lo mismo que va en el mail que sale al crear la orden (numero, total
 * y alias) porque el correo puede tardar, caer en spam o no haberse enviado: el
 * comprador tiene que poder transferir sin depender de eso. Y tiene que
 * quedar claro que la compra todavia no esta cerrada — el aviso de pago
 * acreditado llega despues, cuando el pedido pasa a `paid`.
 *
 * La URL lleva el uuid del pedido. No es una pantalla privada — muestra lo
 * que el comprador acaba de cargar — pero el id no es adivinable, asi que no
 * queda expuesta al que pase por la ruta.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { Great_Vibes } from "next/font/google";
import { Clock, Landmark, MapPin, MessageCircle } from "lucide-react";

import { prisma } from "@/app/lib/prisma";
import {
  BANK_TRANSFER,
  DESCUENTO_TRANSFERENCIA,
  METODO_TRANSFERENCIA,
} from "@/app/lib/paymentConfig";
import { buscarSucursal } from "@/app/lib/branches";
import { formatearPesos, numeroDePedido } from "@/app/lib/orderEmail";
import ClearCartOnMount from "@/components/ClearCartOnMount";

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

/* Lee un pedido recien escrito: no puede servirse desde cache. */
export const dynamic = "force-dynamic";

function DatoBancario({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-stone-200/70 py-2.5 last:border-b-0">
      <span className="shrink-0 text-[11px] tracking-wide text-stone-500">
        {label}
      </span>
      <span
        className={`truncate text-sm text-stone-800 ${
          mono ? "font-mono tracking-tight" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default async function TransferenciaConfirmadaPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  const orden = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      totalAmount: true,
      pickupBranch: true,
      paymentMethod: true,
    },
  });

  /* Un id inventado, o un pedido de Mercado Pago entrado por esta ruta, no
     tiene nada que mostrar aca. */
  if (!orden || orden.paymentMethod !== METODO_TRANSFERENCIA) {
    notFound();
  }

  const numero = numeroDePedido(orden.id);
  const total = formatearPesos(Number(orden.totalAmount));
  const sucursal = buscarSucursal(orden.pickupBranch);
  const { comprobante } = BANK_TRANSFER;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      {/* El pedido ya esta guardado: el carrito no hace falta mas. */}
      <ClearCartOnMount />

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

      <main className="w-full px-4 py-12 sm:py-16 md:py-20 flex justify-center">
        <div className="w-full max-w-xl rounded-xl border border-stone-200 bg-white p-6 shadow-sm shadow-stone-200/50 sm:p-10">
          <div className="text-center">
            {/* Reloj y no tilde verde: el pedido esta tomado, pero todavia no
                pagado. Un check en verde aca hace creer que ya esta listo y
                deja al comprador esperando un retiro que no va a salir. */}
            <span className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border border-amber-800/20 bg-amber-50">
              <Clock className="h-8 w-8 text-amber-800" strokeWidth={1.5} />
            </span>

            <h1 className="mb-3 font-[family-name:var(--font-display)] text-2xl text-stone-900 sm:text-3xl">
              Tu pedido está reservado
            </h1>
            <span className="mx-auto mb-6 block h-px w-14 bg-amber-800" />

            <p className="text-[15px] leading-relaxed text-stone-600">
              <strong className="text-stone-800">
                Transferí a esta cuenta. Tu pedido se procesará al confirmar el
                pago.
              </strong>{" "}
              Te mandamos el número de pedido y los datos para transferir a{" "}
              <strong className="text-stone-800">{orden.customerEmail}</strong>.
            </p>

            {/* El mail sale de una casilla de Gmail y con el primer envio a un
                destinatario nuevo es habitual que caiga en Promociones o en
                Spam. Los datos para transferir tambien estan mas abajo en esta
                pantalla, pero el que cierra la pestana los busca en el mail:
                mejor decirle donde mirar antes de que crea que no llego. */}
            {/* 13px explicitos y no `text-sm`: el rem base del sitio esta al
                67% (ver globals.css), asi que text-sm caeria en ~9px, ilegible
                al lado del parrafo de 15px que tiene arriba. */}
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-left text-[13px] leading-relaxed text-amber-700">
              <strong>Importante:</strong> Revisá tu carpeta de Spam o
              Promociones si no encontrás el correo en tu bandeja principal.
            </p>
          </div>

          {/* Lo que el comprador necesita a mano */}
          <dl className="mt-8 space-y-2 border-t border-stone-200 pt-6 text-[13px]">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-stone-500">N° de pedido</dt>
              <dd className="font-mono text-base font-bold tracking-tight text-stone-900">
                {numero}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-stone-500">Total a transferir</dt>
              <dd className="font-[family-name:var(--font-display)] text-2xl text-stone-900 tabular-nums">
                {total}
              </dd>
            </div>
            {/* El importe guardado ya tiene el descuento aplicado, y es menor
                que lo que el comprador sumo en el carrito: sin esta linea, el
                numero se lee como un error y llama para preguntar. */}
            <p className="pt-1 text-right text-[12px] font-medium text-green-700">
              Incluye el {DESCUENTO_TRANSFERENCIA}% de descuento por
              transferencia
            </p>
          </dl>

          <div className="mt-6 rounded-xl border border-amber-800/25 bg-[#F7F5F0] p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
              <Landmark className="h-4 w-4 text-[#8B5A2B]" />
              Datos para transferir
            </h2>

            {/* Alias arriba: es lo que se pega en el homebanking. El titular y
                el banco son de control, van despues. La cuenta es de Mercado
                Pago, asi que no hay CBU ni tipo de cuenta, y el CVU sale
                recien cuando este cargado (ver paymentConfig). */}
            <div className="mt-4">
              <DatoBancario label="Alias" value={BANK_TRANSFER.alias} mono />
              {BANK_TRANSFER.cvu && (
                <DatoBancario label="CVU" value={BANK_TRANSFER.cvu} mono />
              )}
              <DatoBancario label="Titular" value={BANK_TRANSFER.titular} />
              <DatoBancario label="Banco" value={BANK_TRANSFER.banco} />
            </div>

            <div className="mt-5 rounded-lg border border-amber-800/20 bg-amber-50/70 p-4">
              <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-amber-900">
                <MessageCircle className="h-3.5 w-3.5" />
                Último paso
              </p>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">
                Usá <strong>{numero}</strong> como referencia y enviá el
                comprobante por WhatsApp al{" "}
                <a
                  href={`https://wa.me/${comprobante.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-amber-900 underline underline-offset-2 hover:text-[#8B5A2B]"
                >
                  {comprobante.telefono}
                </a>
                . Te avisamos por mail apenas confirmemos el pago.
              </p>
            </div>
          </div>

          {sucursal && (
            <div className="mt-6 flex gap-3 rounded-xl border border-stone-200 p-5">
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-800"
                strokeWidth={1.75}
              />
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-stone-500">
                  RETIRÁS EN
                </p>
                <p className="mt-1 text-[15px] leading-tight text-stone-900">
                  {sucursal.nombre}
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  {sucursal.direccion} · {sucursal.horario}
                </p>
                <p className="mt-2 text-xs text-stone-400">
                  Vas a poder retirarlo una vez confirmado el pago.
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              href="/productos"
              className="inline-block rounded-lg bg-[#8B5A2B] px-8 py-3.5 text-sm font-semibold tracking-wide text-[#F7F5F0] shadow-sm transition-all hover:bg-[#6b4421] active:scale-[0.99]"
            >
              Seguir comprando
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
