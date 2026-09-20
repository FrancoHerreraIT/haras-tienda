"use client";

import { Landmark, MessageCircle } from "lucide-react";

import { BANK_TRANSFER } from "@/app/lib/paymentConfig";
import CopyableRow from "@/components/CopyableRow";

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
        <CopyableRow label="Alias" value={BANK_TRANSFER.alias} copyable mono />
        {/* La cuenta es de Mercado Pago: no hay CBU ni tipo de cuenta, y el
            CVU recien se muestra cuando este cargado (ver paymentConfig). */}
        {BANK_TRANSFER.cvu && (
          <CopyableRow label="CVU" value={BANK_TRANSFER.cvu} copyable mono />
        )}
        <CopyableRow label="Titular" value={BANK_TRANSFER.titular} />
        <CopyableRow label="Banco" value={BANK_TRANSFER.banco} />
      </div>

      {/* Paso que el cliente no puede saltear */}
      <div className="mt-5 rounded-lg border border-amber-800/20 bg-amber-50/70 p-4">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-amber-900">
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
          . Tu pedido se procesa al confirmar el pago.
        </p>
      </div>
    </div>
  );
}
