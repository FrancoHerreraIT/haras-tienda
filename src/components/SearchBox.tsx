"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { RUTA_CATALOGO, SEARCH_PARAM, hrefBusqueda } from "@/app/lib/search";

/* Cuanto se espera despues de la ultima tecla antes de tocar la URL. */
const ESPERA_MS = 250;

type SearchBoxProps = {
  /** Texto del placeholder: en el telefono entra menos. */
  placeholder: string;
  /** Se llama al confirmar la busqueda; en mobile cierra la fila. */
  onSubmitted?: () => void;
  autoFocus?: boolean;
  className?: string;
};

/**
 * Buscador de la tienda.
 *
 * La consulta vive en la URL (`/productos?q=cuchillo`), no en un estado suelto:
 * asi el resultado se puede compartir por link, el boton "atras" vuelve a la
 * busqueda anterior, y el listado la lee con useSearchParams.
 *
 * Estando en el catalogo la URL se actualiza con `history.replaceState`, que
 * Next engancha al router sin ir al servidor (ver "Native History API" en la
 * doc de navegacion): el filtrado es instantaneo porque los productos ya estan
 * en el cliente. Desde cualquier otra pagina no hay listado que filtrar, asi
 * que ahi recien se navega al catalogo al confirmar.
 */
export default function SearchBox({
  placeholder,
  onSubmitted,
  autoFocus = false,
  className = "",
}: SearchBoxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const consultaEnUrl = searchParams.get(SEARCH_PARAM) ?? "";
  const [texto, setTexto] = useState(consultaEnUrl);
  const enCatalogo = pathname === RUTA_CATALOGO;

  /* La URL manda: si cambio por el boton "atras" o porque el listado limpio
     la busqueda, el input se pone al dia. Se ajusta durante el render y no
     en un efecto para no encadenar un segundo render (react.dev,
     "You Might Not Need an Effect"). */
  const [ultimaUrlVista, setUltimaUrlVista] = useState(consultaEnUrl);
  if (ultimaUrlVista !== consultaEnUrl) {
    setUltimaUrlVista(consultaEnUrl);
    /* Solo si lo tipeado ya no significa lo mismo que la URL. Sin esta
       condicion, escribir "tabla " y frenar borraba el espacio final: la URL
       guarda la consulta sin espacios y volvia recortada al input. */
    if (texto.trim() !== consultaEnUrl) setTexto(consultaEnUrl);
  }

  /* Filtrado mientras se escribe, con una pausa para no reescribir la URL en
     cada tecla. Solo en el catalogo: en otra pagina no hay nada que filtrar. */
  useEffect(() => {
    if (!enCatalogo || texto.trim() === consultaEnUrl) return;

    const temporizador = setTimeout(() => {
      window.history.replaceState(null, "", hrefBusqueda(texto));
    }, ESPERA_MS);

    return () => clearTimeout(temporizador);
  }, [texto, consultaEnUrl, enCatalogo]);

  const confirmar = (evento: React.FormEvent) => {
    evento.preventDefault();

    if (enCatalogo) {
      /* Puede haber un debounce a mitad de camino: se aplica ya. */
      window.history.replaceState(null, "", hrefBusqueda(texto));
      document
        .getElementById("productos")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      router.push(hrefBusqueda(texto));
    }

    /* En el telefono el teclado tapa media pantalla: se cierra para que se
       vean los resultados. */
    inputRef.current?.blur();
    onSubmitted?.();
  };

  return (
    <form role="search" onSubmit={confirmar} className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        Buscar productos
      </label>
      <input
        ref={inputRef}
        id={id}
        name={SEARCH_PARAM}
        type="search"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        /* La fila del buscador en mobile se despliega a pedido: si no toma
           el foco sola hay que volver a tocar el input. */
        autoFocus={autoFocus}
        className="w-full bg-[#252120] border border-stone-700/70 rounded-full py-2.5 pl-5 pr-12 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-[#8B5A2B] transition-colors"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="absolute right-1 top-1 bottom-1 aspect-square flex items-center justify-center rounded-full text-amber-700 hover:text-amber-500 transition-colors"
      >
        <Search className="w-5 h-5" />
      </button>
    </form>
  );
}
