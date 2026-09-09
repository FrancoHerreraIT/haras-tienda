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
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 ${
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

      {/* dvh y no vh: en mobile la barra del navegador cambia de alto y con
          vh el pie del formulario quedaba fuera de pantalla. El alto del
          cuerpo lo resuelve flex (min-h-0), no un max-h fijo. */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative flex max-h-[90dvh] w-full ${sizes[size]} flex-col overflow-hidden rounded-2xl border-t-4 border-[#8B5A2B] bg-[#F7F5F0] shadow-2xl shadow-black/40 focus:outline-none`}
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

        {footer && (
          <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-stone-200 bg-stone-100/60 px-5 py-4 pb-safe sm:flex-row sm:justify-end sm:px-8 sm:py-5">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
