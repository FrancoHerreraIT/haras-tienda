import type { Metadata } from "next";
import { ArrowRight, Clock, Mail, MapPin, MessageCircle } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import CopyableRow from "@/components/CopyableRow";
import InstagramGlyph from "@/components/InstagramGlyph";
import { getStoreCategories } from "@/app/lib/storeData";
import {
  BANK_TRANSFER,
  DESCUENTO_TRANSFERENCIA,
} from "@/app/lib/paymentConfig";
import { STORE_CONTACT } from "@/app/lib/contacto";
import { PICKUP_BRANCHES } from "@/app/lib/branches";

/* La barra de rubros del Navbar sale de la base, igual que en el catalogo:
   un rubro nuevo tiene que aparecer aca sin recompilar. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contacto | Haras del Este",
  description:
    "Escribinos por WhatsApp o mail, seguinos en Instagram y consultá los datos bancarios de Haras del Este para transferir tu pedido.",
};

/**
 * La serif de los titulos.
 *
 * NO es `font-serif`: el @theme de globals.css no define --font-serif, asi que
 * esa clase cae al stack propio de Tailwind (ui-serif, Georgia) y no a
 * Playfair. `font-sans` en cambio si esta mapeado (--font-sans, Source Sans),
 * por eso los datos de contacto lo usan tal cual.
 */
const SERIF = "font-[family-name:var(--font-display)]";

/** Tarjeta base. Las cinco comparten fondo, borde y radio. */
const TARJETA = "rounded-2xl border border-stone-200 bg-white p-8 shadow-sm";

/** Rotulo en versalitas sobre el dato. */
const ROTULO =
  "text-xs font-bold uppercase tracking-widest text-stone-400 mt-4 mb-2";

/**
 * Enlace de accion.
 *
 * El cuero va en hex porque `text-brown-600` no existe en Tailwind. El @theme
 * define --color-cuero, pero todavia ningun componente usa esa clase: hasta
 * que se migre el resto, el hex es lo que hace juego con el sitio.
 */
const ENLACE =
  "group mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-[#8B5A2B] transition-colors hover:text-[#6b4421]";

/**
 * Tarjeta de un medio de contacto.
 *
 * `items-center text-center` y el enlace con `mt-auto`: las tres tarjetas de
 * la fila salen con la altura de la mas alta, y sin el mt-auto cada enlace
 * quedaba a distinta altura segun cuanto texto tuviera arriba.
 */
function TarjetaContacto({
  icono,
  rotulo,
  valor,
  hint,
  href,
  accion,
  externo = false,
}: {
  icono: React.ReactNode;
  rotulo: string;
  valor: string;
  hint: string;
  href: string;
  accion: string;
  externo?: boolean;
}) {
  return (
    <div
      className={`${TARJETA} flex flex-col items-center text-center transition-shadow hover:shadow-md`}
    >
      <span className="text-[#8B5A2B]">{icono}</span>

      <p className={ROTULO}>{rotulo}</p>

      {/* font-sans explicito: el dato de contacto no va en serif. */}
      <p className="break-words font-sans text-lg font-semibold text-stone-800">
        {valor}
      </p>

      <p className="mt-2 mb-6 text-sm text-stone-500">{hint}</p>

      <a
        href={href}
        /* mailto no abre pestaña; los otros dos salen del sitio. */
        {...(externo
          ? { target: "_blank", rel: "noopener noreferrer" }
          : undefined)}
        className={ENLACE}
      >
        {accion}
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </a>
    </div>
  );
}

/**
 * La pagina de contacto.
 *
 * Junta lo que el cliente viene a buscar cuando algo no salio como esperaba:
 * a quien escribirle, por donde, y — sobre todo — el alias. Al registrar el
 * pedido sale un mail con esos datos, pero puede tardar o caer en spam: esta
 * pagina es la red de seguridad del que cerro la pestaña del checkout antes
 * de copiar el alias.
 *
 * Dos filas de tarjetas: arriba los tres canales, abajo los dos bloques de
 * datos. Nada de columnas de distinto largo que terminan desbalanceadas.
 */
export default async function ContactoPage() {
  const categories = await getStoreCategories();

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F7F5F0] text-stone-800">
      <Navbar categories={categories} />

      {/* max-w en px y no max-w-7xl: el :root del sitio esta al 67%
          (globals.css), asi que las medidas en rem se achican con el — 7xl
          (80rem) daria ~858px reales. En px el ancho es el que dice. */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-12 md:px-8">
        <header className="mb-16 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
            Estamos para ayudarte
          </p>
          <h1 className={`${SERIF} mt-4 text-4xl text-stone-900`}>Contacto</h1>
          {/* Topado y centrado: un renglon de punta a punta no se puede leer. */}
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-stone-600">
            Consultas sobre un pedido, un producto o una transferencia:
            escribinos por donde te quede más cómodo. Atendemos{" "}
            {STORE_CONTACT.horarioAtencion.toLowerCase()}.
          </p>
        </header>

        {/* ---------- Fila 1: los tres canales ---------- */}
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* WhatsApp primero: es por donde llega casi todo. */}
          <TarjetaContacto
            icono={<MessageCircle className="h-6 w-6" strokeWidth={1.5} />}
            rotulo="WhatsApp"
            valor={STORE_CONTACT.whatsapp.display}
            hint="La vía más rápida. Es también el número donde se envían los comprobantes de transferencia."
            href={STORE_CONTACT.whatsapp.url}
            accion="Escribinos"
            externo
          />
          <TarjetaContacto
            icono={<Mail className="h-6 w-6" strokeWidth={1.5} />}
            rotulo="Atención al cliente"
            valor={STORE_CONTACT.email}
            hint="Para consultas que necesitan adjuntar algo: comprobantes, facturas o fotos de un producto."
            href={`mailto:${STORE_CONTACT.email}`}
            accion="Enviar un mail"
          />
          <TarjetaContacto
            icono={<InstagramGlyph className="h-6 w-6" />}
            rotulo="Instagram"
            valor={STORE_CONTACT.instagram.handle}
            hint="Las piezas nuevas, los combos de temporada y lo que sale del taller."
            href={STORE_CONTACT.instagram.url}
            accion="Seguinos"
            externo
          />
        </div>

        {/* ---------- Fila 2: banco y retiro ---------- */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className={TARJETA}>
            <h2 className={`${SERIF} mb-6 text-2xl text-stone-900`}>
              Datos bancarios
            </h2>

            {/* Fondo apenas insinuado: agrupa los seis renglones sin que la
                tabla pese mas que la tarjeta que la contiene. */}
            <div className="rounded-xl bg-stone-50 p-4">
              <CopyableRow
                label="Alias"
                value={BANK_TRANSFER.alias}
                copyable
                mono
              />
              {/* La cuenta es de Mercado Pago: no hay CBU ni tipo de cuenta, y
                  el CVU recien se muestra cuando este cargado en
                  paymentConfig. Con el alias alcanza para transferir. */}
              {BANK_TRANSFER.cvu && (
                <CopyableRow
                  label="CVU"
                  value={BANK_TRANSFER.cvu}
                  copyable
                  mono
                />
              )}
              <CopyableRow label="Titular" value={BANK_TRANSFER.titular} />
              <CopyableRow label="Banco" value={BANK_TRANSFER.banco} />
            </div>

            {/* La regla comercial va junto a los datos bancarios: el que llega
                a esta pagina a copiar el alias es exactamente el que se gana
                el descuento. */}
            <p className="mt-4 text-[14px] font-medium text-green-700">
              Pagando por transferencia tenés un {DESCUENTO_TRANSFERENCIA}% de
              descuento sobre el total de tu compra.
            </p>

            {/* Fuera del fondo gris y resaltado: no es una aclaracion mas,
                es el plazo del que depende que el pedido siga en pie. */}
            <div className="mt-6 rounded-xl border border-orange-100 bg-orange-50/50 p-4">
              <h4 className="mb-1 text-sm font-semibold text-orange-900">
                Importante sobre tu pago
              </h4>
              <p className="text-sm leading-relaxed text-orange-800/80">
                Una vez realizado el pedido, tenés <strong>24 horas</strong>{" "}
                para enviar el comprobante por WhatsApp indicando tu número de
                orden. Pasado ese tiempo, si no recibimos el comprobante, el
                pedido se cancelará automáticamente para liberar el stock.
              </p>
            </div>
          </section>

          {/* Las mismas sucursales del checkout: el que pregunta "dónde
              retiro" tambien termina en esta pagina. */}
          <section className={TARJETA}>
            <h2 className={`${SERIF} mb-6 text-2xl text-stone-900`}>
              Dónde retirás
            </h2>

            <ul className="divide-y divide-stone-200">
              {PICKUP_BRANCHES.map((sucursal) => (
                <li key={sucursal.id} className="py-4 first:pt-0 last:pb-0">
                  <p className="flex items-center gap-2 font-sans text-lg font-semibold text-stone-800">
                    <MapPin
                      className="h-4 w-4 shrink-0 text-[#8B5A2B]"
                      strokeWidth={1.75}
                    />
                    {sucursal.nombre}
                  </p>
                  <p className="mt-1.5 text-sm text-stone-500">
                    {sucursal.direccion}
                  </p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-400">
                    <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                    {sucursal.horario}
                  </p>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-sm leading-relaxed text-stone-500">
              No hacemos envíos a domicilio: los pedidos se retiran por
              cualquiera de las dos sucursales.
            </p>
          </section>
        </div>
      </main>

      <Footer />
      <CartDrawer />
    </div>
  );
}
