"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import Modal from "./Modal";
import { btnDanger, btnPrimary, btnSecondary } from "./ui";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  /** "top" para confirmar por encima de un formulario ya abierto. */
  layer?: "base" | "top";
  /** Devuelve un mensaje de error para mostrarlo, o nada si salio bien. */
  onConfirm: () => Promise<string | void>;
};

/* Alto tactil en px: el rem del sitio esta al 67% (globals.css) y el py-3
   de btnBase deja el boton bastante por debajo de los 44px recomendados. */
const btnTactil = "min-h-[44px] sm:min-h-[38px]";

/**
 * Dialogo unico de confirmacion del panel: se usa igual para dar de baja
 * una categoria, desactivar un producto o cancelar un pedido.
 */
export default function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  layer = "base",
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);

    const result = await onConfirm();

    /* Si la accion devolvio texto, algo fallo: el modal queda abierto
       mostrando el motivo en lugar de cerrarse en silencio. */
    if (typeof result === "string") {
      setError(result);
      setPending(false);
      return;
    }

    setPending(false);
    onClose();
  }

  function handleClose() {
    if (pending) return;
    setError(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      size="sm"
      layer={layer}
      dismissible={!pending}
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            disabled={pending}
            className={`${btnSecondary} ${btnTactil}`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            className={`${tone === "danger" ? btnDanger : btnPrimary} ${btnTactil}`}
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      {/* El recuadro del icono tiene medida fija y va arriba (self-start):
          como hijo de un flex se estiraba por defecto al alto del mensaje, y
          con dos parrafos quedaba como una barra vertical. */}
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className={`flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-lg ${
            tone === "danger"
              ? "bg-red-100 text-red-700"
              : "bg-[#8B5A2B]/10 text-[#8B5A2B]"
          }`}
        >
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 text-sm leading-relaxed text-stone-600">
          {message}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </Modal>
  );
}
