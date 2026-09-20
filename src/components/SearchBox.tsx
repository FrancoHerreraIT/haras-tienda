"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Package, Search } from "lucide-react";
import {
  RUTA_CATALOGO,
  RUTA_SUGERENCIAS,
  SEARCH_PARAM,
  hrefBusqueda,
  type ResultadoBusqueda,
} from "@/app/lib/search";

/* Pausa entre teclas antes de pedir sugerencias. Corta: la primera letra ya
   muestra resultados, pero escribir "tabla" de corrido no dispara cinco
   pedidos al servidor. */
const ESPERA_SUGERENCIAS_MS = 120;

/* Las sugerencias recuerdan para que consulta llegaron: mientras la respuesta
   de lo ultimo tipeado no vuelve, se sigue mostrando la anterior. */
type Sugerencias = ResultadoBusqueda & { consulta: string; fallo?: boolean };

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
 * Muestra resultados desde la primera letra, de dos maneras:
 *  - En el catalogo filtra la grilla: la URL se actualiza con
 *    `history.replaceState`, que Next engancha al router sin ir al servidor
 *    (ver "Native History API" en la doc de navegacion).
 *  - En cualquier otra pagina abre un desplegable con sugerencias que pide a
 *    RUTA_SUGERENCIAS. No navega al catalogo mientras se escribe: el Navbar es
 *    de cada pagina, y al cambiar de pagina el input se volveria a crear y se
 *    perderian el foco y las letras tipeadas en el medio.
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
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const consultaEnUrl = searchParams.get(SEARCH_PARAM) ?? "";
  const [texto, setTexto] = useState(consultaEnUrl);
  const enCatalogo = pathname === RUTA_CATALOGO;

  const [sugerencias, setSugerencias] = useState<Sugerencias | null>(null);
  const [abierto, setAbierto] = useState(false);

  const consulta = texto.trim();
  const conSugerencias = !enCatalogo && consulta.length > 0;
  const mostrarPanel = conSugerencias && abierto;
  const cargando = sugerencias?.consulta !== consulta;

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

  /* Pide las sugerencias de lo tipeado. Cada tecla cancela el pedido
     anterior: si una respuesta vieja llegara despues que la nueva, pisaria
     los resultados con los de una consulta que ya no es la del input. */
  useEffect(() => {
    if (!conSugerencias) return;

    const control = new AbortController();
    const temporizador = setTimeout(async () => {
      try {
        const respuesta = await fetch(
          `${RUTA_SUGERENCIAS}?${SEARCH_PARAM}=${encodeURIComponent(consulta)}`,
          { signal: control.signal },
        );
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

        const datos: ResultadoBusqueda = await respuesta.json();
        setSugerencias({ consulta, ...datos });
      } catch (error) {
        if (control.signal.aborted) return;
        console.error("[SearchBox] no se pudieron traer sugerencias:", error);
        setSugerencias({ consulta, products: [], total: 0, fallo: true });
      }
    }, ESPERA_SUGERENCIAS_MS);

    return () => {
      clearTimeout(temporizador);
      control.abort();
    };
  }, [conSugerencias, consulta]);

  /* Tocar afuera cierra el desplegable, como cualquier menu: si no, queda
     flotando sobre la pagina despues de irse a otra parte. */
  useEffect(() => {
    if (!mostrarPanel) return;

    const alTocar = (evento: PointerEvent) => {
      const destino = evento.target;
      if (destino instanceof Node && !formRef.current?.contains(destino)) {
        setAbierto(false);
      }
    };

    window.addEventListener("pointerdown", alTocar);
    return () => window.removeEventListener("pointerdown", alTocar);
  }, [mostrarPanel]);

  /* Filtrado en vivo desde la primera letra, en el mismo onChange. En el
     catalogo no hace falta esperar a que termine de escribir: replaceState no
     va al servidor y el listado filtra lo que ya tiene en memoria. */
  const escribir = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const valor = evento.target.value;
    setTexto(valor);
    setAbierto(true);

    /* Con el input vacio no quedan sugerencias viejas esperando a aparecer
       en la proxima busqueda. */
    if (!valor.trim()) setSugerencias(null);

    if (enCatalogo && valor.trim() !== consultaEnUrl) {
      window.history.replaceState(null, "", hrefBusqueda(valor));
    }
  };

  const cerrar = () => {
    setAbierto(false);
    onSubmitted?.();
  };

  const confirmar = (evento: React.FormEvent) => {
    evento.preventDefault();

    if (enCatalogo) {
      /* La URL ya esta al dia por onChange: solo falta llevar a la grilla. */
      document
        .getElementById("productos")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      router.push(hrefBusqueda(texto));
    }

    /* En el telefono el teclado tapa media pantalla: se cierra para que se
       vean los resultados. */
    inputRef.current?.blur();
    cerrar();
  };

  const lista = sugerencias?.products ?? [];
  const total = sugerencias?.total ?? 0;

  return (
    <form
      ref={formRef}
      role="search"
      onSubmit={confirmar}
      onKeyDown={(evento) => {
        if (evento.key === "Escape") setAbierto(false);
      }}
      className={`relative ${className}`}
    >
      <label htmlFor={id} className="sr-only">
        Buscar productos
      </label>
      <input
        ref={inputRef}
        id={id}
        name={SEARCH_PARAM}
        type="search"
        value={texto}
        onChange={escribir}
        onFocus={() => setAbierto(true)}
        placeholder={placeholder}
        autoComplete="off"
        aria-controls={mostrarPanel ? `${id}-sugerencias` : undefined}
        /* La fila del buscador en mobile se despliega a pedido: si no toma
           el foco sola hay que volver a tocar el input. */
        autoFocus={autoFocus}
        className="w-full bg-[#252120] border border-stone-700/70 rounded-full py-3 pl-6 pr-14 text-base text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-[#8B5A2B] transition-colors"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="absolute right-1 top-1 bottom-1 aspect-square flex items-center justify-center rounded-full text-amber-700 hover:text-amber-500 transition-colors"
      >
        <Search className="w-6 h-6" />
      </button>

      {mostrarPanel && (
        <div
          id={`${id}-sugerencias`}
          aria-live="polite"
          aria-busy={cargando}
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-stone-200 bg-white text-stone-800 shadow-xl shadow-black/25"
        >
          {lista.length > 0 ? (
            <>
              <ul
                className={`max-h-[60vh] overflow-y-auto py-1 transition-opacity ${
                  cargando ? "opacity-60" : ""
                }`}
              >
                {lista.map((producto) => (
                  <li key={producto.id}>
                    <Link
                      href={`/producto/${producto.id}`}
                      onClick={cerrar}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#F7F5F0] focus:outline-none focus-visible:bg-[#F7F5F0]"
                    >
                      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-stone-100 bg-[#F7F5F0]">
                        {producto.imagen ? (
                          <Image
                            src={producto.imagen}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <Package
                            className="h-5 w-5 text-stone-300"
                            strokeWidth={1.25}
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-stone-800">
                          {producto.title}
                        </span>
                        <span className="block truncate text-[11px] font-semibold tracking-wide text-amber-800/80">
                          {producto.categoryName}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-semibold text-stone-900">
                          $ {producto.price.toLocaleString("es-AR")}
                        </span>
                        {producto.stock <= 0 && (
                          <span className="block text-[10px] text-stone-400">
                            Sin stock
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={hrefBusqueda(texto)}
                onClick={cerrar}
                className="flex items-center justify-center border-t border-stone-100 px-4 py-3 text-[13px] font-semibold text-[#8B5A2B] transition-colors hover:bg-[#F7F5F0] focus:outline-none focus-visible:bg-[#F7F5F0]"
              >
                {cargando
                  ? "Ver todos los resultados"
                  : total === 1
                    ? "Ver el resultado en el catálogo"
                    : `Ver los ${total} resultados`}
              </Link>
            </>
          ) : cargando ? (
            <p className="flex items-center gap-2 px-4 py-4 text-sm text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Buscando...
            </p>
          ) : sugerencias?.fallo ? (
            <p className="px-4 py-4 text-sm text-stone-500">
              No pudimos buscar en este momento. Apretá Enter para buscar en el
              catálogo.
            </p>
          ) : (
            <p className="px-4 py-4 text-sm text-stone-500">
              No encontramos nada para{" "}
              <span className="font-semibold text-stone-700">“{consulta}”</span>.
            </p>
          )}
        </div>
      )}
    </form>
  );
}
