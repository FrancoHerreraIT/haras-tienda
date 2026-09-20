"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { headingClass } from "./ui";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Pie del modal: normalmente los botones de accion. */
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /** En false ignora Escape y el click en el fondo (hay un dialogo encima). */
  dismissible?: boolean;
  /** "top" lo apila por encima de otro modal ya abierto. */
  layer?: "base" | "top";
};

const sizes = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-3xl",
};

/**
 * Base de todos los dialogos del panel. Cierra con Escape o clickeando el
 * fondo, y bloquea el scroll de atras mientras esta abierto.
 *
 * Queda centrado en la pantalla en todos los tamanos. Si el contenido no
 * entra, el que scrollea es el cuerpo (min-h-0 + flex-1), nunca la pagina de
 * atras, asi el encabezado y los botones siempre estan a la vista.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
  layer = "base",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  /**
   * El foco entra al panel una sola vez, al abrir.
   *
   * Va en su propio efecto y depende solo de `open` a proposito. Antes estaba
   * junto al de Escape, que depende de `onClose` y `dismissible`: como
   * `onClose` es una funcion nueva en cada render, el efecto se repetia con
   * cada tecla y le sacaba el foco al campo. Resultado: al escribir el nombre
   * de un producto solo quedaba la primera letra.
   *
   * Tampoco se roba el foco si algo adentro del panel ya lo tiene, para no
   * pisar el `autoFocus` del primer campo del formulario.
   */
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && dismissible) onClose();
    }

    document.addEventListener("keydown", onKeyDown);

    /* El fondo no debe scrollear detras del modal. */
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;

  return (
    /* El aire de los cuatro bordes lo pone el fondo, no un margen del panel:
       con `items-center` un `mb` lo descentraria hacia arriba, mientras que
       el padding achica la caja donde se centra y el panel queda parejo.
       Abajo se le suma el area segura para el panel sin pie (el que la lleva
       en su propio padding). El backdrop es `absolute inset-0`: resuelve
       contra el padding box, asi que sigue tapando la pantalla entera. */
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 pb-[calc(1.5rem_+_env(safe-area-inset-bottom,0px))] sm:p-6 ${
        layer === "top" ? "z-[60]" : "z-50"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Fondo forja translucido */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={dismissible ? onClose : undefined}
        className="absolute inset-0 cursor-default bg-[#1C1A19]/70 backdrop-blur-sm"
      />

      {/* svh y no vh ni dvh: en el telefono la barra del navegador cambia de
          alto, y el que manda el centrado es el `inset-0` de afuera, que mide
          el viewport grande (barra escondida). Con vh/dvh el panel se
          dimensionaba contra un alto que en ese momento no estaba disponible y
          el pie del formulario terminaba abajo del borde. svh es el viewport
          chico — el que hay con la barra a la vista —, asi que el 85% entra
          siempre, en la resolucion mas apretada tambien. El reparto interno lo
          sigue resolviendo flex: encabezado y pie fijos (shrink-0), el cuerpo
          scrollea (min-h-0 + flex-1 + overflow-y-auto). */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative flex max-h-[85svh] w-full ${sizes[size]} flex-col overflow-hidden rounded-2xl border-t-4 border-[#8B5A2B] bg-[#F7F5F0] shadow-2xl shadow-black/40 focus:outline-none`}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 px-5 pt-5 pb-4 sm:px-8 sm:pt-7 sm:pb-5">
          <div className="min-w-0">
            <h2 className={`${headingClass} text-lg sm:text-xl`}>{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-stone-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-stone-200 px-5 py-6 sm:px-8 sm:py-7">
          {children}
        </div>

        {/* El padding inferior SUMA el area segura en vez de reemplazarla,
            igual que el pie del CartDrawer. `pb-safe` es una @utility que
            declara `padding-bottom: env(safe-area-inset-bottom, 0px)` y por
            orden de cascada pisaba el 1rem del `py-4`: en cuanto el inset da
            0 — Android sin barra gestual, o iOS cuando la barra del navegador
            ya ocupa ese lugar — el pie se quedaba sin padding abajo y
            "Volver", que en mobile es el ultimo por el flex-col-reverse,
            terminaba pegado al canto del panel. */}
        {footer && (
          <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-stone-200 bg-stone-100/60 px-5 pt-4 pb-[calc(2rem_+_env(safe-area-inset-bottom,0px))] sm:flex-row sm:justify-end sm:px-8 sm:pt-5 sm:pb-[calc(1.25rem_+_env(safe-area-inset-bottom,0px))]">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
