import { Great_Vibes } from "next/font/google";

/* Firma de estancia para el logo */
const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const TAMANOS = {
  nav: {
    firma: "text-[1.75rem] sm:text-[2.125rem] md:text-[2.75rem]",
    bajada: "text-[8px] sm:text-[9px] md:text-[11px]",
  },
  footer: {
    firma: "text-[2.75rem] md:text-[3.25rem]",
    bajada: "text-[11px] md:text-[12px]",
  },
} as const;

/**
 * Logo de la tienda: la firma "Haras del Este" con la bajada debajo.
 *
 * Lo comparten el Navbar y el Footer para que se vean identicos; solo cambia
 * el tamano. La bajada va centrada bajo la firma: la H de Great Vibes abre con
 * un rulo hacia la izquierda, y alineadas las dos a la izquierda la bajada se
 * veia corrida.
 * Sin truncate: su overflow hidden cortaba los trazos de la cursiva que salen
 * de la caja, como el remate de la ultima "e". El px-1 les deja lugar.
 *
 * El hover de la firma responde a un `group` del padre (el Link del Navbar).
 */
export default function BrandLogo({
  size = "nav",
}: {
  size?: keyof typeof TAMANOS;
}) {
  const tamano = TAMANOS[size];
  return (
    <span className="inline-flex flex-col items-center leading-none">
      <span
        className={`${greatVibes.className} block whitespace-nowrap px-1 ${tamano.firma} text-stone-50 group-hover:text-amber-100 transition-colors leading-[1.15]`}
      >
        Haras del Este
      </span>
      <span
        className={`mt-1 block whitespace-nowrap ${tamano.bajada} tracking-wide text-amber-700/90`}
      >
        Cocina · Campo · Hogar
      </span>
    </span>
  );
}
