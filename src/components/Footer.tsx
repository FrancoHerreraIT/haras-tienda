"use client";

import { ArrowUp, MapPin, MessageCircle } from "lucide-react";
import { Great_Vibes } from "next/font/google";

/* Misma firma de estancia que usa el Navbar */
const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const sucursales = [
  { nombre: "Centro", direccion: "Duarte Quirós 591" },
  { nombre: "Homa Mall", direccion: "Ruta C45 · Km 1 · Local 2" },
];

/**
 * lucide-react ya no distribuye iconos de marca, así que dibujamos el glifo
 * de Instagram con el mismo trazo que el resto de los iconos.
 */
function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function Footer() {
  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="relative bg-[#1C1A19] text-stone-300 mt-8">
      {/* Filete de cuero superior */}
      <span className="block h-px w-full bg-gradient-to-r from-transparent via-amber-800/60 to-transparent" />

      <div className="w-full px-4 md:px-12 lg:px-24 xl:px-32 py-12 md:py-20 pb-safe">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 md:gap-10 lg:gap-16">
          {/* Columna 1 — Marca */}
          <div>
            <span
              className={`${greatVibes.className} block text-4xl md:text-5xl text-stone-50 leading-[1.1]`}
            >
              Haras del Este
            </span>
            <span className="block text-[10px] tracking-wide text-amber-700 mt-3 pl-1">
              Cocina • Campo • Hogar
            </span>
            <p className="text-sm text-stone-400 leading-relaxed mt-6 max-w-xs">
              Tablas, cuchillería y hierro forjado elegidos pieza por pieza para
              la mesa de campo.
            </p>
          </div>

          {/* Columna 2 — Sucursales */}
          <div>
            <h3 className="text-[11px] tracking-wide text-amber-700 font-semibold mb-6">
              Sucursales
            </h3>
            <ul className="space-y-5">
              {sucursales.map((s) => (
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
                  href="https://instagram.com/harasdeleste"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 py-1 text-stone-300 hover:text-amber-600 transition-colors group"
                >
                  <span className="flex items-center justify-center w-9 h-9 rounded-full border border-stone-700 group-hover:border-amber-800 transition-colors">
                    <InstagramGlyph className="w-[18px] h-[18px]" />
                  </span>
                  <span className="text-[15px]">@harasdeleste</span>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/"
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
            </ul>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="border-t border-stone-800 mt-12 pt-7 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-xs text-stone-500">
            © {new Date().getFullYear()} Haras del Este. Todos los derechos
            reservados.
          </p>
          <p className="text-[10px] tracking-wide text-stone-600">
            Envíos a todo el país
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
