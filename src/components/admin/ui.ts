/**
 * Vocabulario visual del backoffice.
 *
 * Todo el panel (formularios, tablas, modales) toma las clases de aca para
 * que un boton "Cancelar" se vea igual en Productos que en Categorias.
 * Paleta: forja #1C1A19, cuero #8B5A2B, crema #F7F5F0.
 */

/* py-3 en mobile deja el boton en ~44px de alto (guia tactil de iOS/Android);
   desde sm vuelve a la altura compacta del escritorio. */
export const btnBase =
"inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 sm:py-2.5 text-xs font-semibold tracking-wide transition-colors disabled:opacity-60 disabled:pointer-events-none";

export const btnPrimary = `${btnBase} bg-[#1C1A19] text-stone-50 hover:bg-[#8B5A2B]`;

export const btnSecondary = `${btnBase} border border-stone-300 bg-transparent text-stone-600 hover:bg-stone-200`;

export const btnDanger = `${btnBase} bg-red-700 text-stone-50 hover:bg-red-800`;

/* Igual que btnBase: comodo para el dedo en mobile, compacto en la tabla. */
export const btnGhost =
  "inline-flex items-center gap-1.5 rounded-lg px-3 py-3 sm:px-2.5 sm:py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900";

export const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#8B5A2B] focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 transition-colors";

export const labelClass =
"block text-[11px] font-semibold tracking-wide text-stone-500 mb-2";

export const cardClass =
  "rounded-xl border border-stone-200 bg-white shadow-sm";

export const headingClass =
  "font-[family-name:var(--font-display)] text-stone-900";

/** Precios en pesos, con el formato que ya usa la tienda. */
export const formatARS = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

/** El panel muestra siempre hora de Argentina, corra donde corra el servidor. */
const TIMEZONE = "America/Argentina/Buenos_Aires";

/**
 * Fecha y hora en formato argentino, identica en servidor y navegador.
 *
 * Se arma parte por parte a proposito. Si se deja que Intl devuelva el string
 * completo, los separadores que agrega dependen de la version de ICU: Node
 * escribe "p." + espacio duro + "m." y Chrome usa un espacio comun, y React
 * lo reporta como error de hidratacion. Armando el string a mano esos
 * separadores nunca llegan a la salida.
 *
 * La zona tambien va fija: si el servidor corre en UTC (el caso tipico al
 * desplegar) la fecha del HTML no coincidiria con la del cliente, y ademas
 * estaria corrida tres horas.
 */
export const formatDate = (value: Date | string) => {
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    /* h23 y no hour12: evita el "p. m." y que medianoche salga como 24. */
    hourCycle: "h23",
  }).formatToParts(new Date(value));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("day")}/${get("month")}/${get("year")}, ${get("hour")}:${get("minute")}`;
};
