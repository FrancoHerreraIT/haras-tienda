"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Fila "etiqueta / valor" con boton para copiar al portapapeles.
 *
 * La usan el panel de transferencia del checkout y la pagina de contacto: en
 * las dos lo que se muestra es un CBU o un alias que el cliente va a pegar en
 * el homebanking, y transcribir 22 digitos a mano es como se pierden las
 * transferencias.
 */
export default function CopyableRow({
  label,
  value,
  copyable = false,
  mono = false,
}: {
  label: string;
  value: string;
  /** Sin esto la fila es solo informativa (el banco, el tipo de cuenta). */
  copyable?: boolean;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Sin permiso de portapapeles el dato igual esta visible para copiarlo a mano. */
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-stone-200/70 py-2.5 last:border-b-0">
      <span className="text-[12px] tracking-wide text-stone-500 shrink-0">
        {label}
      </span>
      <span className="flex items-center gap-2 min-w-0">
        {/* El tamaño va en px y no en `text-sm`: el :root del sitio esta al
            67% (globals.css), asi que un text-sm cae a ~9px reales y un CBU
            de 22 digitos se vuelve ilegible justo donde hay que leerlo bien. */}
        <span
          className={`truncate text-[14px] text-stone-800 ${
            mono ? "font-mono tracking-tight" : ""
          }`}
        >
          {value}
        </span>
        {copyable && (
          <button
            type="button"
            onClick={copy}
            aria-label={`Copiar ${label}`}
            className="shrink-0 rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-700"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </span>
    </div>
  );
}
