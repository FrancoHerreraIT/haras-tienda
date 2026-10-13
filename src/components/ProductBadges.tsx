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
      className={`inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[11px] font-semibold leading-none tracking-wide ${ESTILOS[tipo]}`}
    >
      {tipo === "destacado" && (
        <Star className="h-3 w-3 shrink-0 fill-current" aria-hidden="true" />
      )}
      {texto}
    </span>
  );
}

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
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {destacado && <Badge tipo="destacado" texto="Destacado" />}
      {stockBajo && <Badge tipo="stockBajo" texto={etiquetaStockBajo(stock)} />}
      {agotado && <Badge tipo="agotado" texto="Sin stock" />}
    </div>
  );
}
