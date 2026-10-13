"use client";

import Link from "next/link";
import { ArrowUp, Leaf, Mail, MapPin, MessageCircle } from "lucide-react";

/* Las mismas sucursales que ofrece el checkout para retirar. */
import { PICKUP_BRANCHES } from "@/app/lib/branches";
/* Y los mismos datos de contacto que muestra /contacto. */
import { STORE_CONTACT } from "@/app/lib/contacto";
import InstagramGlyph from "@/components/InstagramGlyph";
import BrandLogo from "@/components/BrandLogo";

export default function Footer() {
  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="relative bg-[#1C1A19] text-stone-300 mt-8">
      {/* Filete de cuero superior */}
      <span className="block h-px w-full bg-gradient-to-r from-transparent via-amber-800/60 to-transparent" />

      <div className="w-full px-4 md:px-12 lg:px-24 xl:px-32 py-12 md:py-20 pb-safe">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 md:gap-10 lg:gap-16">
          {/* Columna 1 — Marca. El mismo logo que el Navbar, mas grande. En
              el telefono el bloque va centrado; desde sm se alinea con las
              otras columnas. La hoja cierra la frase en linea con el texto (y no como un
              item flex aparte) para que la acompane tambien cuando esta
              centrada y ocupa dos renglones. */}
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <BrandLogo size="footer" />
            <p className="mt-6 max-w-xs text-[14px] leading-relaxed text-stone-400">
              El equilibrio entre delicados diseños y el espíritu de lo
              autóctono
              <Leaf
                className="ml-1.5 inline-block h-[14px] w-[14px] -translate-y-px align-middle text-amber-700"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </p>
          </div>

          {/* Columna 2 — Sucursales */}
          <div>
            <h3 className="text-[11px] tracking-wide text-amber-700 font-semibold mb-6">
              Sucursales
            </h3>
            <ul className="space-y-5">
              {PICKUP_BRANCHES.map((s) => (
                <li key={s.nombre} className="flex gap-3">
                  <MapPin
                    className="w-4 h-4 mt-1 shrink-0 text-amber-800"
                    strokeWidth={1.75}
                  />
                  <div>
                    <p className="text-stone-100 text-[15px] leading-tight">
                      {s.nombre}
                    </p>
                    <p className="text-sm text-stone-400 mt-1">{s.direccion}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Columna 3 — Redes y contacto */}
          <div>
            <h3 className="text-[11px] tracking-wide text-amber-700 font-semibold mb-6">
              Seguinos
            </h3>
            <ul className="space-y-4">
              <li>
                <a
                  href={STORE_CONTACT.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 py-1 text-stone-300 hover:text-amber-600 transition-colors group"
                >
                  <span className="flex items-center justify-center w-9 h-9 rounded-full border border-stone-700 group-hover:border-amber-800 transition-colors">
                    <InstagramGlyph className="w-[18px] h-[18px]" />
                  </span>
                  <span className="text-[15px]">
                    {STORE_CONTACT.instagram.handle}
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={STORE_CONTACT.whatsapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 py-1 text-stone-300 hover:text-amber-600 transition-colors group"
                >
                  <span className="flex items-center justify-center w-9 h-9 rounded-full border border-stone-700 group-hover:border-amber-800 transition-colors">
                    <MessageCircle className="w-[18px] h-[18px]" strokeWidth={1.75} />
                  </span>
                  <span className="text-[15px]">WhatsApp</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${STORE_CONTACT.email}`}
                  className="inline-flex items-center gap-3 py-1 text-stone-300 hover:text-amber-600 transition-colors group"
                >
                  <span className="flex items-center justify-center w-9 h-9 rounded-full border border-stone-700 group-hover:border-amber-800 transition-colors">
                    <Mail className="w-[18px] h-[18px]" strokeWidth={1.75} />
                  </span>
                  <span className="text-[15px] break-all">
                    {STORE_CONTACT.email}
                  </span>
                </a>
              </li>
            </ul>

            {/* Todo junto, mas los datos bancarios por si perdio el alias. */}
            <Link
              href="/contacto"
              className="mt-6 inline-block text-sm text-amber-700 underline underline-offset-4 hover:text-amber-600 transition-colors"
            >
              Ver todos los datos de contacto
            </Link>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="border-t border-stone-800 mt-12 pt-7 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-xs text-stone-500">
            © {new Date().getFullYear()} Haras del Este. Todos los derechos
            reservados.
          </p>
        </div>
      </div>

      {/* Botón flotante: volver al tope */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Volver al inicio de la página"
        className="absolute bottom-20 right-4 sm:bottom-6 md:right-12 lg:right-24 xl:right-32 flex items-center justify-center w-12 h-12 rounded-full bg-amber-700 hover:bg-[#6b4421] text-[#F7F5F0] shadow-lg shadow-black/40 active:scale-95 transition-all"
      >
        <ArrowUp className="w-5 h-5" strokeWidth={2.25} />
      </button>
    </footer>
  );
}
