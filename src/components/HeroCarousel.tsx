"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { DESCUENTO_TRANSFERENCIA } from "@/app/lib/paymentConfig";

interface Slide {
  id: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  image: string;
  /* Que parte de la foto se prioriza al recortar en pantallas angostas. */
  position: string;
}

const slides: Slide[] = [
  {
    id: 1,
    eyebrow: "Haras del Este",
    title: "Tradición en tu cocina y asador",
    subtitle:
      "Tablas, cuchillería y hierro forjado elegidos pieza por pieza para la mesa de campo.",
    cta: "Ver catálogo",
    image: "/hero/haras1.jpg",
    position: "object-center",
  },
  {
    id: 2,
    eyebrow: "Aprovechá el beneficio",
    /* Interpolado y no escrito a mano: si cambia el porcentaje, el hero no
       puede quedar prometiendo otro numero que el que cobra el checkout. */
    title: `${DESCUENTO_TRANSFERENCIA}% de descuento`,
    subtitle: "Abonando tu compra con transferencia bancaria.",
    cta: "Ver catálogo",
    image: "/hero/haras2.jpg",
    position: "object-center",
  },
];

const AUTOPLAY_MS = 5000;
/* Desplazamiento minimo del dedo para que cuente como swipe y no como tap. */
const SWIPE_THRESHOLD_PX = 50;

export default function HeroCarousel() {
  const [active, setActive] = useState(0);
  /* Si el usuario toca el carrusel, el avance automatico deja de pelearle. */
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const goPrev = useCallback(
    () => setActive((prev) => (prev - 1 + slides.length) % slides.length),
    [],
  );
  const goNext = useCallback(
    () => setActive((prev) => (prev + 1) % slides.length),
    [],
  );

  useEffect(() => {
    if (paused) return;

    /* Sin autoplay para quien pidio menos movimiento en su sistema. */
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const interval = setInterval(goNext, AUTOPLAY_MS);
    return () => clearInterval(interval);
  }, [paused, goNext]);

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0].clientX;
    touchStartY.current = event.touches[0].clientY;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    const deltaY = event.changedTouches[0].clientY - touchStartY.current;

    touchStartX.current = null;
    touchStartY.current = null;

    /* Si el gesto fue mas vertical que horizontal era un scroll de pagina. */
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    setPaused(true);
    if (deltaX < 0) goNext();
    else goPrev();
  }

  return (
    <section className="w-full px-4 md:px-12 lg:px-24 xl:px-32 pt-4 md:pt-6">
      <div
        className="relative overflow-hidden rounded-xl md:rounded-2xl min-h-[380px] sm:min-h-[460px] md:min-h-[560px] flex"
        role="region"
        aria-roledescription="carrusel"
        aria-label="Destacados de Haras del Este"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Capas de imagen (crossfade). Decorativas: el texto del slide ya
            dice lo mismo y anunciar las fotos apiladas solo estorba. */}
        {slides.map((s, index) => (
          <div
            key={s.id}
            aria-hidden
            className={`absolute inset-0 scale-105 transition-opacity duration-1000 ease-in-out ${
              index === active ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={s.image}
              alt=""
              fill
              sizes="100vw"
              /* La primera es el LCP. En Next 16 `priority` quedo deprecado
                 en favor de `preload`. */
              preload={index === 0}
              className={`object-cover ${s.position}`}
            />
          </div>
        ))}

        {/* Overlay liviano: deja ver el local y sostiene el contraste del H1.
            En mobile es mas parejo porque el texto ocupa todo el ancho. */}
        <div className="absolute inset-0 bg-black/40 md:bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent md:via-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1A19]/80 via-transparent to-transparent md:from-[#1C1A19]/70" />

        {/* Contenido */}
        <div className="relative z-10 flex flex-col justify-center w-full px-5 sm:px-8 md:px-16 lg:px-20 pt-12 pb-16 sm:py-16 md:py-24">
          <div className="max-w-2xl">
            <span className="inline-block text-[10px] sm:text-[11px] md:text-xs tracking-wide text-amber-500/90 mb-3 sm:mb-5">
              {slides[active].eyebrow}
            </span>
            <h1 className="font-[family-name:var(--font-display)] text-[28px] sm:text-4xl md:text-6xl lg:text-7xl text-[#F7F5F0] leading-[1.12] md:leading-[1.08] mb-4 sm:mb-6 drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] text-balance">
              {slides[active].title}
            </h1>
            <p className="text-sm md:text-lg text-stone-200/90 mb-7 sm:mb-9 max-w-lg leading-relaxed">
              {slides[active].subtitle}
            </p>
            <button
              type="button"
              /* En el telefono el boton quedaba pegado al parrafo: se lo baja
                 dentro del hero para que respire. En sm+ ya estaba bien. */
              className="mt-8 sm:mt-0 w-full sm:w-auto bg-[#8B5A2B] hover:bg-[#6b4421] active:scale-[0.98] text-[#F7F5F0] font-semibold tracking-wide px-7 sm:px-9 py-4 rounded-lg text-xs md:text-sm transition-all shadow-lg shadow-black/30"
            >
              {slides[active].cta}
            </button>
          </div>

          {/* Dots — el area tocable es de 44px aunque la marca sea fina.
              Debajo de md van anclados al borde inferior de la foto: pegados
              al boton quedaban flotando en el medio. En md+ siguen el flujo. */}
          <div className="absolute bottom-1 left-5 sm:left-8 md:static flex gap-1 md:mt-16 -ml-2">
            {slides.map((s, index) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setPaused(true);
                  setActive(index);
                }}
                aria-label={`Ir al slide ${index + 1} de ${slides.length}`}
                aria-current={index === active}
                className="flex h-11 w-11 items-center justify-center"
              >
                <span
                  className={`block h-[3px] rounded-full transition-all ${
                    index === active
                      ? "w-8 bg-[#8B5A2B]"
                      : "w-4 bg-white/40 hover:bg-white/70"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Flechas: en mobile se navega con swipe, asi no tapan el texto */}
        <button
          type="button"
          onClick={() => {
            setPaused(true);
            goPrev();
          }}
          aria-label="Slide anterior"
          className="hidden md:flex absolute z-10 left-5 top-1/2 -translate-y-1/2 items-center justify-center w-11 h-11 rounded-full border border-white/20 bg-black/30 text-stone-100 hover:bg-[#8B5A2B] hover:border-transparent transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setPaused(true);
            goNext();
          }}
          aria-label="Slide siguiente"
          className="hidden md:flex absolute z-10 right-5 top-1/2 -translate-y-1/2 items-center justify-center w-11 h-11 rounded-full border border-white/20 bg-black/30 text-stone-100 hover:bg-[#8B5A2B] hover:border-transparent transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}
