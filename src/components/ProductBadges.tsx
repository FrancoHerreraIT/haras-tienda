import { Star } from "lucide-react";
import { esStockBajo, etiquetaStockBajo } from "@/app/lib/plural";

/**
 * Etiquetas de un producto: "Destacado", "Últimas N unidades", "Sin stock".
 *
 * Van en una fila propia y no encima de la foto: con object-contain una foto
 * vertical ocupa todo el alto del marco y la etiqueta le tapaba el producto.
 * Comparten tamaño, forma y tipografia; solo cambia el color segun el tipo.
 */

type Tipo = "destacado" | "stockBajo" | "agotado";

const ESTILOS: Record<Tipo, string> = {
  destacado: "bg-[#8B5A2B] text-[#F7F5F0]",
  stockBajo: "bg-[#B5532C] text-white",
  agotado: "bg-stone-700 text-stone-100",
};

function Badge({ tipo, texto }: { tipo: Tipo; texto: string }) {
  return (
    <span
      /* 22px de alto por padding + interlineado (5 + 12 + 5) y no con un
         h fijo: la pildora toma el alto de su contenido y no puede quedar
         recortada. ALTO_BADGE tiene que coincidir. */
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-[5px] text-[11px] font-semibold leading-[12px] tracking-wide ${ESTILOS[tipo]}`}
    >
      {tipo === "destacado" && (
        <Star className="h-3 w-3 shrink-0 fill-current" aria-hidden="true" />
      )}
      {texto}
    </span>
  );
}

/** Alto de una pildora: la fila que reserva su lugar usa este minimo. */
export const ALTO_BADGE = "min-h-[22px]";

type ProductBadgesProps = {
  stock: number;
  /* Opcional: el buscador del Navbar no recibe si el producto es destacado. */
  destacado?: boolean;
  className?: string;
};

export default function ProductBadges({
  stock,
  destacado = false,
  className = "",
}: ProductBadgesProps) {
  const agotado = stock <= 0;
  const stockBajo = esStockBajo(stock);

  /* Sin etiquetas igual se dibuja el contenedor: quien lo usa le da un alto
     minimo para que la tarjeta no cambie de alto por tener o no etiqueta. */
  return (
    <div className={`flex shrink-0 flex-wrap items-center gap-1.5 ${className}`}>
      {destacado && <Badge tipo="destacado" texto="Destacado" />}
      {stockBajo && <Badge tipo="stockBajo" texto={etiquetaStockBajo(stock)} />}
      {agotado && <Badge tipo="agotado" texto="Sin stock" />}
    </div>
  );
}
