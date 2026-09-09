"use client";

import { useState } from "react";
import { Check, Copy, Landmark, MessageCircle } from "lucide-react";

import { BANK_TRANSFER } from "@/app/lib/paymentConfig";

/** Fila de dato bancario con boton para copiar al portapapeles. */
function DataRow({
  label,
  value,
  copyable = false,
  mono = false,
}: {
  label: string;
  value: string;
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
      <span className="text-[11px] uppercase tracking-[0.16em] text-stone-500 shrink-0">
        {label}
      </span>
      <span className="flex items-center gap-2 min-w-0">
        <span
          className={`truncate text-sm text-stone-800 ${
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

/**
 * Datos para transferir + instruccion de envio del comprobante.
 * Se muestra cuando el cliente elige pagar por transferencia.
 */
export default function TransferPanel() {
  const { comprobante } = BANK_TRANSFER;

  return (
    <div className="mt-5 rounded-xl border border-amber-800/25 bg-[#F7F5F0] p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
        <Landmark className="h-4 w-4 text-[#8B5A2B]" />
        Datos para transferir
      </h3>

      <div className="mt-4">
        <DataRow label="Banco" value={BANK_TRANSFER.banco} />
        <DataRow label="Titular" value={BANK_TRANSFER.titular} />
        <DataRow label="CUIT" value={BANK_TRANSFER.cuit} />
        <DataRow label="Cuenta" value={BANK_TRANSFER.tipoCuenta} />
        <DataRow label="CBU" value={BANK_TRANSFER.cbu} copyable mono />
        <DataRow label="Alias" value={BANK_TRANSFER.alias} copyable mono />
      </div>

      {/* Paso que el cliente no puede saltear */}
      <div className="mt-5 rounded-lg border border-amber-800/20 bg-amber-50/70 p-4">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-900">
          <MessageCircle className="h-3.5 w-3.5" />
          Importante
        </p>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">
          Enviá el comprobante por WhatsApp al{" "}
          <a
            href={`https://wa.me/${comprobante.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-amber-900 underline underline-offset-2 hover:text-[#8B5A2B]"
          >
            {comprobante.telefono}
          </a>
          , que está a nombre de{" "}
          <strong className="text-stone-900">{comprobante.aNombreDe}</strong>.
          Tu pedido queda reservado hasta que confirmemos el pago.
        </p>
      </div>
    </div>
  );
}
