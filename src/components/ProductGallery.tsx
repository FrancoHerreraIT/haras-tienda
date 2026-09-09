"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";

/**
 * Galeria de la ficha de producto.
 *
 * En desktop se cambia de foto con las miniaturas; en el telefono, ademas,
 * deslizando con el dedo, que es como se espera que funcione ahi.
 */
export default function ProductGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [activa, setActiva] = useState(0);
  const inicioX = useRef<number | null>(null);
  const inicioY = useRef<number | null>(null);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-stone-200 bg-white">
        <Package className="h-16 w-16 text-stone-300" strokeWidth={1} />
      </div>
    );
  }

  const ir = (siguiente: number) =>
    setActiva((siguiente + images.length) % images.length);

  return (
    <div>
      <div
        className="relative aspect-square w-full overflow-hidden rounded-xl border border-stone-200 bg-white"
        onTouchStart={(e) => {
          inicioX.current = e.touches[0].clientX;
          inicioY.current = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          if (inicioX.current === null || inicioY.current === null) return;
          const dx = e.changedTouches[0].clientX - inicioX.current;
          const dy = e.changedTouches[0].clientY - inicioY.current;
          inicioX.current = null;
          inicioY.current = null;
          /* Si el gesto fue mas vertical que horizontal era scroll de pagina. */
          if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
          ir(activa + (dx < 0 ? 1 : -1));
        }}
      >
        <Image
          src={images[activa]}
          alt={
            images.length > 1
              ? `${title} — foto ${activa + 1} de ${images.length}`
              : title
          }
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          /* contain y no cover: la foto del producto se ve entera, sin que
             el encuadre cuadrado le recorte los bordes. */
          className="object-contain p-3 sm:p-4"
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => ir(activa - 1)}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-700 shadow-sm transition-colors hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => ir(activa + 1)}
              aria-label="Foto siguiente"
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-700 shadow-sm transition-colors hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-[#1C1A19]/75 px-2.5 py-1 text-[11px] font-medium text-stone-100">
              {activa + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2 sm:gap-3">
          {images.map((url, indice) => (
            <li key={url}>
              <button
                type="button"
                onClick={() => setActiva(indice)}
                aria-label={`Ver foto ${indice + 1}`}
                aria-current={indice === activa}
                className={`relative block aspect-square w-full overflow-hidden rounded-lg border-2 transition-colors ${
                  indice === activa
                    ? "border-[#8B5A2B]"
                    : "border-transparent hover:border-stone-300"
                }`}
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-contain p-1"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
